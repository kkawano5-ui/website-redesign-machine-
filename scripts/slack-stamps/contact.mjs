// out/ の全スタンプを一覧化した contact-sheet.png を生成する（ライト/ダーク両方）。
// 使い方: node contact.mjs [スタンプ定義.json] [画像フォルダ] [出力PNG]
//   例) node contact.mjs stamps-polite.json out-polite contact-polite.png
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const STAMPS_FILE = process.argv[2] || 'stamps.json';
const OUT_DIR = process.argv[3] || 'out';
const SHEET = process.argv[4] || 'contact-sheet.png';
function findChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const c = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  for (const p of c) { try { if (fs.existsSync(p)) return p; } catch {} }
  throw new Error('Chrome/Chromium が見つかりません。CHROME_PATH を指定してください。');
}

const stamps = JSON.parse(fs.readFileSync(path.join(__dir, STAMPS_FILE), 'utf8'));
const OUT = path.join(__dir, OUT_DIR);
const b64 = n => fs.readFileSync(path.join(OUT, `${n}.png`)).toString('base64');
const cell = s => `<div class="c"><img src="data:image/png;base64,${b64(s.name)}"><div class="n">:${s.name}:</div></div>`;
const grid = stamps.map(cell).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;font-family:"IPAGothic",sans-serif;}
body{width:760px;}.sec{padding:18px 16px 22px;}.title{font-size:15px;font-weight:bold;margin:0 0 12px;}
.light{background:#fff;}.light .title{color:#1d1c1d;}.light .n{color:#616061;}
.dark{background:#1a1d21;}.dark .title{color:#d1d2d3;}.dark .n{color:#abadb0;}
.grid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px 6px;}
.c{display:flex;flex-direction:column;align-items:center;gap:4px;}.c img{width:64px;height:64px;}.n{font-size:10px;}
</style></head><body>
<div class="sec light"><div class="title">☀️ ライトモード（全${stamps.length}個）</div><div class="grid">${grid}</div></div>
<div class="sec dark"><div class="title">🌙 ダークモード（全${stamps.length}個）</div><div class="grid">${grid}</div></div>
</body></html>`;

const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'] });
const page = await browser.newPage();
await page.setViewport({ width: 760, height: 10, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: path.join(__dir, SHEET), fullPage: true });
await browser.close();
console.log(`${SHEET} written`);
