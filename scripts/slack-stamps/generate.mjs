// Slack カスタム絵文字（スタンプ）一括生成スクリプト
// stamps.json を読み、128x128 の透過PNGを out/ に量産する。
//
// スタイル:
//   "pop"   (既定) … 色文字 + 白フチ。ライト/ダーク両方で読める
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
function starburst(spikes = 14, outer = 50, inner = 33) {
  const pts = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / spikes) * i - Math.PI / 2;
    const x = (50 + r * Math.cos(a)).toFixed(2);
    const y = (50 + r * Math.sin(a)).toFixed(2);
    pts.push(`${x}% ${y}%`);
  }
  return `polygon(${pts.join(',')})`;
}

const FONT = `"IPAGothic","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif`;
const POP_SHADOW = `text-shadow:3px 3px 0 #fff,-3px 3px 0 #fff,3px -3px 0 #fff,-3px -3px 0 #fff,
  0 3px 0 #fff,0 -3px 0 #fff,3px 0 0 #fff,-3px 0 0 #fff,2px 2px 0 #fff,-2px -2px 0 #fff;`;
const BURST_SHADOW = `text-shadow:2px 2px 0 rgba(0,0,0,.35),-1px -1px 0 rgba(0,0,0,.25);`;

function tpl(s) {
  const rot = s.rotate ? `transform:rotate(${s.rotate}deg);` : '';
  if (s.style === 'burst') {
    return `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:128px;height:128px;}
body{display:flex;align-items:center;justify-content:center;overflow:hidden;}
.burst{width:126px;height:126px;display:flex;align-items:center;justify-content:center;
  background:${s.color};clip-path:${starburst()};${rot}}
#t{font-family:${FONT};font-weight:900;color:#fff;line-height:1.0;text-align:center;
   word-break:break-word;padding:0 4px;${BURST_SHADOW}}
</style></head><body><div class="burst"><div id="t">${s.text}</div></div></body></html>`;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:128px;height:128px;}
body{display:flex;align-items:center;justify-content:center;overflow:hidden;}
#t{font-family:${FONT};font-weight:900;color:${s.color};line-height:1.02;text-align:center;
   word-break:break-word;${rot}${POP_SHADOW}}
</style></head><body><div id="t">${s.text}</div></body></html>`;
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
  const box = s.style === 'burst' ? 78 : 116; // 収める安全枠（burstは星の中心に収める）
  await page.setContent(tpl(s), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate((box) => {
    const el = document.getElementById('t'); let size = 64;
    el.style.fontSize = size + 'px';
    while ((el.scrollWidth > box || el.scrollHeight > box) && size > 9) { size -= 1; el.style.fontSize = size + 'px'; }
  }, box);
  await page.screenshot({ path: path.join(OUT, `${s.name}.png`), omitBackground: true });
  process.stdout.write(`✓ ${s.name} (${s.text})${s.style ? ' ['+s.style+']' : ''}\n`);
}
await browser.close();
console.log(`\n完成: ${stamps.length}個のPNGを ${OUT}/ に出力しました。`);
