import fs from 'fs/promises';
import path from 'path';
import { readJsonFile } from './utils.js';
import { writeFileEnsured, parseCsv, csvCell, escapeHtml as esc } from './demo/helpers.js';
import { VERTICALS, resolveVertical } from './demo/verticals.js';
import { renderSite } from './demo/render-site.js';

// 統合営業CRM / leads_*.csv の様々なヘッダ名を吸収するためのフィールド別名。
// 注意: CRMの「サイト区分」は自社サイト有無の区分(A/B/C/D)であり、業種ではないため vertical には含めない。
const FIELD = {
  // place_id 等を id に拾うと URL が汚くなるので、明示の slug/デモID 指定時のみ採用（既定は k001 採番）。
  id: ['slug', 'デモID'],
  name: ['name', 'displayName', 'companyName', '会社名', '店名', '店舗名', '名称', '社名', '事業者名'],
  area: ['area', 'area_name', 'エリア', 'エリア名', '地域', '駅'],
  vertical: ['vertical', '業種', '業種・種別', '業種名', '種別', 'business', 'category', 'カテゴリ'],
  reviewCount: ['reviewCount', 'review_count', 'userRatingCount', '口コミ数', '口コミ件数', 'クチコミ数', 'クチコミ', '口コミ', 'reviews', 'レビュー数'],
  website: ['website', 'websiteUri', '既存website', '既存サイト', 'サイト', 'サイトURL', 'url', 'HP'],
  placeId: ['place_id', 'placeId', 'placeID', 'placeid'],
};

// --exclude-food 用: これらが業種に含まれる行は除外（GTM方針＝飲食は営業対象外）。
const FOOD_KEYWORDS = [
  '居酒屋', '和食', '洋食', '中華', '飲食', 'レストラン', 'カフェ', '喫茶', 'コーヒー',
  'ラーメン', 'うどん', 'そば', '蕎麦', '寿司', 'すし', '焼肉', '焼き鳥', '焼鳥', '鳥料理',
  'イタリア', 'フレンチ', 'スペイン', '韓国料理', 'タイ料理', 'ステーキ', 'ハンバーガー',
  '定食', '食堂', '丼', 'カレー', 'ピザ', 'パスタ', 'バー', 'バル', 'ダイニング', 'ビストロ',
  '居酒', '酒場', '串', '鍋', 'しゃぶ', 'すき焼', '餃子', 'お好み焼', 'たこ焼', '鉄板',
  'パン', 'ベーカリー', 'スイーツ', 'ケーキ', '甘味', '弁当', '惣菜', '割烹', '料亭', '創作料理',
  // 追加（実データの取りこぼし対策: 「〜料理店/ファーストフード/とんかつ」等）
  '料理', 'ファーストフード', 'ファースト フード', 'フード', 'とんかつ', 'テイクアウト',
  '食料品', '食品', '海鮮', 'シーフード', '魚', 'サンドイッチ', '菓子', '製菓', '軽食',
  'ケバブ', 'サラダ', 'ダイナー', 'アサイー', 'パブ', '鶏', 'グルメ', '食事', '麺', '酒',
  'デリカ', 'グリル', 'スープ', 'ジュース', 'スムージー', 'アイスクリーム', 'ドーナツ',
  'クレープ', 'タピオカ', 'ジェラート', 'チョコ', '飲料',
];

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--out') args.out = argv[(i += 1)];
    else if (a.startsWith('--out=')) args.out = a.slice(6);
    else if (a === '--base-url') args.baseUrl = argv[(i += 1)];
    else if (a.startsWith('--base-url=')) args.baseUrl = a.slice(11);
    else if (a === '--all') args.all = true;
    else if (a === '--exclude-food' || a === '--no-food') args.excludeFood = true;
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

// scan の leads CSV は is_target 列を持つ（1 = Webなし×口コミ≤10 のFS本命）。
// 既定はターゲットのみ生成。--all で全件。is_target 列が無い入力（手書きJSON等）は全件扱い。
function isTargetRow(raw, includeAll) {
  if (includeAll) return true;
  for (const k of ['is_target', 'isTarget', 'ターゲット', 'target']) {
    if (raw[k] !== undefined && String(raw[k]).trim() !== '') {
      const v = String(raw[k]).trim().toLowerCase();
      return v === '1' || v === 'true' || v === 'yes' || v === 'y';
    }
  }
  return true;
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

  // 出力の demo/ を一旦クリア（前回入力で生成され、今回は対象外の会社の残骸を残さない）。
  await fs.rm(path.join(outDir, 'demo'), { recursive: true, force: true });

  const counters = {};
  const generated = [];
  const skipped = [];
  let excluded = 0;
  let foodExcluded = 0;

  for (const raw of rawCompanies) {
    if (!isTargetRow(raw, args.all)) {
      excluded += 1;
      continue;
    }
    const name = pick(raw, FIELD.name);
    if (!name) {
      skipped.push({ name: '(無名)', reason: '社名フィールドが空' });
      continue;
    }
    const rawVertical = pick(raw, FIELD.vertical);
    if (args.excludeFood && FOOD_KEYWORDS.some((k) => rawVertical.includes(k))) {
      foodExcluded += 1;
      continue;
    }
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
  // 画像アセット（任意）: 公開ディレクトリの assets を一旦消してから、リポの assets/ を反映。
  // （古い形式/不要ファイルを残さずアップロードを軽く保つ。無ければプレースホルダのまま＝壊れない）
  await fs.rm(path.join(outDir, 'assets'), { recursive: true, force: true });
  try {
    await fs.access(path.resolve('assets'));
    await fs.cp(path.resolve('assets'), path.join(outDir, 'assets'), { recursive: true });
  } catch {
    /* assets 無し → スキップ */
  }
  // 顧客リスト由来のURL一覧は公開ディレクトリ(sites/)の外に出す（デプロイで全件が公開されるのを防ぐ）。
  const urlsCsvPath = path.resolve('data/outputs/demo-urls.csv');
  await writeFileEnsured(urlsCsvPath, renderUrlsCsv(generated, baseUrl));

  const rel = (p) => path.relative(process.cwd(), p);
  console.log(`\n生成完了: ${generated.length}件 → ${rel(outDir)}/`);
  const byVertical = {};
  generated.forEach((g) => {
    byVertical[g.verticalName] = (byVertical[g.verticalName] || 0) + 1;
  });
  Object.entries(byVertical).forEach(([n, ct]) => console.log(`  - ${n}: ${ct}件`));
  if (excluded) console.log(`  対象外(is_target≠1)を除外: ${excluded}件（全件出すなら --all）`);
  if (foodExcluded) console.log(`  飲食を除外: ${foodExcluded}件（--exclude-food）`);
  const fallbackCount = generated.filter((g) => g.resolvedBy === 'fallback').length;
  if (fallbackCount) console.log(`  うち汎用テンプレ(general)に着地: ${fallbackCount}件（業種名のエイリアスを足せば専用テーマに割当可）`);
  console.log(`  ギャラリー : ${rel(path.join(outDir, 'index.html'))}`);
  console.log(`  デモURL一覧: ${rel(urlsCsvPath)}（sites/の外＝非公開）`);
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
