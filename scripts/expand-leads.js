import path from 'path';
import fs from 'fs/promises';
import { buildInputFromLead } from './industry-templates.js';
import { createSafeSlug, ensureDir } from './utils.js';

/**
 * Lead expander — turn a thin CSV of prospects into complete input JSONs.
 *
 *   npm run leads -- data/leads/prospects.csv
 *   npm run leads -- data/leads/prospects.csv --force
 *
 * Each CSV row (companyName, website, industry, ...) becomes a
 * validation-passing data/inputs/{slug}.json via industry templates.
 * Chain with `npm run build:all` to mass-produce demo sites.
 *
 * Scaling "leads in" is how you scale "demos sent" — the cheapest lever
 * in the revenue model.
 */

/** Minimal RFC4180-ish CSV parser: handles quotes, escaped quotes, commas/newlines in quotes. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/\r\n?/g, '\n');

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function rowsToObjects(rows) {
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const obj = {};
    header.forEach((key, i) => {
      const val = (cells[i] ?? '').trim();
      if (val !== '') obj[key] = val;
    });
    return obj;
  });
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const csvPath = process.argv[2];
  const force = process.argv.includes('--force');

  if (!csvPath) {
    console.error('Usage: node scripts/expand-leads.js <path-to-csv> [--force]');
    process.exit(1);
  }

  const text = await fs.readFile(path.resolve(csvPath), 'utf-8');
  const leads = rowsToObjects(parseCsv(text));
  if (leads.length === 0) {
    console.error('No lead rows found in CSV.');
    process.exit(1);
  }

  const inputsDir = path.resolve('data/inputs');
  await ensureDir(inputsDir);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const lead of leads) {
    try {
      const input = buildInputFromLead(lead);
      const slug = createSafeSlug(input.companySlug || input.companyName, 'lead');
      input.companySlug = slug;
      const outPath = path.join(inputsDir, `${slug}.json`);

      if (!force && (await fileExists(outPath))) {
        skipped += 1;
        console.log(`  - ${slug}.json (既存・スキップ)`);
        continue;
      }
      await fs.writeFile(outPath, `${JSON.stringify(input, null, 2)}\n`, 'utf-8');
      created += 1;
      console.log(`  ✓ ${slug}.json`);
    } catch (error) {
      failed += 1;
      console.error(`  ✗ ${lead.companyName ?? '(no name)'}: ${error.message}`);
    }
  }

  console.log(`\nDone. ${created} created, ${skipped} skipped, ${failed} failed.`);
  if (created > 0) console.log('次: npm run build:all  でデモサイトとギャラリーを一括生成できます。');
}

main().catch((error) => {
  console.error('Lead expansion failed:', error.message);
  process.exit(1);
});
