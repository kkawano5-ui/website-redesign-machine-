import path from 'path';
import fs from 'fs/promises';

/**
 * Site auditor — detect concrete defects in a prospect's current site so
 * outreach can be evidence-based ("拝見したところ、スマホ対応設定がなく…")
 * instead of generic. Higher relevance lifts the reply/close rate, and it
 * automates the manual research step.
 *
 *   npm run audit -- path/to/saved-page.html
 *   npm run audit -- https://prospect.example.com        # tries fetch, falls back
 *   npm run audit -- saved.html --write data/inputs/foo.json
 *
 * Offline-first: works on a saved HTML file regardless of network policy.
 * Heuristic (regex) checks — fast, dependency-free, good enough to anchor
 * a sales conversation; confirm specifics before quoting them as fact.
 */

const CHECKS = [
  {
    id: 'viewport',
    test: (h) => !/<meta[^>]+name=["']?viewport["']?/i.test(h),
    issue: 'スマートフォン表示の最適化設定（viewport）がなく、モバイルで見づらい',
    weight: 3
  },
  {
    id: 'layout-table',
    test: (h) => (h.match(/<table[\s>]/gi) || []).length >= 2,
    issue: 'テーブルレイアウトが使われており、スマホで崩れやすい',
    weight: 2
  },
  {
    id: 'meta-description',
    test: (h) => !/<meta[^>]+name=["']?description["']?/i.test(h),
    issue: 'メタディスクリプション未設定で、検索結果で内容が伝わりにくい',
    weight: 2
  },
  {
    id: 'title',
    test: (h) => !/<title[^>]*>\s*\S/i.test(h),
    issue: 'ページタイトルが設定されておらず、検索・共有時に不利',
    weight: 2
  },
  {
    id: 'insecure-resource',
    test: (h) => /(?:src|href)=["']http:\/\//i.test(h),
    issue: '一部リソースが非HTTPS（http://）で、混在コンテンツの懸念がある',
    weight: 2
  },
  {
    id: 'deprecated-tags',
    test: (h) => /<\/?(font|center|marquee|blink)[\s>]/i.test(h),
    issue: '古いHTMLタグ（font/center等）が使われており、保守・表示に難がある',
    weight: 1
  },
  {
    id: 'img-alt',
    test: (h) => {
      const imgs = h.match(/<img\b[^>]*>/gi) || [];
      return imgs.length > 0 && imgs.some((t) => !/\balt=/i.test(t));
    },
    issue: '画像にalt属性がなく、アクセシビリティ・SEOに課題がある',
    weight: 1
  },
  {
    id: 'h1',
    test: (h) => !/<h1[\s>]/i.test(h),
    issue: '見出し（H1）が不明確で、内容の階層が伝わりにくい',
    weight: 1
  },
  {
    id: 'ogp',
    test: (h) => !/<meta[^>]+property=["']?og:/i.test(h),
    issue: 'OGP未設定で、SNS共有時の見栄えが弱い',
    weight: 1
  }
];

export function auditHtml(html) {
  const found = CHECKS.filter((c) => {
    try {
      return c.test(html);
    } catch {
      return false;
    }
  }).map(({ id, issue, weight }) => ({ id, issue, weight }));
  found.sort((a, b) => b.weight - a.weight);
  const score = Math.max(0, 100 - found.reduce((s, f) => s + f.weight * 8, 0));
  return { score, issues: found };
}

async function loadHtml(target) {
  if (/^https?:\/\//i.test(target)) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      const res = await fetch(target, { redirect: 'follow', signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      throw new Error(
        `URLの取得に失敗しました (${e.message})。この環境はネットワークが制限されている場合があります。\n` +
          '対象ページをブラウザで保存(.html)し、そのファイルパスを指定して再実行してください。'
      );
    }
  }
  return fs.readFile(path.resolve(target), 'utf-8');
}

async function main() {
  const args = process.argv.slice(2);
  const target = args.find((a) => !a.startsWith('--'));
  const writeIdx = args.indexOf('--write');
  const writePath = writeIdx >= 0 ? args[writeIdx + 1] : null;

  if (!target) {
    console.error('Usage: node scripts/audit-site.js <html-file|url> [--write data/inputs/x.json]');
    process.exit(1);
  }

  const html = await loadHtml(target);
  const { score, issues } = auditHtml(html);

  console.log(`\n対象: ${target}`);
  console.log(`簡易スコア: ${score}/100（低いほど改善余地が大きい）\n`);
  if (issues.length === 0) {
    console.log('検出された明確な課題はありません。');
  } else {
    console.log('検出された課題:');
    for (const i of issues) console.log(`  - [${i.id}] ${i.issue}`);
  }

  const top = issues.slice(0, 3).map((i) => i.issue);
  if (top.length) {
    console.log('\ncurrentSiteIssues 用JSON:');
    console.log(JSON.stringify(top, null, 2));
  }

  if (writePath && top.length) {
    const abs = path.resolve(writePath);
    const json = JSON.parse(await fs.readFile(abs, 'utf-8'));
    json.currentSiteIssues = top;
    await fs.writeFile(abs, `${JSON.stringify(json, null, 2)}\n`, 'utf-8');
    console.log(`\n更新しました: ${abs}（currentSiteIssues を実測値で上書き）`);
  }
}

// Only run as CLI (allow importing auditHtml for tests/other scripts).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Audit failed:', error.message);
    process.exit(1);
  });
}
