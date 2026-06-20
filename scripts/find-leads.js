import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config';

import { ensureDir } from './utils.js';
import { resolveRegion, listRegions, SAITAMA_WARDS, SAITAMA_CITY } from './regions.js';

/**
 * さいたま市の飲食店を Google Places API (New) で走査し、
 * 「website未登録」または「口コミ10件以下」の店舗を営業リードとして抽出する。
 *
 * 使い方:
 *   GOOGLE_MAPS_API_KEY=xxxx npm run find:leads
 *   npm run find:leads -- --region=urawa --max-reviews=5
 *   npm run find:leads -- --all-regions          # 10区を順に走査＋サマリー
 *   npm run find:leads -- --list-regions         # 利用可能な地域プリセット一覧
 *
 * 環境変数:
 *   GOOGLE_MAPS_API_KEY  必須。Places API (New) を有効化したキー。
 */

const NEARBY_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchNearby';

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.googleMapsUri',
  'places.primaryTypeDisplayName',
  'places.businessStatus',
  'places.location'
].join(',');

function parseArgs(argv) {
  const args = {
    maxReviews: 10,
    step: 600, // グリッド間隔(m)。小さいほど網羅的・高コスト。
    radius: 500, // 各セルの検索半径(m)。
    types: ['restaurant'],
    bboxOverride: {}, // south/north/west/east の手動指定があれば格納
    regionKeys: [], // --region=a,b で指定したプリセットkey
    allRegions: false,
    listRegionsOnly: false,
    delayMs: 120,
    dryRun: false
  };

  for (const raw of argv) {
    const [key, value] = raw.replace(/^--/, '').split('=');
    switch (key) {
      case 'max-reviews':
        args.maxReviews = Number(value);
        break;
      case 'step':
        args.step = Number(value);
        break;
      case 'radius':
        args.radius = Number(value);
        break;
      case 'types':
        args.types = value.split(',').map((t) => t.trim()).filter(Boolean);
        break;
      case 'region':
        args.regionKeys = value.split(',').map((t) => t.trim()).filter(Boolean);
        break;
      case 'all-regions':
        args.allRegions = true;
        break;
      case 'list-regions':
        args.listRegionsOnly = true;
        break;
      case 'south':
      case 'north':
      case 'west':
      case 'east':
        args.bboxOverride[key] = Number(value);
        break;
      case 'delay':
        args.delayMs = Number(value);
        break;
      case 'dry-run':
        args.dryRun = true;
        break;
      default:
        break;
    }
  }

  return args;
}

// 実行対象の地域リストを決定する。
//   --all-regions     → さいたま市10区
//   --region=a,b      → 指定プリセット
//   --south等のbbox   → 手動範囲（単一）
//   既定              → さいたま市全域
function resolveTargets(args) {
  if (args.allRegions) {
    return Object.entries(SAITAMA_WARDS).map(([key, r]) => ({ key, ...r }));
  }
  if (args.regionKeys.length > 0) {
    return args.regionKeys.map((key) => {
      const region = resolveRegion(key);
      if (!region) throw new Error(`未知の地域プリセット: ${key}（--list-regions で確認）`);
      return { key, ...region };
    });
  }
  const hasManualBbox = Object.keys(args.bboxOverride).length > 0;
  if (hasManualBbox) {
    return [{ key: 'custom', label: 'カスタム範囲', ...SAITAMA_CITY, ...args.bboxOverride }];
  }
  return [{ key: 'saitama', ...SAITAMA_CITY }];
}

// 緯度経度のグリッド点を生成する。stepはメートル。
function buildGrid(bbox, stepMeters) {
  const latStep = stepMeters / 111_320; // 緯度1度 ≒ 111.32km
  const midLat = (bbox.south + bbox.north) / 2;
  const lngStep = stepMeters / (111_320 * Math.cos((midLat * Math.PI) / 180));

  const points = [];
  for (let lat = bbox.south; lat <= bbox.north; lat += latStep) {
    for (let lng = bbox.west; lng <= bbox.east; lng += lngStep) {
      points.push({ latitude: Number(lat.toFixed(6)), longitude: Number(lng.toFixed(6)) });
    }
  }
  return points;
}

async function searchCell(apiKey, point, radius, includedTypes) {
  const body = {
    includedTypes,
    maxResultCount: 20,
    rankPreference: 'POPULARITY',
    locationRestriction: {
      circle: {
        center: point,
        radius
      }
    }
  };

  const res = await fetch(NEARBY_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Places API ${res.status}: ${text}`);
  }

  const json = await res.json();
  return json.places || [];
}

function isLead(place, maxReviews) {
  const reviewCount = place.userRatingCount || 0;
  const hasWebsite = Boolean(place.websiteUri);
  const fewReviews = reviewCount <= maxReviews;
  return !hasWebsite || fewReviews;
}

function leadReason(place, maxReviews) {
  const reasons = [];
  if (!place.websiteUri) reasons.push('website無し');
  if ((place.userRatingCount || 0) <= maxReviews) reasons.push('口コミ少');
  return reasons.join(' / ');
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(leads, maxReviews) {
  const header = [
    'name',
    'reason',
    'review_count',
    'rating',
    'has_website',
    'website',
    'phone',
    'address',
    'category',
    'business_status',
    'maps_url',
    'place_id'
  ];

  const rows = leads.map((p) =>
    [
      p.displayName?.text || '',
      leadReason(p, maxReviews),
      p.userRatingCount || 0,
      p.rating || '',
      p.websiteUri ? 'yes' : 'no',
      p.websiteUri || '',
      p.nationalPhoneNumber || p.internationalPhoneNumber || '',
      p.formattedAddress || '',
      p.primaryTypeDisplayName?.text || '',
      p.businessStatus || '',
      p.googleMapsUri || '',
      p.id || ''
    ]
      .map(csvEscape)
      .join(',')
  );

  return [header.join(','), ...rows].join('\n');
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 概算コスト（Nearby Search Enterprise: 約$0.035/リクエスト, 為替¥155/$想定）
const COST_PER_REQUEST_JPY = 0.035 * 155;

// 1地域を走査してリードを返す。
async function scanRegion(apiKey, target, args, stamp) {
  const grid = buildGrid(target, args.step);
  console.log(`\n[${target.label}] グリッド ${grid.length}セル (step=${args.step}m) / 推定 ¥${Math.round(grid.length * COST_PER_REQUEST_JPY).toLocaleString()}`);

  if (args.dryRun) {
    return { ...target, requestCount: grid.length, allCount: 0, leadCount: 0, csvPath: null };
  }

  const seen = new Map();
  let requestCount = 0;

  for (const point of grid) {
    requestCount += 1;
    try {
      const places = await searchCell(apiKey, point, args.radius, args.types);
      for (const place of places) {
        if (place.id && !seen.has(place.id)) seen.set(place.id, place);
      }
      if (requestCount % 10 === 0) {
        process.stdout.write(`  ...${requestCount}/${grid.length}セル / ユニーク${seen.size}件\n`);
      }
    } catch (error) {
      console.warn(`  セル(${point.latitude},${point.longitude}) スキップ: ${error.message}`);
    }
    await sleep(args.delayMs);
  }

  const allPlaces = [...seen.values()];
  const leads = allPlaces
    .filter((p) => p.businessStatus !== 'CLOSED_PERMANENTLY')
    .filter((p) => isLead(p, args.maxReviews))
    .sort((a, b) => (a.userRatingCount || 0) - (b.userRatingCount || 0));

  const csv = toCsv(leads, args.maxReviews);
  const csvPath = path.resolve('data/leads', `saitama-${target.key}-${stamp}.csv`);
  await ensureDir(path.dirname(csvPath));
  await fs.writeFile(csvPath, csv, 'utf-8');

  console.log(`  → ${target.label}: 店舗${allPlaces.length}件 / リード${leads.length}件 → ${path.basename(csvPath)}`);
  return { ...target, requestCount, allCount: allPlaces.length, leadCount: leads.length, csvPath };
}

function printSummary(results, args) {
  const totalReq = results.reduce((s, r) => s + r.requestCount, 0);
  const totalLeads = results.reduce((s, r) => s + r.leadCount, 0);
  const ranked = [...results].sort((a, b) => b.leadCount - a.leadCount);

  console.log('\n==== サマリー（リード多い順 = 営業優先エリア） ====');
  for (const r of ranked) {
    const bar = '█'.repeat(Math.min(40, Math.round(r.leadCount / 5)));
    console.log(`  ${r.label.padEnd(8, '　')} リード${String(r.leadCount).padStart(4)}件  ${bar}`);
  }
  console.log('  --------------------------------------------------');
  console.log(`  合計リクエスト: ${totalReq}回  /  推定コスト: ¥${Math.round(totalReq * COST_PER_REQUEST_JPY).toLocaleString()}`);
  if (!args.dryRun) console.log(`  合計リード数  : ${totalLeads}件`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.listRegionsOnly) {
    console.log('利用可能な地域プリセット:');
    for (const { key, label } of listRegions()) {
      console.log(`  --region=${key.padEnd(10)} ${label}`);
    }
    console.log('\n例: npm run find:leads -- --all-regions');
    return;
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey && !args.dryRun) {
    console.error('環境変数 GOOGLE_MAPS_API_KEY が未設定です。.env に設定してください。');
    process.exit(1);
  }

  const targets = resolveTargets(args);
  const stamp = new Date().toISOString().slice(0, 10);

  console.log(`検索条件: types=${args.types.join(',')} / 口コミ${args.maxReviews}件以下 or website無し`);
  console.log(`対象地域: ${targets.map((t) => t.label).join(', ')}`);

  const results = [];
  for (const target of targets) {
    results.push(await scanRegion(apiKey, target, args, stamp));
  }

  if (targets.length > 1 || args.dryRun) {
    printSummary(results, args);
  }
}

main().catch((error) => {
  console.error('リード抽出に失敗しました:', error.message);
  process.exit(1);
});
