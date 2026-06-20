// 店舗ジャンルごとの「空気感」を決めるデザインテーマ。
// 色・フォント・質感(texture)・ヒーローのレイアウト型を切り替えることで、
// 同じテンプレに見えないようにする。

export type ThemeKey =
  | 'kissaten-retro'
  | 'modern-cafe'
  | 'izakaya-warm'
  | 'yakiniku-premium'
  | 'ramen-street'
  | 'bar-night'
  | 'chinese-local'
  | 'bakery-natural';

export type HeroLayout = 'editorial' | 'split' | 'overlay' | 'poster';
export type Texture = 'paper' | 'wood' | 'dark' | 'craft' | 'smoke' | 'noren' | 'none';

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  muted: string;
  accent: string;
  accentInk: string; // accent 上に乗せる文字色
  border: string;
}

export interface RestaurantTheme {
  key: ThemeKey;
  label: string;
  mood: string;
  /** Google Fonts の読み込みURL */
  fontHref: string;
  fontHeading: string;
  fontBody: string;
  /** 見出しを縦書き風の太さで使うか等の雰囲気 */
  headingTracking: string;
  colors: ThemeColors;
  hero: HeroLayout;
  texture: Texture;
  /** 角丸の基調。0=シャープ, 1=やや丸, 2=丸 */
  rounding: 'sharp' | 'soft' | 'round';
  /** ラベル等の英字見出しに使う雰囲気語 */
  accentWord: string;
}

const G =
  'https://fonts.googleapis.com/css2?family=';

export const restaurantThemes: Record<ThemeKey, RestaurantTheme> = {
  'kissaten-retro': {
    key: 'kissaten-retro',
    label: '喫茶店・レトロ',
    mood: '紙、ブラウン、クリーム、余白、昔ながら',
    fontHref: `${G}Shippori+Mincho:wght@500;700;800&family=Zen+Kaku+Gothic+New:wght@400;500&display=swap`,
    fontHeading: "'Shippori Mincho', serif",
    fontBody: "'Zen Kaku Gothic New', sans-serif",
    headingTracking: '0.04em',
    colors: {
      bg: '#efe7d6',
      surface: '#f7f1e4',
      surfaceAlt: '#e7dcc4',
      text: '#3a2e22',
      muted: '#8a7a64',
      accent: '#7a3b1d',
      accentInk: '#f7f1e4',
      border: '#d9ccb2'
    },
    hero: 'editorial',
    texture: 'paper',
    rounding: 'sharp',
    accentWord: 'Since'
  },
  'modern-cafe': {
    key: 'modern-cafe',
    label: 'カフェ・モダン',
    mood: '白、ベージュ、写真大きめ、柔らかい',
    fontHref: `${G}Cormorant+Garamond:wght@500;600&family=Zen+Kaku+Gothic+New:wght@300;400;500;700&display=swap`,
    fontHeading: "'Cormorant Garamond', 'Zen Kaku Gothic New', serif",
    fontBody: "'Zen Kaku Gothic New', sans-serif",
    headingTracking: '0.02em',
    colors: {
      bg: '#faf8f4',
      surface: '#ffffff',
      surfaceAlt: '#f1ece4',
      text: '#2f2b26',
      muted: '#9a9085',
      accent: '#a9885f',
      accentInk: '#ffffff',
      border: '#e9e3d9'
    },
    hero: 'split',
    texture: 'none',
    rounding: 'round',
    accentWord: 'Café'
  },
  'izakaya-warm': {
    key: 'izakaya-warm',
    label: '居酒屋・暖色',
    mood: '木目、暖色、手書き風、活気',
    fontHref: `${G}Yuji+Syuku&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap`,
    fontHeading: "'Yuji Syuku', 'Zen Kaku Gothic New', serif",
    fontBody: "'Zen Kaku Gothic New', sans-serif",
    headingTracking: '0.06em',
    colors: {
      bg: '#241a12',
      surface: '#2f2118',
      surfaceAlt: '#3a2a1d',
      text: '#f4e9da',
      muted: '#bfa98a',
      accent: '#e0892f',
      accentInk: '#241a12',
      border: '#4a3727'
    },
    hero: 'overlay',
    texture: 'wood',
    rounding: 'soft',
    accentWord: '酒場'
  },
  'yakiniku-premium': {
    key: 'yakiniku-premium',
    label: '焼肉・プレミアム',
    mood: '黒、赤、煙、力強い',
    fontHref: `${G}Shippori+Mincho+B1:wght@600;800&family=Oswald:wght@500;600&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap`,
    fontHeading: "'Shippori Mincho B1', serif",
    fontBody: "'Zen Kaku Gothic New', sans-serif",
    headingTracking: '0.08em',
    colors: {
      bg: '#121012',
      surface: '#1b181a',
      surfaceAlt: '#241f22',
      text: '#f2ece9',
      muted: '#a99f9a',
      accent: '#b4302c',
      accentInk: '#f7efe9',
      border: '#3a3033'
    },
    hero: 'poster',
    texture: 'smoke',
    rounding: 'sharp',
    accentWord: 'YAKINIKU'
  },
  'ramen-street': {
    key: 'ramen-street',
    label: 'ラーメン・勢い',
    mood: '暖簾、湯気、赤、黄色、勢い',
    fontHref: `${G}RocknRoll+One&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap`,
    fontHeading: "'RocknRoll One', 'Zen Kaku Gothic New', sans-serif",
    fontBody: "'Zen Kaku Gothic New', sans-serif",
    headingTracking: '0.04em',
    colors: {
      bg: '#1c1714',
      surface: '#241d18',
      surfaceAlt: '#2e251e',
      text: '#f7efe2',
      muted: '#bdae9a',
      accent: '#d8362b',
      accentInk: '#fff4d6',
      border: '#3d3026'
    },
    hero: 'overlay',
    texture: 'noren',
    rounding: 'soft',
    accentWord: 'RAMEN'
  },
  'bar-night': {
    key: 'bar-night',
    label: 'バー・静けさ',
    mood: '暗色、余白、ボトル、金色、静けさ',
    fontHref: `${G}Cormorant+Garamond:wght@400;500;600&family=Zen+Kaku+Gothic+New:wght@300;400;500&display=swap`,
    fontHeading: "'Cormorant Garamond', serif",
    fontBody: "'Zen Kaku Gothic New', sans-serif",
    headingTracking: '0.14em',
    colors: {
      bg: '#0e0e12',
      surface: '#15151b',
      surfaceAlt: '#1d1d25',
      text: '#ece8df',
      muted: '#938d80',
      accent: '#c4a35e',
      accentInk: '#15151b',
      border: '#2a2a33'
    },
    hero: 'overlay',
    texture: 'dark',
    rounding: 'sharp',
    accentWord: 'BAR'
  },
  'chinese-local': {
    key: 'chinese-local',
    label: '中華・町中華',
    mood: '赤、金、町中華、賑わい',
    fontHref: `${G}Shippori+Mincho:wght@700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap`,
    fontHeading: "'Shippori Mincho', serif",
    fontBody: "'Zen Kaku Gothic New', sans-serif",
    headingTracking: '0.05em',
    colors: {
      bg: '#fbf3e8',
      surface: '#ffffff',
      surfaceAlt: '#f6e7d2',
      text: '#2a1b14',
      muted: '#8a6f5c',
      accent: '#c01f2a',
      accentInk: '#fff5df',
      border: '#e7d2b6'
    },
    hero: 'split',
    texture: 'craft',
    rounding: 'soft',
    accentWord: '中華'
  },
  'bakery-natural': {
    key: 'bakery-natural',
    label: 'ベーカリー・ナチュラル',
    mood: '生成り、クラフト紙、朝、ナチュラル',
    fontHref: `${G}Quicksand:wght@500;600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap`,
    fontHeading: "'Quicksand', 'Zen Kaku Gothic New', sans-serif",
    fontBody: "'Zen Kaku Gothic New', sans-serif",
    headingTracking: '0.03em',
    colors: {
      bg: '#f5efe2',
      surface: '#fbf7ee',
      surfaceAlt: '#ece2cd',
      text: '#3b3225',
      muted: '#998c75',
      accent: '#9a7a3f',
      accentInk: '#fbf7ee',
      border: '#ddd0b8'
    },
    hero: 'split',
    texture: 'craft',
    rounding: 'round',
    accentWord: 'Bakery'
  }
};

export function getTheme(key: ThemeKey): RestaurantTheme {
  return restaurantThemes[key];
}

/** 角丸の基調をユーティリティクラスに変換 */
export function radii(theme: RestaurantTheme) {
  switch (theme.rounding) {
    case 'sharp':
      return { card: 'rounded-none', img: 'rounded-none', btn: 'rounded-none', pill: 'rounded-full' };
    case 'soft':
      return { card: 'rounded-xl', img: 'rounded-lg', btn: 'rounded-lg', pill: 'rounded-full' };
    case 'round':
    default:
      return { card: 'rounded-3xl', img: 'rounded-2xl', btn: 'rounded-full', pill: 'rounded-full' };
  }
}
