// Slack カスタム絵文字（スタンプ）一括生成スクリプト
// stamps.json を読み、128x128 の透過PNGを out/ に量産する。
// ライト/ダーク両テーマで読めるよう、文字に白フチを付けている。
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

const stamps = JSON.parse(fs.readFileSync(path.join(__dir, 'stamps.json'), 'utf8'));
const OUT = path.join(__dir, 'out');
fs.mkdirSync(OUT, { recursive: true });

const tpl = (text, color) => `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:128px;height:128px;}
body{display:flex;align-items:center;justify-content:center;overflow:hidden;}
#t{font-family:"IPAGothic","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;
   font-weight:900;color:${color};line-height:1.02;text-align:center;word-break:break-word;
   text-shadow:3px 3px 0 #fff,-3px 3px 0 #fff,3px -3px 0 #fff,-3px -3px 0 #fff,
               0 3px 0 #fff,0 -3px 0 #fff,3px 0 0 #fff,-3px 0 0 #fff,
               2px 2px 0 #fff,-2px -2px 0 #fff;}
</style></head><body><div id="t">${text}</div></body></html>`;

const browser = await puppeteer.launch({
  executablePath: findChrome(), headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'],
});
const page = await browser.newPage();
await page.setViewport({ width: 128, height: 128, deviceScaleFactor: 2 }); // 2x = くっきり

for (const s of stamps) {
  await page.setContent(tpl(s.text, s.color), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  // 自動フィット: 116pxの安全枠に収まるまでフォントを縮める
  await page.evaluate(() => {
    const el = document.getElementById('t'); const box = 116; let size = 64;
    el.style.fontSize = size + 'px';
    while ((el.scrollWidth > box || el.scrollHeight > box) && size > 10) { size -= 1; el.style.fontSize = size + 'px'; }
  });
  await page.screenshot({ path: path.join(OUT, `${s.name}.png`), omitBackground: true });
  process.stdout.write(`✓ ${s.name} (${s.text})\n`);
}
await browser.close();
console.log(`\n完成: ${stamps.length}個のPNGを ${OUT}/ に出力しました。`);
