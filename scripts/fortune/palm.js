// 手相画像の解析（Claude Vision）
import fs from 'fs/promises';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

export const FORTUNE_MODEL = process.env.FORTUNE_MODEL || 'claude-opus-4-8';

function client() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY が未設定です（.env を確認）');
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

/**
 * 手のひら画像を観察して構造化メモ(JSON)を返す。
 * @param {string} imagePath 画像ファイルパス
 * @param {string} visionPrompt prompts/palm-vision.md の本文
 * @returns {Promise<Object>} 観察メモ（パース失敗時は { raw } を返す）
 */
export async function analyzePalm(imagePath, visionPrompt) {
  const ext = path.extname(imagePath).toLowerCase();
  const mediaType = MIME[ext];
  if (!mediaType) {
    throw new Error(`未対応の画像形式です: ${ext}（jpg/png/webp/gif を使用）`);
  }
  const data = (await fs.readFile(imagePath)).toString('base64');

  const res = await client().messages.create({
    model: FORTUNE_MODEL,
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
          { type: 'text', text: visionPrompt },
        ],
      },
    ],
  });

  const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
  const jsonText = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(jsonText);
  } catch {
    return { raw: text, parseError: true };
  }
}
