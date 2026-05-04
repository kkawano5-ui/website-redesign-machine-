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
  if (pages.length === 0) return '- 記載なし（Top / サービス / 事例 / 会社案内 / お問い合わせ を基準に補完してください）';

  const genericElements = [
    '見出し（H1/H2）と要約リード文',
    '実績・根拠データ（件数/年数/対応エリア）',
    '信頼補強要素（お客様の声・資格・受賞）'
  ];

  return pages
    .map((page, index) => {
      const cta = ctas[index % Math.max(ctas.length, 1)] ?? '無料相談・見積依頼';
      return `### ${index + 1}. ${page}\n- 目的: このページ単体で価値が伝わり、次の行動（問い合わせ/資料請求/電話）に進める状態にする。\n- 必須セクション:\n${indentBullets(toBulletList(genericElements))}\n- 推奨CTA: - ${cta}`;
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

  const missingFields = meta.missingFields?.length
    ? `- 未入力項目: ${meta.missingFields.join(', ')}`
    : '- 未入力項目: なし';

  return `# ${companyName} サイト制作仕様書

## 0. 入力メタ情報
- 生成日時: ${new Date().toISOString()}
- 入力ファイル: ${meta.inputPath ?? 'N/A'}
- 企業サイト: ${website}
${missingFields}

## 1. プロジェクト要約（AI実装者向け）
- ゴール: 地方中小企業向けに、信頼感・清潔感・現代感のあるコーポレートサイトを制作する。
- 優先順位: ①信頼性 ②分かりやすさ ③問い合わせ導線 ④表示速度。
- 禁止事項: 既存サイト文言のコピペ、誇大表現、著作権リスク画像の使用。

## 2. 会社・市場理解
### 2-1. 会社概要
${sections.companyOverview}

### 2-2. 既存サイトの課題
${sections.currentSiteIssues}

### 2-3. ターゲット顧客
${sections.targetCustomers}

## 3. 企画方針
### 3-1. サイトコンセプト
${sections.siteConcept}

### 3-2. ファーストビュー訴求案
- 目的: 訪問後10秒以内に「誰向け / 何が強みか / どう行動すれば良いか」を理解できる状態を作る。
- 必須要素:
  - キャッチコピー（地域性 + 提供価値 + 実績）
  - サブコピー（顧客課題と解決像）
  - ヒーロー画像（施工現場/スタッフ/完成写真）
  - 信頼補強（対応エリア、施工件数、創業年、資格）
  - 主CTA（無料相談/見積依頼）
- 訴求テキスト案:
${indentBullets(sections.firstViewIdeas)}

### 3-3. CTA案
${sections.ctaIdeas}

## 4. 情報設計（IA）
### 4-1. 推奨ページ構成と要件
${renderPagePlan(recommendedPages, ctaIdeas)}

## 5. デザイン/UX要件
### 5-1. デザイントーン
${sections.designTone}
- 余白: セクション上下は72〜96px、本文行間は1.8前後で可読性を担保。
- タイポグラフィ: 見出しは700、本文は16〜18px。
- 色設計: ベース70% / サブ20% / アクセント10%。CTAカラーは固定。
- UI方針: 控えめな角丸（6〜10px）、アニメーションは必要最小限。

### 5-2. 表現上の注意
${sections.avoidExpressions}

## 6. 実装仕様（Claude / Cursor / Codex へそのまま渡す）
### 6-1. 技術スタック
- Astro + Tailwind CSS
- モバイルファースト（375px基準）
- semantic HTML + aria属性
- Lighthouse目標: Performance/Accessibility/Best Practices/SEO 各90+

### 6-2. 実装スコープ
- 主要ページ: Top / サービス / 事例 / 会社案内 / お問い合わせ
- 全ページに主CTA + 補助CTA
- 再利用コンポーネント: Hero / Section / CTA / Footer / Header
- 差し替え可能領域（文言・画像・連絡先）をコメントで明示

### 6-3. コンテンツ作成ルール
- ダミーテキストは業種に沿った自然な日本語で生成
- 断定的No.1表現など根拠不明の優良誤認表現は避ける
- 画像は著作権フリー素材またはプレースホルダーを使用

### 6-4. 追加実装指示
${sections.buildInstruction}

## 7. 納品物チェックリスト
- [ ] Astroプロジェクトとして \`npm install && npm run dev\` で起動できる
- [ ] レスポンシブで 375px / 768px / 1280px の崩れがない
- [ ] お問い合わせ導線が全主要ページから1クリック以内
- [ ] READMEにセットアップ/起動手順/編集ポイントを記載
`;
}
