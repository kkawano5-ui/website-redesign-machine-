import path from 'path';
import { createSiteSpecMarkdown } from './create-site-spec.js';
import {
  createSafeSlug,
  fileNameWithoutExt,
  readJsonFile,
  writeMarkdownFile
} from './utils.js';

async function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    console.error('Usage: node scripts/run-one.js <path-to-input-json>');
    process.exit(1);
  }

  const absInputPath = path.resolve(inputPath);
  const manusJson = await readJsonFile(absInputPath);

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
