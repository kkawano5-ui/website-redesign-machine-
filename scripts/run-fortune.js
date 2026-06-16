// CLIエントリ：依頼JSON -> 鑑定書Markdown + PDF
//   npm run fortune -- data/fortune-inputs/sample.json
//   オプション: --bazi-only(命式のみ) / --no-pdf(PDF出力を省略)
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { readJsonFile, writeMarkdownFile, createSafeSlug } from './utils.js';
import { generateReading, formatBaziTable } from './fortune/generate-reading.js';
import { computeBazi } from './fortune/bazi.js';
import { renderReadingPdf } from './fortune/pdf.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

async function main() {
  const inputArg = process.argv[2];
  if (!inputArg) {
    console.error('使い方: npm run fortune -- data/fortune-inputs/sample.json');
    console.error('        （命式だけ確認: --bazi-only を付与）');
    process.exit(1);
  }
  const baziOnly = process.argv.includes('--bazi-only');
  const inputPath = path.isAbsolute(inputArg) ? inputArg : path.join(ROOT, inputArg);
  const input = await readJsonFile(inputPath);

  // --bazi-only: APIキー不要で命式だけ表示（動作確認・節入り境界の検証用）
  if (baziOnly) {
    const b = computeBazi({
      year: input.birth.year,
      month: input.birth.month,
      day: input.birth.day,
      hour: typeof input.birth.hour === 'number' ? input.birth.hour : undefined,
      minute: input.birth.minute ?? 0,
      tzOffsetHours: input.birth.tzOffsetHours ?? 9,
    });
    console.log(formatBaziTable(b));
    return;
  }

  console.log('🔮 鑑定を生成中…（四柱推命 → 手相解析 → 複合鑑定）');
  const { markdown, bazi } = await generateReading(input);

  const slug = createSafeSlug(input.nickname || input.id || 'reading', 'reading');
  const stamp = new Date().toISOString().slice(0, 10);
  const outPath = path.join(ROOT, 'data', 'fortune-outputs', `${stamp}-${slug}.md`);
  await writeMarkdownFile(outPath, markdown);

  console.log('\n--- 命式 ---');
  console.log(formatBaziTable(bazi));
  console.log(`\n✅ 鑑定書(Markdown): ${path.relative(ROOT, outPath)}`);

  if (!process.argv.includes('--no-pdf')) {
    const pdfPath = outPath.replace(/\.md$/, '.pdf');
    await renderReadingPdf(markdown, pdfPath, {
      bazi,
      nickname: input.nickname || '',
      brand: input.brand || process.env.FORTUNE_BRAND || 'Luna Mano 鑑定室',
    });
    console.log(`✅ 鑑定書(PDF・納品用): ${path.relative(ROOT, pdfPath)}`);
  }
}

main().catch((err) => {
  console.error('❌ エラー:', err.message);
  process.exit(1);
});
