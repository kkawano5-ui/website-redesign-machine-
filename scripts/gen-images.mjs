// 業種別デモ画像を生成して assets/<業種>/ に保存する。2系統に対応:
//   - OpenAI : gpt-image-1 / dall-e-3            （OPENAI_API_KEY = sk-... ）
//   - Google : Imagen (imagen-3.0-generate-002)  （GOOGLE_API_KEY = AIza... ）← Placesと同じGoogle系
//
// ※このリモート環境では実行不可（鍵無し・外部APIへの egress 遮断）。ローカルMacで実行する。
//   OpenAI: OPENAI_API_KEY=sk-proj-... npm run gen:images
//   Google: GOOGLE_API_KEY=AIza...     npm run gen:images -- --provider google
//
// オプション:
//   --provider openai|google   どのAPIで生成するか（既定: openai）
//   --genre k,f,lodging        生成する業種key（既定: 全業種）
//   --only hero|gallery        heroのみ / galleryのみ
//   --force                    既存ファイルも上書き
//   --out <dir>                出力先（既定: assets）
//   --model <id>               モデル上書き
//
// 依存ゼロ（Node18+ の fetch）。1業種 = hero1 + gallery6 = 7枚。全13業種で約91枚。
// 生成後: npm run generate:sites（assets/ を sites/ にコピー）→ wrangler で公開。

import fs from 'fs/promises';
import path from 'path';
import { STYLE, IMAGE_PROMPTS } from './demo/image-prompts.js';

function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const t = argv[i];
    if (t === '--provider') a.provider = argv[(i += 1)];
    else if (t === '--genre') a.genre = argv[(i += 1)];
    else if (t === '--only') a.only = argv[(i += 1)];
    else if (t === '--out') a.out = argv[(i += 1)];
    else if (t === '--model') a.model = argv[(i += 1)];
    else if (t === '--force') a.force = true;
    else a._.push(t);
  }
  return a;
}

async function alreadyExists(outPath, force) {
  if (force) return false;
  try {
    await fs.access(outPath);
    return true;
  } catch {
    return false;
  }
}

async function save(outPath, buf) {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, buf);
}

// OpenAI 画像API（gpt-image-1 / dall-e-3）
async function genOpenAI({ key, prompt, size, model, isDalle }) {
  const body = { model, prompt, size, n: 1 };
  if (isDalle) body.response_format = 'b64_json'; // gpt-image-1 は常にb64でこの引数不可
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const item = (await res.json())?.data?.[0];
  if (item?.b64_json) return Buffer.from(item.b64_json, 'base64');
  if (item?.url) return Buffer.from(await (await fetch(item.url)).arrayBuffer());
  throw new Error('画像データが空（b64_json/url 無し）');
}

// Google Imagen（Gemini API / generativelanguage）。キーはURLクエリで渡す。
async function genGoogle({ key, prompt, aspect, model }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: aspect } }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const b64 = (await res.json())?.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error('画像データが空（predictions無し）');
  return Buffer.from(b64, 'base64');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const provider = args.provider || 'openai';
  if (!['openai', 'google'].includes(provider)) {
    console.error(`--provider は openai か google。受け取った値: ${provider}`);
    process.exit(1);
  }

  const conf =
    provider === 'google'
      ? { envName: 'GOOGLE_API_KEY', key: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY, re: /^AIza[A-Za-z0-9_-]+$/, defaultModel: 'imagen-3.0-generate-002', hint: 'aistudio.google.com で発行した Gemini APIキー（AIza… の長い英数字）' }
      : { envName: 'OPENAI_API_KEY', key: process.env.OPENAI_API_KEY, re: /^sk-[A-Za-z0-9_-]+$/, defaultModel: 'gpt-image-1.5', hint: 'platform.openai.com で発行した実際のキー（sk-proj-… の長い英数字）' };

  if (!conf.key) {
    console.error(`${conf.envName} が未設定です。  ${conf.envName}=... npm run gen:images${provider === 'google' ? ' -- --provider google' : ''}`);
    process.exit(1);
  }
  if (!conf.re.test(conf.key)) {
    console.error(`${conf.envName} の値が正しくないようです（受け取った値: "${conf.key.slice(0, 14)}…"）。`);
    console.error(`「本物の鍵」等のプレースホルダではなく、${conf.hint} をそのまま入れてください。`);
    process.exit(1);
  }

  const model = args.model || conf.defaultModel;
  const isDalle = /dall-e/.test(model);
  const heroSizeOpenAI = isDalle ? '1792x1024' : '1536x1024';
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
    if (args.only !== 'gallery') jobs.push({ name: 'hero', prompt: def.hero, hero: true });
    if (args.only !== 'hero') def.gallery.forEach((p, i) => jobs.push({ name: String(i + 1), prompt: p, hero: false }));
    for (const job of jobs) {
      const outPath = path.join(outDir, k, `${job.name}.png`);
      process.stdout.write(`[${k}/${job.name}] `);
      try {
        if (await alreadyExists(outPath, args.force)) {
          skip += 1;
          console.log('既存スキップ');
          continue;
        }
        const prompt = `${STYLE} ${job.prompt}.`;
        const buf =
          provider === 'google'
            ? await genGoogle({ key: conf.key, prompt, aspect: job.hero ? '16:9' : '1:1', model })
            : await genOpenAI({ key: conf.key, prompt, size: job.hero ? heroSizeOpenAI : '1024x1024', model, isDalle });
        await save(outPath, buf);
        ok += 1;
        console.log('生成');
      } catch (e) {
        fail += 1;
        console.log(`失敗: ${e.message}`);
      }
    }
  }
  console.log(`\n完了: 生成${ok} / スキップ${skip} / 失敗${fail} → ${path.relative(process.cwd(), outDir)}/ （provider=${provider}, model=${model}）`);
  console.log('次: npm run generate:sites（assets/ を sites/ にコピー）→ wrangler pages deploy');
}

main().catch((e) => {
  console.error('画像生成に失敗:', e.message);
  process.exit(1);
});
