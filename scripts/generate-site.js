import path from 'path';
import { buildDemoSiteFiles } from './build-demo-site.js';
import {
  createSafeSlug,
  ensureDir,
  fileNameWithoutExt,
  readJsonFile
} from './utils.js';
import fs from 'fs/promises';

/**
 * Build a deployable demo site from a Manus research JSON.
 *
 *   npm run build:site -- data/inputs/sample.json
 *
 * Output: data/sites/{slug}/ (index.html + _headers), ready to drop onto
 * Cloudflare Pages or any static host with no build step.
 */
async function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    console.error('Usage: node scripts/generate-site.js <path-to-input-json>');
    process.exit(1);
  }

  const absInputPath = path.resolve(inputPath);
  const manusJson = await readJsonFile(absInputPath);

  const slugBase = manusJson.companySlug || manusJson.companyName || fileNameWithoutExt(inputPath);
  const slug = createSafeSlug(slugBase, 'site');

  const outDir = path.resolve('data/sites', slug);
  await ensureDir(outDir);

  const files = buildDemoSiteFiles(manusJson);
  for (const file of files) {
    const filePath = path.join(outDir, file.path);
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, file.content, 'utf-8');
  }

  console.log(`Generated demo site: ${path.join(outDir, 'index.html')}`);
}

main().catch((error) => {
  console.error('Failed to generate demo site:', error.message);
  process.exit(1);
});
