import path from 'path';
import { createSiteSpecMarkdown } from './create-site-spec.js';
import {
  createSafeSlug,
  fileNameWithoutExt,
  readJsonFile,
  writeMarkdownFile
} from './utils.js';

function hasContent(value) {
  if (Array.isArray(value)) return value.some((item) => String(item ?? '').trim());
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
}

function validateInputJson(input) {
  const recommendedFields = [
    'companyName',
    'website',
    'companyOverview',
    'currentSiteIssues',
    'targetCustomers',
    'siteConcept',
    'recommendedPages',
    'firstViewIdeas',
    'ctaIdeas',
    'designTone',
    'buildInstruction'
  ];

  const missing = recommendedFields.filter((field) => !hasContent(input?.[field]));
  return { missing };
}

async function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    console.error('Usage: node scripts/run-one.js <path-to-input-json>');
    process.exit(1);
  }

  const absInputPath = path.resolve(inputPath);
  const manusJson = await readJsonFile(absInputPath);
  const { missing } = validateInputJson(manusJson);

  if (missing.length > 0) {
    console.warn(
      `[WARN] 入力JSONに未入力の推奨項目があります（可能な範囲で生成を続行）: ${missing.join(', ')}`
    );
  }

  const slugBase = manusJson.companySlug || manusJson.companyName || fileNameWithoutExt(inputPath);
  const slug = createSafeSlug(slugBase, 'site');

  const markdown = createSiteSpecMarkdown(manusJson, { inputPath, missingFields: missing });
  const outputPath = path.resolve('data/outputs', `${slug}-site-spec.md`);

  await writeMarkdownFile(outputPath, markdown);
  console.log(`Generated: ${outputPath}`);
}

main().catch((error) => {
  console.error('Failed to generate site spec:', error.message);
  process.exit(1);
});
