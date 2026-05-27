import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const inputPath = path.join(__dirname, '..', 'data', 'prospects-sns-consulting.json');
const outputPath = path.join(__dirname, '..', 'data', 'prospects-sns-consulting.csv');

const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const headers = [
  ['segment', 'セグメント'],
  ['subcategory', 'サブカテゴリ'],
  ['companyName', '会社名'],
  ['url', 'URL'],
  ['businessOverview', '事業概要'],
  ['contact', '問い合わせ窓口'],
  ['representative', '代表者'],
  ['recruitPageUrl', '採用ページURL'],
  ['salesHookHypothesis', '営業トーク仮説'],
];

const escapeCsv = (value) => {
  const s = String(value ?? '');
  return `"${s.replace(/"/g, '""')}"`;
};

const headerRow = headers.map(([, label]) => escapeCsv(label)).join(',');
const dataRows = data.map((row) =>
  headers.map(([key]) => escapeCsv(row[key])).join(',')
);

const csv = '﻿' + [headerRow, ...dataRows].join('\r\n') + '\r\n';

fs.writeFileSync(outputPath, csv, 'utf8');
console.log(`Wrote ${data.length} rows to ${outputPath}`);
