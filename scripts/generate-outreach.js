import path from 'path';
import fs from 'fs/promises';
import { normalizeArray } from './create-site-spec.js';
import { createSafeSlug, ensureDir, pickFirstValue } from './utils.js';

/**
 * Outreach generator — turn each input JSON into a ready-to-send,
 * personalized outreach draft (initial + follow-up) with the prospect's
 * real site issue, strength, and demo URL filled in, plus a pipeline row
 * to track status.
 *
 *   npm run outreach -- --base-url https://demos.example.com
 *   npm run outreach -- --base-url https://demos.example.com data/inputs/sample.json
 *
 * Hand-filling templates per company is the friction that caps how many
 * demos you actually send. Removing it scales throughput -> the cheapest
 * lever in the revenue model. Compliance checklist stays in
 * gtm/outreach-templates.md; sender details are placeholders to fill once.
 */

const PIPELINE_COLUMNS = ['slug', 'companyName', 'website', 'demoUrl', 'status', 'lastContact', 'notes'];

function parseArgs(argv) {
  const opts = { baseUrl: 'https://YOUR-DEMO-DOMAIN', inputs: [] };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--base-url') {
      opts.baseUrl = (argv[i + 1] ?? opts.baseUrl).replace(/\/+$/, '');
      i += 1;
    } else if (!argv[i].startsWith('--')) {
      opts.inputs.push(argv[i]);
    }
  }
  return opts;
}

async function listInputs(explicit) {
  if (explicit.length) return explicit.map((p) => path.resolve(p));
  const dir = path.resolve('data/inputs');
  const entries = await fs.readdir(dir);
  return entries
    .filter((n) => n.toLowerCase().endsWith('.json'))
    .map((n) => path.join(dir, n))
    .sort();
}

function firstSentence(text) {
  return String(text).split(/[。\n]/)[0].trim();
}

function buildDrafts({ companyName, website, demoUrl, observation, strength }) {
  return `# ${companyName} 向けアウトリーチ下書き

- 既存サイト: ${website}
- デモURL: ${demoUrl}
- 送信前に \`gtm/outreach-templates.md\` のコンプライアンスチェックを必ず確認

---

## 1. 初回（メール / 問い合わせフォーム）

件名: 【${companyName}様】Webサイトのリニューアル案を作成しました（無料・確認用）

ご担当者様

突然のご連絡失礼いたします。{自社名}の{氏名}と申します。
地方の中小企業様向けにWebサイトのリニューアル制作を行っております。

貴社サイトを拝見し、${observation}と感じ、確認用のデモページを試作しました。
${strength}という強みが初見で伝わる構成を意識しています。

▼ デモ（${companyName}様向け・提案用）
${demoUrl}

※既存の文章・画像は使用せず独自に再構成したサンプルです。費用は一切かかりません。
不要であればご放念ください。以後の案内が不要な場合はその旨ご返信ください。

ご興味があれば15分ほどで改善ポイントと費用感をご説明します。
ご都合のよい候補日を2〜3いただけますでしょうか。

------------------------------
{自社名} {氏名} / {電話} / {メール} / {住所}
------------------------------

## 2. フォローアップ（3〜5営業日後・1回のみ）

件名: Re: 【${companyName}様】リニューアルデモの件

ご担当者様

先日お送りしたデモページの件、いかがでしたでしょうか。
${demoUrl}

「今は不要」「別担当へ」等でも構いませんので一言いただけますと幸いです。
（以後の案内が不要な場合はその旨ご返信ください。）
`;
}

// --- Minimal CSV read/write for the pipeline tracker (controlled columns) ---
function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function parseCsvLine(line) {
  const out = [];
  let field = '';
  let q = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      out.push(field);
      field = '';
    } else field += c;
  }
  out.push(field);
  return out;
}

async function readPipeline(p) {
  try {
    const text = (await fs.readFile(p, 'utf-8')).replace(/\r\n?/g, '\n').trim();
    if (!text) return new Map();
    const lines = text.split('\n');
    const header = parseCsvLine(lines[0]);
    const map = new Map();
    for (const line of lines.slice(1)) {
      if (!line.trim()) continue;
      const cells = parseCsvLine(line);
      const row = {};
      header.forEach((h, i) => (row[h] = cells[i] ?? ''));
      if (row.slug) map.set(row.slug, row);
    }
    return map;
  } catch {
    return new Map();
  }
}

function writePipeline(rows) {
  const head = PIPELINE_COLUMNS.join(',');
  const body = rows.map((r) => PIPELINE_COLUMNS.map((c) => csvEscape(r[c])).join(',')).join('\n');
  return `${head}\n${body}\n`;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const inputs = await listInputs(opts.inputs);
  if (inputs.length === 0) {
    console.error('No input JSON files found.');
    process.exit(1);
  }

  const outDir = path.resolve('data/outreach');
  await ensureDir(outDir);
  const pipelinePath = path.join(outDir, 'pipeline.csv');
  const existing = await readPipeline(pipelinePath);

  let written = 0;
  for (const inputPath of inputs) {
    const json = JSON.parse(await fs.readFile(inputPath, 'utf-8'));
    const companyName = pickFirstValue(json, ['companyName', 'company', 'name'], '対象企業');
    const website = pickFirstValue(json, ['website', 'url', 'siteUrl'], '');
    const slug = createSafeSlug(json.companySlug || companyName, 'site');
    const demoUrl = `${opts.baseUrl}/${slug}/`;

    const issues = normalizeArray(json.currentSiteIssues ?? json.issues);
    const overview = normalizeArray(json.companyOverview ?? json.overview);
    const concept = normalizeArray(json.siteConcept ?? json.proposedConcept);
    const observation = issues.length
      ? `${firstSentence(issues[0])}という点が改善できる`
      : 'スマートフォンでの見やすさや問い合わせ導線を改善できる';
    const strength = firstSentence(overview[0] || concept[0] || '地域に根ざしたサービス');

    const md = buildDrafts({ companyName, website, demoUrl, observation, strength });
    await fs.writeFile(path.join(outDir, `${slug}.md`), md, 'utf-8');
    written += 1;

    // Seed/merge the pipeline row, preserving any existing status/notes.
    const prev = existing.get(slug) ?? {};
    existing.set(slug, {
      slug,
      companyName,
      website,
      demoUrl,
      status: prev.status || '未送付',
      lastContact: prev.lastContact || '',
      notes: prev.notes || ''
    });
    console.log(`  ✓ ${slug}.md`);
  }

  await fs.writeFile(pipelinePath, writePipeline([...existing.values()]), 'utf-8');
  console.log(`\nDone. ${written} draft(s) written. Pipeline: ${pipelinePath}`);
  if (opts.baseUrl.includes('YOUR-DEMO-DOMAIN')) {
    console.log('ヒント: 公開URLが決まったら --base-url を指定して再実行するとデモURLが埋まります。');
  }
}

main().catch((error) => {
  console.error('Outreach generation failed:', error.message);
  process.exit(1);
});
