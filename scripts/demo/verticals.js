// 新4業種のサンプルサイト用テーマ定義。
// 対象: 建築・外装 / フィットネス / ペット / 美容医療
// 整体・鍼灸は既存「治療院」テンプレで代替するため対象外（GTMメモ準拠）。
// 各テーマは scripts/create-site-spec.js の業種ガイド（信頼補強・画像方針・避ける表現）と整合させている。
// すべてのテキストはプレーン文字列（HTMLタグ無し）。描画側で必ずエスケープすること。

export const VERTICALS = {
  kenchiku: {
    key: 'kenchiku',
    prefix: 'k',
    name: '建築・外装',
    label: '外壁塗装・屋根・防水・リフォーム',
    accent: '#1f5fa8',
    accentDark: '#143f73',
    glow: '#3f86d6',
    tint: '#eef4fb',
    headline: () => '住まいを、\n長く美しく守る。',
    lead: (c) =>
      `${c.name}は、外壁塗装・屋根工事・防水・リフォームを手がける地域密着の専門店です。現地調査からお見積り、施工後の保証までしっかりお任せいただけます。`,
    reasons: [
      { icon: '🏠', title: '地域密着の施工対応', desc: '地元での施工で培った経験をもとに、建物の状態に合わせた最適なプランをご提案します。（実績件数は差し替え枠）' },
      { icon: '👷', title: '自社スタッフが丁寧に対応', desc: '現地調査から施工まで経験豊富なスタッフが担当し、工程はその都度ご説明します。' },
      { icon: '📋', title: '費用と工期を明確に', desc: '内訳の分かるお見積りをご提示し、ご納得いただいてから着工します。' },
    ],
    services: [
      { name: '外壁塗装', desc: '建物に合わせた塗料選定と丁寧な下地処理で、美観と耐久性に配慮します。' },
      { name: '屋根工事・修理', desc: '点検から塗装・葺き替えまで、屋根まわりを幅広く対応します。' },
      { name: '防水工事', desc: 'ベランダ・屋上などの防水を、建物に適した工法でご提案します。' },
      { name: '内外装リフォーム', desc: '住まいの気になる箇所を、暮らしやすさを考えてリフォームします。' },
    ],
    workLabel: '施工事例',
    voices: [
      { who: '40代・戸建てオーナー', text: '見積りの説明が分かりやすく、工程ごとに報告があって安心して任せられました。' },
      { who: '50代・店舗オーナー', text: '外壁がきれいになり、お店の印象が明るくなったと好評です。' },
    ],
    ctaLabel: '無料の現地調査・お見積り',
    avoid: ['最安値保証など過度な価格訴求', '根拠のないNo.1表現'],
    imagePolicy: ['施工前後の比較写真（根拠付き）', '職人・現場の実写', '地域性の伝わる外観カット'],
  },

  fitness: {
    key: 'fitness',
    prefix: 'f',
    name: 'フィットネス',
    label: 'パーソナルジム・ピラティス',
    accent: '#13b58a',
    accentDark: '#0c7e60',
    glow: '#27d6a6',
    tint: '#ecfbf6',
    headline: () => 'なりたい身体へ、\nマンツーマンで。',
    lead: (c) =>
      `${c.name}は、${c.area}の完全個室・マンツーマン指導のパーソナルジム／ピラティススタジオです。一人ひとりの目標と体力に合わせてプログラムを設計します。`,
    reasons: [
      { icon: '🎯', title: '目標に合わせた個別設計', desc: 'カウンセリングをもとに、無理なく続けられるプランをご提案します。' },
      { icon: '🚪', title: '完全個室・予約制', desc: '人目を気にせず、自分のペースでトレーニングに集中できます。' },
      { icon: '🥗', title: '日々の習慣までサポート', desc: 'トレーニングだけでなく、生活習慣のご相談にも寄り添います。' },
    ],
    services: [
      { name: 'パーソナルトレーニング', desc: '専属トレーナーがフォームから丁寧に指導します。' },
      { name: 'ピラティス', desc: '体幹や姿勢を意識した動きで、しなやかな身体づくりを目指します。' },
      { name: '食事・生活アドバイス', desc: '日々の食事や習慣について、続けやすい形でご提案します。' },
      { name: '体験セッション', desc: 'まずは雰囲気を知っていただける体験をご用意しています。' },
    ],
    workLabel: 'スタジオ・トレーニング風景',
    voices: [
      { who: '30代・女性', text: 'マンツーマンなので質問しやすく、自分のペースで続けられています。' },
      { who: '40代・男性', text: '無理のないメニューで、運動の習慣が身につきました。' },
    ],
    ctaLabel: '無料カウンセリング・体験予約',
    avoid: ['効果を断定する表現', '誇大な数値訴求（個人差を明記する）'],
    imagePolicy: ['清潔感のあるスタジオ写真', 'トレーナーの実写', '誇張のない実際のトレーニング風景'],
  },

  pet: {
    key: 'pet',
    prefix: 'p',
    name: 'ペット',
    label: 'ペットサロン・トリミング',
    accent: '#f0863e',
    accentDark: '#c25e1f',
    glow: '#ffa867',
    tint: '#fff3ea',
    headline: () => '大切な家族を、\nやさしく、きれいに。',
    lead: (c) =>
      `${c.name}は、${c.area}のトリミングサロンです。一頭ごとの体調や性格に合わせ、丁寧なカウンセリングのうえでお預かりします。`,
    reasons: [
      { icon: '✂️', title: '経験豊富なトリマー', desc: 'その子に合わせたカットとケアを、丁寧に行います。' },
      { icon: '🧼', title: '清潔で安心な店内', desc: '衛生管理に配慮した環境で、リラックスして過ごせるよう努めています。' },
      { icon: '🐾', title: '一頭ずつ丁寧に', desc: '完全予約制で、その子のペースに合わせてお預かりします。' },
    ],
    services: [
      { name: 'トリミング', desc: '犬種・毛質・ご希望に合わせたカットをご提案します。' },
      { name: 'シャンプー・スパ', desc: '肌や被毛をいたわる丁寧な洗いで、すっきり清潔に。' },
      { name: '部分カット・ケア', desc: '爪切り・耳掃除など、気になる部分のケアにも対応します。' },
      { name: 'オプションケア', desc: 'その子に合わせた追加のケアメニューをご用意しています。' },
    ],
    workLabel: 'トリミング事例',
    voices: [
      { who: '愛犬家・40代', text: 'カウンセリングが丁寧で、仕上がりも毎回満足しています。' },
      { who: '愛猫家・30代', text: 'うちの子に優しく接してくれて、安心して任せられます。' },
    ],
    ctaLabel: 'ご予約・お問い合わせ',
    avoid: ['効果を断定する表現', '不安を過度に煽る表現'],
    imagePolicy: ['清潔な店内の写真', '同意取得済みのペット写真', '誇張のない仕上がり写真'],
  },

  biyoclinic: {
    key: 'biyoclinic',
    prefix: 'c',
    name: '美容医療',
    label: '美容クリニック・美容皮膚科',
    accent: '#b08463',
    accentDark: '#8a6347',
    glow: '#cda383',
    tint: '#f8f1ea',
    headline: () => '肌の悩みに、\n医師が寄り添う。',
    lead: (c) =>
      `${c.name}は、${c.area}の美容皮膚科・美容外科クリニックです。お一人おひとりのお悩みをうかがい、医師がご相談に応じます。`,
    reasons: [
      { icon: '🩺', title: '医師によるカウンセリング', desc: 'お悩みやご希望をうかがい、無理のないご提案を心がけます。' },
      { icon: '🏥', title: '院内環境への配慮', desc: '清潔感とプライバシーに配慮した院内でお迎えします。' },
      { icon: '💴', title: '料金の明確化', desc: '事前に料金をご説明し、ご納得いただいたうえで進めます。' },
    ],
    services: [
      { name: '美容皮膚科', desc: '肌のお悩みについて、医師がご相談に応じます。（内容は差し替え枠）' },
      { name: 'スキンケア相談', desc: '日々のケアについてのご相談を承ります。' },
      { name: 'カウンセリング', desc: 'まずはお悩みをうかがうカウンセリングから始められます。' },
    ],
    workLabel: '院内のご案内',
    voices: [
      { who: '30代・女性', text: 'カウンセリングが丁寧で、疑問にしっかり答えてもらえました。' },
      { who: '40代・女性', text: '料金の説明が明確で、安心して相談できました。' },
    ],
    ctaLabel: 'カウンセリングのご予約',
    // 医療広告ガイドライン・薬機法: 効果効能の断定、ビフォーアフターの強調、体験談による効果保証は不可。
    avoid: ['治療効果を断定する表現', 'ビフォーアフターを強調する表現', '体験談で効果を保証する表現', '「絶対」「必ず」等の断定'],
    imagePolicy: ['清潔感のある院内写真', '医療行為を誇張しない構成', '効果を想起させる加工画像は使わない'],
  },
};

const ALIASES = {
  kenchiku: ['kenchiku', 'k', '建築', '建築・外装', '外装', '外壁', '外壁塗装', '屋根', '防水', 'リフォーム', '塗装', 'construction'],
  fitness: ['fitness', 'f', 'フィットネス', 'ジム', 'パーソナルジム', 'パーソナル', 'ピラティス', 'gym', 'pilates'],
  pet: ['pet', 'p', 'ペット', 'ペットサロン', 'トリミング', 'トリマー', 'グルーミング', 'grooming'],
  biyoclinic: ['biyoclinic', 'c', '美容医療', '美容クリニック', '美容皮膚科', '美容外科', 'クリニック', '医療脱毛', 'clinic'],
};

// 区分文字列・社名から業種キーを推定する。戻り値 { key, resolvedBy }。
export function resolveVertical(rawVertical, name = '') {
  const raw = String(rawVertical ?? '').trim().toLowerCase();
  if (raw) {
    for (const [key, aliases] of Object.entries(ALIASES)) {
      if (aliases.some((a) => raw === a.toLowerCase())) return { key, resolvedBy: 'label' };
    }
    for (const [key, aliases] of Object.entries(ALIASES)) {
      if (aliases.some((a) => a.length >= 2 && raw.includes(a.toLowerCase()))) return { key, resolvedBy: 'label-partial' };
    }
  }
  const seed = String(name ?? '');
  for (const [key, aliases] of Object.entries(ALIASES)) {
    if (aliases.some((a) => a.length >= 2 && seed.includes(a))) return { key, resolvedBy: 'name' };
  }
  return { key: null, resolvedBy: 'unresolved' };
}
