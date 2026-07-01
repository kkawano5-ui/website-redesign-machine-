#!/usr/bin/env node
/**
 * ホットペッパービューティーのサロンURLから、デモ用の「上書きJSON」を自動生成する。
 *  取得 → 解析（店名/住所/営業/メニュー/口コミ/スタッフ/客層）→ Places APIでplace_id解決
 *  → data/overrides/<place_id>.json を書き出す。以後は generate → deploy でそのデモが専用サイト化。
 *
 *  ※ 実行は「あなたのMac」で（サンドボックスからHPに出られないため）。
 *
 * 使い方:
 *   export GOOGLE_MAPS_API_KEY=AIza...            # place_id解決に使用（電話取得と同じキー）
 *   node scripts/fetch-hotpepper.mjs "https://beauty.hotpepper.jp/kr/slnH000299515/"
 *   # または: npm run fetch:hotpepper -- "<URL>"
 *
 * オプション:
 *   --place-id ChIJ...   place_id を手動指定（自動解決をスキップ）
 *   --label "ネイルサロン" 表示業種ラベル（既定は自動推定）
 *   --area  北千住        エリア名（既定はURL種別/住所から推定）
 *   --out   path.json     出力先（既定 data/overrides/<place_id>.json）
 *
 * うまく取れない項目があれば、保存される data/overrides/_raw/<id>.html を送ってください。
 * こちらで精密に解析を合わせ込みます（生HTMLさえあれば外部通信なしで直せます）。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const URL_IN = argv.find((a) => /^https?:\/\//.test(a));
const KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY || opt('--key');
const FORCE_PID = opt('--place-id');
const LABEL_IN = opt('--label');
const AREA_IN = opt('--area');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';

if (!URL_IN) { console.error('❌ ホットペッパーのサロンURLを渡してください。例: node scripts/fetch-hotpepper.mjs "https://beauty.hotpepper.jp/kr/slnH000299515/"'); process.exit(1); }

// ---------- HTMLユーティリティ ----------
const decode = (s) => String(s || '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
const strip = (h) => decode(String(h || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ')).replace(/[ \t]+/g, ' ').replace(/\n /g, '\n').trim();
const clean = (s) => strip(s).replace(/\n{2,}/g, ' / ').replace(/\s+/g, ' ').trim();
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// <th>ラベル</th><td>値</td> / <dt>ラベル</dt><dd>値</dd> を横断で拾う
function rowVal(html, label) {
  const pats = [
    new RegExp('<th[^>]*>[\\s\\S]{0,40}?' + escRe(label) + '[\\s\\S]{0,20}?</th>\\s*<td[^>]*>([\\s\\S]*?)</td>', 'i'),
    new RegExp('<dt[^>]*>[\\s\\S]{0,40}?' + escRe(label) + '[\\s\\S]{0,20}?</dt>\\s*<dd[^>]*>([\\s\\S]*?)</dd>', 'i'),
  ];
  for (const re of pats) { const m = html.match(re); if (m) return clean(m[1]); }
  return '';
}

async function fetchText(url) {
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': UA, 'Accept-Language': 'ja' } });
    if (!res.ok) return '';
    return await res.text();
  } catch { return ''; }
}

// ---------- place_id 解決（Places API New / Text Search） ----------
async function resolvePlaceId(query) {
  if (!KEY) return null;
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location' },
      body: JSON.stringify({ languageCode: 'ja', regionCode: 'JP', textQuery: query }),
    });
    const j = await res.json();
    return j.places && j.places[0] ? j.places[0] : null;
  } catch { return null; }
}

// ---------- メイン ----------
const base = (URL_IN.match(/^(https?:\/\/beauty\.hotpepper\.jp\/[a-z]{0,3}\/?sln[A-Za-z0-9]+)/) || [])[1];
if (!base) { console.error('❌ ホットペッパーのサロンURL形式ではありません:', URL_IN); process.exit(1); }
const salonId = (base.match(/sln[A-Za-z0-9]+/) || [''])[0];
const top = base + '/';

console.log('取得中:', top);
const [htmlTop, htmlCoupon, htmlMenu, htmlReview, htmlStylist, htmlStaff] = await Promise.all([
  fetchText(top),
  fetchText(top + 'coupon/'), fetchText(top + 'menu/'),
  fetchText(top + 'review/'), fetchText(top + 'stylist/'), fetchText(top + 'staff/'),
]);
if (!htmlTop) { console.error('❌ ページ取得に失敗しました（HP側のブロック/URL誤り/ネットワーク）。UAやネット環境をご確認ください。'); process.exit(1); }

// 生HTML保存（外した時の精密調整用）
const rawDir = 'data/overrides/_raw';
mkdirSync(rawDir, { recursive: true });
writeFileSync(`${rawDir}/${salonId}_top.html`, htmlTop);
const htmlMenuBest = (htmlCoupon && htmlCoupon.length > 2000) ? htmlCoupon : htmlMenu;
if (htmlMenuBest) writeFileSync(`${rawDir}/${salonId}_menu.html`, htmlMenuBest);
if (htmlReview) writeFileSync(`${rawDir}/${salonId}_review.html`, htmlReview);
const htmlStaffBest = (htmlStylist && htmlStylist.length > 1500) ? htmlStylist : htmlStaff;
if (htmlStaffBest) writeFileSync(`${rawDir}/${salonId}_staff.html`, htmlStaffBest);

// --- 店名 ---
let name = '';
const t = (htmlTop.match(/<title>([^<]*)<\/title>/i) || [])[1] || '';
name = clean(t.split(/[｜|]/)[0]).replace(/\s*のサロン情報.*$/, '').trim();
const h1 = (htmlTop.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1];
if (h1) { const n = clean(h1); if (n && n.length <= 40) name = n; }

// --- キャッチコピー ---
let catchCopy = '';
const cm = htmlTop.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
if (cm) catchCopy = decode(cm[1]).trim();

// --- サロンデータ（ラベル一致で抽出）---
const address = rowVal(htmlTop, '住所');
const access = rowVal(htmlTop, 'アクセス') || rowVal(htmlTop, '道案内');
const hours = rowVal(htmlTop, '営業時間');
const closed = rowVal(htmlTop, '定休日');
const payment = rowVal(htmlTop, '支払');
const parking = rowVal(htmlTop, '駐車場') || rowVal(htmlTop, '駐輪');
const featuresRaw = rowVal(htmlTop, 'こだわり');
const features = featuresRaw ? featuresRaw.split(/[／\/・|]/).map((s) => s.trim()).filter((s) => s && s.length <= 18).slice(0, 10) : [];
const staffCount = rowVal(htmlTop, 'スタッフ数');

// --- 平均予約金額・予約比率 ---
const avgPrice = (strip(htmlTop).match(/2回目以降来店\s*([¥￥][\d,]+\s*[〜～]\s*[¥￥]?[\d,]+)/) || [])[1] || '';
const female = (strip(htmlTop).match(/女性\s*([\d]{1,3}%)/) || [])[1] || '';
const ageM = strip(htmlTop).match(/20代\s*(\d{1,3}%)[\s\S]{0,20}?30代\s*(\d{1,3}%)[\s\S]{0,20}?40代\s*(\d{1,3}%)[\s\S]{0,40}?50代[〜～]?\s*(\d{1,3}%)/);
const ages = ageM ? `20代${ageM[1]}・30代${ageM[2]}・40代${ageM[3]}・50代〜${ageM[4]}` : '';

// --- 口コミ評価・件数 ---
const rating = (strip(htmlTop).match(/([0-5]\.\d{1,2})\s*[（(]?\s*(\d+)\s*件/) || [])[1] || '';
const reviewCount = (strip(htmlTop).match(/([0-5]\.\d{1,2})\s*[（(]?\s*(\d+)\s*件/) || [])[2]
  || (strip(htmlReview).match(/(\d+)\s*件の口コミ/) || [])[1] || '';

// --- メニュー（グループ見出し＋アイテム名の¥価格を拾う簡易版）---
const menu = [];
if (htmlMenuBest) {
  const txt = strip(htmlMenuBest);
  const lines = txt.split('\n').map((s) => s.trim()).filter(Boolean);
  const items = [];
  for (const ln of lines) {
    const pm = ln.match(/([¥￥][\d,]+\s*[〜～]?|\/\s*[\d,]+\s*[〜～]?)/);
    if (pm && ln.length <= 80 && !/クーポン|ポイント|検索|絞り込/.test(ln)) {
      const price = pm[0].replace(/^\//, '¥').replace(/\s+/g, '');
      const nm = ln.replace(pm[0], '').replace(/[\/：:]\s*$/, '').trim();
      if (nm && nm.length >= 4) items.push({ name: nm.slice(0, 60), price, desc: '' });
    }
  }
  // 重複除去
  const seen = new Set();
  const uniq = items.filter((it) => { const k = it.name + it.price; if (seen.has(k)) return false; seen.add(k); return true; });
  if (uniq.length) menu.push({ group: 'メニュー', items: uniq.slice(0, 14) });
}

// --- 口コミ本文（数件）---
const voices = [];
if (htmlReview) {
  const blocks = htmlReview.split(/投稿日/).slice(1, 8);
  for (const b of blocks) {
    const dm = b.match(/(\d{4}\/\d{1,2}\/\d{1,2})/);
    const bt = strip(b);
    const body = bt.replace(/^[\]\s：:]*\d{4}\/\d{1,2}\/\d{1,2}/, '').replace(/総合\s*\d[\s\S]*?料金\s*\d/, '')
      .replace(/予約時のクーポン[\s\S]*$/, '').replace(/クーポン利用[\s\S]*$/, '').trim();
    const text = body.split('\n').map((s) => s.trim()).filter((s) => s.length >= 12).slice(0, 2).join(' ');
    if (text && text.length >= 15) voices.push({ text: text.slice(0, 160), who: 'ホットペッパー口コミ', date: dm ? dm[1] : '' });
    if (voices.length >= 4) break;
  }
}

// --- スタッフ（1人目）---
let staff = null;
if (htmlStaffBest) {
  const st = strip(htmlStaffBest);
  const yrs = (st.match(/歴\s*(\d+)\s*年/) || [])[0] || '';
  const nm = (htmlStaffBest.match(/<h[23][^>]*>([^<]{1,24})<\/h[23]>/i) || [])[1];
  if (nm) staff = { name: clean(nm), role: yrs ? `スタッフ（${yrs}）` : 'スタッフ', comment: '' };
}

// --- エリア/ラベル推定 ---
const area = AREA_IN || (access.match(/([^\s、。]+?駅)/) || [])[1] || (address.match(/([^\s、]+?[区市町村])/) || [])[1] || '';
const label = LABEL_IN || (/\/kr\//.test(URL_IN) ? 'ネイル・アイビューティー' : /\/CSP|\/slnH/.test(URL_IN) ? 'サロン' : 'サロン');

// --- place_id 解決 ---
let placeId = FORCE_PID || '';
let resolved = null;
if (!placeId) {
  const q = [name, area, address].filter(Boolean).join(' ');
  resolved = await resolvePlaceId(q);
  placeId = resolved ? resolved.id : '';
}

// --- override 組み立て ---
const override = {
  _place_id: placeId || '(未解決)',
  _source: 'HOT PEPPER Beauty（自動取得）',
  _hotpepper: top,
  name, label, area,
  catch: catchCopy,
  rating, reviewCount: reviewCount ? Number(reviewCount) : undefined,
  ratingSource: 'ホットペッパービューティー',
  menu: menu.length ? menu : undefined,
  staff: staff || undefined,
  voices: voices.length ? voices : undefined,
  stats: (female || ages || avgPrice) ? { female, ages, avgPrice } : undefined,
  info: { address, access, hours, closed, payment, parking, features },
  cta: { label: '予約・お問い合わせ', tel: '', channels: '', note: '' },
};
if (resolved && resolved.location) override.map = { lat: resolved.location.latitude, lng: resolved.location.longitude };
Object.keys(override).forEach((k) => override[k] === undefined && delete override[k]);

// --- 出力 ---
const outPath = opt('--out', placeId ? `data/overrides/${placeId}.json` : `data/overrides/_draft_${salonId}.json`);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(override, null, 2) + '\n');

// --- レポート ---
const ok = (v) => (v && (Array.isArray(v) ? v.length : true) ? '✅' : '⚠️ 空');
console.log('\n==== 取得レポート ====');
console.log(`  店名        ${ok(name)}  ${name}`);
console.log(`  place_id    ${ok(placeId && placeId !== '(未解決)')}  ${placeId}${resolved ? ' ('+clean(resolved.formattedAddress||'')+')' : ''}`);
console.log(`  ラベル/エリア ${ok(label)} / ${ok(area)}  ${label} / ${area}`);
console.log(`  住所        ${ok(address)}  ${address}`);
console.log(`  営業時間    ${ok(hours)}  ${hours}`);
console.log(`  定休日      ${ok(closed)}  ${closed}`);
console.log(`  支払い      ${ok(payment)}`);
console.log(`  こだわり    ${ok(features)}  (${features.length}件)`);
console.log(`  評価/件数   ${ok(rating)} ${rating} / ${reviewCount}`);
console.log(`  メニュー    ${ok(menu.length && menu[0].items)}  ${menu.length ? menu[0].items.length + '件' : 0}`);
console.log(`  口コミ      ${ok(voices)}  ${voices.length}件`);
console.log(`  スタッフ    ${ok(staff)}  ${staff ? staff.name : ''}`);
console.log(`  客層        ${ok(female)} 女性${female} / ${ages}`);
console.log(`\n出力: ${outPath}`);
console.log(`生HTML: ${rawDir}/${salonId}_*.html （取りこぼしがあればこれを送ってください＝精密に直せます）`);
if (!placeId || placeId === '(未解決)') console.log('⚠️ place_idが未解決です。--place-id で指定するか、GOOGLE_MAPS_API_KEY を設定して再実行してください。');
console.log('\n次: 中身を確認・微修正 → npm run generate:sites … → deploy でデモに反映されます。');
