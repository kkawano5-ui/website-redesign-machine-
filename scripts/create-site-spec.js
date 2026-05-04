import { pickFirstValue, toBulletList } from './utils.js';

export function createSiteSpecMarkdown(manusJson, meta = {}) {
  const companyName = pickFirstValue(manusJson, ['companyName', 'company', 'name'], '対象企業');
  const website = pickFirstValue(manusJson, ['website', 'url', 'siteUrl'], '不明');

  const sections = {
    companyOverview: toBulletList(manusJson.companyOverview ?? manusJson.overview),
    currentSiteIssues: toBulletList(manusJson.currentSiteIssues ?? manusJson.issues),
    targetCustomers: toBulletList(manusJson.targetCustomers ?? manusJson.targetAudience),
    siteConcept: toBulletList(manusJson.siteConcept ?? manusJson.proposedConcept),
    recommendedPages: toBulletList(manusJson.recommendedPages ?? manusJson.siteMap),
    firstViewIdeas: toBulletList(manusJson.firstViewIdeas ?? manusJson.heroIdeas),
    ctaIdeas: toBulletList(manusJson.ctaIdeas ?? manusJson.cta),
    designTone: toBulletList(manusJson.designTone ?? manusJson.designStyle),
    avoidExpressions: toBulletList(manusJson.avoidExpressions ?? manusJson.cautions),
    buildInstruction: toBulletList(manusJson.buildInstruction ?? manusJson.claudeInstruction)
  };

  return `# ${companyName} サイト制作仕様書

- 生成日時: ${new Date().toISOString()}
- 入力ファイル: ${meta.inputPath ?? 'N/A'}
- 企業サイト: ${website}

## 会社概要
${sections.companyOverview}

## 既存サイトの課題
${sections.currentSiteIssues}

## ターゲット顧客
${sections.targetCustomers}

## 提案するサイトコンセプト
${sections.siteConcept}

## 推奨ページ構成
${sections.recommendedPages}

## ファーストビュー案
${sections.firstViewIdeas}

## CTA案
${sections.ctaIdeas}

## デザイントーン
${sections.designTone}

## 使用しない方がよい表現・注意事項
${sections.avoidExpressions}

## Claudeでサイト生成するための制作指示
${sections.buildInstruction}
`;
}
