import fs from 'fs/promises';
import path from 'path';

// ファイル名用スラッグ。日本語はそのまま残し、FS的に危険な文字だけ除去/置換する。
function fileSlug(name) {
  const s = String(name || 'sample')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '') // FS禁止文字を除去
    .replace(/[\s　]+/g, '-'); // 空白をハイフンに
  return s || 'sample';
}

/**
 * 店名＋業種から「御社専用サンプルサイト」(1ページHTML) を生成する。
 * 営業訪問時に見せる “勝手に作ったサンプル” 用。外部依存なし・単一HTML。
 *
 * 使い方:
 *   node scripts/make-sample.js "うさぎ家" "居酒屋"
 *   node scripts/make-sample.js --from-csv data/leads/saitama-all-wards-2026-06-20.csv --limit 5
 *
 * 出力: samples/output/<slug>.html
 */

// 業種 → テーマの振り分け
const CATEGORY_THEME = [
  { theme: 'izakaya', keys: ['居酒屋', 'バー', 'パブ', '焼き鳥', '焼肉', 'スナック'] },
  { theme: 'cafe', keys: ['カフェ', '喫茶', 'コーヒー', 'デザート', '軽食', 'テイクアウト', 'ベーカリー', 'パン'] },
  { theme: 'noodle', keys: ['ラーメン', '中華', '台湾', 'インド', '韓国', 'ピザ', 'ファースト'] },
  { theme: 'dining', keys: ['レストラン', '和食', '寿司', 'イタリア', '洋食', 'ステーキ', 'とんかつ', '食堂', '料理'] }
];

const THEMES = {
  izakaya: {
    label: '居酒屋・バー',
    bg: '#1a1410',
    panel: '#241c16',
    text: '#f3ece2',
    sub: '#bdae9a',
    accent: '#d98b3a',
    tagline: '今日のおつかれに、一杯とひと皿を。',
    intro: '地元に愛される、こだわりの一品料理と厳選のお酒。仕事帰りも、仲間との集まりも、ふらりとどうぞ。',
    menu: ['本日の鮮魚お造り', '名物 串焼き盛り合わせ', '自家製だし巻き玉子', '季節の旬野菜天ぷら', '〆の出汁茶漬け'],
    cta: 'ご予約・お問い合わせ'
  },
  cafe: {
    label: 'カフェ',
    bg: '#faf6f0',
    panel: '#ffffff',
    text: '#3a352f',
    sub: '#8a8175',
    accent: '#c08552',
    tagline: 'ゆっくり流れる、わたしの時間。',
    intro: '丁寧に淹れた一杯と、手づくりの焼き菓子。日々の合間に、ほっとひと息つける場所をご用意しています。',
    menu: ['本日のスペシャルティcoffee', '自家製チーズケーキ', '季節のフルーツタルト', '世界が大好きなランチプレート', 'こだわりのカフェラテ'],
    cta: 'アクセス・営業時間'
  },
  noodle: {
    label: '麺・中華',
    bg: '#fff8f0',
    panel: '#ffffff',
    text: '#2b2320',
    sub: '#7a6f66',
    accent: '#d1402f',
    tagline: '一杯入魂。湯気の向こうに、笑顔を。',
    intro: '毎日仕込む自慢のスープと、もちもちの自家製麺。お腹も心も満たす、変わらない一杯をどうぞ。',
    menu: ['特製らーめん', '当店名物 餃子', 'チャーシュー丼', '辛口担々麺', '日替わり定食'],
    cta: 'お店の場所・営業時間'
  },
  dining: {
    label: 'ダイニング',
    bg: '#f7f5f1',
    panel: '#ffffff',
    text: '#2c2a26',
    sub: '#827c72',
    accent: '#9a7b4f',
    tagline: '素材を、いちばん美味しい瞬間に。',
    intro: '旬の食材を活かした、季節ごとのお料理。記念日のお食事から普段使いまで、心を込めてお迎えします。',
    menu: ['本日のおまかせコース', '旬の前菜盛り合わせ', 'シェフ自慢のメイン料理', '季節の一汁三菜', '食後のデザート'],
    cta: 'ご予約・お問い合わせ'
  }
};

export function resolveTheme(category) {
  const c = String(category || '');
  for (const { theme, keys } of CATEGORY_THEME) {
    if (keys.some((k) => c.includes(k))) return theme;
  }
  return 'dining';
}

export function renderSampleHtml({ name, category }) {
  const theme = THEMES[resolveTheme(category)];
  const safeName = String(name || '店舗名').trim();
  const cat = String(category || '飲食店').trim();
  const menuItems = theme.menu
    .map((m) => `<li class="menu-item"><span>${m}</span><span class="dots"></span><span class="price">¥—</span></li>`)
    .join('\n          ');

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${safeName}｜${cat}</title>
<style>
  :root{
    --bg:${theme.bg}; --panel:${theme.panel}; --text:${theme.text};
    --sub:${theme.sub}; --accent:${theme.accent};
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:"Hiragino Kaku Gothic ProN","Yu Gothic",system-ui,sans-serif;
    background:var(--bg);color:var(--text);line-height:1.8;-webkit-font-smoothing:antialiased}
  .wrap{max-width:960px;margin:0 auto;padding:0 24px}
  header.hero{min-height:70vh;display:flex;flex-direction:column;justify-content:center;
    align-items:center;text-align:center;padding:80px 24px;
    background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 12%,var(--bg)),var(--bg))}
  .badge{font-size:13px;letter-spacing:.3em;color:var(--accent);margin-bottom:20px}
  h1{font-size:clamp(34px,7vw,64px);font-weight:800;letter-spacing:.04em;margin-bottom:18px}
  .tagline{font-size:clamp(15px,2.6vw,20px);color:var(--sub)}
  .btn{display:inline-block;margin-top:34px;padding:14px 34px;border-radius:999px;
    background:var(--accent);color:#fff;text-decoration:none;font-weight:700;letter-spacing:.08em}
  section{padding:64px 0;border-top:1px solid color-mix(in srgb,var(--sub) 24%,transparent)}
  h2{font-size:24px;letter-spacing:.12em;margin-bottom:24px;color:var(--accent)}
  .intro{font-size:17px;color:var(--text);max-width:640px}
  .menu-list{list-style:none;max-width:560px}
  .menu-item{display:flex;align-items:baseline;gap:10px;padding:12px 0;
    border-bottom:1px dashed color-mix(in srgb,var(--sub) 35%,transparent)}
  .menu-item .dots{flex:1}
  .price{color:var(--sub)}
  .info{display:grid;grid-template-columns:120px 1fr;gap:12px 24px;max-width:560px}
  .info dt{color:var(--accent);font-weight:700}
  .info dd{color:var(--text)}
  footer{padding:48px 24px;text-align:center;color:var(--sub);font-size:13px;
    border-top:1px solid color-mix(in srgb,var(--sub) 24%,transparent)}
  .demo-note{background:color-mix(in srgb,var(--accent) 14%,var(--bg));
    color:var(--text);text-align:center;padding:10px;font-size:13px;letter-spacing:.05em}
</style>
</head>
<body>
  <div class="demo-note">★ これは営業ご提案用のデモサンプルです（${safeName} 様専用イメージ）</div>
  <header class="hero">
    <div class="badge">${cat}</div>
    <h1>${safeName}</h1>
    <p class="tagline">${theme.tagline}</p>
    <a class="btn" href="#contact">${theme.cta}</a>
  </header>

  <section>
    <div class="wrap">
      <h2>ABOUT</h2>
      <p class="intro">${theme.intro}</p>
    </div>
  </section>

  <section>
    <div class="wrap">
      <h2>MENU</h2>
      <ul class="menu-list">
          ${menuItems}
      </ul>
      <p style="margin-top:16px;color:var(--sub);font-size:13px">※メニュー・価格はサンプルです。実際の内容に差し替えできます。</p>
    </div>
  </section>

  <section id="contact">
    <div class="wrap">
      <h2>INFORMATION</h2>
      <dl class="info">
        <dt>店名</dt><dd>${safeName}</dd>
        <dt>業種</dt><dd>${cat}</dd>
        <dt>営業時間</dt><dd>11:00 - 22:00（サンプル）</dd>
        <dt>定休日</dt><dd>—</dd>
        <dt>ご予約</dt><dd>お電話にて承ります</dd>
      </dl>
    </div>
  </section>

  <footer>
    ${safeName}　|　${cat}<br />
    <span style="opacity:.8">Website sample created for proposal — 初期費用 5万円 / 月額 1万円</span>
  </footer>
</body>
</html>`;
}

function parseCsvLine(line) {
  const cells = [];
  let cur = '';
  let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) {
      cells.push(cur);
      cur = '';
    } else cur += ch;
  }
  cells.push(cur);
  return cells;
}

async function writeSample(name, category) {
  const html = renderSampleHtml({ name, category });
  const slug = fileSlug(name);
  const outPath = path.resolve('samples/output', `${slug}.html`);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, html, 'utf-8');
  return outPath;
}

async function main() {
  const argv = process.argv.slice(2);

  if (argv[0] === '--from-csv') {
    const csvPath = argv[1];
    const limitArg = argv.find((a) => a.startsWith('--limit='));
    const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;
    if (!csvPath) {
      console.error('Usage: node scripts/make-sample.js --from-csv <path> [--limit=N]');
      process.exit(1);
    }
    const raw = await fs.readFile(path.resolve(csvPath), 'utf-8');
    const rows = raw.trim().split('\n').slice(1).map(parseCsvLine);
    let count = 0;
    for (const r of rows) {
      if (count >= limit) break;
      // 統合CSV列: 区,店名,業種,...
      const name = r[1];
      const category = r[2];
      if (!name) continue;
      const out = await writeSample(name, category);
      console.log(`生成: ${out}  [${category} → ${resolveTheme(category)}]`);
      count += 1;
    }
    console.log(`\n${count}件のサンプルを生成しました。`);
    return;
  }

  const [name, category] = argv;
  if (!name) {
    console.error('Usage: node scripts/make-sample.js "店名" "業種"');
    console.error('   or: node scripts/make-sample.js --from-csv <path> [--limit=N]');
    process.exit(1);
  }
  const out = await writeSample(name, category || '飲食店');
  console.log(`生成: ${out}  [${category || '飲食店'} → ${resolveTheme(category)}]`);
}

main().catch((error) => {
  console.error('サンプル生成に失敗しました:', error.message);
  process.exit(1);
});
