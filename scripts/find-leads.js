import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config';

import { ensureDir } from './utils.js';

/**
 * さいたま市の飲食店を Google Places API (New) で走査し、
 * 「website未登録」または「口コミ10件以下」の店舗を営業リードとして抽出する。
 *
 * 使い方:
 *   GOOGLE_MAPS_API_KEY=xxxx npm run find:leads
 *   npm run find:leads -- --max-reviews=5 --step=500 --types=restaurant,cafe
 *
 * 環境変数:
 *   GOOGLE_MAPS_API_KEY  必須。Places API (New) を有効化したキー。
 */

const NEARBY_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchNearby';

// さいたま市のおおよその外接矩形（10区をカバー）。必要に応じて絞り込む。
const DEFAULT_BBOX = {
  south: 35.82,
  west: 139.55,
  north: 35.99,
  east: 139.73
};

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
    bbox: { ...DEFAULT_BBOX },
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
      case 'south':
        args.bbox.south = Number(value);
        break;
      case 'west':
        args.bbox.west = Number(value);
        break;
      case 'north':
        args.bbox.north = Number(value);
        break;
      case 'east':
        args.bbox.east = Number(value);
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error('環境変数 GOOGLE_MAPS_API_KEY が未設定です。.env に設定してください。');
    process.exit(1);
  }

  const grid = buildGrid(args.bbox, args.step);
  console.log(`検索条件: types=${args.types.join(',')} / 口コミ${args.maxReviews}件以下 or website無し`);
  console.log(`グリッド: ${grid.length} セル (step=${args.step}m, radius=${args.radius}m)`);
  console.log(`推定リクエスト数: ${grid.length} 回\n`);

  if (args.dryRun) {
    console.log('--dry-run 指定のため、API呼び出しは行いません。');
    return;
  }

  const seen = new Map(); // place_id -> place
  let requestCount = 0;

  for (const point of grid) {
    requestCount += 1;
    try {
      const places = await searchCell(apiKey, point, args.radius, args.types);
      for (const place of places) {
        if (place.id && !seen.has(place.id)) {
          seen.set(place.id, place);
        }
      }
      if (requestCount % 10 === 0) {
        process.stdout.write(
          `  ...${requestCount}/${grid.length} セル走査済 / ユニーク店舗 ${seen.size}件\n`
        );
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
  const stamp = new Date().toISOString().slice(0, 10);
  const outputPath = path.resolve('data/leads', `saitama-restaurants-${stamp}.csv`);
  await ensureDir(path.dirname(outputPath));
  await fs.writeFile(outputPath, csv, 'utf-8');

  console.log(`\n完了:`);
  console.log(`  走査セル数      : ${requestCount}`);
  console.log(`  ユニーク店舗数  : ${allPlaces.length}`);
  console.log(`  営業リード数    : ${leads.length}`);
  console.log(`  出力            : ${outputPath}`);
}

main().catch((error) => {
  console.error('リード抽出に失敗しました:', error.message);
  process.exit(1);
});
