import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';

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

// 業種 → テーマの振り分け（上から順にマッチ。具体的なものを先に）
const CATEGORY_THEME = [
  { theme: 'ramen', keys: ['ラーメン', 'らーめん', 'つけ麺', '担々'] },
  { theme: 'coffee', keys: ['コーヒー', '珈琲'] },
  { theme: 'yakiniku', keys: ['焼肉', '焼き鳥', 'やきとり', 'ホルモン', '炭火', 'ジンギスカン'] },
  { theme: 'bar', keys: ['バー', 'スナック', 'パブ', 'ダーツ'] },
  { theme: 'izakaya', keys: ['居酒屋', '酒場', '大衆', '酒処', '呑み'] },
  { theme: 'chinese', keys: ['中華', '台湾', '餃子'] },
  { theme: 'ethnic', keys: ['インド', 'ネパール', '韓国', 'タイ', 'ベトナム', 'エスニック', 'アジア'] },
  { theme: 'washoku', keys: ['和食', '寿司', 'すし', 'そば', '蕎麦', 'うどん', 'うなぎ', '鰻', 'とんかつ', '天ぷら', '日本料理', '割烹', '食堂'] },
  { theme: 'cafe', keys: ['カフェ', '喫茶', 'デザート', 'スイーツ', 'パン', 'ベーカリー', 'クレープ'] },
  { theme: 'takeout', keys: ['テイクアウト', '弁当', 'ファースト', '軽食'] },
  { theme: 'western', keys: ['イタリア', '洋食', 'ステーキ', 'ピザ', 'フレンチ', 'ハンバーガー', 'ビストロ', 'レストラン'] }
];

const THEMES = {
  izakaya: {
    label: '居酒屋',
    bg: '#1a1410', panel: '#241c16', text: '#f3ece2', sub: '#bdae9a', accent: '#d98b3a',
    tagline: '今日のおつかれに、一杯とひと皿を。',
    intro: '地元に愛される、こだわりの一品料理と厳選のお酒。仕事帰りも、仲間との集まりも、ふらりとどうぞ。',
    menu: ['本日の鮮魚お造り', '名物 串焼き盛り合わせ', '自家製だし巻き玉子', '季節の旬野菜天ぷら', '〆の出汁茶漬け'],
    cta: 'ご予約・お問い合わせ'
  },
  bar: {
    label: 'バー・スナック',
    bg: '#0f0f14', panel: '#181820', text: '#ece9f2', sub: '#a39db8', accent: '#b08cff',
    tagline: '夜を、もう少しだけ特別に。',
    intro: '落ち着いた灯りと、丁寧に作る一杯。仕事帰りの一息にも、大切な人との時間にも。静かに寄り添うお店です。',
    menu: ['バーテンダーおまかせカクテル', '厳選ウイスキー各種', '本日のおすすめワイン', 'チーズの盛り合わせ', 'ナッツ＆ドライフルーツ'],
    cta: 'ご予約・営業時間'
  },
  yakiniku: {
    label: '焼肉・焼き鳥',
    bg: '#181210', panel: '#221814', text: '#f5e9e2', sub: '#c4a99a', accent: '#e0533a',
    tagline: '炭火が、いちばんのごちそう。',
    intro: '厳選したお肉を、炭火で香ばしく。脂の旨み、立ちのぼる煙、その一瞬を味わいに。ご家族でもお仲間とも。',
    menu: ['特選カルビ', '本日の希少部位', '名物 串焼き五種盛り', '自家製タレの焼き鳥', '〆の冷麺'],
    cta: 'ご予約・お問い合わせ'
  },
  ramen: {
    label: 'ラーメン',
    bg: '#fff8f0', panel: '#ffffff', text: '#2b2320', sub: '#7a6f66', accent: '#d1402f',
    tagline: '一杯入魂。湯気の向こうに、笑顔を。',
    intro: '毎日仕込む自慢のスープと、もちもちの自家製麺。お腹も心も満たす、変わらない一杯をどうぞ。',
    menu: ['特製らーめん', '濃厚つけ麺', 'チャーシュー丼', '辛口担々麺', '名物 餃子'],
    cta: 'お店の場所・営業時間'
  },
  chinese: {
    label: '中華',
    bg: '#1c0f0d', panel: '#2a1714', text: '#f7ece0', sub: '#cbab8f', accent: '#e0b341',
    tagline: '町に根づく、本格の味。',
    intro: '熱々の鉄鍋から生まれる、本場仕込みの一皿。気軽な定食から宴会まで、毎日のごはんに寄り添います。',
    menu: ['名物 焼き餃子', '麻婆豆腐', '海老のチリソース', '五目炒飯', '日替わり定食'],
    cta: 'ご予約・お問い合わせ'
  },
  ethnic: {
    label: 'アジア・エスニック',
    bg: '#fbf3e6', panel: '#ffffff', text: '#33271a', sub: '#8a7458', accent: '#e08a2b',
    tagline: 'スパイスが運ぶ、遠い国の食卓。',
    intro: '本場のレシピと香り高いスパイス。日常にちょっとした旅気分を。ランチからディナーまでお楽しみください。',
    menu: ['日替わりカレー（ナン付き）', 'タンドリーチキン', '本日のビリヤニ', 'チーズナン', 'ラッシー各種'],
    cta: 'アクセス・営業時間'
  },
  washoku: {
    label: '和食・寿司',
    bg: '#f5f3ec', panel: '#ffffff', text: '#26241d', sub: '#7e786a', accent: '#7a8b5a',
    tagline: '四季を、ひと皿に映して。',
    intro: '旬の食材を丁寧に。日本の食卓の安心感を大切に、一品一品を仕立てています。ハレの日も普段使いにも。',
    menu: ['本日の握り盛り合わせ', '旬魚の煮付け', '手打ちそば', '季節の天ぷら', '一汁三菜の御膳'],
    cta: 'ご予約・お問い合わせ'
  },
  western: {
    label: '洋食・レストラン',
    bg: '#f7f5f1', panel: '#ffffff', text: '#2c2a26', sub: '#827c72', accent: '#9a7b4f',
    tagline: '素材を、いちばん美味しい瞬間に。',
    intro: '旬の食材を活かした、季節ごとのお料理。記念日のお食事から普段使いまで、心を込めてお迎えします。',
    menu: ['本日のおまかせコース', '旬の前菜盛り合わせ', 'シェフ自慢のメイン料理', '窯焼きピッツァ', '食後のデザート'],
    cta: 'ご予約・お問い合わせ'
  },
  cafe: {
    label: 'カフェ',
    bg: '#faf6f0', panel: '#ffffff', text: '#3a352f', sub: '#8a8175', accent: '#c08552',
    tagline: 'ゆっくり流れる、わたしの時間。',
    intro: '丁寧に淹れた一杯と、手づくりの焼き菓子。日々の合間に、ほっとひと息つける場所をご用意しています。',
    menu: ['本日のカフェラテ', '自家製チーズケーキ', '季節のフルーツタルト', '日替わりランチプレート', '焼きたてスコーン'],
    cta: 'アクセス・営業時間'
  },
  coffee: {
    label: 'コーヒー専門',
    bg: '#f3ece3', panel: '#ffffff', text: '#2a221b', sub: '#7c6f60', accent: '#6f4e37',
    tagline: '一杯のために、豆から、丁寧に。',
    intro: '自家焙煎のスペシャルティコーヒー。香りと余韻にこだわった一杯を、落ち着いた空間でお楽しみください。',
    menu: ['本日のドリップコーヒー', 'エスプレッソ', 'カフェラテ', '自家焙煎豆（量り売り）', '焼き菓子各種'],
    cta: 'アクセス・営業時間'
  },
  takeout: {
    label: 'テイクアウト・軽食',
    bg: '#fff7ee', panel: '#ffffff', text: '#2d2620', sub: '#857a6c', accent: '#f0901e',
    tagline: 'できたてを、あなたのもとへ。',
    intro: 'いつでも気軽に、できたての美味しさを。お持ち帰りも、ちょっとした軽食にも。毎日の「おいしい」をお手軽に。',
    menu: ['日替わり弁当', '人気のから揚げ', '手づくりおにぎり', '本日のお惣菜', 'ドリンクセット'],
    cta: 'お店の場所・営業時間'
  },
  dining: {
    label: '飲食店',
    bg: '#f7f5f1', panel: '#ffffff', text: '#2c2a26', sub: '#827c72', accent: '#9a7b4f',
    tagline: '素材を、いちばん美味しい瞬間に。',
    intro: '旬の食材を活かした、季節ごとのお料理。記念日のお食事から普段使いまで、心を込めてお迎えします。',
    menu: ['本日のおすすめ', '旬の前菜', '自慢のメイン料理', '季節の一品', '食後のデザート'],
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

const THEME_EMOJI = {
  izakaya: '🏮', bar: '🍸', yakiniku: '🔥', ramen: '🍜', chinese: '🥟',
  ethnic: '🍛', washoku: '🍣', western: '🍽️', cafe: '🍰', coffee: '☕',
  takeout: '🍱', dining: '🍴'
};

export function renderSampleHtml({ name, category }) {
  const themeKey = resolveTheme(category);
  const theme = THEMES[themeKey];
  const emoji = THEME_EMOJI[themeKey] || '🍴';
  const safeName = String(name || '店舗名').trim();
  const cat = String(category || '飲食店').trim();
  const nums = ['①', '②', '③', '④', '⑤'];
  const menuCards = theme.menu
    .map(
      (m, i) => `
        <div class="menu-card">
          <div class="menu-badge">${nums[i] || '◦'}</div>
          <div class="menu-name">${m}</div>
          <div class="price-pill">¥—</div>
        </div>`
    )
    .join('');

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${safeName}｜${cat}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;800&family=Zen+Maru+Gothic:wght@400;500;700;900&display=swap" rel="stylesheet">
<style>
:root{--bg:${theme.bg};--panel:${theme.panel};--text:${theme.text};--sub:${theme.sub};--accent:${theme.accent};
  --accent-soft:color-mix(in srgb,var(--accent) 22%,var(--bg));}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Zen Maru Gothic","Hiragino Maru Gothic ProN",system-ui,sans-serif;
  background:var(--bg);color:var(--text);line-height:1.85;overflow-x:hidden;position:relative;-webkit-font-smoothing:antialiased}
.blob{position:absolute;z-index:0;filter:blur(10px);opacity:.5;pointer-events:none}
.blob.b1{width:520px;height:520px;top:-170px;right:-160px;
  background:radial-gradient(circle at 30% 30%,var(--accent),transparent 70%);
  border-radius:47% 53% 60% 40%/52% 45% 55% 48%}
.blob.b2{width:380px;height:380px;bottom:10%;left:-150px;opacity:.4;
  background:radial-gradient(circle at 50% 50%,var(--accent),transparent 70%);
  border-radius:58% 42% 38% 62%/45% 60% 40% 55%}
.wrap{max-width:1000px;margin:0 auto;padding:0 22px;position:relative;z-index:1}
.demo{position:relative;z-index:2;text-align:center;padding:14px}
.demo span{display:inline-block;background:var(--accent);color:#fff;font-size:12.5px;font-weight:700;
  padding:8px 18px;border-radius:999px;box-shadow:0 8px 20px color-mix(in srgb,var(--accent) 40%,transparent)}
nav{position:relative;z-index:2;max-width:1000px;margin:4px auto 0;padding:12px 22px;display:flex;
  align-items:center;justify-content:space-between}
nav .brand{font-weight:900;font-size:18px;letter-spacing:.03em}
nav .tel{font-family:"Poppins",sans-serif;font-size:13px;font-weight:600;color:var(--text);
  background:var(--panel);border:2px solid var(--accent);padding:8px 16px;border-radius:999px;text-decoration:none}
.hero{position:relative;z-index:1;display:grid;grid-template-columns:1.1fr .9fr;gap:28px;align-items:center;
  max-width:1000px;margin:0 auto;padding:34px 22px 16px}
.badge{display:inline-block;font-family:"Poppins",sans-serif;font-size:12px;font-weight:600;letter-spacing:.16em;
  color:var(--accent);background:var(--accent-soft);padding:7px 16px;border-radius:999px;margin-bottom:18px}
.hero h1{font-size:clamp(36px,6.4vw,66px);font-weight:900;line-height:1.18;letter-spacing:.02em;margin-bottom:16px}
.hero .tagline{font-size:clamp(15px,2.4vw,19px);color:var(--sub);margin-bottom:26px}
.btn{display:inline-block;font-weight:700;background:var(--accent);color:#fff;text-decoration:none;
  padding:15px 34px;border-radius:999px;box-shadow:0 12px 26px color-mix(in srgb,var(--accent) 38%,transparent);transition:transform .15s}
.btn:hover{transform:translateY(-2px)}
.visual{position:relative;aspect-ratio:1;display:flex;align-items:center;justify-content:center}
.visual .ring{position:absolute;inset:0;
  background:linear-gradient(140deg,var(--accent),color-mix(in srgb,var(--accent) 30%,#fff));
  border-radius:62% 38% 47% 53%/45% 56% 44% 55%;
  box-shadow:0 30px 60px color-mix(in srgb,var(--accent) 35%,transparent);animation:morph 9s ease-in-out infinite}
.visual .emoji{position:relative;z-index:1;font-size:clamp(70px,15vw,128px);filter:drop-shadow(0 8px 14px rgba(0,0,0,.18))}
.visual .dot{position:absolute;border-radius:50%;background:var(--panel);box-shadow:0 6px 16px rgba(0,0,0,.12)}
.visual .dot.d1{width:46px;height:46px;top:6%;right:12%}
.visual .dot.d2{width:26px;height:26px;bottom:12%;left:6%}
.visual .dot.d3{width:34px;height:34px;bottom:-2%;right:24%;background:var(--accent-soft)}
@keyframes morph{0%,100%{border-radius:62% 38% 47% 53%/45% 56% 44% 55%}
  50%{border-radius:42% 58% 63% 37%/53% 44% 56% 47%}}
section{position:relative;z-index:1;padding:30px 0}
.label{font-family:"Poppins",sans-serif;letter-spacing:.22em;font-size:13px;font-weight:600;color:var(--accent);margin-bottom:14px}
.card{background:var(--panel);border-radius:34px;padding:32px 30px;
  box-shadow:0 16px 40px color-mix(in srgb,var(--text) 9%,transparent)}
.intro{font-size:16.5px;max-width:680px}
.menu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
.menu-card{background:var(--panel);border-radius:26px;padding:18px 20px;display:flex;align-items:center;gap:14px;
  box-shadow:0 10px 26px color-mix(in srgb,var(--text) 8%,transparent)}
.menu-badge{flex:none;width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-weight:700;background:var(--accent-soft);color:var(--accent);font-size:18px}
.menu-name{flex:1;font-weight:500;font-size:15px}
.price-pill{font-family:"Poppins",sans-serif;font-size:12px;color:var(--sub);background:var(--accent-soft);padding:4px 12px;border-radius:999px}
.note{margin-top:14px;color:var(--sub);font-size:12.5px}
.info{display:grid;grid-template-columns:110px 1fr;gap:14px 22px}
.info dt{color:var(--accent);font-weight:700}
footer{position:relative;z-index:1;margin-top:28px;background:var(--panel);
  border-radius:48px 48px 0 0;padding:44px 22px;text-align:center}
footer .fname{font-weight:900;font-size:20px}
footer .price-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:18px}
footer .pchip{background:var(--accent-soft);color:var(--accent);font-weight:700;font-size:13px;padding:9px 18px;border-radius:999px}
footer .fnote{color:var(--sub);font-size:12px;margin-top:18px}
@media(max-width:720px){.hero{grid-template-columns:1fr;text-align:center}
  .badge{margin-inline:auto}.visual{max-width:300px;margin:4px auto 0}}
</style>
</head>
<body>
  <div class="blob b1"></div>
  <div class="blob b2"></div>
  <div class="demo"><span>★ 営業ご提案用デモ（${safeName} 様専用イメージ）</span></div>
  <nav><div class="brand">${safeName}</div><a class="tel" href="#info">☎ ご予約はこちら</a></nav>

  <header class="hero">
    <div class="hero-text">
      <span class="badge">${cat}</span>
      <h1>${safeName}</h1>
      <p class="tagline">${theme.tagline}</p>
      <a class="btn" href="#info">${theme.cta}</a>
    </div>
    <div class="visual">
      <div class="ring"></div>
      <div class="emoji">${emoji}</div>
      <div class="dot d1"></div><div class="dot d2"></div><div class="dot d3"></div>
    </div>
  </header>

  <section class="wrap">
    <div class="card">
      <div class="label">ABOUT</div>
      <p class="intro">${theme.intro}</p>
    </div>
  </section>

  <section class="wrap">
    <div class="label">MENU</div>
    <div class="menu-grid">${menuCards}
    </div>
    <p class="note">※メニュー・価格はサンプルです。実際の内容に差し替えできます。</p>
  </section>

  <section class="wrap" id="info">
    <div class="card">
      <div class="label">INFORMATION</div>
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
    <div class="fname">${safeName}</div>
    <div style="color:var(--sub);font-size:13px">${cat}</div>
    <div class="price-row"><span class="pchip">初期費用 5万円</span><span class="pchip">月額 1万円</span></div>
    <div class="fnote">Website sample created for proposal</div>
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

// 直接実行されたときだけ main を走らせる（他スクリプトから import 可能にする）
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error('サンプル生成に失敗しました:', error.message);
    process.exit(1);
  });
}
