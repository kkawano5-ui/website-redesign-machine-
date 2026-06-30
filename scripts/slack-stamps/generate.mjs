// Slack カスタム絵文字（スタンプ）一括生成スクリプト
// stamps.json を読み、128x128 の透過PNGを out/ に量産する。
//
// 使い方:
//   node generate.mjs [スタンプ定義.json] [出力フォルダ]
//   例) node generate.mjs                       -> stamps.json から out/ へ
//       node generate.mjs stamps-polite.json out-polite
//
// 特徴:
//   - バランス改行: 1〜4行を試し「一番大きく表示できる行数」を自動採用（長い丁寧語でも大きく）
//   - 句読点・小書き仮名・英単語は前の文字に結合し「！」等の行頭こぼれを防止
//   - text に "\n" を入れれば改行位置を手動指定も可能
//
// スタイル: "pop"(既定)=色文字+白フチ / "burst"=爆発背景+白文字 / rotate(度)で傾き
//
// Chrome/Chromium のパスは CHROME_PATH 環境変数で上書き可能。
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const STAMPS_FILE = process.argv[2] || 'stamps.json';
const OUT_DIR = process.argv[3] || 'out';

function findChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const candidates = [
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',                       // Claude Code on the web
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',             // macOS Chrome
    '/Applications/Chromium.app/Contents/MacOS/Chromium',                       // macOS Chromium
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', // Linux
    'C:/Program Files/Google/Chrome/Application/chrome.exe',                    // Windows
  ];
  for (const c of candidates) { try { if (fs.existsSync(c)) return c; } catch {} }
  throw new Error('Chrome/Chromium が見つかりません。CHROME_PATH 環境変数でパスを指定してください。');
}

function starburst(spikes = 14, outer = 50, inner = 39) {
  const pts = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / spikes) * i - Math.PI / 2;
    pts.push(`${(50 + r * Math.cos(a)).toFixed(2)}% ${(50 + r * Math.sin(a)).toFixed(2)}%`);
  }
  return `polygon(${pts.join(',')})`;
}

const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// 行頭に来てほしくない文字（前の文字にくっつける）
const ATTACH = /[ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶゕゖーｰ〜～、。，．,.!！?？…‥・：；）)\]｝》」』】〉〕’”]/;
// テキストを「改行してもよい最小単位（グループ）」に分割
function groupUnits(text) {
  const groups = [];
  let cur = '';
  for (const ch of text) {
    if (/[A-Za-z0-9]/.test(ch)) { cur += ch; continue; }       // 英数字はひとかたまり
    if (cur && ATTACH.test(ch)) { cur += ch; continue; }       // くっつけ文字
    if (cur) groups.push(cur);
    cur = ch;
  }
  if (cur) groups.push(cur);
  return groups.map(esc);
}

const FONT = `"IPAGothic","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif`;
const POP_SHADOW = `text-shadow:4px 4px 0 #fff,-4px 4px 0 #fff,4px -4px 0 #fff,-4px -4px 0 #fff,
  0 4px 0 #fff,0 -4px 0 #fff,4px 0 0 #fff,-4px 0 0 #fff,3px 3px 0 #fff,-3px -3px 0 #fff,3px -3px 0 #fff,-3px 3px 0 #fff;`;
const BURST_SHADOW = `text-shadow:2px 2px 0 rgba(0,0,0,.35),-1px -1px 0 rgba(0,0,0,.25);`;

function shell(s, boxW) {
  const rot = s.rotate ? `transform:rotate(${s.rotate}deg);` : '';
  const common = `*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:128px;height:128px;}
body{display:flex;align-items:center;justify-content:center;overflow:hidden;}
.ln{white-space:nowrap;}.g{white-space:nowrap;}
#t{font-family:${FONT};font-weight:900;line-height:.94;text-align:center;width:${boxW}px;}`;
  if (s.style === 'burst') {
    return `<!doctype html><meta charset="utf-8"><style>${common}
.burst{width:128px;height:128px;display:flex;align-items:center;justify-content:center;background:${s.color};clip-path:${starburst()};${rot}}
#t{color:#fff;${BURST_SHADOW}}
</style><div class="burst"><div id="t"></div></div>`;
  }
  return `<!doctype html><meta charset="utf-8"><style>${common}
#t{color:${s.color};${rot}${POP_SHADOW}}
</style><div id="t"></div>`;
}

const stamps = JSON.parse(fs.readFileSync(path.join(__dir, STAMPS_FILE), 'utf8'));
const OUT = path.join(__dir, OUT_DIR);
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: findChrome(), headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'],
});
const page = await browser.newPage();
await page.setViewport({ width: 128, height: 128, deviceScaleFactor: 2 }); // 2x = くっきり

for (const s of stamps) {
  const box = s.style === 'burst' ? 90 : 112;          // この枠に収める（端に少し余白）
  const forced = s.text.includes('\n')
    ? s.text.split('\n').map(line => groupUnits(line)) // 手動改行
    : null;
  const units = groupUnits(s.text.replace(/\n/g, ''));

  await page.setContent(shell(s, box), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);

  const size = await page.evaluate((units, forced, box) => {
    const el = document.getElementById('t');
    const build = (lines) => {
      el.innerHTML = lines.map(line =>
        `<div class="ln">${line.map(u => `<span class="g">${u}</span>`).join('​')}</div>`).join('');
    };
    const fit = () => {
      let s = 8; el.style.fontSize = s + 'px';
      while (s < 220) { el.style.fontSize = (s + 2) + 'px'; if (el.scrollWidth > box || el.scrollHeight > box) break; s += 2; }
      el.style.fontSize = s + 'px'; return s;
    };
    // 文字数で行数を決定（1行に詰め込みすぎず、かつ大きく）
    const n = units.length;
    const L = n <= 3 ? 1 : n <= 6 ? 2 : n <= 12 ? 3 : 4;
    // L行に「均等」分割（孤立した1文字行を作らない）
    const split = (arr, L) => {
      const base = Math.floor(arr.length / L), rem = arr.length % L, out = [];
      let i = 0;
      for (let k = 0; k < L; k++) { const len = base + (k < rem ? 1 : 0); out.push(arr.slice(i, i + len)); i += len; }
      return out.filter(x => x.length);
    };
    const lines = forced || split(units, L);
    build(lines);
    return fit();
  }, units, forced, box);

  await page.screenshot({ path: path.join(OUT, `${s.name}.png`), omitBackground: true });
  process.stdout.write(`✓ ${s.name} (${s.text.replace(/\n/g, '/')}) ${size}px${s.style ? ' ['+s.style+']' : ''}\n`);
}
await browser.close();
console.log(`\n完成: ${stamps.length}個のPNGを ${OUT}/ に出力しました。`);
