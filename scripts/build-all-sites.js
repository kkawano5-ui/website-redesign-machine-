import path from 'path';
import fs from 'fs/promises';
import { buildDemoSiteFiles } from './build-demo-site.js';
import { detectIndustry } from './create-site-spec.js';
import {
  createSafeSlug,
  ensureDir,
  fileNameWithoutExt,
  pickFirstValue,
  readJsonFile
} from './utils.js';

/**
 * Batch-build every demo site under data/inputs and emit a portfolio
 * gallery (data/sites/index.html) linking to all of them.
 *
 *   npm run build:all
 *
 * One command -> N deployable demo sites + a single sales-ready index URL.
 * This is what makes "営業デモURLの量産" literal: scale the asset that
 * drives conversions without scaling per-site cost.
 */

const INDUSTRY_LABELS = {
  memorial: '霊園・墓石',
  medical: '医療・クリニック',
  professional: '士業・専門サービス',
  care: '介護・福祉',
  manufacturing: '製造・B2B',
  construction: '建設・工務店',
  general: '中小企業'
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function listInputFiles(inputsDir) {
  const entries = await fs.readdir(inputsDir);
  return entries
    .filter((name) => name.toLowerCase().endsWith('.json'))
    .map((name) => path.join(inputsDir, name))
    .sort();
}

function renderGallery(cards) {
  const cardHtml = cards
    .map(
      (c) => `      <a href="./${escapeHtml(c.slug)}/index.html" class="group block overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:shadow-lg">
        <div class="h-28" style="background:linear-gradient(135deg, ${c.accent} 0%, ${c.accentDark} 100%)"></div>
        <div class="p-5">
          <span class="text-xs font-medium text-slate-500">${escapeHtml(c.industryLabel)}</span>
          <h2 class="mt-1 text-lg font-semibold text-slate-900 group-hover:underline">${escapeHtml(c.companyName)}</h2>
          <p class="mt-2 line-clamp-2 text-sm text-slate-600">${escapeHtml(c.concept)}</p>
          <span class="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-700">デモを開く <span aria-hidden="true">→</span></span>
        </div>
      </a>`
    )
    .join('\n');

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>リニューアル提案デモ一覧</title>
  <meta name="robots" content="noindex" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>body{font-feature-settings:"palt"}.line-clamp-2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}</style>
</head>
<body class="bg-slate-50 text-slate-800 antialiased">
  <header class="bg-slate-900 py-12 text-white">
    <div class="mx-auto max-w-6xl px-6">
      <h1 class="text-2xl font-bold sm:text-3xl">Webサイトリニューアル提案デモ</h1>
      <p class="mt-3 text-slate-300">各社向けに作成したデモサイトの一覧です（${cards.length}件）。カードから個別デモを開けます。</p>
    </div>
  </header>
  <main class="mx-auto max-w-6xl px-6 py-12">
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
${cardHtml}
    </div>
  </main>
  <footer class="py-10 text-center text-xs text-slate-400">Demo redesign concept — 営業提案用デモの一覧ページです。</footer>
</body>
</html>
`;
}

// Keep theme colors in sync with build-demo-site.js for gallery thumbnails.
const THEME_COLORS = {
  memorial: ['#2f6b4f', '#1f4a37'],
  medical: ['#1f6fb2', '#155080'],
  professional: ['#1f3a5f', '#13263f'],
  care: ['#c9742b', '#9c581f'],
  manufacturing: ['#37597a', '#243c52'],
  construction: ['#b9772b', '#8a591f'],
  general: ['#3a4db5', '#283787']
};

async function main() {
  const inputsDir = path.resolve('data/inputs');
  const sitesDir = path.resolve('data/sites');
  await ensureDir(sitesDir);

  const inputFiles = await listInputFiles(inputsDir);
  if (inputFiles.length === 0) {
    console.error('No input JSON files found in data/inputs');
    process.exit(1);
  }

  const cards = [];
  let ok = 0;
  let failed = 0;

  for (const inputPath of inputFiles) {
    try {
      const manusJson = await readJsonFile(inputPath);
      const slugBase =
        manusJson.companySlug || manusJson.companyName || fileNameWithoutExt(inputPath);
      const slug = createSafeSlug(slugBase, 'site');
      const outDir = path.join(sitesDir, slug);
      await ensureDir(outDir);

      for (const file of buildDemoSiteFiles(manusJson)) {
        const filePath = path.join(outDir, file.path);
        await ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, file.content, 'utf-8');
      }

      const industry = detectIndustry(manusJson);
      const [accent, accentDark] = THEME_COLORS[industry] ?? THEME_COLORS.general;
      cards.push({
        slug,
        companyName: pickFirstValue(manusJson, ['companyName', 'company', 'name'], '対象企業'),
        concept: pickFirstValue(manusJson, ['siteConcept', 'proposedConcept'], ''),
        industryLabel: INDUSTRY_LABELS[industry] ?? INDUSTRY_LABELS.general,
        accent,
        accentDark
      });
      ok += 1;
      console.log(`  ✓ ${slug}`);
    } catch (error) {
      failed += 1;
      console.error(`  ✗ ${path.basename(inputPath)}: ${error.message}`);
    }
  }

  await fs.writeFile(path.join(sitesDir, 'index.html'), renderGallery(cards), 'utf-8');
  console.log(`\nDone. ${ok} site(s) built, ${failed} failed.`);
  console.log(`Gallery: ${path.join(sitesDir, 'index.html')}`);
}

main().catch((error) => {
  console.error('Batch build failed:', error.message);
  process.exit(1);
});
