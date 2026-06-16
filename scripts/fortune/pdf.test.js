// PDF描画の動作確認（APIキー不要）。生成して存在・サイズだけ検証する。
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderReadingPdf } from './pdf.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, '..', '..', 'data', 'fortune-outputs', '_pdf-selftest.pdf');

const md = `# あなたの鑑定書 〜四柱推命 × 手相〜

## 1. あなたの本質（四柱推命より）
あなたの日主は **乙（きのと）＝陰の木**。大樹ではなく、草花や蔓のような「しなやかな木」です。力でねじ伏せるより、環境を読み、人との繋がりの中で伸びていく適応力と気配りの人。月柱の戊寅（正財）は堅実さを示します。

## 2. いまのあなた（手相より）
生命線は金星丘を大きく回り、体力・愛情の土台は豊か。知能線はゆるやかに下降するバランス型です。

## 5. 開運のヒント
- 「水」を補う：青・濃紺・黒を小物に一点。水辺でのリセットが効きます。
- 休息を予定に書き込む：乙木は根を休ませると伸びる木。

---
※本鑑定は自己理解を深めるためのエンターテインメントです。健康・寿命に関する診断ではありません。
`;

const p = await renderReadingPdf(md, out);
const size = fs.statSync(p).size;
const head = fs.readFileSync(p).slice(0, 5).toString();
console.log(`生成: ${path.relative(process.cwd(), p)}  size=${size}B  header=${head}`);
if (head === '%PDF-' && size > 1000) {
  console.log('✅ PDF生成OK');
} else {
  console.log('❌ PDF生成に問題あり');
  process.exit(1);
}
