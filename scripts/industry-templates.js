import { detectIndustry } from './create-site-spec.js';

/**
 * Industry templates — scaffolding that expands a thin lead (company name +
 * URL + industry) into a complete, validation-passing input JSON.
 *
 * The goal is to scale "demos sent" (the cheapest lever in the revenue
 * model) without hand-authoring every field. Values are industry-typical
 * placeholders meant to be refined; the generated demo footer already
 * states it is a concept that may differ from reality.
 *
 * Any field can be overridden per-lead via the CSV.
 */

const TEMPLATES = {
  memorial: {
    targetCustomers: ['50〜70代で墓じまい・改葬を検討中の家族', '遠方在住で現地確認の時間が限られる層'],
    siteConcept: ['宗旨宗派への配慮と費用透明性で安心して相談できる霊園サイト', '見学予約まで迷わず進める導線設計'],
    recommendedPages: ['トップページ', 'プラン・費用', '供養の流れ', 'よくある質問', 'アクセス', '見学予約'],
    firstViewIdeas: ['将来の管理不安に備える永代供養を明確化したコピー', '費用目安・対応エリア・見学予約CTAを1画面で提示'],
    ctaIdeas: ['見学予約をする', '資料を請求する', '電話で相談する'],
    designTone: ['落ち着きと清潔感のある配色（白・深緑・グレー基調）', '高齢者にも読みやすい文字サイズと明瞭なコントラスト'],
    buildInstruction: ['見学予約フォームは入力項目を最小化し電話導線を常時表示', '費用は追加費用の条件まで注記する']
  },
  medical: {
    targetCustomers: ['近隣で通いやすい医療機関を探す地域住民', '初めて受診する不安を抱える患者・家族'],
    siteConcept: ['診療内容と受診のしやすさが一目で伝わるクリニックサイト', '予約・アクセスまで迷わない導線'],
    recommendedPages: ['トップページ', '診療案内', '院内・設備紹介', '医師・スタッフ紹介', 'アクセス', 'Web予約'],
    firstViewIdeas: ['診療科目・診療時間・予約導線を1画面で提示', '清潔感と安心感を伝えるキャッチコピー'],
    ctaIdeas: ['Web予約をする', '診療時間を確認する', '電話で問い合わせる'],
    designTone: ['清潔感のある白＋ブルー基調', '高齢者にも視認しやすいUIと十分なコントラスト'],
    buildInstruction: ['診療時間・休診日・予約方法を明確に表示', '治療効果を断定する表現は避ける']
  },
  professional: {
    targetCustomers: ['初めて専門家へ相談する個人・経営者', '対応領域と料金を比較検討している層'],
    siteConcept: ['相談できる範囲と料金が明快で安心して問い合わせできる士業サイト', '初回相談までの心理的ハードルを下げる構成'],
    recommendedPages: ['トップページ', '取扱業務', '料金案内', '事務所・代表紹介', 'よくある質問', '相談予約'],
    firstViewIdeas: ['対応領域と初回相談条件を明確化したコピー', '資格者の信頼性と相談導線を1画面で提示'],
    ctaIdeas: ['無料相談を予約する', '料金を確認する', '電話で相談する'],
    designTone: ['信頼感のあるネイビー＋グレー基調', 'テキスト可読性を最優先した余白設計'],
    buildInstruction: ['初回相談の条件・料金体系を明示', '必ず勝てる等の断定表現は避ける']
  },
  care: {
    targetCustomers: ['親の介護先を検討する家族', '見学・空き状況を急いで知りたい層'],
    siteConcept: ['受け入れ対象と提供サービスが明快で家族が安心して相談できる介護サイト', '見学予約まで迷わない導線'],
    recommendedPages: ['トップページ', 'サービス案内', '料金・利用の流れ', 'スタッフ・施設紹介', 'よくある質問', '見学・相談予約'],
    firstViewIdeas: ['受け入れ対象と空き状況の確認導線を明確化', '安心感のある生活シーンと相談CTAを提示'],
    ctaIdeas: ['見学を予約する', '空き状況を問い合わせる', '電話で相談する'],
    designTone: ['温かみと清潔感のある配色', '高齢家族にも読みやすい大きめの文字'],
    buildInstruction: ['受け入れ対象・提供サービス・空き状況導線を明確化', '過剰な回復保証表現は避ける']
  },
  manufacturing: {
    targetCustomers: ['発注先を比較検討する調達・技術担当', '小ロット/特殊材質の対応可否を探す層'],
    siteConcept: ['対応範囲と品質体制が伝わり安心して引き合いできるB2Bサイト', '問い合わせ・見積依頼までの導線を短縮'],
    recommendedPages: ['トップページ', '対応技術・設備', '加工事例', '品質・体制', '会社案内', '見積・問い合わせ'],
    firstViewIdeas: ['対応材質・ロット・精度を明確化したコピー', '導入実績と問い合わせ導線を1画面で提示'],
    ctaIdeas: ['見積を依頼する', '技術資料を請求する', '電話で相談する'],
    designTone: ['信頼感のあるスチールブルー＋グレー基調', '仕様が伝わる図表中心の構成'],
    buildInstruction: ['対応可能な工程・材質・精度を具体的に明示', '対応できない工程の包括表現は避ける']
  },
  construction: {
    targetCustomers: ['新築・リフォームを検討する持ち家世帯', '初めて工務店へ相談する家族'],
    siteConcept: ['施工事例から問い合わせまでの導線を短縮した工務店サイト', '安心して相談できる地域密着の訴求'],
    recommendedPages: ['トップページ', '施工事例', 'サービス紹介', '会社案内', 'よくある質問', 'お問い合わせ'],
    firstViewIdeas: ['地域密着の実績を伝えるキャッチコピー', '代表的な施工写真と無料相談CTA'],
    ctaIdeas: ['無料相談はこちら', '施工事例を見る', '電話で相談する'],
    designTone: ['温かみのある配色', '読みやすい余白設計'],
    buildInstruction: ['施工前後の比較は根拠付きで掲載', '最安値保証など過度な価格訴求は避ける']
  },
  general: {
    targetCustomers: ['地域で取引先・相談先を探す層', '初めて問い合わせる個人・企業'],
    siteConcept: ['強みと相談できる内容が一目で伝わるコーポレートサイト', '問い合わせまでの導線を短縮'],
    recommendedPages: ['トップページ', 'サービス紹介', '実績・事例', '会社案内', 'よくある質問', 'お問い合わせ'],
    firstViewIdeas: ['提供価値と実績を伝えるキャッチコピー', '強みと問い合わせ導線を1画面で提示'],
    ctaIdeas: ['無料で相談する', '資料を請求する', '電話で問い合わせる'],
    designTone: ['信頼感と清潔感のある配色', '読みやすい余白とコントラスト'],
    buildInstruction: ['強みと実績を具体的に提示', '根拠のないNo.1表現は避ける']
  }
};

function defaultOverview(companyName, industryLabel) {
  return [
    `${companyName}の事業概要（${industryLabel}）。※リサーチ結果で差し替えてください。`,
    '地域のお客様に向けてサービスを提供。'
  ];
}

function defaultIssues() {
  return [
    'スマートフォンで見づらく離脱しやすい',
    '問い合わせ・予約の導線が分かりにくい',
    '強みや実績が初見で伝わりにくい'
  ];
}

/**
 * Expand a thin lead object into a complete input JSON.
 * Recognized lead keys: companyName (required), website, industry,
 * companySlug, plus optional overrides for any required field.
 */
export function buildInputFromLead(lead) {
  const companyName = String(lead.companyName ?? '').trim();
  if (!companyName) throw new Error('companyName is required');

  const website = String(lead.website ?? '').trim() || 'https://example.com';

  // Reuse the shared industry detector; honor an explicit industry hint.
  const industry = detectIndustry({
    industry: lead.industry,
    companyName,
    siteConcept: lead.siteConcept,
    recommendedPages: lead.recommendedPages,
    companyOverview: lead.companyOverview
  });
  const tpl = TEMPLATES[industry] ?? TEMPLATES.general;
  const industryLabel = String(lead.industry ?? industry).trim();

  const pick = (key, fallback) => {
    const v = lead[key];
    if (Array.isArray(v) && v.length) return v;
    if (typeof v === 'string' && v.trim()) return v.split('|').map((s) => s.trim()).filter(Boolean);
    return fallback;
  };

  const input = {
    companySlug: String(lead.companySlug ?? '').trim() || undefined,
    companyName,
    website,
    industry: industryLabel || undefined,
    companyOverview: pick('companyOverview', defaultOverview(companyName, industryLabel || industry)),
    currentSiteIssues: pick('currentSiteIssues', defaultIssues()),
    targetCustomers: pick('targetCustomers', tpl.targetCustomers),
    siteConcept: pick('siteConcept', tpl.siteConcept),
    recommendedPages: pick('recommendedPages', tpl.recommendedPages),
    firstViewIdeas: pick('firstViewIdeas', tpl.firstViewIdeas),
    ctaIdeas: pick('ctaIdeas', tpl.ctaIdeas),
    designTone: pick('designTone', tpl.designTone),
    avoidExpressions: pick('avoidExpressions', []),
    buildInstruction: pick('buildInstruction', tpl.buildInstruction)
  };

  // Drop undefined optional keys for clean JSON output.
  Object.keys(input).forEach((k) => input[k] === undefined && delete input[k]);
  return input;
}
