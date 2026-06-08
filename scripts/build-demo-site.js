import {
  detectIndustry,
  createIndustryGuide,
  normalizeArray
} from './create-site-spec.js';
import { pickFirstValue } from './utils.js';

/**
 * Deterministic demo-site generator.
 *
 * Turns a Manus research JSON into a complete, deployable single-page
 * corporate demo site (static HTML + Tailwind via CDN). No API key and
 * no build step required, so a demo URL can be produced for any prospect
 * at zero marginal cost — the core lever behind "営業デモURLの量産".
 *
 * Output is intentionally self-contained (one index.html) so it can be
 * dropped straight onto Cloudflare Pages / any static host.
 */

const THEMES = {
  memorial: { accent: '#2f6b4f', accentDark: '#1f4a37', tint: '#eef4f0', name: '深緑' },
  medical: { accent: '#1f6fb2', accentDark: '#155080', tint: '#eaf3fa', name: '清潔ブルー' },
  professional: { accent: '#1f3a5f', accentDark: '#13263f', tint: '#eef1f6', name: 'ネイビー' },
  care: { accent: '#c9742b', accentDark: '#9c581f', tint: '#fbf2e8', name: '温かみオレンジ' },
  manufacturing: { accent: '#37597a', accentDark: '#243c52', tint: '#eef1f5', name: 'スチールブルー' },
  construction: { accent: '#b9772b', accentDark: '#8a591f', tint: '#fbf4e9', name: 'アンバー' },
  general: { accent: '#3a4db5', accentDark: '#283787', tint: '#eef0fa', name: 'インディゴ' }
};

const INDUSTRY_LABELS = {
  memorial: '霊園・墓石',
  medical: '医療・クリニック',
  professional: '士業・専門サービス',
  care: '介護・福祉',
  manufacturing: '製造・B2B',
  construction: '建設・工務店',
  general: '中小企業'
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function pickStats(manusJson) {
  // Pull plausible proof points out of the overview/concept text so the
  // trust bar feels specific rather than templated.
  const haystack = [
    ...normalizeArray(manusJson.companyOverview ?? manusJson.overview),
    ...normalizeArray(manusJson.siteConcept ?? manusJson.proposedConcept),
    ...normalizeArray(manusJson.firstViewIdeas ?? manusJson.heroIdeas)
  ].join(' ');

  const stats = [];
  const yearMatch = haystack.match(/(\d+)\s*年/);
  if (yearMatch) stats.push({ value: `${yearMatch[1]}年+`, label: '地域での実績' });
  const countMatch = haystack.match(/(\d+)\s*件/);
  if (countMatch) stats.push({ value: `${countMatch[1]}件+`, label: '対応実績' });

  while (stats.length < 3) {
    const fallback = [
      { value: '地域密着', label: '対応エリア' },
      { value: 'ワンストップ', label: '相談体制' },
      { value: '無料相談', label: '初回対応' }
    ][stats.length];
    stats.push(fallback);
  }
  return stats.slice(0, 3);
}

function navId(index) {
  return `section-${index + 1}`;
}

function renderHero(ctx) {
  const { companyName, catch1, catch2, primaryCta, theme, industryLabel } = ctx;
  return `  <section class="relative overflow-hidden">
    <div class="absolute inset-0 -z-10" style="background:linear-gradient(135deg, ${theme.accent} 0%, ${theme.accentDark} 100%)"></div>
    <div class="mx-auto max-w-6xl px-6 py-24 sm:py-32 text-white">
      <p class="mb-4 inline-block rounded-full bg-white/15 px-4 py-1 text-sm font-medium tracking-wide">${escapeHtml(industryLabel)}向けリニューアル提案</p>
      <h1 class="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">${escapeHtml(catch1)}</h1>
      <p class="mt-6 max-w-2xl text-lg leading-relaxed text-white/90">${escapeHtml(catch2)}</p>
      <div class="mt-10 flex flex-wrap gap-4">
        <a href="#contact" class="rounded-lg bg-white px-7 py-3.5 text-base font-semibold shadow-sm transition hover:translate-y-[-1px] hover:shadow-md" style="color:${theme.accentDark}">${escapeHtml(primaryCta)}</a>
        <a href="#${navId(0)}" class="rounded-lg border border-white/40 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-white/10">サービスを見る</a>
      </div>
    </div>
  </section>`;
}

function renderStats(stats) {
  const cells = stats
    .map(
      (s) => `      <div class="text-center">
        <dt class="text-3xl font-bold" style="color:var(--accent)">${escapeHtml(s.value)}</dt>
        <dd class="mt-1 text-sm text-slate-600">${escapeHtml(s.label)}</dd>
      </div>`
    )
    .join('\n');
  return `  <section class="border-b border-slate-100 bg-white">
    <dl class="mx-auto grid max-w-4xl grid-cols-1 gap-8 px-6 py-12 sm:grid-cols-3">
${cells}
    </dl>
  </section>`;
}

function pagePurposeLine(page) {
  if (/トップ|home|index/i.test(page)) return '強みと相談できることを最初の画面で明確に伝えます。';
  if (/事例|実績|症例|施工|納入/i.test(page)) return '具体的な実績で、相談前の不安を取り除きます。';
  if (/サービス|診療|メニュー|取扱|業務|プラン|費用/i.test(page)) return '提供範囲と費用の目安をわかりやすく整理します。';
  if (/会社|理念|スタッフ|院長|代表|施設/i.test(page)) return '担当者の顔が見える情報で信頼感を高めます。';
  if (/声|口コミ|レビュー|質問|faq/i.test(page)) return 'よくある疑問に先回りして答え、検討を後押しします。';
  if (/問い合わせ|予約|相談|面談|アクセス/i.test(page)) return '迷わず行動できる、入力負荷の低い導線にします。';
  return '役割を明確にし、次の行動に進みやすくします。';
}

function renderServices(ctx) {
  const { pages, ctaIdeas } = ctx;
  const cards = pages
    .map((page, i) => {
      const cta = ctaIdeas[i % Math.max(ctaIdeas.length, 1)] ?? '詳しく見る';
      return `      <article class="group rounded-xl border border-slate-200 bg-white p-7 transition hover:border-transparent hover:shadow-lg">
        <div class="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg text-lg font-bold text-white" style="background:var(--accent)">${i + 1}</div>
        <h3 class="text-lg font-semibold text-slate-900">${escapeHtml(page)}</h3>
        <p class="mt-2 text-sm leading-relaxed text-slate-600">${escapeHtml(pagePurposeLine(page))}</p>
        <a href="#contact" class="mt-4 inline-flex items-center gap-1 text-sm font-semibold" style="color:var(--accent)">${escapeHtml(cta)} <span aria-hidden="true">→</span></a>
      </article>`;
    })
    .join('\n');
  return `  <section id="${navId(0)}" class="bg-slate-50">
    <div class="mx-auto max-w-6xl px-6 py-20">
      <h2 class="text-2xl font-bold text-slate-900 sm:text-3xl">ご提案するページ構成</h2>
      <p class="mt-3 max-w-2xl text-slate-600">検討中のお客様が迷わず相談まで進める導線でリニューアルします。</p>
      <div class="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
${cards}
      </div>
    </div>
  </section>`;
}

function renderTrust(ctx) {
  const { trust, concept } = ctx;
  const conceptItems = concept
    .map((c) => `        <li class="flex gap-3"><span class="mt-1 select-none" style="color:var(--accent)" aria-hidden="true">●</span><span>${escapeHtml(c)}</span></li>`)
    .join('\n');
  const trustItems = trust
    .map((t) => `        <li class="flex gap-3"><span class="mt-1 select-none text-slate-400" aria-hidden="true">✓</span><span>${escapeHtml(t)}</span></li>`)
    .join('\n');
  return `  <section id="${navId(1)}" class="bg-white">
    <div class="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2">
      <div>
        <h2 class="text-2xl font-bold text-slate-900 sm:text-3xl">私たちが大切にすること</h2>
        <ul class="mt-6 space-y-3 text-slate-700">
${conceptItems}
        </ul>
      </div>
      <div class="rounded-2xl p-8" style="background:var(--tint)">
        <h3 class="text-lg font-semibold text-slate-900">安心していただくために</h3>
        <ul class="mt-5 space-y-3 text-slate-700">
${trustItems}
        </ul>
      </div>
    </div>
  </section>`;
}

function renderCta(ctx) {
  const { ctaIdeas, theme } = ctx;
  const buttons = ctaIdeas
    .slice(0, 3)
    .map((c, i) =>
      i === 0
        ? `        <a href="#contact" class="rounded-lg bg-white px-7 py-3.5 font-semibold shadow-sm transition hover:shadow-md" style="color:${theme.accentDark}">${escapeHtml(c)}</a>`
        : `        <a href="#contact" class="rounded-lg border border-white/50 px-7 py-3.5 font-semibold text-white transition hover:bg-white/10">${escapeHtml(c)}</a>`
    )
    .join('\n');
  return `  <section id="contact">
    <div class="px-6 py-20 text-white" style="background:linear-gradient(135deg, ${theme.accent} 0%, ${theme.accentDark} 100%)">
      <div class="mx-auto max-w-3xl text-center">
        <h2 class="text-2xl font-bold sm:text-3xl">まずはお気軽にご相談ください</h2>
        <p class="mt-4 text-white/90">ご相談・お見積りは無料です。内容を伺ったうえで、最適なご提案をいたします。</p>
        <div class="mt-8 flex flex-wrap justify-center gap-4">
${buttons}
        </div>
        <p class="mt-6 text-sm text-white/70">※本ページはリニューアル提案用のデモです。お問い合わせ内容は送信されません。</p>
      </div>
    </div>
  </section>`;
}

export function buildDemoSiteHtml(manusJson) {
  const companyName = pickFirstValue(manusJson, ['companyName', 'company', 'name'], '対象企業');
  const industry = detectIndustry(manusJson);
  const theme = THEMES[industry] ?? THEMES.general;
  const guide = createIndustryGuide(industry);
  const industryLabel = INDUSTRY_LABELS[industry] ?? INDUSTRY_LABELS.general;

  const firstView = normalizeArray(manusJson.firstViewIdeas ?? manusJson.heroIdeas);
  const concept = normalizeArray(manusJson.siteConcept ?? manusJson.proposedConcept);
  const pages = normalizeArray(manusJson.recommendedPages ?? manusJson.siteMap);
  const ctaIdeas = normalizeArray(manusJson.ctaIdeas ?? manusJson.cta);

  const catch1 = firstView[0] || concept[0] || `${companyName}の新しいWebサイトをご提案します`;
  const catch2 =
    firstView[1] ||
    concept[1] ||
    '見やすく・伝わる・相談したくなる。地域のお客様に選ばれるサイトへ。';
  const primaryCta = ctaIdeas[0] || '無料で相談する';

  const ctx = {
    companyName,
    theme,
    industryLabel,
    catch1,
    catch2,
    primaryCta,
    concept: concept.length ? concept : ['お客様の不安に寄り添う', 'わかりやすさを最優先する'],
    pages: pages.length ? pages : ['トップページ', 'サービス紹介', 'お問い合わせ'],
    ctaIdeas: ctaIdeas.length ? ctaIdeas : ['無料で相談する'],
    trust: guide.trust
  };

  const stats = pickStats(manusJson);
  const year = new Date().getFullYear();

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(companyName)}｜リニューアルデモ</title>
  <meta name="description" content="${escapeHtml(companyName)}のWebサイトリニューアル提案デモ。${escapeHtml(industryLabel)}向けに、信頼感と相談導線を重視して再設計しました。" />
  <meta name="robots" content="noindex" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>:root{--accent:${theme.accent};--accent-dark:${theme.accentDark};--tint:${theme.tint}}html{scroll-behavior:smooth}body{font-feature-settings:"palt"}</style>
</head>
<body class="bg-white text-slate-800 antialiased">
  <header class="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
    <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
      <span class="text-lg font-bold tracking-tight text-slate-900">${escapeHtml(companyName)}</span>
      <nav class="hidden gap-7 text-sm font-medium text-slate-600 sm:flex" aria-label="メイン">
        <a href="#${navId(0)}" class="hover:text-slate-900">サービス</a>
        <a href="#${navId(1)}" class="hover:text-slate-900">特長</a>
        <a href="#contact" class="hover:text-slate-900">お問い合わせ</a>
      </nav>
      <a href="#contact" class="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90" style="background:var(--accent)">${escapeHtml(primaryCta)}</a>
    </div>
  </header>

${renderHero(ctx)}
${renderStats(stats)}
${renderServices(ctx)}
${renderTrust(ctx)}
${renderCta(ctx)}

  <footer class="bg-slate-900 py-10 text-slate-300">
    <div class="mx-auto flex max-w-6xl flex-col gap-2 px-6 text-sm">
      <span class="font-semibold text-white">${escapeHtml(companyName)}</span>
      <span class="text-slate-400">&copy; ${year} ${escapeHtml(companyName)}</span>
      <span class="mt-2 text-xs text-slate-500">Demo redesign concept — 営業提案用のデモサイトです。実在の内容とは異なる場合があります。</span>
    </div>
  </footer>
</body>
</html>
`;
}

/**
 * Cloudflare Pages serves a static directory as-is, so the deployable
 * artifact is just index.html (plus an optional headers file).
 */
export function buildDemoSiteFiles(manusJson) {
  return [
    { path: 'index.html', content: buildDemoSiteHtml(manusJson) },
    { path: '_headers', content: '/*\n  X-Robots-Tag: noindex\n' }
  ];
}
