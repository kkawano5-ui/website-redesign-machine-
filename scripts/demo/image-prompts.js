// デモサイト用の業種別・画像生成プロンプト（ChatGPT / gpt-image-1 等で使用）。
// 画像は「業種ごとに共通」（社名非依存）。1業種 = hero 1枚 + gallery 6枚。
// 生成物の配置: assets/<テーマkey>/hero.png, assets/<テーマkey>/1.png 〜 6.png
// → generate-demo-sites.js が sites/assets/ にコピーし、各デモの hero と作例ギャラリーに反映。
// 画像が無ければデモは従来のプレースホルダ表示にフォールバックする（壊れない）。

// 全業種共通のスタイル指示（各シーンの前に付与）。
export const STYLE =
  'Photorealistic editorial photography, bright soft natural light, clean and modern Japanese small-business aesthetic, inviting and trustworthy, shallow depth of field. No text, no logos, no watermarks, no readable signage, no identifiable faces, no brand marks.';

// テーマkey → { hero, gallery[6] }。シーン記述は簡潔に（gen側でSTYLEを前置）。
export const IMAGE_PROMPTS = {
  kenchiku: {
    hero: 'Exterior of a freshly repainted Japanese house, clean walls and roof, blue sky, neat and well-maintained',
    gallery: [
      'A painter carefully applying exterior wall coating, professional and tidy worksite',
      'Close-up of a clean repaired roof with new tiles',
      'Waterproofing work on a balcony, neat finish',
      'A renovated bright living room interior',
      'Scaffolding on a small house, organized and safe',
      'A tidy work van and tools, professional impression',
    ],
  },
  fitness: {
    hero: 'A clean private personal training gym studio with modern equipment and large mirror, bright and tidy',
    gallery: [
      'Free weights and a bench in a clean private gym',
      'A mirrored training area with mats',
      'A small reception corner with plants',
      'A pilates reformer in a bright studio',
      'A stretching area with foam rollers',
      'A water station and towels, clean and organized',
    ],
  },
  pet: {
    hero: 'A clean bright pet grooming salon interior with a grooming table, friendly and tidy atmosphere',
    gallery: [
      'A grooming table with professional tools, clean and bright',
      'A small fluffy dog looking happy and well cared for',
      'A tidy shelf of pet care products',
      'A comfortable waiting area with seating',
      'A clean pet bath station',
      'A welcoming reception counter with plants',
    ],
  },
  biyoclinic: {
    hero: 'A clean calm modern beauty clinic reception and waiting room, soft neutral tones, hygienic and reassuring',
    gallery: [
      'A clean consultation room with a chair, neutral and hygienic',
      'A tidy reception desk with soft lighting',
      'A comfortable waiting area with plants',
      'Neatly arranged skincare products on a shelf',
      'A calm private treatment room, neutral and clean',
      'A bright hallway with soft natural light',
    ],
  },
  lodging: {
    hero: 'A cozy bright guesthouse lounge with warm wood, plants and a large window view, welcoming atmosphere',
    gallery: [
      'A clean simple guest room with a neatly made bed and soft morning light',
      'A communal lounge with comfortable seating and books',
      'A small breakfast nook with simple tableware',
      'A welcoming entrance with a shoe shelf and plants',
      'A quiet terrace or small garden',
      'A tidy hallway with soft warm lighting',
    ],
  },
  retail: {
    hero: 'A stylish small Japanese select/zakka shop interior with neatly arranged goods and warm lighting',
    gallery: [
      'Shelves of curated lifestyle goods, neatly displayed',
      'Close-up of handmade accessories on a wooden tray',
      'A gift-wrapping corner with ribbons and paper',
      'A charming small storefront with plants',
      'Fresh flowers arranged in a corner of the shop',
      'A tidy counter with a few selected items',
    ],
  },
  beauty_relax: {
    hero: 'A calm clean relaxation/esthetic salon room with a treatment bed, soft towels and warm neutral tones',
    gallery: [
      'A neat treatment bed with folded towels',
      'A soft reception corner with aroma diffuser',
      'Rolled towels and aroma oils on a tray',
      'A calm private room with indirect lighting',
      'A comfortable waiting space with plants',
      'Neatly arranged care products on a shelf',
    ],
  },
  amusement: {
    hero: 'A bright modern indoor amusement lounge with games and comfortable seating, fun and clean (no gambling imagery)',
    gallery: [
      'A clean darts board area with good lighting',
      'A table set up for board games with colorful pieces',
      'Comfortable lounge seating for groups',
      'A tidy counter with drinks (non-alcoholic) and snacks',
      'A spacious play area with warm lighting',
      'Shelves of board games neatly arranged',
    ],
  },
  outdoor: {
    hero: 'A scenic glamping site with a cozy tent and string lights at golden hour, inviting nature setting',
    gallery: [
      'A comfortable glamping tent interior with cozy bedding',
      'A clean barbecue area with a table set up',
      'A fire pit with chairs around it at dusk',
      'A nature path through trees',
      'Neatly arranged outdoor equipment for rental',
      'A lakeside or riverside view with calm water',
    ],
  },
  sauna: {
    hero: 'A serene modern sauna interior with warm wood, empty and clean, calm atmosphere (no people)',
    gallery: [
      'A clean wooden sauna room with soft lighting',
      'A calm bath area with warm water',
      'A relaxation lounge with comfortable chairs',
      'Neatly folded towels on a shelf',
      'A tidy entrance with plants',
      'A glass of water and a towel on a wooden bench',
    ],
  },
  workshop: {
    hero: 'A bright pottery and craft studio with wheels and shelves of works, creative and welcoming',
    gallery: [
      'A pottery wheel with clay, ready for a class',
      'Hands shaping clay on a wheel, close-up (no face)',
      'A shelf of finished handmade ceramic works',
      'Neatly arranged craft tools on a table',
      'Classroom tables set for a workshop',
      'A glass craft studio with colorful pieces',
    ],
  },
  fortune: {
    hero: 'A cozy calm fortune-telling room with tarot cards, a candle and warm low light, reassuring (not spooky)',
    gallery: [
      'A tarot card spread on a cloth-covered table',
      'A crystal ball and stones on a small table',
      'A warm table setting with a candle',
      'A cozy seating area with soft cushions',
      'A welcoming entrance with warm lighting',
      'Soft warm light over a small consultation table',
    ],
  },
  rental: {
    hero: 'A clean versatile rental studio space with natural light and an open bright floor, flexible and tidy',
    gallery: [
      'A photo studio setup with lights and a backdrop',
      'A bright room set up for a meeting',
      'A practice room with a large mirror wall',
      'Neatly arranged equipment and chairs',
      'Studio lighting equipment on stands',
      'An empty bright open room with wooden floor',
    ],
  },
};
