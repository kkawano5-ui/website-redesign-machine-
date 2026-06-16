// 複合鑑定オーケストレーター：四柱推命 × 手相 → 鑑定書(Markdown)
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import { computeBazi } from './bazi.js';
import { analyzePalm, FORTUNE_MODEL } from './palm.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

async function readPrompt(name) {
  return fs.readFile(path.join(ROOT, 'prompts', name), 'utf-8');
}

// 命式を人が読める表で文字列化（鑑定プロンプトに渡す & デバッグ用）
export function formatBaziTable(b) {
  const p = b.pillars;
  const row = (label, pil, god) =>
    `| ${label} | ${pil ? `${pil.kanshi}（${pil.yomi}）` : '—'} | ${pil ? pil.element : '—'} | ${god ?? '—'} |`;
  const el = b.elementCount;
  return [
    '| 柱 | 干支 | 五行 | 通変星 |',
    '|---|---|---|---|',
    row('年柱', p.year, b.tenGods.year),
    row('月柱', p.month, b.tenGods.month),
    row('日柱', p.day, '（日主）'),
    row('時柱', p.hour, b.tenGods.hour),
    '',
    `- 日主: ${b.dayMaster.stem}（${b.dayMaster.yomi}）／${b.dayMaster.element}・${b.dayMaster.yinYang}`,
    `- 五行バランス: 木${el.木} 火${el.火} 土${el.土} 金${el.金} 水${el.水}`,
    b.notes.length ? `- 注記: ${b.notes.join(' / ')}` : '',
  ].filter(Boolean).join('\n');
}

/**
 * 依頼1件分の鑑定書を生成する。
 * @param {Object} input 依頼データ（data/fortune-inputs/*.json 形式）
 * @returns {Promise<{ markdown: string, bazi: Object, palm: Object }>}
 */
export async function generateReading(input) {
  const { birth, palmImage, concern = '全体運', nickname = 'あなた' } = input;
  if (!birth || !birth.year || !birth.month || !birth.day) {
    throw new Error('birth.year / birth.month / birth.day は必須です');
  }

  // 1) 四柱推命（決定論的・APIキー不要）
  const bazi = computeBazi({
    year: birth.year,
    month: birth.month,
    day: birth.day,
    hour: typeof birth.hour === 'number' ? birth.hour : undefined,
    minute: birth.minute ?? 0,
    tzOffsetHours: birth.tzOffsetHours ?? 9,
  });

  // 2) 手相（Claude Vision）— 画像があるときのみ
  let palm = { note: '手相画像なし（四柱推命のみで鑑定）' };
  if (palmImage) {
    const imgPath = path.isAbsolute(palmImage) ? palmImage : path.join(ROOT, palmImage);
    palm = await analyzePalm(imgPath, await readPrompt('palm-vision.md'));
  }

  // 3) 複合鑑定（Claude）
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY が未設定です（.env を確認）');
  }
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const systemPrompt = await readPrompt('fortune-reading.md');
  const userPayload = JSON.stringify({ bazi, palm, concern, nickname }, null, 2);

  const res = await anthropic.messages.create({
    model: FORTUNE_MODEL,
    max_tokens: 3000,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content:
          `以下の命式と手相観察メモから、フォーマットに従って鑑定書(Markdown)を作成してください。\n\n` +
          `【命式表】\n${formatBaziTable(bazi)}\n\n【入力データ(JSON)】\n${userPayload}`,
      },
    ],
  });

  const markdown = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
  return { markdown, bazi, palm };
}
