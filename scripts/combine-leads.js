import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

import { SAITAMA_WARDS } from './regions.js';

/**
 * find-leads.js が区ごとに出力した CSV を1つの統合CSVにまとめる。
 * - 区をまたぐ重複（place_id 一致）を除去
 * - 区の列を先頭に付与
 * - 住所は日本語（find-leads.js の languageCode=ja 前提）
 * - GoogleマップURLは店舗プロフィールに直接飛ぶ cid 形式に整形
 *
 * 使い方:
 *   npm run combine:leads               # 当日の区別CSVを統合
 *   npm run combine:leads -- 2026-06-20 # 日付指定
 */

function parseCsvLine(line) {
  const cells = [];
  let cur = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ',' && !inQuotes) {
      cells.push(cur);
      cur = '';
    } else cur += ch;
  }
  cells.push(cur);
  return cells;
}

function csvEscape(value) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// 長く不透明な googleMapsUri を、店舗に直接飛ぶ短い cid 形式へ整形。
function cleanMapsUrl(url) {
  const m = (url || '').match(/cid=(\d+)/);
  return m ? `https://maps.google.com/?cid=${m[1]}` : url || '';
}

async function main() {
  const date = process.argv[2] || new Date().toISOString().slice(0, 10);
  const leadsDir = path.resolve('data/leads');

  const header = ['区', '店名', '提案区分', '口コミ数', '評価', 'web有無', '電話', '住所', 'GoogleマップURL'];
  const out = [header];
  const seen = new Set();
  const perWard = {};

  for (const [key, info] of Object.entries(SAITAMA_WARDS)) {
    const filePath = path.join(leadsDir, `saitama-${key}-${date}.csv`);
    if (!existsSync(filePath)) continue;

    const raw = await fs.readFile(filePath, 'utf-8');
    const rows = raw.trim().split('\n').slice(1).map(parseCsvLine);

    let count = 0;
    for (const r of rows) {
      const placeId = r[11];
      if (placeId && seen.has(placeId)) continue; // 区をまたぐ重複を除去
      if (placeId) seen.add(placeId);
      // name,reason,review,rating,has_website,website,phone,address,category,status,maps,place_id
      out.push([info.label, r[0], r[1], r[2], r[3], r[4], r[6], r[7], cleanMapsUrl(r[10])]);
      count += 1;
    }
    perWard[info.label] = count;
  }

  if (out.length === 1) {
    console.error(`統合対象の区別CSVが見つかりません（data/leads/saitama-*-${date}.csv）。`);
    process.exit(1);
  }

  const csv = out.map((row) => row.map(csvEscape).join(',')).join('\n');
  const outputPath = path.join(leadsDir, `saitama-all-wards-${date}.csv`);
  await fs.writeFile(outputPath, csv, 'utf-8');

  console.log(`統合完了: ${outputPath}`);
  console.log(`ユニークリード数（重複除去後）: ${out.length - 1}`);
  console.log('区別（リード多い順 = 営業優先エリア）:');
  for (const [label, n] of Object.entries(perWard).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${label.padEnd(6, '　')} ${n}`);
  }
}

main().catch((error) => {
  console.error('統合に失敗しました:', error.message);
  process.exit(1);
});
