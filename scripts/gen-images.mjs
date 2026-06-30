// 業種別デモ画像を OpenAI 画像API(gpt-image-1)で生成し assets/<業種>/ に保存する。
//
// ※このリモート環境では実行不可（OPENAI_API_KEY無し・api.openai.com への egress 遮断）。
//   ローカルMacで実行する:
//     OPENAI_API_KEY=sk-... npm run gen:images
//     OPENAI_API_KEY=sk-... node scripts/gen-images.mjs --genre lodging,sauna
//
// オプション:
//   --genre k,f,lodging   生成する業種key（既定: 全業種）
//   --only hero|gallery   heroのみ / galleryのみ
//   --force               既存ファイルも上書き
//   --out <dir>           出力先（既定: assets）
//   --model <id>          既定: gpt-image-1（gpt-image-1 が使えない場合は dall-e-3）
//
// 依存ゼロ（Node18+ の fetch を使用）。1業種 = hero1 + gallery6 = 7枚。全13業種で約91枚。
// 生成後: npm run generate:sites（assets/ を sites/ にコピー）→ wrangler で公開。

import fs from 'fs/promises';
import path from 'path';
import { STYLE, IMAGE_PROMPTS } from './demo/image-prompts.js';

const API = 'https://api.openai.com/v1/images/generations';

function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const t = argv[i];
    if (t === '--genre') a.genre = argv[(i += 1)];
    else if (t === '--only') a.only = argv[(i += 1)];
    else if (t === '--out') a.out = argv[(i += 1)];
    else if (t === '--model') a.model = argv[(i += 1)];
    else if (t === '--force') a.force = true;
    else a._.push(t);
  }
  return a;
}

async function genOne({ key, prompt, size, model, isDalle, outPath, force }) {
  if (!force) {
    try {
      await fs.access(outPath);
      return 'skip';
    } catch {
      /* not exist → 生成へ */
    }
  }
  const body = { model, prompt, size, n: 1 };
  if (isDalle) body.response_format = 'b64_json'; // gpt-image-1 は常にb64でこの引数不可
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const item = (await res.json())?.data?.[0];
  let buf;
  if (item?.b64_json) buf = Buffer.from(item.b64_json, 'base64');
  else if (item?.url) buf = Buffer.from(await (await fetch(item.url)).arrayBuffer());
  else throw new Error('画像データが空（b64_json/url 無し）');
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, buf);
  return 'ok';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.error('OPENAI_API_KEY が未設定です。  OPENAI_API_KEY=sk-... node scripts/gen-images.mjs');
    process.exit(1);
  }
  const model = args.model || 'gpt-image-1';
  const isDalle = /dall-e/.test(model);
  const heroSize = isDalle ? '1792x1024' : '1536x1024';
  const sqSize = '1024x1024';
  const outDir = path.resolve(args.out || 'assets');
  const wanted = args.genre ? args.genre.split(',').map((s) => s.trim()).filter(Boolean) : null;

  const keys = Object.keys(IMAGE_PROMPTS).filter((k) => !wanted || wanted.includes(k));
  if (keys.length === 0) {
    console.error('対象業種がありません。--genre の値を確認してください。');
    process.exit(1);
  }

  let ok = 0;
  let skip = 0;
  let fail = 0;
  for (const k of keys) {
    const def = IMAGE_PROMPTS[k];
    const jobs = [];
    if (args.only !== 'gallery') jobs.push({ name: 'hero', prompt: def.hero, size: heroSize });
    if (args.only !== 'hero') def.gallery.forEach((p, i) => jobs.push({ name: String(i + 1), prompt: p, size: sqSize }));
    for (const job of jobs) {
      const outPath = path.join(outDir, k, `${job.name}.png`);
      process.stdout.write(`[${k}/${job.name}] `);
      try {
        const r = await genOne({ key, prompt: `${STYLE} ${job.prompt}.`, size: job.size, model, isDalle, outPath, force: args.force });
        if (r === 'ok') {
          ok += 1;
          console.log('生成');
        } else {
          skip += 1;
          console.log('既存スキップ');
        }
      } catch (e) {
        fail += 1;
        console.log(`失敗: ${e.message}`);
      }
    }
  }
  console.log(`\n完了: 生成${ok} / スキップ${skip} / 失敗${fail} → ${path.relative(process.cwd(), outDir)}/`);
  console.log('次: npm run generate:sites（assets/ を sites/ にコピー）→ wrangler pages deploy');
}

main().catch((e) => {
  console.error('画像生成に失敗:', e.message);
  process.exit(1);
});
