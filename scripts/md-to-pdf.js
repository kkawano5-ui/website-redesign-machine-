// 既存の鑑定書Markdown -> PDF（人が手直しした後の再生成用）
//   npm run fortune:pdf -- data/fortune-outputs/2026-06-16-xxxx.md
import fs from 'fs/promises';
import path from 'path';
import { renderReadingPdf } from './fortune/pdf.js';

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('使い方: npm run fortune:pdf -- <鑑定書.md>');
    process.exit(1);
  }
  const mdPath = path.resolve(arg);
  const md = await fs.readFile(mdPath, 'utf-8');
  const pdfPath = mdPath.replace(/\.md$/, '.pdf');
  await renderReadingPdf(md, pdfPath);
  console.log(`✅ PDFを出力しました: ${pdfPath}`);
}

main().catch((e) => {
  console.error('❌ エラー:', e.message);
  process.exit(1);
});
