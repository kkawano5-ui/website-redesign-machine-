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

// Pop palette: each theme is a vivid two-stop gradient (accent -> accent2)
// plus a soft tint for blob backgrounds. Brighter and friendlier than a
// single corporate hue, while staying tasteful enough for SMB trust.
const THEMES = {
  memorial: { accent: '#10b981', accent2: '#5eead4', accentDark: '#047857', tint: '#ecfdf5', name: 'フレッシュグリーン' },
  medical: { accent: '#2563eb', accent2: '#22d3ee', accentDark: '#1d4ed8', tint: '#eff6ff', name: 'スカイブルー' },
  professional: { accent: '#6366f1', accent2: '#a78bfa', accentDark: '#4338ca', tint: '#eef2ff', name: 'バイオレット' },
  care: { accent: '#fb7185', accent2: '#fbbf24', accentDark: '#e11d48', tint: '#fff1f2', name: 'コーラルポップ' },
  manufacturing: { accent: '#0ea5e9', accent2: '#38bdf8', accentDark: '#0369a1', tint: '#f0f9ff', name: 'エレクトリックブルー' },
  construction: { accent: '#f59e0b', accent2: '#fb923c', accentDark: '#d97706', tint: '#fffbeb', name: 'サンセットアンバー' },
  general: { accent: '#8b5cf6', accent2: '#ec4899', accentDark: '#6d28d9', tint: '#faf5ff', name: 'ポップパープル' }
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

// Abstract, copyright-safe hero artwork built purely from theme colors:
// overlapping circles, an organic blob, an ellipse, floating dots and a
// hand-drawn-style curve. Gives the "ポップ" visual the hero needs without
// any photo/illustration licensing risk.
function renderHeroArt(theme) {
  return `        <svg viewBox="0 0 420 420" class="h-full w-full" role="img" aria-label="装飾イラスト" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="hg1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="${theme.accent}" />
              <stop offset="1" stop-color="${theme.accent2}" />
            </linearGradient>
            <linearGradient id="hg2" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stop-color="${theme.accent2}" />
              <stop offset="1" stop-color="${theme.accent}" />
            </linearGradient>
          </defs>
          <ellipse cx="225" cy="320" rx="150" ry="40" fill="${theme.accent2}" opacity="0.18" />
          <path d="M300 120 C350 160 360 250 300 300 C245 345 150 345 105 290 C65 240 70 150 130 110 C185 73 255 83 300 120 Z" fill="url(#hg1)" />
          <circle cx="150" cy="150" r="70" fill="url(#hg2)" opacity="0.85" />
          <circle cx="225" cy="210" r="120" fill="none" stroke="${theme.accent2}" stroke-width="3" opacity="0.6" />
          <path d="M70 270 C140 220 200 320 350 250" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.85" />
          <circle cx="330" cy="110" r="16" fill="#ffffff" opacity="0.9" />
          <circle cx="95" cy="120" r="10" fill="${theme.accent2}" />
          <circle cx="300" cy="300" r="13" fill="#ffffff" opacity="0.8" />
          <circle cx="360" cy="200" r="8" fill="${theme.accent}" />
        </svg>`;
}

function renderHero(ctx) {
  const { catch1, catch2, primaryCta, theme, industryLabel } = ctx;
  return `  <section class="relative overflow-hidden bg-white">
    <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div class="absolute -left-28 -top-28 h-96 w-96 rounded-full opacity-40 blur-3xl" style="background:radial-gradient(circle at 30% 30%, ${theme.accent2}, transparent 70%)"></div>
      <div class="absolute -right-10 top-24 h-[30rem] w-[30rem] rounded-full opacity-30 blur-3xl" style="background:radial-gradient(circle at 70% 30%, ${theme.accent}, transparent 70%)"></div>
    </div>
    <div class="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-28 pt-16 sm:pt-20 lg:grid-cols-2 lg:gap-6">
      <div>
        <p class="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-semibold shadow-sm ring-1 ring-slate-100" style="color:${theme.accentDark}"><span class="inline-block h-2 w-2 rounded-full" style="background:${theme.accent}"></span>${escapeHtml(industryLabel)}向けリニューアル提案</p>
        <h1 class="text-4xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-5xl">${escapeHtml(catch1)}</h1>
        <p class="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">${escapeHtml(catch2)}</p>
        <div class="mt-9 flex flex-wrap gap-4">
          <a href="#contact" class="rounded-full px-8 py-4 text-base font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl" style="background:linear-gradient(135deg, ${theme.accent} 0%, ${theme.accent2} 100%)">${escapeHtml(primaryCta)}</a>
          <a href="#${navId(0)}" class="rounded-full bg-white px-8 py-4 text-base font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow">サービスを見る</a>
        </div>
      </div>
      <div class="relative mx-auto aspect-square w-full max-w-sm sm:max-w-md">
${renderHeroArt(theme)}
      </div>
    </div>
    <div class="-mb-px" aria-hidden="true">
      <svg viewBox="0 0 1440 120" preserveAspectRatio="none" class="h-16 w-full sm:h-24" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 64 C 240 8 480 8 720 56 C 960 104 1200 112 1440 64 L1440 120 L0 120 Z" fill="#f8fafc" />
      </svg>
    </div>
  </section>`;
}

function renderStats(stats) {
  const cells = stats
    .map(
      (s) => `      <div class="flex flex-col items-center rounded-[2rem] bg-white px-6 py-8 text-center shadow-sm ring-1 ring-slate-100">
        <span class="mb-3 inline-flex h-3 w-3 rounded-full" style="background:var(--accent)" aria-hidden="true"></span>
        <dt class="text-2xl font-extrabold text-slate-900 sm:text-3xl">${escapeHtml(s.value)}</dt>
        <dd class="mt-1 text-sm text-slate-500">${escapeHtml(s.label)}</dd>
      </div>`
    )
    .join('\n');
  return `  <section class="bg-slate-50">
    <dl class="mx-auto grid max-w-4xl grid-cols-1 gap-6 px-6 pb-16 sm:grid-cols-3">
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
      return `      <article class="group rounded-[1.75rem] bg-white p-7 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-xl">
        <div class="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full text-lg font-extrabold text-white shadow-md" style="background:linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%)">${i + 1}</div>
        <h3 class="text-lg font-bold text-slate-900">${escapeHtml(page)}</h3>
        <p class="mt-2 text-sm leading-relaxed text-slate-600">${escapeHtml(pagePurposeLine(page))}</p>
        <a href="#contact" class="mt-4 inline-flex items-center gap-1 text-sm font-bold" style="color:var(--accent)">${escapeHtml(cta)} <span class="transition group-hover:translate-x-1" aria-hidden="true">→</span></a>
      </article>`;
    })
    .join('\n');
  return `  <section id="${navId(0)}" class="bg-slate-50">
    <div class="mx-auto max-w-6xl px-6 py-20">
      <h2 class="text-2xl font-extrabold text-slate-900 sm:text-3xl">ご提案するページ構成</h2>
      <p class="mt-3 max-w-2xl text-slate-600">検討中のお客様が迷わず相談まで進める導線でリニューアルします。</p>
      <div class="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
${cards}
      </div>
    </div>
  </section>`;
}

function renderTrust(ctx) {
  const { trust, concept } = ctx;
  const conceptItems = concept
    .map((c) => `        <li class="flex gap-3"><span class="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold text-white" style="background:linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%)" aria-hidden="true">●</span><span>${escapeHtml(c)}</span></li>`)
    .join('\n');
  const trustItems = trust
    .map((t) => `        <li class="flex gap-3"><span class="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-white text-xs font-bold shadow-sm" style="color:var(--accent)" aria-hidden="true">✓</span><span>${escapeHtml(t)}</span></li>`)
    .join('\n');
  return `  <section id="${navId(1)}" class="bg-white">
    <div class="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2">
      <div>
        <h2 class="text-2xl font-extrabold text-slate-900 sm:text-3xl">私たちが大切にすること</h2>
        <ul class="mt-6 space-y-4 text-slate-700">
${conceptItems}
        </ul>
      </div>
      <div class="relative overflow-hidden rounded-[2.5rem] p-8" style="background:var(--tint)">
        <div class="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-50 blur-2xl" style="background:var(--accent2)" aria-hidden="true"></div>
        <h3 class="relative text-lg font-bold text-slate-900">安心していただくために</h3>
        <ul class="relative mt-5 space-y-4 text-slate-700">
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
        ? `        <a href="#contact" class="rounded-full bg-white px-8 py-4 font-bold shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl" style="color:${theme.accentDark}">${escapeHtml(c)}</a>`
        : `        <a href="#contact" class="rounded-full border-2 border-white/60 px-8 py-4 font-bold text-white transition hover:bg-white/10">${escapeHtml(c)}</a>`
    )
    .join('\n');
  return `  <section id="contact" class="bg-white px-6 py-20">
    <div class="relative mx-auto max-w-5xl overflow-hidden rounded-[3rem] px-6 py-20 text-center text-white shadow-xl" style="background:linear-gradient(135deg, ${theme.accent} 0%, ${theme.accent2} 100%)">
      <div class="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/15 blur-2xl" aria-hidden="true"></div>
      <div class="pointer-events-none absolute -bottom-20 -right-12 h-72 w-72 rounded-full bg-white/10 blur-2xl" aria-hidden="true"></div>
      <div class="relative mx-auto max-w-3xl">
        <h2 class="text-3xl font-extrabold sm:text-4xl">まずはお気軽にご相談ください</h2>
        <p class="mt-4 text-white/90">ご相談・お見積りは無料です。内容を伺ったうえで、最適なご提案をいたします。</p>
        <div class="mt-9 flex flex-wrap justify-center gap-4">
${buttons}
        </div>
        <p class="mt-6 text-sm text-white/80">※本ページはリニューアル提案用のデモです。お問い合わせ内容は送信されません。</p>
      </div>
    </div>
  </section>`;
}

// Industry-aware FAQ. Answering common doubts on-page is a proven way to
// lift the demo->contact conversion rate (the `close` lever in the model).
const FAQ_BY_INDUSTRY = {
  memorial: [
    ['見学だけでも可能ですか？', 'はい、見学のみでも歓迎です。無理な勧誘はいたしません。ご都合に合わせてご案内します。'],
    ['費用には何が含まれますか？', '基本費用に含まれる範囲と、別途必要になる費用の条件まで事前にご説明します。'],
    ['宗旨宗派の制限はありますか？', '原則として宗旨宗派を問わずご相談いただけます。詳細はお問い合わせください。']
  ],
  medical: [
    ['予約は必要ですか？', 'Web予約・お電話のいずれでも受け付けています。当日の空き状況もご案内できます。'],
    ['初診で持っていくものは？', '保険証と、お持ちの方はお薬手帳をご持参ください。問診票は事前にご記入いただけます。'],
    ['駐車場はありますか？', 'アクセスページに駐車場・最寄り交通機関の情報を掲載しています。']
  ],
  professional: [
    ['初回相談は無料ですか？', '初回相談の条件（無料/有料・時間）を明記しています。お気軽にご予約ください。'],
    ['料金体系を知りたいのですが', '主要業務の料金の目安を料金案内に掲載しています。お見積りは無料です。'],
    ['オンライン相談は可能ですか？', '対応可否をご相談時にご案内します。遠方の方もお問い合わせください。']
  ],
  care: [
    ['見学はできますか？', 'はい、随時見学を受け付けています。ご家族そろってのご相談も歓迎です。'],
    ['空き状況を知りたい', '最新の受け入れ状況をお問い合わせ時にご案内します。'],
    ['送迎はありますか？', '対応エリア・送迎の有無をご相談時にご説明します。']
  ],
  manufacturing: [
    ['小ロットでも対応可能ですか？', '対応可能なロット・材質・精度をお問い合わせ時にご確認いただけます。'],
    ['見積もりにかかる時間は？', '図面・仕様をいただければ、可能な範囲で迅速にお見積りします。'],
    ['短納期に対応できますか？', '工程と現状の負荷に応じてご相談に応じます。まずはご連絡ください。']
  ],
  construction: [
    ['相談・見積もりは無料ですか？', 'ご相談・お見積りは無料です。内容を伺ったうえでご提案します。'],
    ['対応エリアはどこまでですか？', '地域密着で対応しています。エリアの詳細はお問い合わせください。'],
    ['アフター対応はありますか？', '施工後の保証・アフターサポート体制についてもご説明します。']
  ],
  general: [
    ['相談・見積もりは無料ですか？', 'ご相談・お見積りは無料です。内容を伺ったうえで最適なご提案をします。'],
    ['対応エリアを教えてください', '地域を中心に対応しています。詳細はお問い合わせ時にご案内します。'],
    ['どのくらいで対応できますか？', '内容を伺ったうえで、スケジュールの目安をご案内します。']
  ]
};

function renderTestimonials(ctx) {
  // Placeholder testimonials — clearly marked as samples to replace.
  const samples = [
    ['丁寧に相談に乗ってもらえて安心できました。', '40代・ご家族'],
    ['対応が早く、こちらの要望をよく汲んでくれました。', '50代・ご利用者'],
    ['初めてでも分かりやすく説明してもらえました。', '30代・ご相談者']
  ];
  const cards = samples
    .map(
      ([quote, who]) => `      <figure class="rounded-[1.75rem] bg-white p-7 shadow-sm ring-1 ring-slate-100">
        <div class="flex items-center gap-3">
          <span class="inline-flex h-11 w-11 items-center justify-center rounded-full text-base font-extrabold text-white" style="background:linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%)" aria-hidden="true">${escapeHtml(who.slice(0, 1))}</span>
          <span class="text-lg" style="color:var(--accent)" aria-hidden="true">★★★★★</span>
        </div>
        <blockquote class="mt-4 text-slate-700">「${escapeHtml(quote)}」</blockquote>
        <figcaption class="mt-3 text-sm text-slate-500">${escapeHtml(who)}</figcaption>
      </figure>`
    )
    .join('\n');
  return `  <section class="bg-slate-50">
    <div class="mx-auto max-w-6xl px-6 py-20">
      <h2 class="text-2xl font-extrabold text-slate-900 sm:text-3xl">お客様の声</h2>
      <p class="mt-3 text-sm text-slate-500">※掲載内容はデモ用のサンプルです。実際の声に差し替えてください。</p>
      <div class="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
${cards}
      </div>
    </div>
  </section>`;
}

function renderFaq(industry) {
  const faqs = FAQ_BY_INDUSTRY[industry] ?? FAQ_BY_INDUSTRY.general;
  const items = faqs
    .map(
      ([q, a]) => `      <details class="group mb-4 rounded-2xl bg-slate-50 px-6 py-5 ring-1 ring-slate-100">
        <summary class="flex cursor-pointer items-center justify-between text-base font-bold text-slate-900">
          <span>${escapeHtml(q)}</span>
          <span class="ml-4 inline-flex h-7 w-7 flex-none select-none items-center justify-center rounded-full text-white transition group-open:rotate-45" style="background:linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%)" aria-hidden="true">＋</span>
        </summary>
        <p class="mt-3 text-slate-600">${escapeHtml(a)}</p>
      </details>`
    )
    .join('\n');
  return `  <section class="bg-white">
    <div class="mx-auto max-w-3xl px-6 py-20">
      <h2 class="text-2xl font-extrabold text-slate-900 sm:text-3xl">よくあるご質問</h2>
      <div class="mt-8">
${items}
      </div>
    </div>
  </section>`;
}

function renderStickyBar(ctx) {
  // Mobile-only sticky CTA — keeps the primary action one tap away while
  // scrolling, a reliable lift to contact rate on phones.
  // NOTE: replace href="#contact" on the call button with a real tel: link.
  return `  <div class="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur sm:hidden">
    <div class="flex gap-3">
      <a href="#contact" class="flex-1 rounded-full border border-slate-300 py-3 text-center text-sm font-bold text-slate-700">電話で相談</a>
      <a href="#contact" class="flex-1 rounded-full py-3 text-center text-sm font-bold text-white" style="background:linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%)">${escapeHtml(ctx.primaryCta)}</a>
    </div>
  </div>`;
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
    industry,
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
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(companyName)}｜リニューアルデモ" />
  <meta property="og:description" content="${escapeHtml(industryLabel)}向けに信頼感と相談導線を重視して再設計した提案デモです。" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>:root{--accent:${theme.accent};--accent2:${theme.accent2};--accent-dark:${theme.accentDark};--tint:${theme.tint}}html{scroll-behavior:smooth}body{font-feature-settings:"palt"}</style>
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
      <a href="#contact" class="rounded-full px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90" style="background:linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%)">${escapeHtml(primaryCta)}</a>
    </div>
  </header>

${renderHero(ctx)}
${renderStats(stats)}
${renderServices(ctx)}
${renderTrust(ctx)}
${renderTestimonials(ctx)}
${renderFaq(industry)}
${renderCta(ctx)}

  <footer class="bg-slate-900 py-10 pb-24 text-slate-300 sm:pb-10">
    <div class="mx-auto flex max-w-6xl flex-col gap-2 px-6 text-sm">
      <span class="font-semibold text-white">${escapeHtml(companyName)}</span>
      <span class="text-slate-400">&copy; ${year} ${escapeHtml(companyName)}</span>
      <span class="mt-2 text-xs text-slate-500">Demo redesign concept — 営業提案用のデモサイトです。実在の内容とは異なる場合があります。</span>
    </div>
  </footer>
${renderStickyBar(ctx)}
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
