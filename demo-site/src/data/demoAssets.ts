// 営業デモ用の「承認済み素材パック」マニフェスト。
//
// 重要な方針:
// - 画像は外部からランダム取得しない（クエリ自動取得・ランダムURLは禁止）
// - サイトで使うのは approved: true の素材だけ
// - 画像URLをHTMLや shop データに直接ベタ書きしない（必ずこの manifest 経由）
// - 素材は public/demo-assets/{category}/{role}/ に配置する前提（本番は店舗写真へ差し替え）
//
// 現状はキュレーション済みの実ファイルがまだ無いため、全エントリ approved: false。
// 本物の素材を public/demo-assets/... に置き、該当エントリを approved: true にすると表示されます。
// approved が無い役割は、ランダム画像ではなく「デザインされた差し替え枠」を表示します。

export type AssetCategory =
  | 'yakiniku'
  | 'kissaten'
  | 'cafe'
  | 'izakaya'
  | 'ramen'
  | 'bar'
  | 'chinese'
  | 'washoku';

export type AssetRole = 'hero' | 'menu' | 'interior' | 'atmosphere' | 'detail' | 'video' | 'ogp';

export interface DemoAsset {
  id: string;
  category: AssetCategory;
  role: AssetRole;
  src: string;
  alt: string;
  mood: string[];
  suitableFor: string[];
  avoidFor?: string[];
  note?: string;
  approved: boolean;
}

// 業態ごとの雰囲気タグ（mood マッチに使用）
const CATEGORY_MOOD: Record<AssetCategory, string[]> = {
  yakiniku: ['dark', 'charcoal', 'smoke', 'premium', 'warm', 'appetizing'],
  kissaten: ['retro', 'warm', 'dim', 'wood', 'calm', 'showa'],
  cafe: ['bright', 'natural', 'soft', 'clean', 'beige', 'daylight'],
  izakaya: ['wood', 'warm', 'lively', 'casual', 'amber'],
  ramen: ['steam', 'red', 'energetic', 'counter', 'hearty'],
  bar: ['dark', 'quiet', 'gold', 'moody', 'bottles'],
  chinese: ['red', 'gold', 'lively', 'local', 'wok'],
  washoku: ['calm', 'seasonal', 'refined', 'wood', 'green']
};

// 業態×役割の alt テンプレ（業態とズレない説明文）
const ALT: Record<AssetCategory, Partial<Record<AssetRole, string>>> = {
  yakiniku: {
    hero: '炭火で和牛を焼く焼肉店の臨場感あるイメージ',
    menu: '焼肉店で提供される和牛のイメージ',
    interior: '落ち着いた暗めの焼肉店の店内イメージ',
    atmosphere: '煙と炭火が立ちのぼる焼肉店の雰囲気',
    detail: '卓上ロースターや炭火など焼肉のディテール',
    video: '網の上で肉が焼ける様子の映像',
    ogp: '炭火と和牛が伝わる焼肉店の横長イメージ'
  },
  kissaten: {
    hero: '深煎り珈琲とレトロな店内の喫茶店イメージ',
    menu: 'ナポリタンやプリンなど昔ながらの喫茶メニュー',
    interior: '木製テーブルと暖色照明の落ち着いた喫茶店内',
    atmosphere: '昭和の喫茶店の温かな雰囲気',
    detail: 'ネルドリップやカップなど喫茶のディテール',
    ogp: '珈琲とレトロ内装が伝わる喫茶店の横長イメージ'
  },
  cafe: {
    hero: '自然光のさす明るいカフェとラテのイメージ',
    menu: 'ラテや焼き菓子などカフェメニュー',
    interior: '白とベージュ基調の明るいカフェ店内',
    atmosphere: '木目と余白のある心地よいカフェの雰囲気',
    detail: 'ハンドドリップや豆などカフェのディテール',
    ogp: 'ラテと明るい店内が伝わるカフェの横長イメージ'
  },
  izakaya: {
    hero: '木目と暖色の活気ある居酒屋イメージ',
    menu: '居酒屋の一品料理とお酒のイメージ',
    interior: '木の温もりある居酒屋の店内',
    atmosphere: '賑わいのある居酒屋の雰囲気',
    detail: '徳利やお通しなど居酒屋のディテール',
    ogp: '居酒屋の活気が伝わる横長イメージ'
  },
  ramen: {
    hero: '湯気立つ一杯と暖簾のラーメン店イメージ',
    menu: 'ラーメンや餃子のイメージ',
    interior: 'カウンター主体のラーメン店内',
    atmosphere: '湯気と活気のあるラーメン店の雰囲気',
    detail: '麺・スープ・チャーシューのディテール',
    ogp: '湯気立つ一杯が伝わるラーメン店の横長イメージ'
  },
  bar: {
    hero: '暗色で落ち着いたバーのイメージ',
    menu: 'カクテルやウイスキーなどバーのドリンク',
    interior: 'ボトルが並ぶ静かなバーの店内',
    atmosphere: '静けさと灯りのあるバーの雰囲気',
    detail: 'グラスや氷などバーのディテール',
    ogp: '落ち着いた灯りが伝わるバーの横長イメージ'
  },
  chinese: {
    hero: '赤と金の活気ある町中華のイメージ',
    menu: '餃子や炒飯など町中華のメニュー',
    interior: '賑わいのある町中華の店内',
    atmosphere: '熱気のある町中華の雰囲気',
    detail: '鉄鍋や湯気など中華のディテール',
    ogp: '町中華の活気が伝わる横長イメージ'
  },
  washoku: {
    hero: '季節の和食と落ち着いた店内のイメージ',
    menu: '寿司や旬の和食メニュー',
    interior: '和の落ち着いた店内',
    atmosphere: '静かで品のある和食店の雰囲気',
    detail: '器や盛り付けなど和食のディテール',
    ogp: '季節感のある和食店の横長イメージ'
  }
};

// 業態ごとに用意する素材スロット数（店舗から提供される想定の枚数）
const SPEC: Record<AssetCategory, Partial<Record<AssetRole, number>>> = {
  yakiniku: { hero: 5, menu: 12, detail: 6, interior: 4, video: 3, ogp: 2 },
  kissaten: { hero: 5, menu: 10, detail: 6, interior: 5, ogp: 2 },
  cafe: { hero: 5, menu: 10, interior: 5, detail: 5, ogp: 2 },
  izakaya: { hero: 5, menu: 12, interior: 5, detail: 5, ogp: 2 },
  ramen: { hero: 5, menu: 10, interior: 4, detail: 5, ogp: 2 },
  bar: { hero: 5, menu: 10, interior: 5, detail: 5, ogp: 2 },
  chinese: { hero: 5, menu: 10, interior: 5, detail: 5, ogp: 2 },
  washoku: { hero: 5, menu: 10, interior: 5, detail: 5, ogp: 2 }
};

const pad = (n: number) => String(n).padStart(2, '0');

// SPEC から manifest を生成（実ファイルは未配置のため approved:false）。
function buildManifest(): DemoAsset[] {
  const out: DemoAsset[] = [];
  (Object.keys(SPEC) as AssetCategory[]).forEach((category) => {
    const roles = SPEC[category];
    (Object.keys(roles) as AssetRole[]).forEach((role) => {
      const count = roles[role] ?? 0;
      const ext = role === 'video' ? 'mp4' : 'jpg';
      for (let i = 1; i <= count; i++) {
        out.push({
          id: `${category}-${role}-${pad(i)}`,
          category,
          role,
          src: `/demo-assets/${category}/${role}/${role}-${pad(i)}.${ext}`,
          alt: ALT[category][role] ?? `${category}の${role}イメージ`,
          mood: CATEGORY_MOOD[category],
          suitableFor: [category],
          // 本物のキュレーション写真を配置したら true に切り替える
          approved: false,
          note: '店舗提供写真へ差し替え予定のスロット'
        });
      }
    });
  });
  return out;
}

export const demoAssets: DemoAsset[] = buildManifest();

/** approved な素材だけを、category/role で絞って返す（mood が近い順）。 */
export function listApproved(
  category: AssetCategory,
  role: AssetRole,
  mood: string[] = []
): DemoAsset[] {
  return demoAssets
    .filter((a) => a.approved && a.category === category && a.role === role)
    .map((a) => ({ a, score: a.mood.filter((m) => mood.includes(m)).length }))
    .sort((x, y) => y.score - x.score)
    .map((x) => x.a);
}

/**
 * category/role の approved 素材を index 番目に返す。
 * 同じ構図の連続配置を避けるため index で distinct に選び、足りなければ null（差し替え枠）。
 */
export function pickAsset(
  category: AssetCategory,
  role: AssetRole,
  index = 0,
  mood: string[] = []
): DemoAsset | null {
  const list = listApproved(category, role, mood);
  return list[index] ?? null;
}

/** OGP は hero と同じ世界観の横長を1枚。なければ null。 */
export function pickOgp(category: AssetCategory, mood: string[] = []): DemoAsset | null {
  return pickAsset(category, 'ogp', 0, mood) ?? pickAsset(category, 'hero', 0, mood);
}

/** 承認OGPが無いときに使うローカルの汎用OGP（外部URLは使わない）。 */
export const FALLBACK_OGP = '/demo-assets/og-default.png';

/**
 * OGP画像のローカルパスを返す。
 * 1) approved な ogp 素材 → 2) approved な hero 素材 → 3) ローカル汎用OGP。
 * 外部ランダムURLは絶対に返さない。
 */
export function resolveOgpSrc(category: AssetCategory, mood: string[] = []): string {
  return pickOgp(category, mood)?.src ?? FALLBACK_OGP;
}
