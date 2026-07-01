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
 *   --limit 50             入力の先頭N件だけ読む（動作確認用）
 *   --daily 300            未処理のうち今回はN件だけ取得して終了（毎日ドリップ用）
 *                          無料枠(10,000/月/SKU ≒ 1日333件)内に自動で収めるための件数制限。
 *   --priority / --no-priority   優先度スコア順に叩く（既定ON）。業界ティア×サイト有無×口コミ×エリア。
 *                          「サービス業(美容/治療院/エステ/歯科)→サイト無し飲食→士業」の順で上位から。
 *   --reenrich             取得済みでも「website/★/口コミ実数/営業状態」が未取得の行を取り直す。
 *                          電話取得と同じ1回のAPI呼び出しで実測データを足す（追加課金ゼロ＝同一Enterprise SKU）。
 *
 * 出力 CSV 列(A〜H は据え置き=シートのVLOOKUPを壊さない):
 *   A place_id, B 電話, C 電話_国際, D 店名, E エリア, F 業種, G 既存website, H status,
 *   I 優先度, J website実測, K ★評価, L 口コミ実数, M 営業状態, N enriched
 *   → 「電話」は B列。CRMの電話列に VLOOKUP で流し込めます。優先度(I)で並べ替えると「叩く順」。
 * 途中で失敗しても再実行すれば「取得済みはスキップ」して続きから取り直します。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// ---------- 引数 ----------
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
// 値を取るフラグ（--out の次の "path" などを入力CSVと誤認しないため、その位置を除外）
const VALUE_FLAGS = new Set(['--key', '--out', '--concurrency', '--language', '--limit', '--daily']);
const consumed = new Set();
for (let i = 0; i < argv.length; i++) if (VALUE_FLAGS.has(argv[i])) consumed.add(i + 1);
const INPUT = argv.find((a, i) => !a.startsWith('--') && !consumed.has(i) && !/^AIza/.test(a)) || 'data/companies/crm-source.csv';
const KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY || opt('--key', argv.find((a) => /^AIza/.test(a)));
const OUT = opt('--out', 'data/outputs/phones.csv');
const CONCURRENCY = Math.max(1, Number(opt('--concurrency', '10')));
const LANG = opt('--language', 'ja');
const LIMIT = opt('--limit') ? Number(opt('--limit')) : Infinity;
const DAILY = opt('--daily') ? Math.max(0, Number(opt('--daily'))) : Infinity;
const PRIORITY = !argv.includes('--no-priority'); // 既定ON（優先度スコア順に叩く）
const REENRICH = argv.includes('--reenrich');      // 取得済みでも実測データ未取得なら取り直す

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
  kuchi: col(['口コミ', '口コミ数', 'reviews', 'レビュー数']),
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
    kuchi: ci.kuchi >= 0 ? (row[ci.kuchi] || '').trim() : '',
  });
  if (companies.length >= LIMIT) break;
}

// ---------- 優先度スコアリング（誰から叩くか＝あてずっぽうにしない）----------
// 方針: サービス業ファースト（美容→治療院→エステ→歯科）→ サイト無し飲食 → 士業。
//       業種内では「サイト無し × 口コミが少し動いてる(1〜50)＝手が回ってないオーナー」を上に。
// ※ ここの数値・リストは自由に編集可。編集すれば翌日のドリップ順に即反映されます。
const SERVICE_WEIGHT = { '美容': 100, '治療院': 96, 'エステ': 92, '歯科': 88, '美容医療': 100, 'ネイルサロン': 100, '整体': 96, '接骨院': 96, '鍼灸': 96 };
const SHIGYO = ['税理士', '司法書士', '行政書士', '社会保険労務士', '弁護士', '弁護士 法律事務所', '会計事務所', '会計', '弁理士', '中小企業診断士', '士業', '行政書士事務所', '法律事務所'];
// 営業対象外（公共・非商用・大箱）。ここは最初から叩かない＝API節約。
const EXCLUDE_GENRE = new Set(['官公庁', '政府機関', '協会/組織', '学校', '教育機関', 'ショッピング モール', '共同オフィス', '企業のオフィス', '卸売業', 'ディスカウント スーパー', 'ドラッグストア', '書店', 'クリーニング店', 'インターネット カフェ', '図書館']);
const reviewsOf = (c) => { const v = (c.kuchi || '').replace(/[^0-9]/g, ''); return v === '' ? -1 : +v; }; // -1=数値なし
function industryWeight(genre) {
  const g = (genre || '').trim();
  if (EXCLUDE_GENRE.has(g)) return null;           // 除外（叩かない）
  if (SERVICE_WEIGHT[g] != null) return SERVICE_WEIGHT[g];
  if (SHIGYO.includes(g)) return 40;               // 士業（Web制作の的だがMEO弱め＝後段）
  return 55;                                       // その他＝飲食など
}
function customerSignal(c) {
  let s = 0;
  if ((c.web || '').trim() === '') s += 30;        // サイト無し＝Web提案の的
  const rev = reviewsOf(c);
  if (rev >= 1 && rev <= 50) s += 20;              // 気にしてるが手が回ってない＝ホット
  else if (rev > 50 && rev <= 200) s += 5;
  else if (rev > 200) s -= 10;                     // 繁盛店・ネット強者は後回し（難易度高）
  return s;                                        // rev===-1(数値なし)は加点なし＝業種重みで判断
}
function priorityScore(c) {
  const iw = industryWeight(c.genre);
  if (iw == null) return null;                     // 除外
  return iw + customerSignal(c);
}
for (const c of companies) { c._score = priorityScore(c); }

// ---------- 出力ヘッダ（A〜H は据え置き＝シートのVLOOKUPを壊さない。I以降に追記）----------
const HEAD = ['place_id', '電話', '電話_国際', '店名', 'エリア', '業種', '既存website', 'status', '優先度', 'website実測', '★評価', '口コミ実数', '営業状態', 'enriched'];

// ---------- 既存出力から再開（取得済みはスキップ／--reenrichで実測未取得だけ取り直す）----------
const done = new Map();    // place_id -> HEADに揃えた配列（今回は再取得しない＝確定）
const prevAll = new Map(); // place_id -> 同上（再取得対象も含む全既存行。失敗時の保全用フォールバック）
if (existsSync(OUT)) {
  const prev = parseCSV(readFileSync(OUT, 'utf8'));
  const ph = prev[0] || [];
  const pi = ph.indexOf('place_id'), ps = ph.indexOf('status'), pe = ph.indexOf('enriched');
  for (let r = 1; r < prev.length; r++) {
    const pid = (prev[r][pi] || '').trim();
    if (!pid) continue;
    const st = ps >= 0 ? (prev[r][ps] || '') : '';
    if (!/^(OK|NO_PHONE|NOT_FOUND)/.test(st)) continue; // DENIED/NETERR等は取り直す
    // 旧フォーマット(8列)でも新HEADの並びに正規化して保持（列ずれ防止）
    const normalized = HEAD.map((name) => { const idx = ph.indexOf(name); return idx >= 0 ? (prev[r][idx] || '') : ''; });
    prevAll.set(pid, normalized); // 既存データは必ず控える（再取得が失敗しても電話を失わないため）
    const enriched = pe >= 0 ? (prev[r][pe] || '') : '';
    // --reenrich: OK/NO_PHONEで実測(enriched)が無い行は「未処理」扱いで取り直す（NOT_FOUNDは中身が無いので対象外）
    if (REENRICH && /^(OK|NO_PHONE)/.test(st) && enriched !== '1') continue;
    done.set(pid, normalized);
  }
}

// ---------- 今回の対象を決める（除外を弾き、優先度スコア順に並べ、--dailyで件数を絞る）----------
const excludedCount = companies.filter((c) => c._score == null).length;
const remaining = companies.filter((c) => !done.has(c.place_id) && c._score != null);
if (PRIORITY) {
  remaining.sort((a, b) => (b._score - a._score) || a.area.localeCompare(b.area, 'ja') || a.name.localeCompare(b.name, 'ja'));
}
const todo = Number.isFinite(DAILY) ? remaining.slice(0, DAILY) : remaining;
const orderLabel = PRIORITY ? '優先度順' : '入力順';
const dailyLabel = Number.isFinite(DAILY) ? `・1日${DAILY}件` : '';
console.log(`対象 ${companies.length}社（除外 ${excludedCount}社）/ 済み ${done.size}社 / 未処理 ${remaining.length}社 → 今回 ${todo.length}社（${orderLabel}${dailyLabel}・同時${CONCURRENCY}）${REENRICH ? ' [reenrich]' : ''}`);
if (remaining.length === 0) console.log('🎉 未処理なし。全社ぶん揃っています。');
else if (todo.length < remaining.length) console.log(`   残り ${remaining.length - todo.length}社は次回以降に続きから取得します。`);
if (PRIORITY && todo.length) console.log(`   叩く先頭3件: ${todo.slice(0, 3).map((c) => `${c.genre || '?'}/${c.area || '?'}(${c._score})`).join('  ')}`);

// ---------- 取得本体 ----------
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
// Places API (New) の Place Details を使用（このプロジェクトは新APIのみ有効）。
// 電話番号(Enterprise SKU)と同じ呼び出しで website/★/口コミ数/営業状態も取得。
// 課金は「1回のうち最上位フィールドのSKU」で決まるため、Enterprise内のこれらを足しても追加課金ゼロ。
const FIELD_MASK = 'id,displayName,nationalPhoneNumber,internationalPhoneNumber,websiteUri,rating,userRatingCount,businessStatus';
async function fetchOne(c, attempt = 0) {
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(c.place_id)}?languageCode=${LANG}`;
  try {
    const res = await fetch(url, {
      headers: { 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': FIELD_MASK },
    });
    if (res.status === 429 || res.status >= 500) throw new Error('http ' + res.status);
    const j = await res.json().catch(() => ({}));
    if (res.status === 403) {
      console.error('❌ PERMISSION_DENIED:', j.error?.message || '(キー権限 / Places API (New) 有効化 / 課金 を確認)');
      process.exitCode = 2; return { ...c, phone: '', intl: '', status: 'DENIED' };
    }
    if (res.status === 404) return { ...c, phone: '', intl: '', status: 'NOT_FOUND' };
    if (!res.ok || j.error) {
      const st = j.error?.status || ('HTTP' + res.status);
      if (/RESOURCE_EXHAUSTED|UNAVAILABLE/.test(st) && attempt < 5) { await sleep(1000 * 2 ** attempt); return fetchOne(c, attempt + 1); }
      return { ...c, phone: '', intl: '', status: 'INVALID:' + st };
    }
    const phone = (j.nationalPhoneNumber || '').trim();
    const intl = (j.internationalPhoneNumber || '').trim();
    const nm = (j.displayName?.text || c.name || '').trim();
    const website = (j.websiteUri || '').trim();
    const rating = j.rating != null ? j.rating : '';
    const reviews = j.userRatingCount != null ? j.userRatingCount : '';
    const bstatus = j.businessStatus || '';
    return { ...c, name: nm, phone, intl, website, rating, reviews, bstatus, enriched: '1', status: phone || intl ? 'OK' : 'NO_PHONE' };
  } catch (e) {
    if (attempt < 4) { await sleep(800 * 2 ** attempt); return fetchOne(c, attempt + 1); }
    return { ...c, phone: '', intl: '', status: 'NETERR' };
  }
}

// ---------- 出力（全件まとめて書く。途中保存も。HEADは上部で定義済み）----------
function writeOut(map) {
  const lines = [HEAD.join(',')];
  // 入力順を維持（並べ替えは「優先度」列でシート側でも可能）
  for (const c of companies) {
    const row = map.get(c.place_id);
    if (!row) continue;
    if (Array.isArray(row)) { lines.push(row.map(csvCell).join(',')); continue; }
    lines.push([
      row.place_id, row.phone, row.intl, row.name, row.area, row.genre, row.web, row.status,
      row._score == null ? '' : row._score, row.website || '', row.rating ?? '', row.reviews ?? '', row.bstatus || '', row.enriched || '',
    ].map(csvCell).join(','));
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
    const failed = !/^(OK|NO_PHONE|NOT_FOUND)/.test(r.status); // DENIED/NETERR/INVALID等
    // 再取得が失敗しても既存データ（電話・実測）は消さない。次回また拾って取り直す。
    if (failed && prevAll.has(c.place_id)) results.set(c.place_id, prevAll.get(c.place_id));
    else results.set(c.place_id, r);
    processed++;
    if (r.status === 'OK') ok++; else if (r.status === 'NO_PHONE') noph++; else if (!/NOT_FOUND|ZERO_RESULTS/.test(r.status)) fail++;
    if (processed % 50 === 0) { writeOut(results); process.stdout.write(`\r  ${processed}/${todo.length} 取得中… (OK:${ok} 番号なし:${noph} 失敗:${fail})   `); }
  }
}
const t0 = Date.now();
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length || 1) }, worker));
writeOut(results);

const vals = Array.from(results.values());
const got = vals.filter((r) => (Array.isArray(r) ? r[1] : r.phone)).length;
const enrichedN = vals.filter((r) => (Array.isArray(r) ? r[13] === '1' : r.enriched === '1')).length;
const webN = vals.filter((r) => (Array.isArray(r) ? (r[9] || '') !== '' : (r.website || '') !== '')).length;
console.log(`\n\n✅ 完了: ${OUT}`);
console.log(`   電話番号あり: ${got} / 全${companies.length}社 ｜ 実測エンリッチ済み ${enrichedN}社（うちwebsite実在 ${webN}社）`);
console.log(`   今回 OK:${ok}  番号なし:${noph}  要再試行(失敗):${fail}  （${((Date.now() - t0) / 1000).toFixed(0)}秒）`);
if (fail > 0) console.log('   ※ 失敗があれば同じコマンドを再実行すると、失敗分だけ取り直します。');
