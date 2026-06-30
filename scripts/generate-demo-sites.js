import fs from 'fs/promises';
import path from 'path';
import { readJsonFile } from './utils.js';
import { writeFileEnsured, parseCsv, csvCell, escapeHtml as esc } from './demo/helpers.js';
import { VERTICALS, resolveVertical } from './demo/verticals.js';
import { renderSite } from './demo/render-site.js';

// 統合営業CRM / leads_*.csv の様々なヘッダ名を吸収するためのフィールド別名。
// 注意: CRMの「サイト区分」は自社サイト有無の区分(A/B/C/D)であり、業種ではないため vertical には含めない。
const FIELD = {
  id: ['id', 'ID', 'slug', 'デモID'],
  name: ['name', 'companyName', '会社名', '店舗名', '社名', '事業者名'],
  area: ['area', 'エリア', '地域', '駅', 'エリア名'],
  vertical: ['vertical', '業種', 'business', 'category', 'カテゴリ', '業種カテゴリ'],
  reviewCount: ['reviewCount', '口コミ数', '口コミ', 'reviews', 'レビュー数', 'クチコミ数'],
  website: ['website', '既存website', '既存サイト', 'url', 'site', 'HP'],
  placeId: ['placeId', 'place_id', 'placeID'],
};

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--out') args.out = argv[(i += 1)];
    else if (a.startsWith('--out=')) args.out = a.slice(6);
    else if (a === '--base-url') args.baseUrl = argv[(i += 1)];
    else if (a.startsWith('--base-url=')) args.baseUrl = a.slice(11);
    else args._.push(a);
  }
  return args;
}

function pick(obj, keys) {
  for (const k of keys) {
    const val = obj?.[k];
    if (val !== undefined && val !== null && String(val).trim() !== '') return String(val).trim();
  }
  return '';
}

function pad(n, width = 3) {
  return String(n).padStart(width, '0');
}

async function loadCompanies(inputPath) {
  const ext = path.extname(inputPath).toLowerCase();
  if (ext === '.csv') {
    const text = await fs.readFile(inputPath, 'utf-8');
    return parseCsv(text);
  }
  const data = await readJsonFile(inputPath);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.companies)) return data.companies;
  throw new Error('入力JSONは配列、または { "companies": [...] } 形式にしてください。');
}

function renderGallery(generated) {
  const cards = generated
    .map(
      (g) => `
      <a class="g-card" href="${esc(g.rel)}">
        <span class="g-tag">${esc(g.verticalName)}</span>
        <h3>${esc(g.name)}</h3>
        <p>${esc(g.area || '—')} ・ ${esc(g.id)}</p>
      </a>`
    )
    .join('');
  return `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>みらい編集｜サンプルサイト一覧（${generated.length}件）</title>
<style>
  body{font-family:system-ui,"Noto Sans JP",sans-serif;background:#f4f6fb;color:#16202c;margin:0;line-height:1.7}
  .wrap{max-width:1100px;margin:0 auto;padding:48px 24px}
  h1{font-size:26px;margin:0 0 6px}
  .sub{color:#5d6b7a;margin:0 0 28px;font-size:14px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
  .g-card{display:block;background:#fff;border:1px solid #e7ebf2;border-radius:14px;padding:20px;transition:transform .15s,box-shadow .15s}
  .g-card:hover{transform:translateY(-3px);box-shadow:0 16px 36px -22px rgba(20,40,70,.5)}
  .g-tag{display:inline-block;font-size:11px;font-weight:700;color:#1f5fa8;background:#eef4fb;border-radius:999px;padding:4px 10px}
  .g-card h3{margin:12px 0 4px;font-size:17px}
  .g-card p{margin:0;color:#5d6b7a;font-size:13px}
  .note{margin-top:28px;font-size:12px;color:#8b95a3}
</style></head><body>
<div class="wrap">
  <h1>サンプルサイト一覧</h1>
  <p class="sub">みらい編集 MEO×Website｜新業種デモ ${generated.length}件（提案用サンプル・差し替え前提）</p>
  <div class="grid">${cards}</div>
  <p class="note">各サイトの写真・実績・お客様の声・料金・連絡先は仮置きです。掲載情報の捏造は行いません。</p>
</div></body></html>`;
}

function renderUrlsCsv(generated, baseUrl) {
  const header = ['id', '会社名', 'エリア', '業種', '口コミ数', '既存website', 'place_id', 'デモ相対パス', 'デモURL'];
  const lines = [header.join(',')];
  for (const g of generated) {
    const demoUrl = baseUrl ? `${baseUrl}/${g.rel}` : '';
    lines.push(
      [g.id, g.name, g.area, g.verticalName, g.reviewCount, g.website, g.placeId, g.rel, demoUrl]
        .map(csvCell)
        .join(',')
    );
  }
  return `${lines.join('\n')}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(args._[0] || 'data/companies/sample-companies.json');
  const outDir = path.resolve(args.out || 'sites');
  const baseUrl = (args.baseUrl || '').replace(/\/+$/, '');

  const rawCompanies = await loadCompanies(inputPath);
  if (rawCompanies.length === 0) throw new Error(`入力にデータがありません: ${inputPath}`);

  const counters = {};
  const generated = [];
  const skipped = [];

  for (const raw of rawCompanies) {
    const name = pick(raw, FIELD.name);
    if (!name) {
      skipped.push({ name: '(無名)', reason: '社名フィールドが空' });
      continue;
    }
    const rawVertical = pick(raw, FIELD.vertical);
    const { key, resolvedBy } = resolveVertical(rawVertical, name);
    if (!key) {
      skipped.push({ name, reason: `業種を判別できません (区分=${rawVertical || '空'})` });
      continue;
    }

    const v = VERTICALS[key];
    counters[key] = (counters[key] || 0) + 1;
    const id = pick(raw, FIELD.id) || `${v.prefix}${pad(counters[key])}`;

    const company = {
      id,
      name,
      area: pick(raw, FIELD.area),
      vertical: key,
      reviewCount: pick(raw, FIELD.reviewCount),
      website: pick(raw, FIELD.website),
      placeId: pick(raw, FIELD.placeId),
    };

    const html = renderSite(company);
    await writeFileEnsured(path.join(outDir, 'demo', id, 'index.html'), html);
    generated.push({ ...company, verticalName: v.name, rel: `demo/${id}/`, resolvedBy });
  }

  if (generated.length === 0) throw new Error('生成対象が0件でした（入力フィールド名を確認してください）。');

  await writeFileEnsured(path.join(outDir, 'index.html'), renderGallery(generated));
  // デモは Cloudflare Pages に公開する（既存の mihon-newbiz.pages.dev/demo/<id> と同じ）。
  // 静的ディレクトリはそのまま配信されるため設定ファイルは不要。デモは noindex にしたいので
  // _headers だけ置く。
  await writeFileEnsured(path.join(outDir, '_headers'), '/*\n  X-Robots-Tag: noindex\n');
  await writeFileEnsured(path.join(outDir, 'demo-urls.csv'), renderUrlsCsv(generated, baseUrl));

  const rel = (p) => path.relative(process.cwd(), p);
  console.log(`\n生成完了: ${generated.length}件 → ${rel(outDir)}/`);
  const byVertical = {};
  generated.forEach((g) => {
    byVertical[g.verticalName] = (byVertical[g.verticalName] || 0) + 1;
  });
  Object.entries(byVertical).forEach(([n, ct]) => console.log(`  - ${n}: ${ct}件`));
  console.log(`  ギャラリー : ${rel(path.join(outDir, 'index.html'))}`);
  console.log(`  デモURL一覧: ${rel(path.join(outDir, 'demo-urls.csv'))}`);
  if (!baseUrl) console.log('  （--base-url <公開URL> を渡すと demo-urls.csv の「デモURL」列が埋まります）');
  if (skipped.length) {
    console.log(`\nスキップ: ${skipped.length}件`);
    skipped.forEach((s) => console.log(`  - ${s.name}: ${s.reason}`));
  }
}

main().catch((err) => {
  console.error('生成に失敗しました:', err.message);
  process.exit(1);
});
