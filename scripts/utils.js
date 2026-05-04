import fs from 'fs/promises';
import path from 'path';

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}

export async function writeMarkdownFile(filePath, content) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf-8');
}

export function createSafeSlug(input, fallback = 'site') {
  const source = String(input ?? fallback)
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');

  const slug = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return slug || fallback;
}

export function fileNameWithoutExt(filePath) {
  return path.parse(filePath).name;
}

export function pickFirstValue(obj, keys, defaultValue = '記載なし') {
  for (const key of keys) {
    const value = obj?.[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (Array.isArray(value) && value.length > 0) {
      return value.join(' / ');
    }
  }
  return defaultValue;
}

export function toBulletList(value) {
  if (Array.isArray(value) && value.length > 0) {
    return value.map((item) => `- ${item}`).join('\n');
  }
  if (typeof value === 'string' && value.trim()) {
    return `- ${value.trim()}`;
  }
  return '- 記載なし';
}
