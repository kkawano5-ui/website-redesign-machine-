// Slack カスタム絵文字（スタンプ）一括生成スクリプト
// stamps.json を読み、128x128 の透過PNGを out/ に量産する。
//
// 特徴:
//   - 文字は枠いっぱいまで自動拡大（短い語は折り返して最大化）＝デカくてインパクト大
//   - 句読点・小さい仮名・英単語は前の文字にくっつけて改行（「！」だけ行頭…を防ぐ）
//
// スタイル:
//   "pop"   (既定) … 色文字 + 太い白フチ。ライト/ダーク両方で読める
//   "burst"         … コミック風の爆発（星形）背景 + 白文字。ふざけ系に
// 各スタンプで rotate(度) を指定すると傾けられる。
//
// 使い方:
//   1) npm install            (puppeteer-core が入る)
//   2) node generate.mjs      (out/ に PNG が出力される)
//   3) out/ の画像を Slack の絵文字管理ページに一括アップロード（README参照）
//
// Chrome/Chromium のパスは CHROME_PATH 環境変数で上書き可能。
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));

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

// N本トゲのスターバースト（爆発）clip-path を生成
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
// 行頭に来てほしくない文字（前の文字にくっつける）: 小書き仮名・長音・句読点・閉じ括弧 等
const ATTACH = /[ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶゕゖーｰ〜～、。，．,.!！?？…‥・：；）)\]｝》」』】〉〕’”]/;
// テキストを「改行してもよい単位（グループ）」に分割し、グループ内では改行しないHTMLを作る
function group(text) {
  const groups = [];
  let cur = '';
  for (const ch of text) {
    if (/[A-Za-z0-9]/.test(ch)) {              // 英数字は連続でひとかたまり（OK / MAX など）
      cur += ch; continue;
    }
    if (cur && ATTACH.test(ch)) { cur += ch; continue; } // くっつけ文字
    if (cur) groups.push(cur);
    cur = ch;
  }
  if (cur) groups.push(cur);
  // グループ間にだけ改行候補(ZWSP)を入れ、各グループは nowrap で割れないようにする
  return groups.map(g => `<span class="g">${esc(g)}</span>`).join('​');
}

const FONT = `"IPAGothic","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif`;
const POP_SHADOW = `text-shadow:4px 4px 0 #fff,-4px 4px 0 #fff,4px -4px 0 #fff,-4px -4px 0 #fff,
  0 4px 0 #fff,0 -4px 0 #fff,4px 0 0 #fff,-4px 0 0 #fff,3px 3px 0 #fff,-3px -3px 0 #fff,3px -3px 0 #fff,-3px 3px 0 #fff;`;
const BURST_SHADOW = `text-shadow:2px 2px 0 rgba(0,0,0,.35),-1px -1px 0 rgba(0,0,0,.25);`;
const BASE = `*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:128px;height:128px;}
body{display:flex;align-items:center;justify-content:center;overflow:hidden;}
.g{white-space:nowrap;}
#t{font-family:${FONT};font-weight:900;line-height:.92;text-align:center;word-break:normal;overflow-wrap:normal;}`;

function tpl(s) {
  const rot = s.rotate ? `transform:rotate(${s.rotate}deg);` : '';
  const inner = group(s.text);
  if (s.style === 'burst') {
    return `<!doctype html><meta charset="utf-8"><style>${BASE}
.burst{width:128px;height:128px;display:flex;align-items:center;justify-content:center;
  background:${s.color};clip-path:${starburst()};${rot}}
#t{color:#fff;width:100px;${BURST_SHADOW}}
</style><div class="burst"><div id="t">${inner}</div></div>`;
  }
  return `<!doctype html><meta charset="utf-8"><style>${BASE}
#t{color:${s.color};width:124px;${rot}${POP_SHADOW}}
</style><div id="t">${inner}</div>`;
}

const stamps = JSON.parse(fs.readFileSync(path.join(__dir, 'stamps.json'), 'utf8'));
const OUT = path.join(__dir, 'out');
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: findChrome(), headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'],
});
const page = await browser.newPage();
await page.setViewport({ width: 128, height: 128, deviceScaleFactor: 2 }); // 2x = くっきり

for (const s of stamps) {
  const box = s.style === 'burst' ? 100 : 124; // この枠いっぱいまで拡大
  await page.setContent(tpl(s), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const size = await page.evaluate((box) => {
    const el = document.getElementById('t'); let s = 8; el.style.fontSize = s + 'px';
    while (s < 240) { el.style.fontSize = (s + 2) + 'px'; if (el.scrollWidth > box || el.scrollHeight > box) break; s += 2; }
    el.style.fontSize = s + 'px'; return s;
  }, box);
  await page.screenshot({ path: path.join(OUT, `${s.name}.png`), omitBackground: true });
  process.stdout.write(`✓ ${s.name} (${s.text}) ${size}px${s.style ? ' ['+s.style+']' : ''}\n`);
}
await browser.close();
console.log(`\n完成: ${stamps.length}個のPNGを ${OUT}/ に出力しました。`);
