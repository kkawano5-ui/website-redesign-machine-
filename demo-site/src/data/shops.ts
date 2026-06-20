import type { ThemeKey } from '../themes/restaurantThemes';

export interface MenuItem {
  name: string;
  price?: string;
  desc?: string;
  image?: string;
  recommend?: boolean;
}

export interface SceneItem {
  label: string; // 例: ひとりで / 仕事帰りに
  body: string;
}

export interface AboutItem {
  title: string;
  body: string;
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
    image: string;
    nearest: string;
  };

  about: AboutItem[]; // 3つ
  menu: MenuItem[]; // 3〜6
  scenes: SceneItem[];
  gallery: string[];

  access: {
    address: string;
    hours: string[];
    holiday: string;
    phone: string;
    mapQuery: string; // Googleマップ埋め込み用のクエリ
  };

  cta: {
    phone: string;
    instagram?: string;
    reserve?: string;
  };

  verify: VerifyFlags;
}

/** 画像のベースパス。public/shops/{slug}/ に配置する前提。 */
const img = (slug: string, file: string) => `/shops/${slug}/${file}`;

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
      ogImage: img('kissa-yamabato', 'ogp.jpg')
    },
    hero: {
      catch: '変わらない一杯が、\nここにある。',
      sub: '深煎りネルドリップ珈琲と、昔ながらの喫茶メニュー。',
      image: img('kissa-yamabato', 'hero.jpg'),
      nearest: '最寄り：北浦和駅 徒歩6分（要確認）'
    },
    about: [
      { title: '一杯ずつ、ネルで。', body: '注文を受けてから一杯ずつ丁寧に淹れる、深煎りのネルドリップ珈琲。' },
      { title: '昔ながらの洋食。', body: '鉄板ナポリタン、玉子のサンドイッチ、固めのプリン。記憶の中の味を今も。' },
      { title: '静かに流れる時間。', body: '低い照明と木のテーブル。読書にも、商談前のひと息にも。' }
    ],
    menu: [
      { name: 'ブレンド珈琲', price: '¥520', desc: '深煎り・ネルドリップ', image: img('kissa-yamabato', 'menu-1.jpg'), recommend: true },
      { name: '鉄板ナポリタン', price: '¥880', desc: '熱々の鉄板で', image: img('kissa-yamabato', 'menu-2.jpg'), recommend: true },
      { name: '自家製プリン', price: '¥480', desc: '固めの昔ながら', image: img('kissa-yamabato', 'menu-3.jpg') },
      { name: '玉子サンド', price: '¥680', desc: 'ふんわり厚焼き', image: img('kissa-yamabato', 'menu-4.jpg') },
      { name: 'クリームソーダ', price: '¥600', desc: 'メロンの緑が映える', image: img('kissa-yamabato', 'menu-5.jpg') }
    ],
    scenes: [
      { label: 'ひとりで', body: '読書や考えごとに。長居しても気づかい不要の静けさ。' },
      { label: '商談前に', body: '落ち着いた席で、打ち合わせ前のひと息を。' },
      { label: '昔を懐かしむ', body: '変わらない味と空間。昭和の喫茶の記憶そのままに。' }
    ],
    gallery: [
      img('kissa-yamabato', 'gallery-1.jpg'),
      img('kissa-yamabato', 'gallery-2.jpg'),
      img('kissa-yamabato', 'gallery-3.jpg'),
      img('kissa-yamabato', 'gallery-4.jpg')
    ],
    access: {
      address: 'さいたま市浦和区（住所はサンプル・要確認）',
      hours: ['平日 8:00 - 19:00', '土日 8:00 - 18:00'],
      holiday: '水曜定休（サンプル）',
      phone: '048-000-0000',
      mapQuery: 'さいたま市浦和区 喫茶店'
    },
    cta: {
      phone: '048-000-0000',
      instagram: 'https://instagram.com/',
      reserve: ''
    },
    verify: { phone: false, address: false, hours: false, menu: false }
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
      ogImage: img('cafe-ao', 'ogp.jpg')
    },
    hero: {
      catch: 'いい一日は、\nいい一杯から。',
      sub: '自家焙煎スペシャルティコーヒーと、季節の焼き菓子。',
      image: img('cafe-ao', 'hero.jpg'),
      nearest: '最寄り：さいたま新都心駅 徒歩8分（要確認）'
    },
    about: [
      { title: '豆から、ていねいに。', body: '浅〜中煎りの自家焙煎。香りと甘さを引き出した一杯を。' },
      { title: '季節の焼き菓子。', body: '旬の素材で焼き上げるスコーンやタルト。コーヒーに寄り添う甘さ。' },
      { title: '明るい、心地よい席。', body: '大きな窓と白い壁。ひとりでも、誰かとでも過ごしやすい空間。' }
    ],
    menu: [
      { name: '本日のドリップ', price: '¥520', desc: '日替わりの自家焙煎', image: img('cafe-ao', 'menu-1.jpg'), recommend: true },
      { name: 'カフェラテ', price: '¥580', desc: 'なめらかなミルク', image: img('cafe-ao', 'menu-2.jpg'), recommend: true },
      { name: '季節のタルト', price: '¥620', desc: '旬のフルーツで', image: img('cafe-ao', 'menu-3.jpg') },
      { name: 'AO ランチプレート', price: '¥1,180', desc: '週替わりの一皿', image: img('cafe-ao', 'menu-4.jpg'), recommend: true },
      { name: 'スコーン（2種）', price: '¥420', desc: '焼きたてを', image: img('cafe-ao', 'menu-5.jpg') }
    ],
    scenes: [
      { label: 'ひとりで', body: '窓際の席でゆっくり。仕事や読書のお供に。' },
      { label: '友人と', body: '気取らず話せる、明るい雰囲気。' },
      { label: '休日の朝に', body: 'モーニングからの一日のはじまりに。' }
    ],
    gallery: [
      img('cafe-ao', 'gallery-1.jpg'),
      img('cafe-ao', 'gallery-2.jpg'),
      img('cafe-ao', 'gallery-3.jpg'),
      img('cafe-ao', 'gallery-4.jpg'),
      img('cafe-ao', 'gallery-5.jpg')
    ],
    access: {
      address: 'さいたま市大宮区（住所はサンプル・要確認）',
      hours: ['9:00 - 19:00'],
      holiday: '不定休（サンプル）',
      phone: '048-000-0000',
      mapQuery: 'さいたま市大宮区 カフェ'
    },
    cta: {
      phone: '048-000-0000',
      instagram: 'https://instagram.com/',
      reserve: 'https://example.com/reserve'
    },
    verify: { phone: false, address: false, hours: false, menu: false }
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
      ogImage: img('yakiniku-daidomon', 'ogp.jpg')
    },
    hero: {
      catch: '炭火が、\nいちばんのごちそう。',
      sub: '厳選和牛を炭火で。希少部位と、受け継いだタレ。',
      image: img('yakiniku-daidomon', 'hero.jpg'),
      nearest: '最寄り：大宮駅 徒歩12分（要確認）'
    },
    about: [
      { title: '厳選した和牛。', body: '部位ごとに見極めて仕入れる、その日いちばんのお肉を。' },
      { title: '炭火で、香ばしく。', body: '立ちのぼる煙と香り。炭火ならではの旨みを存分に。' },
      { title: '受け継いだタレ。', body: '長年つぎ足してきた自家製のタレが、肉の味を引き立てる。' }
    ],
    menu: [
      { name: '特選カルビ', price: '¥1,680', desc: 'その日の厳選', image: img('yakiniku-daidomon', 'menu-1.jpg'), recommend: true },
      { name: '本日の希少部位', price: '時価', desc: '入荷次第', image: img('yakiniku-daidomon', 'menu-2.jpg'), recommend: true },
      { name: '上タン塩', price: '¥1,480', desc: '厚切りで', image: img('yakiniku-daidomon', 'menu-3.jpg') },
      { name: '大同門ハラミ', price: '¥1,280', desc: '自家製タレ', image: img('yakiniku-daidomon', 'menu-4.jpg'), recommend: true },
      { name: '〆の冷麺', price: '¥880', desc: 'さっぱりと', image: img('yakiniku-daidomon', 'menu-5.jpg') }
    ],
    scenes: [
      { label: '家族で', body: '広めの席で、囲んでゆっくり。ハレの日のごちそうに。' },
      { label: '仲間と', body: '炭火を囲んで盛り上がる、特別な一夜。' },
      { label: '接待・記念日', body: '落ち着いた席で、大切な人と特別な時間を。' }
    ],
    gallery: [
      img('yakiniku-daidomon', 'gallery-1.jpg'),
      img('yakiniku-daidomon', 'gallery-2.jpg'),
      img('yakiniku-daidomon', 'gallery-3.jpg'),
      img('yakiniku-daidomon', 'gallery-4.jpg')
    ],
    access: {
      // 実在リード由来だが未確認のためサンプル表記
      address: 'さいたま市大宮区北袋町2丁目（住所はサンプル・要確認）',
      hours: ['17:00 - 23:00（サンプル）'],
      holiday: '月曜定休（サンプル）',
      phone: '048-644-4609',
      mapQuery: 'さいたま市大宮区北袋町 焼肉'
    },
    cta: {
      phone: '048-644-4609',
      instagram: 'https://instagram.com/',
      reserve: 'https://example.com/reserve'
    },
    verify: { phone: false, address: false, hours: false, menu: false }
  }
];

export function getShop(slug: string): Shop | undefined {
  return shops.find((s) => s.slug === slug);
}
