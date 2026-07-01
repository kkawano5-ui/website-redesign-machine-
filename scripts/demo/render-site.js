import { escapeHtml as esc } from './helpers.js';
import { VERTICALS } from './verticals.js';

const FONTS =
  'https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap';

function reasonCards(reasons) {
  return reasons
    .map(
      (r) => `
        <article class="card">
          <div class="card-ic">${esc(r.icon)}</div>
          <h3>${esc(r.title)}</h3>
          <p>${esc(r.desc)}</p>
        </article>`
    )
    .join('');
}

function serviceItems(v) {
  return v.services
    .map(
      (s, i) => `
        <article class="svc">
          <span class="svc-no en">${String(i + 1).padStart(2, '0')}</span>
          <div>
            <h3>${esc(s.name)}</h3>
            <p>${esc(s.desc)}</p>
          </div>
        </article>`
    )
    .join('');
}

// 実データの料金表（override.menu があるとき）
function menuGroups(menu) {
  return menu
    .map(
      (g) => `
        <div class="menu-group">
          <h3>${esc(g.group)}</h3>
          ${g.items
            .map(
              (it) => `
            <div class="menu-item">
              <div class="mi-l">
                <h4>${esc(it.name)}</h4>
                ${it.desc ? `<p>${esc(it.desc)}</p>` : ''}
              </div>
              <span class="mi-price en">${esc(it.price || '')}</span>
            </div>`
            )
            .join('')}
        </div>`
    )
    .join('');
}

function workTiles(v, workLabel) {
  return Array.from(
    { length: 6 },
    (_, i) => `
        <figure class="tile">
          <img src="../../assets/${v.key}/${i + 1}.jpg" alt="" loading="lazy" onerror="this.remove()">
          <span>${esc(workLabel)} ${i + 1}</span>
          <small>写真 差替</small>
        </figure>`
  ).join('');
}

// お客様の声。実口コミ(override.voices: {text,who,date})があれば実データ、無ければサンプル。
function voiceCards(voices, real) {
  return voices
    .map(
      (vo) => `
        <article class="voice">
          <div class="v-stars en">★★★★★</div>
          <p>「${esc(vo.text)}」</p>
          <span>— ${esc(vo.who)} ${real && vo.date ? `<i>（${esc(vo.date)}）</i>` : '<i>（サンプル）</i>'}</span>
        </article>`
    )
    .join('');
}

// company: { name, area, vertical(key), reviewCount, website, placeId, override? }
export function renderSite(company) {
  const v = VERTICALS[company.vertical];
  if (!v) throw new Error(`未知の業種キー: ${company.vertical}`);
  const ov = company.override || null;

  const c = {
    name: (ov && ov.name) || company.name || '貴社名',
    area: (ov && ov.area) || company.area || 'お住まいの地域',
  };
  const brandSub = (ov && ov.brandSub) || v.label;
  const label = (ov && ov.label) || v.label;
  const workLabel = (ov && ov.workLabel) || v.workLabel;

  const reviewChip = ov && ov.rating
    ? `<span class="chip">★ ${esc(ov.ratingSource || '口コミ')} ${esc(ov.rating)}（${esc(String(ov.reviewCount || ''))}件）</span>`
    : Number(company.reviewCount) > 0
      ? `<span class="chip">★ Googleクチコミ ${esc(company.reviewCount)}件</span>`
      : '';

  const heroTitle = (ov && ov.heroTitle) || v.headline(c);
  const heroLead = (ov && ov.catch) || v.lead(c);
  const reasons = (ov && ov.reasons) || v.reasons;
  const ctaLabel = (ov && ov.cta && ov.cta.label) || v.ctaLabel;
  const telHref = ov && ov.cta && ov.cta.tel ? 'tel:' + String(ov.cta.tel).replace(/[^0-9+]/g, '') : '';

  const title = `${c.name}｜${label}（${c.area}）`;
  const desc = ov && ov.catch ? `${c.area}の${label}。${String(ov.catch).slice(0, 80)}` : `${c.area}の${label}。${c.name}のサービス・特長・アクセスのご案内。`;

  // --- 実データありの各セクション（override時のみ） ---
  const noticeBar = ov && ov.notice
    ? `<div class="notice-bar"><div class="wrap">📢 ${esc(ov.notice)}</div></div>`
    : '';

  const menuSection = ov && ov.menu
    ? `<section class="sec svcs" id="services">
    <div class="wrap">
      <span class="eyebrow">Menu &amp; Price</span>
      <h2>メニュー・料金</h2>
      <p class="lead-c">ホットペッパー掲載の実メニューです。表示価格は目安で、デザインにより変動します。</p>
      <div class="menu">${menuGroups(ov.menu)}</div>
    </div>
  </section>`
    : `<section class="sec svcs" id="services">
    <div class="wrap">
      <span class="eyebrow">Services</span>
      <h2>サービス内容</h2>
      <p class="lead-c">${esc(c.area)}で対応している主なサービスです。内容・料金は差し替え枠です。</p>
      <div class="svc-grid">${serviceItems(v)}</div>
    </div>
  </section>`;

  const staffSection = ov && ov.staff
    ? `<section class="sec" id="staff">
    <div class="wrap">
      <span class="eyebrow">Staff</span>
      <h2>スタッフ紹介</h2>
      <div class="staff">
        <div class="ph">💇‍♀️</div>
        <div>
          <h3>${esc(ov.staff.name)}</h3>
          <div class="role">${esc(ov.staff.role || '')}</div>
          <p>${esc(ov.staff.comment || '')}</p>
        </div>
      </div>
    </div>
  </section>`
    : '';

  const statsSection = ov && ov.stats
    ? `<section class="sec statwrap">
    <div class="wrap">
      <span class="eyebrow" style="color:#fff;opacity:.9">Data</span>
      <h2 style="color:#fff">数字で見る${esc(c.name)}</h2>
      <div class="stats">
        <div class="stat"><b class="en">${esc(ov.rating || '—')}</b><span>口コミ評価（${esc(String(ov.reviewCount || '—'))}件）</span></div>
        <div class="stat"><b class="en">${esc(ov.stats.female || '—')}</b><span>女性のご利用</span></div>
        <div class="stat"><b class="en">15年</b><span>ネイリスト歴</span></div>
        <div class="stat"><b class="en" style="font-size:17px">${esc(ov.stats.avgPrice || '—')}</b><span>平均ご予約金額</span></div>
      </div>
      <p class="statnote">年代構成：${esc(ov.stats.ages || '')}</p>
    </div>
  </section>`
    : '';

  // 店舗案内テーブル
  const infoRows = ov && ov.info
    ? `<tr><th>店舗名</th><td>${esc(c.name)}</td></tr>
        <tr><th>住所</th><td>${esc(ov.info.address || '')}</td></tr>
        <tr><th>アクセス</th><td>${esc(ov.info.access || '')}</td></tr>
        <tr><th>営業時間</th><td>${esc(ov.info.hours || '')}</td></tr>
        <tr><th>定休日</th><td>${esc(ov.info.closed || '')}</td></tr>
        <tr><th>お支払い</th><td>${esc(ov.info.payment || '')}</td></tr>
        <tr><th>電話</th><td>${esc(ov.info.tel || (ov.cta && ov.cta.tel) || '')}</td></tr>
        <tr><th>その他</th><td>${esc(ov.info.parking || '')}</td></tr>`
    : `<tr><th>店舗名</th><td>${esc(c.name)}</td></tr>
        <tr><th>エリア</th><td>${esc(c.area)}</td></tr>
        <tr><th>住所</th><td>${esc(c.area)}（住所は差し替え枠）</td></tr>
        <tr><th>営業時間</th><td>10:00〜19:00（差し替え枠）</td></tr>
        <tr><th>定休日</th><td>不定休（差し替え枠）</td></tr>
        <tr><th>電話</th><td>000-0000-0000（差し替え枠）</td></tr>`;

  const featureTags = ov && ov.info && ov.info.features
    ? `<div class="tags">${ov.info.features.map((f) => `<span class="tag">${esc(f)}</span>`).join('')}</div>`
    : '';

  const mapBox = ov && ov.map && ov.map.lat
    ? `<iframe class="mapembed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
        src="https://maps.google.com/maps?q=${ov.map.lat},${ov.map.lng}&z=16&output=embed"></iframe>`
    : `<div class="map">地図 差替（Googleマップ埋め込み）</div>`;

  // CTA
  const ctaInner = ov && ov.cta
    ? `<p class="lead-c" style="color:rgba(255,255,255,.92)">${esc(ov.cta.note || '')}</p>
      <div class="cta-actions">
        ${telHref ? `<a href="${esc(telHref)}" class="btn btn-light">☎ ${esc(ov.cta.tel)}</a>` : ''}
      </div>
      <p class="note">${esc(ov.cta.channels || '')}</p>`
    : `<p class="lead-c" style="color:rgba(255,255,255,.9)">お気軽にお問い合わせください。内容を確認のうえ、担当者よりご連絡します。</p>
      <form class="form" onsubmit="return false">
        <input type="text" placeholder="お名前" aria-label="お名前">
        <input type="tel" placeholder="電話番号" aria-label="電話番号">
        <textarea rows="3" placeholder="ご相談内容" aria-label="ご相談内容"></textarea>
        <button class="btn btn-light" type="submit">${esc(ctaLabel)}</button>
      </form>
      <p class="note">※これは提案用サンプルです。フォームは送信されません（送信先・項目は差し替え）。</p>`;

  const disclaimer = ov
    ? `本ページは ${esc(c.name)} 様向けの提案用サンプルです。料金・営業時間・口コミ等は公開情報（ホットペッパー／Google）を基に掲載しています。写真はイメージで、実際の店舗写真・ロゴに差し替えてご利用ください。`
    : `本ページは ${esc(c.name)} 様向けに作成した提案用サンプルです。写真・施工事例・お客様の声・実績数・料金・連絡先は仮置きで、実際の情報に差し替えてご利用ください。掲載情報の捏造は行いません。`;

  const voices = (ov && ov.voices) || v.voices.map((vo) => ({ text: vo.text, who: vo.who }));

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<!-- 営業提案用サンプル。overrideありは公開情報ベースの実データ、写真はイメージ。業種別NG表現: ${esc(v.avoid.join(' / '))} -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS}" rel="stylesheet">
<style>
  :root{
    --accent:${v.accent};--accent-d:${v.accentDark};--glow:${v.glow};--tint:${v.tint};
    --ink:#16202c;--muted:#5d6b7a;--line:#eef1f5;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{font-family:"Zen Kaku Gothic New","Noto Sans JP",system-ui,sans-serif;color:var(--ink);background:#fff;line-height:1.85;-webkit-font-smoothing:antialiased;overflow-x:hidden}
  .en{font-family:"Sora",sans-serif}
  a{color:inherit;text-decoration:none}
  .wrap{max-width:1120px;margin:0 auto;padding:0 24px}
  .btn{display:inline-flex;align-items:center;gap:8px;padding:14px 26px;border-radius:999px;font-weight:700;font-size:15px;transition:transform .2s,box-shadow .2s;cursor:pointer;border:none}
  .btn-primary{background:var(--accent);color:#fff;box-shadow:0 12px 28px -10px var(--accent)}
  .btn-primary:hover{transform:translateY(-2px)}
  .btn-ghost{border:1.5px solid rgba(255,255,255,.5);color:#fff;background:transparent}
  .btn-ghost:hover{background:rgba(255,255,255,.12)}
  .eyebrow{display:block;text-align:center;font-family:"Sora";font-weight:700;letter-spacing:.16em;font-size:12px;color:var(--accent);text-transform:uppercase}
  .sec{padding:84px 0}
  .sec h2{font-size:clamp(24px,3.4vw,36px);font-weight:900;line-height:1.4;text-align:center;margin-top:8px}
  .lead-c{text-align:center;color:var(--muted);margin:14px auto 0;max-width:640px;font-size:15px}

  header{position:fixed;inset-inline:0;top:0;z-index:50;transition:.3s}
  header.scrolled{background:rgba(255,255,255,.92);backdrop-filter:blur(12px);box-shadow:0 1px 0 rgba(0,0,0,.06)}
  .nav{display:flex;align-items:center;justify-content:space-between;height:68px}
  .brand{font-weight:900;font-size:19px;color:#fff}
  .brand small{display:block;font-family:"Sora";font-size:9px;letter-spacing:.2em;font-weight:700;margin-top:2px;opacity:.85}
  header.scrolled .brand{color:var(--ink)}
  header.scrolled .brand small{color:var(--accent);opacity:1}
  .nav-links{display:flex;gap:26px;font-size:14px;font-weight:500;color:#fff}
  header.scrolled .nav-links{color:var(--ink)}
  .nav-links a{opacity:.85;transition:.2s}
  .nav-links a:hover{opacity:1}
  .nav .btn{padding:10px 18px;font-size:13px}
  @media(max-width:820px){.nav-links{display:none}}

  .hero{position:relative;color:#fff;padding:150px 0 96px;overflow:hidden;background:linear-gradient(135deg,var(--accent-d),var(--accent))}
  .blob{position:absolute;border-radius:50%;filter:blur(60px)}
  .blob.b1{width:460px;height:460px;background:var(--glow);opacity:.5;top:-160px;right:-120px}
  .blob.b2{width:360px;height:360px;background:#fff;opacity:.1;bottom:-150px;left:-80px}
  .hero .wrap{position:relative;z-index:2;display:grid;grid-template-columns:1.1fr .9fr;gap:44px;align-items:center}
  .hpill{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);padding:7px 14px;border-radius:999px;font-size:13px;font-weight:500}
  .hero h1{font-size:clamp(30px,4.6vw,52px);font-weight:900;line-height:1.32;margin:20px 0 0;white-space:pre-line}
  .hero p.lead{margin-top:20px;font-size:clamp(15px,1.5vw,17px);color:rgba(255,255,255,.9);max-width:520px;font-weight:400}
  .btns{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}
  .chips{margin-top:26px;display:flex;flex-wrap:wrap;gap:10px}
  .chip{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22);padding:7px 13px;border-radius:999px;font-size:12.5px;font-weight:500}
  .hero-card{position:relative;overflow:hidden;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.22);border-radius:20px;padding:22px;backdrop-filter:blur(6px)}
  .hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:2}
  .hero-card .mock{height:148px;border-radius:12px;background:linear-gradient(135deg,rgba(255,255,255,.9),rgba(255,255,255,.62));display:flex;align-items:center;justify-content:center;color:var(--accent-d);font-weight:900;font-size:19px;text-align:center;padding:0 14px}
  .hero-card .row{display:flex;gap:10px;margin-top:14px}
  .hero-card .row span{flex:1;height:46px;border-radius:10px;background:rgba(255,255,255,.18)}
  @media(max-width:820px){.hero{padding:118px 0 64px}.hero .wrap{grid-template-columns:1fr;gap:24px}.hero-card{display:none}}

  .notice-bar{background:#fff4e5;border-bottom:1px solid #ffe0b2;color:#8a5a00}
  .notice-bar .wrap{padding:12px 24px;font-size:13.5px;font-weight:600;text-align:center;line-height:1.65}

  .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:48px}
  .card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:28px;box-shadow:0 18px 40px -28px rgba(20,40,70,.4)}
  .card-ic{width:52px;height:52px;border-radius:13px;background:var(--tint);display:flex;align-items:center;justify-content:center;font-size:24px}
  .card h3{margin:16px 0 8px;font-size:18px}
  .card p{color:var(--muted);font-size:14.5px}
  @media(max-width:820px){.cards{grid-template-columns:1fr}}

  .svcs{background:var(--tint)}
  .svc-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:44px}
  .svc{display:flex;gap:16px;background:#fff;border-radius:14px;padding:22px}
  .svc-no{font-weight:800;font-size:22px;color:var(--accent);flex:0 0 auto}
  .svc h3{font-size:17px}
  .svc p{color:var(--muted);font-size:14px;margin-top:5px}
  @media(max-width:820px){.svc-grid{grid-template-columns:1fr}}

  .menu{max-width:820px;margin:36px auto 0}
  .menu-group{margin-top:30px}
  .menu-group h3{font-size:15px;color:var(--accent-d);font-weight:800;padding-bottom:9px;border-bottom:2px solid var(--accent)}
  .menu-item{display:flex;justify-content:space-between;gap:16px;padding:15px 2px;border-bottom:1px solid var(--line);align-items:baseline;background:#fff}
  .menu-item .mi-l h4{font-size:15.5px;font-weight:700;line-height:1.5}
  .menu-item .mi-l p{font-size:13px;color:var(--muted);margin-top:3px}
  .menu-item .mi-price{font-weight:700;color:var(--accent);white-space:nowrap;font-size:15.5px}

  .staff{display:flex;gap:22px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:16px;padding:24px;margin:36px auto 0;max-width:620px;box-shadow:0 18px 40px -30px rgba(20,40,70,.4)}
  .staff .ph{width:92px;height:92px;border-radius:50%;background:var(--tint);display:flex;align-items:center;justify-content:center;font-size:34px;flex:0 0 auto}
  .staff h3{font-size:19px}
  .staff .role{color:var(--accent);font-weight:700;font-size:13px;margin:4px 0 8px}
  .staff p{color:var(--muted);font-size:14px}

  .statwrap{background:linear-gradient(135deg,var(--accent-d),var(--accent));color:#fff}
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:44px}
  .stat{background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.24);border-radius:16px;padding:22px 14px;text-align:center}
  .stat b{display:block;font-size:26px;margin-bottom:6px}
  .stat span{font-size:12px;opacity:.9}
  .statnote{text-align:center;margin-top:18px;font-size:12.5px;color:rgba(255,255,255,.85)}
  @media(max-width:820px){.stats{grid-template-columns:1fr 1fr}}

  .tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:44px}
  .tile{position:relative;overflow:hidden;aspect-ratio:4/3;border-radius:14px;background:linear-gradient(135deg,var(--tint),#fff);border:1px dashed #d6dde6;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--accent-d);margin:0}
  .tile img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1}
  .tile span{font-weight:700;font-size:14px}
  .tile small{color:var(--muted);font-size:11px;margin-top:3px}
  @media(max-width:820px){.tiles{grid-template-columns:1fr 1fr}}

  .voices{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:44px}
  .voice{background:#fff;border:1px solid var(--line);border-radius:16px;padding:26px}
  .v-stars{color:#f6b73c;font-size:14px;letter-spacing:2px;margin-bottom:8px}
  .voice p{font-size:15.5px}
  .voice span{display:block;margin-top:12px;color:var(--muted);font-size:13px;font-weight:700}
  .voice i{font-style:normal;color:#9aa6b2;font-weight:400}
  @media(max-width:820px){.voices{grid-template-columns:1fr}}

  .info{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:44px;align-items:start}
  .info table{width:100%;border-collapse:collapse}
  .info th,.info td{text-align:left;padding:13px 0;border-bottom:1px solid var(--line);font-size:14.5px;vertical-align:top}
  .info th{width:30%;color:var(--muted);font-weight:700}
  .tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
  .tag{background:var(--tint);color:var(--accent-d);border-radius:999px;padding:5px 12px;font-size:12px;font-weight:600}
  .map{aspect-ratio:16/10;border-radius:16px;background:linear-gradient(135deg,var(--tint),#fff);border:1px dashed #d6dde6;display:flex;align-items:center;justify-content:center;color:var(--accent-d);font-weight:700}
  .mapembed{width:100%;aspect-ratio:16/11;border:0;border-radius:16px}
  @media(max-width:820px){.info{grid-template-columns:1fr}}

  .cta{background:linear-gradient(135deg,var(--accent-d),var(--accent));color:#fff;text-align:center}
  .cta h2{color:#fff}
  .cta-actions{display:flex;justify-content:center;gap:12px;margin-top:26px;flex-wrap:wrap}
  .cta-actions .btn{font-size:17px;padding:16px 32px}
  .form{max-width:540px;margin:34px auto 0;display:grid;gap:14px;text-align:left}
  .form input,.form textarea{width:100%;padding:14px 16px;border-radius:12px;border:none;font-size:15px;font-family:inherit}
  .btn-light{background:#fff;color:var(--accent-d);justify-content:center}
  .note{margin-top:18px;font-size:12.5px;color:rgba(255,255,255,.82)}

  footer{background:#0f1720;color:#aeb8c4;padding:44px 0;font-size:13px}
  footer .wrap{display:flex;flex-wrap:wrap;justify-content:space-between;gap:14px;align-items:center}
  footer b{color:#fff;font-size:16px}
  .disclaimer{background:#0b1117;color:#7d8794;font-size:11.5px;text-align:center;padding:14px 24px;line-height:1.7}
</style>
</head>
<body>
<header id="hdr">
  <div class="wrap nav">
    <div class="brand">${esc(c.name)}<small class="en">${esc(brandSub)}</small></div>
    <nav class="nav-links">
      <a href="#reasons">選ばれる理由</a>
      <a href="#services">${ov && ov.menu ? 'メニュー' : 'サービス'}</a>
      <a href="#works">${esc(workLabel)}</a>
      <a href="#access">店舗案内</a>
    </nav>
    <a href="${telHref || '#cta'}" class="btn btn-primary">${esc(ctaLabel)}</a>
  </div>
</header>

<section class="hero">
  <span class="blob b1"></span><span class="blob b2"></span>
  <div class="wrap">
    <div>
      <span class="hpill">📍 ${esc(c.area)}</span>
      <h1>${esc(heroTitle)}</h1>
      <p class="lead">${esc(heroLead)}</p>
      <div class="btns">
        <a href="${telHref || '#cta'}" class="btn btn-primary">${esc(ctaLabel)}</a>
        <a href="#services" class="btn btn-ghost">${ov && ov.menu ? 'メニューを見る' : 'サービスを見る'}</a>
      </div>
      <div class="chips">
        <span class="chip">📍 ${esc(c.area)}</span>
        <span class="chip">🏷 ${esc(label)}</span>
        ${reviewChip}
      </div>
    </div>
    <div class="hero-card" aria-hidden="true">
      <img class="hero-img" src="../../assets/${v.key}/hero.jpg" alt="" onerror="this.remove()">
      <div class="mock">${esc(c.name)}</div>
      <div class="row"><span></span><span></span><span></span></div>
    </div>
  </div>
</section>
${noticeBar}

<section class="sec" id="reasons">
  <div class="wrap">
    <span class="eyebrow">Why choose us</span>
    <h2>${esc(c.name)}が選ばれる理由</h2>
    <div class="cards">${reasonCards(reasons)}</div>
  </div>
</section>

${menuSection}

<section class="sec" id="works">
  <div class="wrap">
    <span class="eyebrow">Works</span>
    <h2>${esc(workLabel)}</h2>
    <p class="lead-c">実際の写真に差し替えてご利用ください（サンプルはイメージです）。</p>
    <div class="tiles">${workTiles(v, workLabel)}</div>
  </div>
</section>

${staffSection}

<section class="sec svcs">
  <div class="wrap">
    <span class="eyebrow">Voice</span>
    <h2>お客様の声</h2>
    ${ov && ov.voices ? '<p class="lead-c">ホットペッパー掲載の口コミより抜粋しています。</p>' : ''}
    <div class="voices">${voiceCards(voices, !!(ov && ov.voices))}</div>
  </div>
</section>

${statsSection}

<section class="sec" id="access">
  <div class="wrap">
    <span class="eyebrow">Information</span>
    <h2>店舗案内</h2>
    <div class="info">
      <div>
        <table>${infoRows}</table>
        ${featureTags}
      </div>
      ${mapBox}
    </div>
  </div>
</section>

<section class="sec cta" id="cta">
  <div class="wrap">
    <h2>${esc(ctaLabel)}</h2>
    ${ctaInner}
  </div>
</section>

<footer>
  <div class="wrap">
    <div><b>${esc(c.name)}</b><br>${esc(label)}｜${esc(c.area)}</div>
    <div class="en">© ${esc(c.name)}</div>
  </div>
</footer>
<div class="disclaimer">${disclaimer}</div>

<script>
  var h=document.getElementById('hdr');
  function onScroll(){h.classList.toggle('scrolled',window.scrollY>40);}
  onScroll();window.addEventListener('scroll',onScroll,{passive:true});
</script>
</body>
</html>`;
}
