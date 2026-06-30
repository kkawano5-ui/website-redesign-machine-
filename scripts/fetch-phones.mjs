#!/usr/bin/env node
/**
 * place_id → Google Places 詳細API で「実際の電話番号」を取得して CSV 出力する。
 *  CRMの「電話」列は "有" フラグだけで実番号が無いため、架電用に番号を引く。
 *
 * 使い方（Macで実行。APIキーはスキャンで使ったGoogle Places キー）:
 *   export GOOGLE_MAPS_API_KEY=AIza...      # ←キーを環境変数で（推奨）
 *   node scripts/fetch-phones.mjs data/companies/crm-source.csv
 *   # または: npm run fetch:phones -- data/companies/crm-source.csv
 *
 * オプション:
 *   --key AIza...          キーを直接渡す（env未設定時）
 *   --out  path.csv        出力先（既定 data/outputs/phones.csv）
 *   --concurrency 10       同時リクエスト数（既定10）
 *   --language ja          表示言語（既定 ja）
 *   --limit 50             先頭N件だけ（動作確認用）
 *
 * 出力 CSV 列: place_id, 電話, 電話_国際, 店名, エリア, 業種, 既存website, status
 *   → 「電話」は B列。CRMの電話列(J)に VLOOKUP で流し込めます（手順は別途）。
 * 途中で失敗しても再実行すれば「取得済みはスキップ」して続きから取り直します。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// ---------- 引数 ----------
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const INPUT = argv.find((a) => !a.startsWith('--') && !/^AIza/.test(a)) || 'data/companies/crm-source.csv';
const KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY || opt('--key', argv.find((a) => /^AIza/.test(a)));
const OUT = opt('--out', 'data/outputs/phones.csv');
const CONCURRENCY = Math.max(1, Number(opt('--concurrency', '10')));
const LANG = opt('--language', 'ja');
const LIMIT = opt('--limit') ? Number(opt('--limit')) : Infinity;

if (!KEY || !/^AIza/.test(KEY)) {
  console.error('❌ Google Places APIキーが必要です。');
  console.error('   export GOOGLE_MAPS_API_KEY=AIza...   を設定するか、 --key AIza... を渡してください。');
  process.exit(1);
}

// ---------- 極小CSVパーサ（"..."内のカンマ/改行に対応） ----------
function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else {
      if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (c === '\r') { /* skip */ }
      else cell += c;
    }
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.length && r.some((v) => v !== ''));
}
const csvCell = (v) => {
  const s = String(v == null ? '' : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

// ---------- 入力読み込み ----------
if (!existsSync(INPUT)) { console.error('❌ 入力CSVが見つかりません:', INPUT); process.exit(1); }
const table = parseCSV(readFileSync(INPUT, 'utf8'));
const header = table[0].map((h) => h.trim());
const col = (names) => { for (const n of names) { const i = header.indexOf(n); if (i >= 0) return i; } return -1; };
const ci = {
  place_id: col(['place_id', 'placeId', 'PlaceID']),
  name: col(['店名', 'name', '会社名', '名称']),
  area: col(['エリア', 'area']),
  genre: col(['業種・種別', '業種', 'genre', '業種名']),
  web: col(['既存website', 'Web', 'website', 'site']),
};
if (ci.place_id < 0) { console.error('❌ place_id 列が見つかりません。ヘッダ:', header.join(' / ')); process.exit(1); }

const companies = [];
const seen = new Set();
for (let r = 1; r < table.length; r++) {
  const row = table[r];
  const pid = (row[ci.place_id] || '').trim();
  if (!pid || seen.has(pid)) continue;
  seen.add(pid);
  companies.push({
    place_id: pid,
    name: ci.name >= 0 ? (row[ci.name] || '').trim() : '',
    area: ci.area >= 0 ? (row[ci.area] || '').trim() : '',
    genre: ci.genre >= 0 ? (row[ci.genre] || '').trim() : '',
    web: ci.web >= 0 ? (row[ci.web] || '').trim() : '',
  });
  if (companies.length >= LIMIT) break;
}

// ---------- 既存出力から再開（取得済みはスキップ） ----------
const done = new Map(); // place_id -> result object
if (existsSync(OUT)) {
  const prev = parseCSV(readFileSync(OUT, 'utf8'));
  const ph = prev[0] || [];
  const pi = ph.indexOf('place_id'), pp = ph.indexOf('電話'), ps = ph.indexOf('status');
  for (let r = 1; r < prev.length; r++) {
    const pid = (prev[r][pi] || '').trim();
    const st = pp >= 0 ? (prev[r][ps] || '') : '';
    // OK か NOT_FOUND/NO_PHONE 等の確定結果だけ「済み」とみなす（ネットワーク失敗は再試行）
    if (pid && /^(OK|NO_PHONE|NOT_FOUND|ZERO_RESULTS|INVALID)/.test(st)) {
      done.set(pid, prev[r]);
    }
  }
}
const todo = companies.filter((c) => !done.has(c.place_id));
console.log(`対象 ${companies.length}社 / 取得済み ${done.size}社 / 今回取得 ${todo.length}社  (同時${CONCURRENCY})`);

// ---------- 取得本体 ----------
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const FIELDS = 'name,formatted_phone_number,international_phone_number,business_status';
async function fetchOne(c, attempt = 0) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json`
    + `?place_id=${encodeURIComponent(c.place_id)}`
    + `&fields=${FIELDS}&language=${LANG}&key=${KEY}`;
  try {
    const res = await fetch(url);
    if (res.status === 429 || res.status >= 500) throw new Error('http ' + res.status);
    const j = await res.json();
    if (j.status === 'OVER_QUERY_LIMIT') {
      if (attempt < 5) { await sleep(1000 * 2 ** attempt); return fetchOne(c, attempt + 1); }
      return { ...c, phone: '', intl: '', status: 'OVER_QUERY_LIMIT' };
    }
    if (j.status === 'REQUEST_DENIED') {
      console.error('❌ REQUEST_DENIED:', j.error_message || '(キー権限/Places API有効化を確認)');
      process.exitCode = 2; return { ...c, phone: '', intl: '', status: 'DENIED' };
    }
    if (j.status === 'NOT_FOUND' || j.status === 'ZERO_RESULTS') return { ...c, phone: '', intl: '', status: j.status };
    if (j.status !== 'OK') return { ...c, phone: '', intl: '', status: 'INVALID:' + j.status };
    const phone = (j.result?.formatted_phone_number || '').trim();
    const intl = (j.result?.international_phone_number || '').trim();
    const nm = (j.result?.name || c.name || '').trim();
    return { ...c, name: nm, phone, intl, status: phone || intl ? 'OK' : 'NO_PHONE' };
  } catch (e) {
    if (attempt < 4) { await sleep(800 * 2 ** attempt); return fetchOne(c, attempt + 1); }
    return { ...c, phone: '', intl: '', status: 'NETERR' };
  }
}

// ---------- 出力（全件まとめて書く。途中保存も） ----------
const HEAD = ['place_id', '電話', '電話_国際', '店名', 'エリア', '業種', '既存website', 'status'];
function writeOut(map) {
  const lines = [HEAD.join(',')];
  // 入力順を維持
  for (const c of companies) {
    const row = map.get(c.place_id);
    if (!row) continue;
    if (Array.isArray(row)) { lines.push(row.map(csvCell).join(',')); continue; }
    lines.push([row.place_id, row.phone, row.intl, row.name, row.area, row.genre, row.web, row.status].map(csvCell).join(','));
  }
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, lines.join('\n') + '\n');
}

// ---------- 並列実行プール ----------
let i = 0, ok = 0, noph = 0, fail = 0, processed = 0;
const results = new Map(done);
async function worker() {
  while (i < todo.length) {
    const c = todo[i++];
    const r = await fetchOne(c);
    results.set(c.place_id, r);
    processed++;
    if (r.status === 'OK') ok++; else if (r.status === 'NO_PHONE') noph++; else if (!/NOT_FOUND|ZERO_RESULTS/.test(r.status)) fail++;
    if (processed % 50 === 0) { writeOut(results); process.stdout.write(`\r  ${processed}/${todo.length} 取得中… (OK:${ok} 番号なし:${noph} 失敗:${fail})   `); }
  }
}
const t0 = Date.now();
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length || 1) }, worker));
writeOut(results);

const got = Array.from(results.values()).filter((r) => (Array.isArray(r) ? r[1] : r.phone)).length;
console.log(`\n\n✅ 完了: ${OUT}`);
console.log(`   電話番号あり: ${got} / 全${companies.length}社`);
console.log(`   今回 OK:${ok}  番号なし:${noph}  要再試行(失敗):${fail}  （${((Date.now() - t0) / 1000).toFixed(0)}秒）`);
if (fail > 0) console.log('   ※ 失敗があれば同じコマンドを再実行すると、失敗分だけ取り直します。');
