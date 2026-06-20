import type { ThemeKey } from '../themes/restaurantThemes';

export interface MenuItem {
  name: string;
  price?: string;
  desc?: string;
  recommend?: boolean;
}

export interface SceneItem {
  label: string;
  body: string;
}

export interface AboutItem {
  title: string;
  body: string;
}

/** 画像・動画は media にまとめ、後から差し替えやすくする。 */
export interface ShopMedia {
  /** 本番動画の配置先（ローカルパス）。未配置時は heroImage が poster として表示される。 */
  heroVideo?: string;
  heroImage: string;
  exteriorImage: string;
  interiorImages: string[];
  menuImages: string[];
  galleryImages: string[];
}

/** 実在確認の状態。false の項目は画面に「要確認/サンプル」を表示する。 */
export interface VerifyFlags {
  phone: boolean;
  address: boolean;
  hours: boolean;
  menu: boolean;
}

export interface Shop {
  slug: string;
  name: string;
  kana?: string;
  genre: string;
  theme: ThemeKey;

  seo: {
    title: string;
    description: string;
    ogImage: string;
  };

  hero: {
    catch: string;
    sub: string;
    nearest: string;
  };

  about: AboutItem[];
  menu: MenuItem[];
  scenes: SceneItem[];
  media: ShopMedia;

  access: {
    address: string;
    hours: string[];
    holiday: string;
    phone: string;
    mapQuery: string;
  };

  cta: {
    phone: string;
    instagram?: string;
    reserve?: string;
  };

  verify: VerifyFlags;
  /** 画面下部/上部に控えめに出す注記。 */
  demoNotice: string;
}

/** 営業デモの共通注記。 */
export const DEMO_NOTICE =
  '掲載写真はご提案用のイメージです。ご契約後、貴店の料理写真・店内写真・外観写真に差し替えて制作いたします。';

/**
 * 仮素材（B案）。loremflickr はキーワード＋lockで安定して実写真を返す。
 * 本番納品時は public/media/{slug}/ の店舗提供写真に差し替える前提。
 */
const lf = (w: number, h: number, tags: string, lock: number) =>
  `https://loremflickr.com/${w}/${h}/${tags}?lock=${lock}`;

export const shops: Shop[] = [
  {
    slug: 'kissa-yamabato',
    name: '喫茶 山鳩',
    kana: 'きっさ やまばと',
    genre: '喫茶店',
    theme: 'kissaten-retro',
    seo: {
      title: '喫茶 山鳩｜昔ながらの珈琲とナポリタン｜さいたま市',
      description:
        'さいたま市の老舗喫茶店「山鳩」。深煎りのネルドリップ珈琲と、昔ながらのナポリタン・プリン。静かに流れる時間をどうぞ。',
      ogImage: lf(1200, 630, 'coffee,cafe,vintage', 101)
    },
    hero: {
      catch: '変わらない一杯が、\nここにある。',
      sub: '深煎りネルドリップ珈琲と、昔ながらの喫茶メニュー。',
      nearest: '最寄り：北浦和駅 徒歩6分（要確認）'
    },
    about: [
      { title: '一杯ずつ、ネルで。', body: '注文を受けてから一杯ずつ丁寧に淹れる、深煎りのネルドリップ珈琲。' },
      { title: '昔ながらの洋食。', body: '鉄板ナポリタン、玉子のサンドイッチ、固めのプリン。記憶の中の味を今も。' },
      { title: '静かに流れる時間。', body: '低い照明と木のテーブル。読書にも、商談前のひと息にも。' }
    ],
    menu: [
      { name: 'ブレンド珈琲', price: '¥520', desc: '深煎り・ネルドリップ', recommend: true },
      { name: '鉄板ナポリタン', price: '¥880', desc: '熱々の鉄板で', recommend: true },
      { name: '自家製プリン', price: '¥480', desc: '固めの昔ながら' },
      { name: '玉子サンド', price: '¥680', desc: 'ふんわり厚焼き' },
      { name: 'クリームソーダ', price: '¥600', desc: 'メロンの緑が映える' }
    ],
    scenes: [
      { label: 'ひとりで', body: '読書や考えごとに。長居しても気づかい不要の静けさ。' },
      { label: '商談前に', body: '落ち着いた席で、打ち合わせ前のひと息を。' },
      { label: '昔を懐かしむ', body: '変わらない味と空間。昭和の喫茶の記憶そのままに。' }
    ],
    media: {
      heroVideo: '/media/kissa-yamabato/hero.mp4',
      heroImage: lf(1600, 1000, 'coffee,cafe,vintage', 102),
      exteriorImage: lf(1200, 900, 'cafe,storefront', 103),
      interiorImages: [lf(1200, 800, 'cafe,interior,vintage', 104), lf(1200, 800, 'coffee,counter', 105)],
      menuImages: [
        lf(800, 800, 'coffee,cup', 111),
        lf(800, 800, 'napolitan,pasta', 112),
        lf(800, 800, 'pudding,dessert', 113),
        lf(800, 800, 'sandwich,egg', 114),
        lf(800, 800, 'melon,soda', 115)
      ],
      galleryImages: [
        lf(900, 900, 'coffee,cafe', 121),
        lf(900, 900, 'cafe,interior', 122),
        lf(900, 900, 'coffee,beans', 123),
        lf(900, 900, 'dessert,cafe', 124)
      ]
    },
    access: {
      address: 'さいたま市浦和区（住所はサンプル・要確認）',
      hours: ['平日 8:00 - 19:00', '土日 8:00 - 18:00'],
      holiday: '水曜定休（サンプル）',
      phone: '048-000-0000',
      mapQuery: 'さいたま市浦和区 喫茶店'
    },
    cta: { phone: '048-000-0000', instagram: 'https://instagram.com/', reserve: '' },
    verify: { phone: false, address: false, hours: false, menu: false },
    demoNotice: DEMO_NOTICE
  },
  {
    slug: 'cafe-ao',
    name: 'CAFE AO',
    kana: 'カフェ アオ',
    genre: 'カフェ',
    theme: 'modern-cafe',
    seo: {
      title: 'CAFE AO｜自家焙煎スペシャルティと焼き菓子｜さいたま市',
      description:
        'さいたま市のカフェ「CAFE AO」。自家焙煎のスペシャルティコーヒーと、季節の焼き菓子・ランチプレート。明るく心地よい時間を。',
      ogImage: lf(1200, 630, 'cafe,coffee,latte', 201)
    },
    hero: {
      catch: 'いい一日は、\nいい一杯から。',
      sub: '自家焙煎スペシャルティコーヒーと、季節の焼き菓子。',
      nearest: '最寄り：さいたま新都心駅 徒歩8分（要確認）'
    },
    about: [
      { title: '豆から、ていねいに。', body: '浅〜中煎りの自家焙煎。香りと甘さを引き出した一杯を。' },
      { title: '季節の焼き菓子。', body: '旬の素材で焼き上げるスコーンやタルト。コーヒーに寄り添う甘さ。' },
      { title: '明るい、心地よい席。', body: '大きな窓と白い壁。ひとりでも、誰かとでも過ごしやすい空間。' }
    ],
    menu: [
      { name: '本日のドリップ', price: '¥520', desc: '日替わりの自家焙煎', recommend: true },
      { name: 'カフェラテ', price: '¥580', desc: 'なめらかなミルク', recommend: true },
      { name: '季節のタルト', price: '¥620', desc: '旬のフルーツで' },
      { name: 'AO ランチプレート', price: '¥1,180', desc: '週替わりの一皿', recommend: true },
      { name: 'スコーン（2種）', price: '¥420', desc: '焼きたてを' }
    ],
    scenes: [
      { label: 'ひとりで', body: '窓際の席でゆっくり。仕事や読書のお供に。' },
      { label: '友人と', body: '気取らず話せる、明るい雰囲気。' },
      { label: '休日の朝に', body: 'モーニングからの一日のはじまりに。' }
    ],
    media: {
      heroVideo: '/media/cafe-ao/hero.mp4',
      heroImage: lf(1600, 1000, 'cafe,coffee,latte', 202),
      exteriorImage: lf(1200, 900, 'cafe,storefront,modern', 203),
      interiorImages: [lf(1200, 800, 'cafe,interior,bright', 204), lf(1200, 800, 'coffee,barista', 205)],
      menuImages: [
        lf(800, 800, 'coffee,drip', 211),
        lf(800, 800, 'cafe,latte', 212),
        lf(800, 800, 'tart,fruit', 213),
        lf(800, 800, 'lunch,plate', 214),
        lf(800, 800, 'scone,bakery', 215)
      ],
      galleryImages: [
        lf(900, 900, 'cafe,coffee', 221),
        lf(900, 900, 'cafe,interior', 222),
        lf(900, 900, 'latte,art', 223),
        lf(900, 900, 'cake,cafe', 224),
        lf(900, 900, 'coffee,beans', 225)
      ]
    },
    access: {
      address: 'さいたま市大宮区（住所はサンプル・要確認）',
      hours: ['9:00 - 19:00'],
      holiday: '不定休（サンプル）',
      phone: '048-000-0000',
      mapQuery: 'さいたま市大宮区 カフェ'
    },
    cta: { phone: '048-000-0000', instagram: 'https://instagram.com/', reserve: 'https://example.com/reserve' },
    verify: { phone: false, address: false, hours: false, menu: false },
    demoNotice: DEMO_NOTICE
  },
  {
    slug: 'yakiniku-daidomon',
    name: '焼肉 大同門',
    kana: 'やきにく だいどうもん',
    genre: '焼肉店',
    theme: 'yakiniku-premium',
    seo: {
      title: '焼肉 大同門｜炭火で味わう厳選和牛｜さいたま市大宮',
      description:
        'さいたま市大宮の焼肉店「大同門」。厳選した和牛を炭火で。希少部位から名物のタレまで、特別な一夜を炭火とともに。',
      ogImage: lf(1200, 630, 'yakiniku,grilled,meat', 301)
    },
    hero: {
      catch: '炭火が、\nいちばんのごちそう。',
      sub: '厳選和牛を炭火で。希少部位と、受け継いだタレ。',
      nearest: '最寄り：大宮駅 徒歩12分（要確認）'
    },
    about: [
      { title: '厳選した和牛。', body: '部位ごとに見極めて仕入れる、その日いちばんのお肉を。' },
      { title: '炭火で、香ばしく。', body: '立ちのぼる煙と香り。炭火ならではの旨みを存分に。' },
      { title: '受け継いだタレ。', body: '長年つぎ足してきた自家製のタレが、肉の味を引き立てる。' }
    ],
    menu: [
      { name: '特選カルビ', price: '¥1,680', desc: 'その日の厳選', recommend: true },
      { name: '本日の希少部位', price: '時価', desc: '入荷次第', recommend: true },
      { name: '上タン塩', price: '¥1,480', desc: '厚切りで' },
      { name: '大同門ハラミ', price: '¥1,280', desc: '自家製タレ', recommend: true },
      { name: '〆の冷麺', price: '¥880', desc: 'さっぱりと' }
    ],
    scenes: [
      { label: '家族で', body: '広めの席で、囲んでゆっくり。ハレの日のごちそうに。' },
      { label: '仲間と', body: '炭火を囲んで盛り上がる、特別な一夜。' },
      { label: '接待・記念日', body: '落ち着いた席で、大切な人と特別な時間を。' }
    ],
    media: {
      heroVideo: '/media/yakiniku-daidomon/hero-grill.mp4',
      heroImage: lf(1600, 1000, 'yakiniku,grilled,meat', 302),
      exteriorImage: lf(1200, 900, 'restaurant,exterior,night', 303),
      interiorImages: [
        lf(1200, 800, 'restaurant,interior,dark', 304),
        lf(1200, 800, 'charcoal,grill', 305),
        lf(1200, 800, 'wagyu,beef', 306)
      ],
      menuImages: [
        lf(800, 800, 'grilled,beef', 311),
        lf(800, 800, 'wagyu,steak', 312),
        lf(800, 800, 'beef,tongue', 313),
        lf(800, 800, 'barbecue,meat', 314),
        lf(800, 800, 'naengmyeon,noodle', 315)
      ],
      galleryImages: [
        lf(900, 900, 'yakiniku,grill', 321),
        lf(900, 900, 'charcoal,fire', 322),
        lf(900, 900, 'wagyu,beef', 323),
        lf(900, 900, 'restaurant,interior,dark', 324),
        lf(900, 900, 'barbecue,smoke', 325),
        lf(900, 900, 'meat,platter', 326)
      ]
    },
    access: {
      address: 'さいたま市大宮区北袋町2丁目（住所はサンプル・要確認）',
      hours: ['17:00 - 23:00（サンプル）'],
      holiday: '月曜定休（サンプル）',
      phone: '048-644-4609',
      mapQuery: 'さいたま市大宮区北袋町 焼肉'
    },
    cta: { phone: '048-644-4609', instagram: 'https://instagram.com/', reserve: 'https://example.com/reserve' },
    verify: { phone: false, address: false, hours: false, menu: false },
    demoNotice: DEMO_NOTICE
  }
];

export function getShop(slug: string): Shop | undefined {
  return shops.find((s) => s.slug === slug);
}
