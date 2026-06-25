import fs from 'fs/promises';
import path from 'path';

/**
 * 業態に合った「サンプル写真」を OpenAI 画像生成で作り、
 * public/demo-assets/{category}/{role}/{role}-NN.png に保存する。
 *
 * 使い方:
 *   OPENAI_API_KEY=sk-... node scripts/gen-demo-images.mjs            # 全件
 *   OPENAI_API_KEY=sk-... node scripts/gen-demo-images.mjs yakiniku   # 業態を限定
 *
 * 方針:
 * - ランダム取得ではなく、業態を固定したプロンプトで生成（焼肉=炭火の肉 等）
 * - ロゴ・看板・文字・人物の顔を入れない
 * - 日本の地域飲食店の温度感
 * 生成後、demoAssets.ts 側で該当を approved:true / .png に切り替える。
 */

const API = 'https://api.openai.com/v1/images/generations';
const MODEL = 'gpt-image-1';
const ROOT = path.resolve('public/demo-assets');

const NEG = 'No text, no words, no logos, no signage, no brand names, no human faces, not a different cuisine.';
const JP = 'Authentic small Japanese local restaurant, realistic photo, natural styling, appetizing, shallow depth of field.';

// 各業態の生成スペック（role, index, size, prompt）
const SPEC = {
  yakiniku: [
    ['hero', 1, '1536x1024', `Close-up of premium marbled wagyu beef grilling over glowing charcoal on a metal grill at a cozy Japanese yakiniku restaurant, smoke rising, glistening juicy meat, warm dark moody ambiance. ${JP} ${NEG}`],
    // menu 01-05 は大同門の品書き順に対応（特選カルビ / 本日の希少部位 / 上タン塩 / 大同門ハラミ / 〆の冷麺）
    ['menu', 1, '1024x1024', `A plate of fresh raw premium wagyu karubi short rib slices, beautifully marbled, dark slate background, yakiniku restaurant. ${JP} ${NEG}`],
    ['menu', 2, '1024x1024', `Assorted premium yakiniku beef cuts platter, several marbled rare cuts arranged neatly on a plate, dark slate background. ${JP} ${NEG}`],
    ['menu', 3, '1024x1024', `Thick-cut beef tongue (gyutan) slices on a plate with lemon and salt, yakiniku restaurant, dark background. ${JP} ${NEG}`],
    ['menu', 4, '1024x1024', `Sliced beef harami skirt steak on a plate glazed with house tare sauce, yakiniku restaurant, dark background. ${JP} ${NEG}`],
    ['menu', 5, '1024x1024', `Korean-style cold noodle naengmyeon in a steel bowl, refreshing, garnish, restaurant table. ${JP} ${NEG}`],
    ['interior', 1, '1536x1024', `Warm dimly lit Japanese yakiniku restaurant interior, wooden tables each with a built-in charcoal grill and overhead exhaust ducts, empty seats, cozy. ${JP} ${NEG}`],
    ['interior', 2, '1024x1024', `Cozy semi-private booth seating in a dark warm Japanese yakiniku restaurant, built-in grill on the table, soft pendant lighting, empty seats. ${JP} ${NEG}`],
    ['atmosphere', 1, '1024x1024', `Glowing charcoal embers with rising smoke close-up, dark moody warm light, yakiniku grill. ${JP} ${NEG}`],
    ['atmosphere', 2, '1024x1024', `Marbled wagyu slices searing on a charcoal grill grate with flames and smoke, dark moody warm light, dynamic. ${JP} ${NEG}`],
    ['atmosphere', 3, '1024x1024', `Warm evening ambiance inside a small Japanese yakiniku eatery, soft warm glow, lantern light, dark tones. ${JP} ${NEG}`],
    ['detail', 1, '1024x1024', `Tabletop yakiniku roaster with tongs and a small dish of dipping tare sauce, charcoal, close-up detail. ${JP} ${NEG}`],
    ['detail', 2, '1024x1024', `Close-up of house-made tare dipping sauce in a small bowl with sesame and green onion, dark wooden table, yakiniku. ${JP} ${NEG}`],
    ['detail', 3, '1024x1024', `Close-up of binchotan charcoal glowing red-orange in a grill, fine ash, dark moody warm light. ${JP} ${NEG}`],
    ['detail', 4, '1024x1024', `Close-up of metal tongs turning a single marbled beef slice on a charcoal grill, juices glistening, smoke. ${JP} ${NEG}`],
    ['ogp', 1, '1536x1024', `Wide cinematic banner of premium marbled wagyu grilling over glowing charcoal at a Japanese yakiniku restaurant, smoke rising, warm dark moody ambiance, generous empty space. ${JP} ${NEG}`]
  ],
  cafe: [
    ['hero', 1, '1536x1024', `Bright airy modern Japanese cafe scene with a latte on a wooden table by a large window with soft natural daylight, minimal, calm. ${JP} ${NEG}`],
    ['menu', 1, '1024x1024', `A cup of hand-dripped specialty coffee on a wooden table, natural light, latte art optional, clean. ${JP} ${NEG}`],
    ['menu', 2, '1024x1024', `A cafe latte with subtle latte art in a ceramic cup, wooden table, soft daylight. ${JP} ${NEG}`],
    ['menu', 3, '1024x1024', `A slice of seasonal fruit tart on a plate, cafe, bright natural light, clean styling. ${JP} ${NEG}`],
    ['menu', 4, '1024x1024', `A wholesome cafe lunch plate with seasonal vegetables and bread, bright daylight, wooden table. ${JP} ${NEG}`],
    ['menu', 5, '1024x1024', `Freshly baked scones on a plate at a cafe, natural light, soft beige tones. ${JP} ${NEG}`],
    ['interior', 1, '1536x1024', `Bright clean modern Japanese cafe interior, white walls, wooden tables, large windows, plants, empty cozy seats. ${JP} ${NEG}`],
    ['detail', 1, '1024x1024', `Close-up of hand drip coffee being poured, kettle and dripper, coffee beans nearby, warm natural light. ${JP} ${NEG}`]
  ],
  kissaten: [
    ['hero', 1, '1536x1024', `Retro Showa-era Japanese kissaten coffee shop scene, deep-roast coffee in a classic cup on a dark wooden table, dim warm lighting, nostalgic mood. ${JP} ${NEG}`],
    ['menu', 1, '1024x1024', `A cup of deep-roast nel-drip coffee in a retro ceramic cup and saucer on a dark wooden table, dim warm light. ${JP} ${NEG}`],
    ['menu', 2, '1024x1024', `Classic Japanese napolitan spaghetti on a hot iron plate, retro kissaten style, warm tones. ${JP} ${NEG}`],
    ['menu', 3, '1024x1024', `A firm old-fashioned custard pudding (purin) with caramel on a small plate, retro kissaten, warm dim light. ${JP} ${NEG}`],
    ['menu', 4, '1024x1024', `A thick fluffy Japanese egg sandwich (tamago sando) cut in half on a plate, retro cafe. ${JP} ${NEG}`],
    ['menu', 5, '1024x1024', `A green melon cream soda float with ice cream in a tall glass, retro kissaten, nostalgic. ${JP} ${NEG}`],
    ['interior', 1, '1536x1024', `Retro Showa Japanese kissaten interior, dark wood, leather booth seats, dim warm lamps, vintage, empty cozy. ${JP} ${NEG}`],
    ['detail', 1, '1024x1024', `Close-up of nel-drip coffee brewing with a cloth filter into a pot, retro kissaten, warm dim light. ${JP} ${NEG}`]
  ]
};

const pad = (n) => String(n).padStart(2, '0');

async function genOne(apiKey, category, role, index, size, prompt) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MODEL, prompt, size, quality: 'medium', n: 1 })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI ${res.status}: ${t.slice(0, 300)}`);
  }
  const json = await res.json();
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error('no image data');
  const dir = path.join(ROOT, category, role);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${role}-${pad(index)}.png`);
  await fs.writeFile(file, Buffer.from(b64, 'base64'));
  return path.relative(process.cwd(), file);
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY が未設定です。');
    process.exit(1);
  }
  const only = process.argv[2];
  const cats = only ? [only] : Object.keys(SPEC);
  let ok = 0;
  let fail = 0;
  for (const category of cats) {
    const items = SPEC[category];
    if (!items) {
      console.warn(`未知の業態: ${category}`);
      continue;
    }
    for (const [role, index, size, prompt] of items) {
      try {
        const out = await genOne(apiKey, category, role, index, size, prompt);
        ok += 1;
        console.log(`✓ ${out}`);
      } catch (e) {
        fail += 1;
        console.warn(`✗ ${category}/${role}-${pad(index)}: ${e.message}`);
      }
    }
  }
  console.log(`\n完了: 成功 ${ok} / 失敗 ${fail}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
