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

function detectIndustry(manusJson) {
  const explicit = pickFirstValue(manusJson, ['industry', 'businessType'], '');
  const seed = [
    explicit,
    pickFirstValue(manusJson, ['companyName', 'company', 'name'], ''),
    ...normalizeArray(manusJson.siteConcept),
    ...normalizeArray(manusJson.companyOverview),
    ...normalizeArray(manusJson.recommendedPages)
  ].join(' ').toLowerCase();

  if (/墓|霊園|供養|葬祭/.test(seed)) return 'memorial';
  if (/病院|クリニック|医療|診療/.test(seed)) return 'medical';
  if (/弁護士|司法書士|税理士|行政書士|社労士|士業/.test(seed)) return 'professional';
  if (/介護|福祉|デイサービス/.test(seed)) return 'care';
  if (/製造|工場|加工|b2b/.test(seed)) return 'manufacturing';
  if (/工務店|建設|リフォーム|施工/.test(seed)) return 'construction';
  return 'general';
}

function pagePurpose(page) {
  if (/トップ|home|index/i.test(page)) return '初回訪問者に「何が強みか」「何を相談できるか」を10秒以内に理解してもらい、主要導線へ送客する。';
  if (/事例|実績|症例|施工|納入/i.test(page)) return '検討段階ユーザーに具体例と成果を示し、相談ハードルを下げる。';
  if (/サービス|診療|メニュー|取扱|業務/i.test(page)) return '提供範囲・進め方・料金目安を明示し、比較検討時の不安を解消する。';
  if (/会社|理念|スタッフ|院長|代表|施設紹介/i.test(page)) return '企業の信頼性・担当者の顔が見える情報を示し、問い合わせ前の心理的不安を軽減する。';
  if (/お客様の声|口コミ|レビュー/i.test(page)) return '第三者評価を提示し、意思決定の最後の不安を払拭する。';
  if (/問い合わせ|予約|相談|面談/i.test(page)) return '入力負荷を下げた導線でCVを最大化する。';
  return 'ページの役割を明確化し、次アクションに進みやすい導線を作る。';
}

function createIndustryGuide(industry) {
  const guides = {
    memorial: {
      trust: ['宗派・宗旨への対応可否', '供養・法要の流れ説明', '費用内訳の透明性', 'アクセスと駐車場情報'],
      image: ['墓地・施設外観は明るい時間帯で撮影', '過度に悲しみを煽る表現は避ける', 'スタッフの丁寧な案内シーンを中心に構成'],
      avoid: ['不安を煽る営業文句', '宗教観を断定する表現']
    },
    medical: {
      trust: ['診療時間・休診日・予約方法の明記', '医師・スタッフ資格', '感染対策や院内設備情報', '保険適用/自由診療の区分'],
      image: ['清潔感のある院内写真', '医療行為の誇張演出は避ける', '高齢者でも視認しやすいUI'],
      avoid: ['治療効果を断定する表現', '薬機法に抵触するビフォーアフター強調']
    },
    professional: {
      trust: ['対応領域と相談可能範囲', '料金体系・初回相談条件', '資格者プロフィール', '守秘義務・セキュリティ方針'],
      image: ['執務風景や相談風景の実写中心', '過度な高級感演出は避ける', 'テキスト可読性を最優先'],
      avoid: ['必ず勝てる等の断定', '法的判断を誤認させる簡略表現']
    },
    care: {
      trust: ['受け入れ対象者と提供サービス', 'スタッフ体制・資格', '空き状況と見学導線', '家族向け情報の充実'],
      image: ['利用者の尊厳を守る写真選定', '同意取得済み素材のみ使用', '明るく安心感のある生活シーン'],
      avoid: ['要介護者を一括りにする表現', '過剰な回復保証']
    },
    manufacturing: {
      trust: ['対応可能ロット・材質・精度', '設備一覧と品質管理体制', '納期対応と検査工程', '導入実績・取引業界'],
      image: ['工場設備・検査工程の実写', '安全対策が伝わる構図', '図表で仕様を明確化'],
      avoid: ['対応できない工程の包括表現', '品質保証を誤認させる断定']
    },
    construction: {
      trust: ['施工実績数と対応エリア', '有資格者・保証制度', '工期と費用目安', 'アフターサポート体制'],
      image: ['施工前後の比較写真（根拠付き）', '職人・現場の実写', '地域性の伝わる外観カット'],
      avoid: ['最安値保証など過度価格訴求', '根拠のないNo.1表現']
    },
    general: {
      trust: ['実績件数・対応範囲・運営年数', '問い合わせ前に必要な情報の明示', '担当者情報と連絡手段の明確化', 'FAQで不安を事前解消'],
      image: ['実在感のあるスタッフ/現場写真', '文字情報を補完する説明図版', '業種と無関係なイメージ素材を避ける'],
      avoid: ['根拠のないNo.1表現', '過度に煽るキャンペーン訴求']
    }
  };

  return guides[industry] ?? guides.general;
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
      const cta = ctas[index % Math.max(ctas.length, 1)] ?? '無料相談・見積依頼';
      return `### ${index + 1}. ${page}\n- 目的: ${pagePurpose(page)}\n- 掲載要素:\n${indentBullets(toBulletList(genericElements))}\n- CTA: ${cta}`;
    })
    .join('\n\n');
}

export function createSiteSpecMarkdown(manusJson, meta = {}) {
  const companyName = pickFirstValue(manusJson, ['companyName', 'company', 'name'], '対象企業');
  const website = pickFirstValue(manusJson, ['website', 'url', 'siteUrl'], '不明');

  const recommendedPages = normalizeArray(manusJson.recommendedPages ?? manusJson.siteMap);
  const firstViewIdeas = normalizeArray(manusJson.firstViewIdeas ?? manusJson.heroIdeas);
  const ctaIdeas = normalizeArray(manusJson.ctaIdeas ?? manusJson.cta);
  const industry = detectIndustry(manusJson);
  const industryGuide = createIndustryGuide(industry);

  const sections = {
    companyOverview: toBulletList(manusJson.companyOverview ?? manusJson.overview),
    currentSiteIssues: toBulletList(manusJson.currentSiteIssues ?? manusJson.issues),
    targetCustomers: toBulletList(manusJson.targetCustomers ?? manusJson.targetAudience),
    siteConcept: toBulletList(manusJson.siteConcept ?? manusJson.proposedConcept),
    firstViewIdeas: toBulletList(firstViewIdeas),
    ctaIdeas: toBulletList(ctaIdeas),
    designTone: toBulletList(manusJson.designTone ?? manusJson.designStyle),
    avoidExpressions: toBulletList([...(normalizeArray(manusJson.avoidExpressions ?? manusJson.cautions)), ...industryGuide.avoid]),
    buildInstruction: toBulletList(manusJson.buildInstruction ?? manusJson.claudeInstruction)
  };

  return `# ${companyName} サイト制作仕様書

- 生成日時: ${new Date().toISOString()}
- 入力ファイル: ${meta.inputPath ?? 'N/A'}
- 企業サイト: ${website}
- 推定業種: ${industry}

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
  - ヒーロー画像（業種に適した現場/スタッフ/提供物）
  - 信頼補強（対応範囲、実績数、資格、運営年数）
  - 主要CTA（相談/予約/資料請求のいずれか）
- 訴求案:
${indentBullets(sections.firstViewIdeas)}

## ページ構成別の制作要件
${renderPagePlan(recommendedPages, ctaIdeas)}

## CTA案
${sections.ctaIdeas}

## 業種別の信頼補強要素
${toBulletList(industryGuide.trust)}

## 画像方針
${toBulletList(industryGuide.image)}

## デザイントーン（具体指示）
${sections.designTone}
- 余白: セクション上下は72〜96px、本文行間は1.8前後で可読性を担保。
- タイポグラフィ: 見出しは太め（700）、本文は16〜18pxを基準に高齢層でも読みやすく。
- 色設計: ベース70% / サブ20% / アクセント10%で、CTA色は常に同一トーンで統一。
- UI方針: カード・ボタン角丸は控えめ（6〜10px）、過度なアニメーションは避ける。

## 使用しない方がよい表現・注意事項
${sections.avoidExpressions}

## Claude / Cursor / Codex 向け制作指示（サイト生成用）
- 目的: 上記要件を満たす、地方中小企業向けの信頼感重視コーポレートサイトを生成する。
- 技術要件:
  - Astro + Tailwind CSSで実装
  - モバイルファースト（375px基準）でレスポンシブ対応
  - semantic HTML / aria属性を適切に設定
  - LighthouseでPerformance/Accessibility/Best Practices/SEOの各90点以上を目標
- 実装要件:
  - 推奨ページ構成に沿って主要ページを作成（固定テンプレートに拘束しない）
  - 各ページに主CTA + 補助CTAを設置（業種と検討段階に合わせる）
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
