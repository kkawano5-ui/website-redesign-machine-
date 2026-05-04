import { pickFirstValue, toBulletList } from './utils.js';

function normalizeArray(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function indentBullets(text, indent = '  ') {
  return text
    .split('\n')
    .map((line) => `${indent}${line}`)
    .join('\n');
}

function renderPagePlan(pages, ctas) {
  if (pages.length === 0) return '- 記載なし';

  const genericElements = [
    '見出し（H1/H2）と要約リード文',
    '実績・根拠データ（件数/年数/対応エリア）',
    '信頼補強要素（お客様の声・資格・受賞）'
  ];

  return pages
    .map((page, index) => {
      const purpose =
        page.includes('トップ')
          ? '初回訪問者に「何が強みか」「何を相談できるか」を10秒以内に理解してもらい、主要導線へ送客する。'
          : page.includes('事例')
            ? '検討段階のユーザーに具体的な施工イメージと費用感を提示し、相談ハードルを下げる。'
            : page.includes('サービス')
              ? '提供範囲・進め方・料金目安を明示し、比較検討時の不安を解消する。'
              : page.includes('会社')
                ? '企業の信頼性・担当者の顔が見える情報を示し、問い合わせ前の心理的不安を軽減する。'
                : page.includes('問い合わせ')
                  ? '入力負荷を下げた問い合わせ導線でCVを最大化する。'
                  : 'ページの役割を明確化し、次アクションに進みやすい導線を作る。';

      const cta = ctas[index % Math.max(ctas.length, 1)] ?? '無料相談・見積依頼';

      return `### ${index + 1}. ${page}\n- 目的: ${purpose}\n- 掲載要素:\n${indentBullets(toBulletList(genericElements))}\n- CTA: - ${cta}`;
    })
    .join('\n\n');
}

export function createSiteSpecMarkdown(manusJson, meta = {}) {
  const companyName = pickFirstValue(manusJson, ['companyName', 'company', 'name'], '対象企業');
  const website = pickFirstValue(manusJson, ['website', 'url', 'siteUrl'], '不明');

  const recommendedPages = normalizeArray(manusJson.recommendedPages ?? manusJson.siteMap);
  const firstViewIdeas = normalizeArray(manusJson.firstViewIdeas ?? manusJson.heroIdeas);
  const ctaIdeas = normalizeArray(manusJson.ctaIdeas ?? manusJson.cta);

  const sections = {
    companyOverview: toBulletList(manusJson.companyOverview ?? manusJson.overview),
    currentSiteIssues: toBulletList(manusJson.currentSiteIssues ?? manusJson.issues),
    targetCustomers: toBulletList(manusJson.targetCustomers ?? manusJson.targetAudience),
    siteConcept: toBulletList(manusJson.siteConcept ?? manusJson.proposedConcept),
    firstViewIdeas: toBulletList(firstViewIdeas),
    ctaIdeas: toBulletList(ctaIdeas),
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

## ファーストビュー案（詳細）
- 目的: 訪問直後に「自社に合うか」を判断できるよう、強み・実績・行動導線を1画面で提示する。
- 必須要素:
  - キャッチコピー（地域性 + 提供価値 + 実績）
  - サブコピー（対象顧客の課題と解決イメージ）
  - ヒーロー画像（施工現場/スタッフ/完成写真）
  - 信頼補強（対応エリア、施工件数、創業年、資格）
  - 主要CTA（無料相談/事例集DL）
- 訴求案:
${indentBullets(sections.firstViewIdeas)}

## ページ構成別の制作要件
${renderPagePlan(recommendedPages, ctaIdeas)}

## CTA案
${sections.ctaIdeas}

## デザイントーン（具体指示）
${sections.designTone}
- 余白: セクション上下は72〜96px、本文行間は1.8前後で可読性を担保。
- タイポグラフィ: 見出しは太め（700）、本文は16〜18pxを基準に高齢層でも読みやすく。
- 色設計: ベース70% / サブ20% / アクセント10%で、CTA色は常に同一トーンで統一。
- UI方針: カード・ボタン角丸は控えめ（6〜10px）、過度なアニメーションは避ける。

## 使用しない方がよい表現・注意事項
${sections.avoidExpressions}

## Claude / Cursor / Codex 向け制作指示（サイト生成用）
- 目的: 上記要件を満たす、ローカル中小企業向けの信頼感重視コーポレートサイトを生成する。
- 技術要件:
  - Astro + Tailwind CSSで実装
  - モバイルファースト（375px基準）でレスポンシブ対応
  - semantic HTML / aria属性を適切に設定
  - LighthouseでPerformance/Accessibility/Best Practices/SEOの各90点以上を目標
- 実装要件:
  - Top / 事例 / サービス / 会社案内 / お問い合わせ の主要ページを作成
  - 各ページに主CTA + 補助CTAを設置
  - ダミーテキストは業種に沿った自然な文体で作成（誇大表現禁止）
  - 画像は著作権フリー素材またはプレースホルダーを使用
- 出力要件:
  - ディレクトリ構造、セットアップ手順、起動手順をREADMEに記載
  - 主要コンポーネント（Hero, Section, CTA, Footer）を分離実装
  - 今後の差し替えポイント（文言・画像・連絡先）をコメントで明示
- 追記事項:
${indentBullets(sections.buildInstruction)}
`;
}
