#!/usr/bin/env node
/**
 * 各社のWebサイトを巡回してメールアドレスを抽出し CSV 出力する。
 *  Places APIはメールを返さないため、サイトのある会社だけが対象（SNS/食べログ/チェーンは自動スキップ）。
 *  ※ 一般サイトへの通信が必要なので「あなたのMac」で実行してください（サンドボックスからは不可）。
 *
 * 使い方（Macで実行）:
 *   node scripts/fetch-emails.mjs data/companies/crm-source.csv
 *   # または: npm run fetch:emails -- data/companies/crm-source.csv
 *
 * オプション:
 *   --out path.csv     出力先（既定 data/outputs/emails.csv）
 *   --concurrency 6    同時アクセス数（既定6。サイトに優しく）
 *   --timeout 12000    1ページのタイムアウトms（既定12000）
 *   --limit 50         先頭N件だけ（動作確認用）
 *
 * 出力 CSV: place_id, 検出メール, 全メール, 店名, エリア, 業種, website, status
 *   検出メール … 最有力1件（サイトのドメインと一致するものを優先）
 *   status     … OK / NO_EMAIL / SKIP_SNS / NO_SITE / FETCH_ERR
 *   → 「検出メール」はB列。CRMの 検出メール 列(AJ) に VLOOKUP で流し込めます。
 * 途中で失敗しても再実行すれば未取得分だけ取り直します（OK/NO_EMAIL/SKIP_SNS は済み扱い）。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// ---------- 引数 ----------
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const INPUT = argv.find((a) => !a.startsWith('--')) || 'data/companies/crm-source.csv';
const OUT = opt('--out', 'data/outputs/emails.csv');
const CONCURRENCY = Math.max(1, Number(opt('--concurrency', '6')));
const TIMEOUT = Number(opt('--timeout', '12000'));
const LIMIT = opt('--limit') ? Number(opt('--limit')) : Infinity;
const UA = 'Mozilla/5.0 (compatible; MiraihenBot/1.0; +contact crawl for own sales list)';

// SNS/集約サイト/予約ポータルは自社メールが無いのでスキップ
const SKIP_HOSTS = ['instagram.', 'facebook.', 'fb.com', 'twitter.', 'x.com', 'tabelog.', 'google.', 'goo.gl',
  'goo.ne', 'hotpepper', 'beauty.hotpepper', 'ekiten', 'line.me', 'lin.ee', 'youtube', 'youtu.be', 'ameblo',
  'owst.jp', 'retty', 'gnavi', 'ozmall', 'minimo', 'rakuten', 'epark', 'jimoty', 'note.com', 'tiktok', 'pinterest', 'maps.app'];

// 抽出後に弾くゴミ（アセット拡張子/ライブラリ/サンプル）
const BAD_TLD = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'css', 'js', 'mjs', 'json', 'xml', 'ico',
  'woff', 'woff2', 'ttf', 'eot', 'mp4', 'webm', 'pdf', 'bmp', 'tiff', 'webmanifest']);
const BAD_DOMAIN = ['sentry', 'wixpress', 'wix.com', 'example.', 'sample.', 'your', 'domain.com', 'email.com',
  'googleapis', 'gstatic', 'schema.org', 'w3.org', 'jsdelivr', 'cloudflare', 'fontawesome', 'gravatar',
  'sentry.io', 'mailchimp', 'cdn.', 'bootstrapcdn', '.png', 'placeholder'];

// ---------- メール抽出（純関数：オフライン検証可能） ----------
export function extractEmails(html, siteHost = '') {
  if (!html) return [];
  // エンティティ/簡易難読化を復元
  let t = html
    .replace(/&#0*64;|&#x0*40;/gi, '@').replace(/&#0*46;|&#x0*2e;/gi, '.')
    .replace(/%40/gi, '@')
    .replace(/\s*\[\s*at\s*\]\s*|\s*\(\s*at\s*\)\s*|\s+at\s+/gi, '@') // 控えめ
    .replace(/\s*\[\s*dot\s*\]\s*|\s*\(\s*dot\s*\)\s*/gi, '.');
  const found = new Set();
  // mailto: を最優先で拾う
  for (const m of t.matchAll(/mailto:([^"'>\s?]+)/gi)) found.add(decodeURIComponent(m[1]));
  for (const m of t.matchAll(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g)) found.add(m[0]);
  const reg = (h) => h.toLowerCase().split('.').slice(-2).join('.');
  const clean = [];
  for (let e of found) {
    e = e.trim().replace(/[.,;:)\]}>'"]+$/, '').toLowerCase();
    const at = e.split('@'); if (at.length !== 2) continue;
    const dom = at[1];
    const tld = dom.split('.').pop();
    if (BAD_TLD.has(tld)) continue;
    if (BAD_DOMAIN.some((b) => e.includes(b))) continue;
    if (/\.(png|jpg|jpeg|gif|webp|svg|css|js)$/i.test(e)) continue;
    if (e.length > 64 || dom.length < 4 || !dom.includes('.')) continue;
    clean.push(e);
  }
  const uniq = [...new Set(clean)];
  // サイトのドメインと一致 → 自社メールの可能性大なので先頭へ。noreply等は後ろへ。
  const sreg = reg(siteHost || '');
  uniq.sort((a, b) => {
    const am = reg(a.split('@')[1]) === sreg ? 0 : 1;
    const bm = reg(b.split('@')[1]) === sreg ? 0 : 1;
    if (am !== bm) return am - bm;
    const an = /no-?reply|do-?not-?reply|noreply/.test(a) ? 1 : 0;
    const bn = /no-?reply|do-?not-?reply|noreply/.test(b) ? 1 : 0;
    return an - bn;
  });
  return uniq;
}

// ---------- 連絡先ページのリンク抽出 ----------
function contactLinks(html, baseUrl) {
  const links = new Set();
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>(.*?)<\/a>/gis)) {
    const href = m[1]; const text = (m[2] || '').replace(/<[^>]+>/g, '');
    const hay = (href + ' ' + text).toLowerCase();
    if (/contact|inquiry|toiawase|お問い合わせ|問合せ|問い合わせ|会社概要|company|about|mail/i.test(hay)) {
      try { links.add(new URL(href, baseUrl).toString()); } catch { /* ignore */ }
    }
  }
  return [...links].filter((u) => /^https?:/.test(u)).slice(0, 3);
}

// 直接実行でなければ（importだけなら）ここで終了 — 抽出関数のテスト用
if (process.argv[1] && import.meta.url !== `file://${process.argv[1]}` && !INPUT) {
  // noop
}

// ---------- CSVパーサ／クオート ----------
function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.length && r.some((v) => v !== ''));
}
const csvCell = (v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- メイン ----------
async function main() {
  if (!existsSync(INPUT)) { console.error('❌ 入力CSVが見つかりません:', INPUT); process.exit(1); }
  const table = parseCSV(readFileSync(INPUT, 'utf8'));
  const header = table[0].map((h) => h.trim());
  const col = (ns) => { for (const n of ns) { const i = header.indexOf(n); if (i >= 0) return i; } return -1; };
  const ci = {
    place_id: col(['place_id', 'placeId']), name: col(['店名', 'name', '会社名']),
    area: col(['エリア', 'area']), genre: col(['業種・種別', '業種', 'genre']),
    web: col(['既存website', 'Web', 'website']),
  };
  if (ci.place_id < 0 || ci.web < 0) { console.error('❌ place_id / 既存website 列が必要です。ヘッダ:', header.join(' / ')); process.exit(1); }

  const all = [], seen = new Set();
  for (let r = 1; r < table.length; r++) {
    const row = table[r]; const pid = (row[ci.place_id] || '').trim();
    if (!pid || seen.has(pid)) continue; seen.add(pid);
    all.push({
      place_id: pid, name: (row[ci.name] || '').trim(), area: (row[ci.area] || '').trim(),
      genre: (row[ci.genre] || '').trim(), web: (row[ci.web] || '').trim(),
    });
    if (all.length >= LIMIT) break;
  }

  // 既存出力から再開
  const done = new Map();
  if (existsSync(OUT)) {
    const prev = parseCSV(readFileSync(OUT, 'utf8')); const ph = prev[0] || [];
    const pi = ph.indexOf('place_id'), psx = ph.indexOf('status');
    for (let r = 1; r < prev.length; r++) {
      const pid = (prev[r][pi] || '').trim(); const st = psx >= 0 ? (prev[r][psx] || '') : '';
      if (pid && /^(OK|NO_EMAIL|SKIP_SNS|NO_SITE)/.test(st)) done.set(pid, prev[r]);
    }
  }
  const todo = all.filter((c) => !done.has(c.place_id));
  console.log(`対象 ${all.length}社 / 取得済み ${done.size} / 今回 ${todo.length}社 (同時${CONCURRENCY})`);

  async function getText(url) {
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), TIMEOUT);
    try {
      const res = await fetch(url, { redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': UA, 'Accept': 'text/html' } });
      const ct = res.headers.get('content-type') || '';
      if (!res.ok || !/html|text/.test(ct)) return '';
      return (await res.text()).slice(0, 600000);
    } catch { return ''; } finally { clearTimeout(to); }
  }

  async function scrape(c) {
    let url = c.web; if (!/^https?:/i.test(url)) url = 'http://' + url;
    let host = ''; try { host = new URL(url).host.toLowerCase(); } catch { return { ...c, emails: [], status: 'NO_SITE' }; }
    if (SKIP_HOSTS.some((s) => host.includes(s) || url.toLowerCase().includes(s))) return { ...c, emails: [], status: 'SKIP_SNS' };
    const home = await getText(url);
    if (!home) return { ...c, emails: [], status: 'FETCH_ERR' };
    let emails = extractEmails(home, host);
    if (!emails.length) {
      for (const link of contactLinks(home, url)) {
        const sub = await getText(link);
        emails = extractEmails(sub, host);
        if (emails.length) break;
        await sleep(150);
      }
    }
    return { ...c, emails, status: emails.length ? 'OK' : 'NO_EMAIL' };
  }

  const HEAD = ['place_id', '検出メール', '全メール', '店名', 'エリア', '業種', 'website', 'status'];
  const results = new Map(done);
  const write = () => {
    const lines = [HEAD.join(',')];
    for (const c of all) {
      const r = results.get(c.place_id); if (!r) continue;
      if (Array.isArray(r)) { lines.push(r.map(csvCell).join(',')); continue; }
      lines.push([r.place_id, r.emails[0] || '', r.emails.join(';'), r.name, r.area, r.genre, r.web, r.status].map(csvCell).join(','));
    }
    mkdirSync(dirname(OUT), { recursive: true }); writeFileSync(OUT, lines.join('\n') + '\n');
  };

  let i = 0, ok = 0, ne = 0, sk = 0, er = 0, n = 0;
  async function worker() {
    while (i < todo.length) {
      const c = todo[i++]; const r = await scrape(c); results.set(c.place_id, r); n++;
      if (r.status === 'OK') ok++; else if (r.status === 'NO_EMAIL') ne++; else if (r.status === 'SKIP_SNS' || r.status === 'NO_SITE') sk++; else er++;
      if (n % 20 === 0) { write(); process.stdout.write(`\r  ${n}/${todo.length} (取得${ok} メール無${ne} 対象外${sk} 失敗${er})   `); }
    }
  }
  const t0 = Date.now();
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length || 1) }, worker));
  write();
  const got = [...results.values()].filter((r) => (Array.isArray(r) ? r[1] : r.emails[0])).length;
  console.log(`\n\n✅ 完了: ${OUT}`);
  console.log(`   メール取得: ${got}社（OK:${ok} / メール無:${ne} / 対象外:${sk} / 失敗:${er}）  ${((Date.now() - t0) / 1000).toFixed(0)}秒`);
  if (er) console.log('   ※ 失敗(FETCH_ERR)があれば再実行で取り直します。');
}

// importされた時は実行しない（抽出関数の単体テスト用）
const isDirect = process.argv[1] && (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith(process.argv[1]));
if (isDirect) main();
