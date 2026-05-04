import path from 'path';
import { createSiteSpecMarkdown } from './create-site-spec.js';
import {
  createSafeSlug,
  fileNameWithoutExt,
  readJsonFile,
  writeMarkdownFile
} from './utils.js';

function validateInputJson(input) {
  const requiredFields = [
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

  const missing = requiredFields.filter((field) => {
    const value = input?.[field];
    if (Array.isArray(value)) return value.length === 0;
    return typeof value !== 'string' || value.trim() === '';
  });

  if (missing.length > 0) {
    throw new Error(`入力JSONの必須項目が不足しています: ${missing.join(', ')}`);
  }
}

async function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    console.error('Usage: node scripts/run-one.js <path-to-input-json>');
    process.exit(1);
  }

  const absInputPath = path.resolve(inputPath);
  const manusJson = await readJsonFile(absInputPath);
  validateInputJson(manusJson);

  const slugBase = manusJson.companySlug || manusJson.companyName || fileNameWithoutExt(inputPath);
  const slug = createSafeSlug(slugBase, 'site');

  const markdown = createSiteSpecMarkdown(manusJson, { inputPath });
  const outputPath = path.resolve('data/outputs', `${slug}-site-spec.md`);

  await writeMarkdownFile(outputPath, markdown);
  console.log(`Generated: ${outputPath}`);
}

main().catch((error) => {
  console.error('Failed to generate site spec:', error.message);
  process.exit(1);
});
