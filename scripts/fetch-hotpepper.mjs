#!/usr/bin/env node
/**
 * ホットペッパービューティーのサロンURLから、デモ用の「上書きJSON」を自動生成する。
 *  取得 → 解析（店名/住所/営業/メニュー/口コミ/スタッフ/客層/電話/地図）
 *  → Places APIでplace_id解決 → data/overrides/<place_id>.json を書き出す。
 *  以後は generate → deploy でそのデモが専用サイト化。
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
 *   --label "ネイルサロン" 表示業種ラベル
 *   --area  北千住        エリア名
 *   --out   path.json     出力先
 *   --html-dir dir        取得済みHTML(_top/_menu/_staff/_review.html)を使う（オフライン再解析）
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { dirname } from 'node:path';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const URL_IN = argv.find((a) => /^https?:\/\//.test(a));
const KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY || opt('--key');
const FORCE_PID = opt('--place-id');
const LABEL_IN = opt('--label');
const AREA_IN = opt('--area');
const HTML_DIR = opt('--html-dir'); // オフライン再解析用
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';

// ---------- HTMLユーティリティ ----------
const decode = (s) => String(s || '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
const strip = (h) => decode(String(h || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ')).replace(/[ \t]+/g, ' ').replace(/\n /g, '\n').trim();
const clean = (s) => strip(s).replace(/\n{2,}/g, ' / ').replace(/\s+/g, ' ').trim();
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const yen = (s) => String(s || '').replace(/￥/g, '¥').replace(/～/g, '〜').replace(/\s+/g, '');

function rowVal(html, label) {
  const re = new RegExp('<th[^>]*>[\\s\\S]{0,40}?' + escRe(label) + '[\\s\\S]{0,20}?</th>\\s*<td[^>]*>([\\s\\S]*?)</td>', 'i');
  const m = html.match(re); return m ? clean(m[1]) : '';
}
function firstMatch(html, re) { const m = html.match(re); return m ? clean(m[1]) : ''; }
function jsonLdBlocks(html) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { out.push(JSON.parse(m[1].trim())); } catch { /* skip */ }
  }
  return out;
}

async function fetchText(url) {
  try { const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': UA, 'Accept-Language': 'ja' } }); return res.ok ? await res.text() : ''; }
  catch { return ''; }
}
async function resolvePlaceId(query) {
  if (!KEY) return null;
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location' },
      body: JSON.stringify({ languageCode: 'ja', regionCode: 'JP', textQuery: query }),
    });
    const j = await res.json(); return j.places && j.places[0] ? j.places[0] : null;
  } catch { return null; }
}

// ---------- 解析（実HTML構造にキャリブレーション済み）----------
export function parseHotpepper(htmlTop, htmlMenu, htmlStaff, htmlReview, ctx = {}) {
  const blocks = jsonLdBlocks(htmlTop);
  const salon = blocks.find((b) => b && typeof b['@type'] === 'string' && /Salon/i.test(b['@type'])) || {};
  const graph = blocks.find((b) => b && b.salonGenderPercentages) || null;

  // 店名（detailTitle > og:title > title）
  let name = firstMatch(htmlTop, /class="detailTitle"[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/i)
    || firstMatch(htmlTop, /<meta property="og:title" content="([^"]+)"/i).split(/[｜|]/)[0]
    || firstMatch(htmlTop, /<title>([^<|｜]*)/i);
  name = name.replace(/｜.*$/, '').trim();

  // キャッチ（トップ画像説明）／告知（shopCatchCopy）
  const catchCopy = firstMatch(htmlTop, /slnTopImgDescription[\s\S]*?<p>([\s\S]*?)<\/p>/i)
    || (salon.description || '');
  const notice = firstMatch(htmlTop, /class="shopCatchCopy"[^>]*>([\s\S]*?)<\/p>/i);

  // サロンデータ表
  const address = rowVal(htmlTop, '住所') || (salon.address && (salon.address.name || salon.address)) || '';
  const access = rowVal(htmlTop, 'アクセス') || rowVal(htmlTop, '道案内');
  const hours = rowVal(htmlTop, '営業時間');
  const closed = rowVal(htmlTop, '定休日');
  const payment = rowVal(htmlTop, '支払');
  const parking = rowVal(htmlTop, '駐車場') || rowVal(htmlTop, '駐輪');
  const featuresRaw = rowVal(htmlTop, 'こだわり');
  const features = featuresRaw ? featuresRaw.split(/[／\/・|]/).map((s) => s.trim()).filter((s) => s && s.length <= 18).slice(0, 10) : [];

  // 平均予約金額（class指定で確実に）
  const avgPrice = yen(firstMatch(htmlTop, /jscAveragePriceSecondOnwardsArea[^>]*>([\s\S]*?)<\/td>/i)).replace(/データ収集中/, '');

  // 評価・電話・地図（JSON-LD）
  const rating = salon.aggregateRating ? Number(salon.aggregateRating.ratingValue).toFixed(2) : firstMatch(htmlTop, /slnHeaderKuchikomiPoint"[^>]*>([\d.]+)</i);
  const reviewCount = salon.aggregateRating ? Number(salon.aggregateRating.reviewCount) : Number((strip(htmlTop).match(/（(\d+)件）/) || [])[1] || 0) || undefined;
  const tel = (salon.telephone || '').trim();
  const map = salon.geo ? { lat: salon.geo.latitude, lng: salon.geo.longitude } : null;

  // 客層（JSON-LDグラフ）
  let stats = null;
  if (graph) {
    const g = graph.salonGenderPercentages || {};
    const a = (graph.salonAgePercentages && graph.salonAgePercentages.ladies) || [];
    const lbl = ['〜10代', '20代', '30代', '40代', '50代〜'];
    const ages = a.map((v, i) => (i > 0 && v ? `${lbl[i]}${v}%` : '')).filter(Boolean).join('・');
    stats = { female: g.ladies != null ? g.ladies + '%' : '', ages, avgPrice };
  } else if (avgPrice) stats = { female: '', ages: '', avgPrice };

  // メニュー（グループ見出し singleMenuHead ＋ couponMenuName ＋ 説明）
  const menu = [];
  if (htmlMenu) {
    const heads = [];
    for (const m of htmlMenu.matchAll(/singleMenuHead[\s\S]*?<span>([^<]+)<\/span>/g)) heads.push({ name: clean(m[1]), idx: m.index });
    for (let i = 0; i < heads.length; i++) {
      if (/備考/.test(heads[i].name)) continue;
      const seg = htmlMenu.slice(heads[i].idx, i + 1 < heads.length ? heads[i + 1].idx : undefined);
      const items = [];
      for (const im of seg.matchAll(/couponMenuName[^>]*>([\s\S]*?)<\/p>[\s\S]*?fgGray fs11 wbba[^>]*>([\s\S]*?)<\/p>/g)) {
        const raw = clean(im[1]); const desc = clean(im[2]);
        // 末尾の価格だけを抽出（名前の途中の¥は残す＝名前を壊さない）
        const tm = raw.match(/^(.*?)\s*([￥¥]\s*[\d,]+\s*[～〜]?|\/\s*[\d,]+\s*[～〜]?)$/);
        let nm = raw, price = '';
        if (tm && tm[1].trim().length >= 3) { nm = tm[1].replace(/[\/：:　\s]+$/, '').trim(); price = yen(tm[2].replace(/^\//, '¥')); }
        if (nm) items.push({ name: nm.slice(0, 70), price, desc: desc.slice(0, 90) });
      }
      if (items.length) menu.push({ group: heads[i].name, items: items.slice(0, 12) });
    }
  }

  // スタッフ（1人目）
  let staff = null;
  if (htmlStaff) {
    const nm = firstMatch(htmlStaff, /fs16 b"><a[^>]*>([^<]{1,30})<\/a>/i);
    if (nm) {
      const roleM = htmlStaff.match(/<span class="fgPurple">([^<]+)<\/span>[（(]([^<]*?)[)）]/);
      const comment = firstMatch(htmlStaff, /hMin30"[^>]*>([\s\S]*?)<\/div>/i);
      staff = { name: nm, role: roleM ? `${clean(roleM[1])}（${clean(roleM[2])}）` : 'スタッフ', comment };
    }
  }

  // 口コミ（review ページ。総合点＋本文＋日付）
  const voices = [];
  if (htmlReview) {
    for (const m of htmlReview.matchAll(/kuchikomiActualNickname[^>]*>([\s\S]*?)<\/[^>]+>[\s\S]*?（([^）]*)）[\s\S]*?(\d{4}\/\d{1,2}\/\d{1,2})[\s\S]*?kuchikomiComment[^>]*>([\s\S]*?)<\/p>/gi)) {
      const who = clean(m[1]) + (m[2] ? '・' + clean(m[2]) : '');
      const text = clean(m[4]);
      if (text && text.length >= 12) voices.push({ text: text.slice(0, 170), who, date: m[3] });
      if (voices.length >= 4) break;
    }
    if (!voices.length) { // フォールバック（構造変化時）
      for (const b of htmlReview.split(/投稿日/).slice(1, 8)) {
        const dm = (b.match(/(\d{4}\/\d{1,2}\/\d{1,2})/) || [])[1];
        const text = strip(b).replace(/^[\]\s：:]*\d{4}\/\d{1,2}\/\d{1,2}/, '').split('\n').map((s) => s.trim()).filter((s) => s.length >= 14).slice(0, 2).join(' ');
        if (text && text.length >= 15) voices.push({ text: text.slice(0, 170), who: 'ホットペッパー口コミ', date: dm || '' });
        if (voices.length >= 4) break;
      }
    }
  }

  // 選ばれる理由（features/catch/staffから簡易生成）
  const reasons = [];
  if (staff && /歴/.test(staff.role)) reasons.push({ icon: '💅', title: `${staff.role}が担当`, desc: `担当は${staff.name}。${staff.comment || '似合わせデザインでご要望を形にします。'}` });
  if (/持ち込み|再現/.test(catchCopy)) reasons.push({ icon: '🎨', title: '持ち込みOK・高い再現力', desc: '豊富なサンプルと高い再現力で、なりたいデザインをイメージ通りに。' });
  if (features.some((f) => /完全予約|個室|貸切|プライベート/.test(f))) reasons.push({ icon: '🛋️', title: '完全予約制のプライベート空間', desc: '他のお客様と被らず、ゆったり落ち着いて過ごせます。' });

  // エリア/ラベル
  const area = ctx.area || AREA_IN || (access.match(/([^\s、。]+?)駅/) || [])[1] || (address.match(/([^\s、]+?[区市町村])/) || [])[1] || '';
  const genre = firstMatch(htmlTop, /krGenre[A-Za-z0-9]*[^>]*>([^<]{1,12})</i);
  const label = ctx.label || LABEL_IN
    || (/ネイル/.test(genre) ? 'ネイルサロン' : /まつげ|マツエク|アイ/.test(genre) ? 'アイビューティー'
      : /\/kr\//.test(URL_IN || '') || /ネイル/.test(name) ? 'ネイルサロン' : 'サロン');

  return {
    name, label, area, catch: catchCopy, notice,
    rating, reviewCount, tel, map,
    address, access, hours, closed, payment, parking, features,
    avgPrice, stats, menu, staff, voices, reasons,
  };
}

// ---------- メイン ----------
async function main() {
  if (!URL_IN && !HTML_DIR) { console.error('❌ ホットペッパーのサロンURL（または --html-dir）を渡してください。'); process.exit(1); }
  let htmlTop = '', htmlMenu = '', htmlStaff = '', htmlReview = '', salonId = 'offline';
  if (HTML_DIR) {
    const rd = (s) => { const p = `${HTML_DIR}/${s}`; return existsSync(p) ? readFileSync(p, 'utf8') : ''; };
    const g = (suf) => rd(`${salonIdFromDir()}_${suf}.html`) || rd(`${suf}.html`);
    function salonIdFromDir() { try { return (readdirSync(HTML_DIR).find((f) => /_top\.html$/.test(f)) || '').replace('_top.html', ''); } catch { return ''; } }
    salonId = salonIdFromDir() || 'offline';
    htmlTop = g('top'); htmlMenu = g('menu'); htmlStaff = g('staff'); htmlReview = g('review');
  } else {
    const base = (URL_IN.match(/^(https?:\/\/beauty\.hotpepper\.jp\/[a-z]{0,3}\/?sln[A-Za-z0-9]+)/) || [])[1];
    if (!base) { console.error('❌ ホットペッパーのサロンURL形式ではありません:', URL_IN); process.exit(1); }
    salonId = (base.match(/sln[A-Za-z0-9]+/) || [''])[0];
    const top = base + '/';
    console.log('取得中:', top);
    let hCoupon, hMenu2, hStylist, hStaff2;
    [htmlTop, hCoupon, hMenu2, htmlReview, hStylist, hStaff2] = await Promise.all([
      fetchText(top), fetchText(top + 'coupon/'), fetchText(top + 'menu/'),
      fetchText(top + 'review/'), fetchText(top + 'stylist/'), fetchText(top + 'staff/'),
    ]);
    if (!htmlTop) { console.error('❌ ページ取得に失敗（HP側ブロック/URL誤り/ネットワーク）。'); process.exit(1); }
    htmlMenu = (hCoupon && hCoupon.length > 2000) ? hCoupon : hMenu2;
    htmlStaff = (hStaff2 && hStaff2.length > 1500) ? hStaff2 : hStylist;
    const rawDir = 'data/overrides/_raw'; mkdirSync(rawDir, { recursive: true });
    writeFileSync(`${rawDir}/${salonId}_top.html`, htmlTop);
    if (htmlMenu) writeFileSync(`${rawDir}/${salonId}_menu.html`, htmlMenu);
    if (htmlReview) writeFileSync(`${rawDir}/${salonId}_review.html`, htmlReview);
    if (htmlStaff) writeFileSync(`${rawDir}/${salonId}_staff.html`, htmlStaff);
  }

  const p = parseHotpepper(htmlTop, htmlMenu, htmlStaff, htmlReview);

  // place_id（JSON-LDには無いのでPlaces解決。--place-id優先）
  let placeId = FORCE_PID || '', resolved = null;
  if (!placeId) { resolved = await resolvePlaceId([p.name, p.area, p.address].filter(Boolean).join(' ')); placeId = resolved ? resolved.id : ''; }
  const map = p.map || (resolved && resolved.location ? { lat: resolved.location.latitude, lng: resolved.location.longitude } : null);

  const override = {
    _place_id: placeId || '(未解決)', _source: 'HOT PEPPER Beauty（自動取得）', _hotpepper: URL_IN || '',
    name: p.name, label: p.label, area: p.area,
    catch: p.catch || undefined, notice: p.notice || undefined,
    rating: p.rating || undefined, reviewCount: p.reviewCount || undefined, ratingSource: 'ホットペッパービューティー',
    reasons: p.reasons.length ? p.reasons : undefined,
    menu: p.menu.length ? p.menu : undefined,
    staff: p.staff || undefined,
    voices: p.voices.length ? p.voices : undefined,
    stats: p.stats || undefined,
    info: { address: p.address, access: p.access, hours: p.hours, closed: p.closed, payment: p.payment, parking: p.parking, tel: p.tel, features: p.features },
    cta: { label: '予約・お問い合わせ', tel: p.tel || '', channels: p.notice ? 'お電話・公式LINE・DMより承ります' : 'お電話にて承ります', note: p.notice || '' },
    map: map || undefined,
  };
  Object.keys(override).forEach((k) => override[k] === undefined && delete override[k]);

  const outPath = opt('--out', placeId ? `data/overrides/${placeId}.json` : `data/overrides/_draft_${salonId}.json`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(override, null, 2) + '\n');

  const ok = (v) => (v && (Array.isArray(v) ? v.length : true) ? '✅' : '⚠️ 空');
  console.log('\n==== 取得レポート ====');
  console.log(`  店名        ${ok(p.name)}  ${p.name}`);
  console.log(`  place_id    ${ok(placeId && placeId !== '(未解決)')}  ${placeId}`);
  console.log(`  ラベル/エリア ${ok(p.label)} / ${ok(p.area)}  ${p.label} / ${p.area}`);
  console.log(`  電話        ${ok(p.tel)}  ${p.tel}`);
  console.log(`  住所        ${ok(p.address)}  ${p.address}`);
  console.log(`  営業/定休   ${ok(p.hours)} / ${ok(p.closed)}`);
  console.log(`  こだわり    ${ok(p.features)}  (${p.features.length}件)`);
  console.log(`  評価/件数   ${ok(p.rating)} ${p.rating} / ${p.reviewCount || ''}`);
  console.log(`  メニュー    ${ok(p.menu.length)}  ${p.menu.reduce((n, g) => n + g.items.length, 0)}件 / ${p.menu.length}グループ`);
  console.log(`  口コミ      ${ok(p.voices)}  ${p.voices.length}件`);
  console.log(`  スタッフ    ${ok(p.staff)}  ${p.staff ? p.staff.name + ' ' + p.staff.role : ''}`);
  console.log(`  客層        ${ok(p.stats && p.stats.female)}  女性${p.stats ? p.stats.female : ''} / ${p.stats ? p.stats.ages : ''}`);
  console.log(`  地図        ${ok(map)}`);
  console.log(`\n出力: ${outPath}`);
  if (!placeId || placeId === '(未解決)') console.log('⚠️ place_id未解決。GOOGLE_MAPS_API_KEY を本物のキーにして再実行、または --place-id で指定してください。');
  console.log('次: 中身を確認・微修正 → npm run generate:sites … → deploy でデモに反映。');
}

// import時（テスト）は実行しない
const isDirect = process.argv[1] && (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith(process.argv[1]));
if (isDirect) main();
