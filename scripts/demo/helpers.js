import fs from 'fs/promises';
import path from 'path';
import { ensureDir } from '../utils.js';

// HTMLに差し込む動的値（社名・エリア等）は必ずこれを通す。
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function writeFileEnsured(filePath, content) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf-8');
}

// 依存ゼロの簡易CSVパーサ（RFC4180の範囲: ダブルクォート・カンマ・改行に対応）。
// 先頭行をヘッダとして { header: value } の配列を返す。
export function parseCsv(text) {
  const rows = [];
  let field = '';
  let record = [];
  let inQuotes = false;
  const pushField = () => {
    record.push(field);
    field = '';
  };
  const pushRecord = () => {
    rows.push(record);
    record = [];
  };
  const src = String(text).replace(/\r\n?/g, '\n');
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      pushField();
    } else if (ch === '\n') {
      pushField();
      pushRecord();
    } else {
      field += ch;
    }
  }
  if (field !== '' || record.length > 0) {
    pushField();
    pushRecord();
  }

  const nonEmpty = rows.filter((r) => r.some((cell) => String(cell).trim() !== ''));
  if (nonEmpty.length === 0) return [];

  const headers = nonEmpty[0].map((h) => h.trim());
  return nonEmpty.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] ?? '').trim();
    });
    return obj;
  });
}

// CSVセル1つを安全に出力（カンマ・改行・引用符を含む場合はクォート）。
export function csvCell(value) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
