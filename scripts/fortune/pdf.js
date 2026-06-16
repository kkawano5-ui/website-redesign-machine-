// 鑑定書 Markdown -> 整形PDF（ブラウザ不要・pdfkitで日本語埋め込み）
//
// 日本語フォントは TTF/OTF を埋め込む。環境変数 FORTUNE_PDF_FONT で上書き可。
// 未指定時は一般的な日本語フォントの候補を順に探す（Linux: IPAフォント / mac / win）。
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

const FONT_CANDIDATES = [
  process.env.FORTUNE_PDF_FONT,
  '/usr/share/fonts/opentype/ipafont-gothic/ipagp.ttf',
  '/usr/share/fonts/truetype/fonts-japanese-gothic.ttf',
  '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
  '/Library/Fonts/Arial Unicode.ttf', // mac
  '/System/Library/Fonts/Hiragino Sans GB.ttc', // mac
  'C:/Windows/Fonts/meiryo.ttc', // win
  'C:/Windows/Fonts/YuGothR.ttc', // win
].filter(Boolean);

function resolveFont() {
  for (const f of FONT_CANDIDATES) {
    if (f && fs.existsSync(f)) return f;
  }
  throw new Error(
    '日本語フォントが見つかりません。FORTUNE_PDF_FONT に .ttf/.otf のパスを指定してください。',
  );
}

const COLORS = {
  h1: '#2b2150',
  h2: '#9a6c1f',
  h3: '#4a3d7a',
  body: '#2a2a35',
  rule: '#d8cfe6',
  muted: '#7d7790',
  eyebrow: '#b8923c',
};

// CJK対応の行折り返し（pdfkitは空白でしか折れないため自前で行分割）
function wrapToLines(doc, text, maxWidth) {
  // ASCII語/空白/その他1文字 にトークン分割
  const tokens = text.match(/[A-Za-z0-9_.,!?'"()%/+\-–—:;@#&]+|\s+|[^\sA-Za-z0-9]/g) || [];
  const lines = [];
  let line = '';
  for (const tok of tokens) {
    const candidate = line + tok;
    if (doc.widthOfString(candidate) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line.trim()) lines.push(line.replace(/\s+$/, ''));
    line = tok.replace(/^\s+/, '');
    // 1トークンが幅を超える場合（長いURL等）は強制分割
    while (doc.widthOfString(line) > maxWidth && line.length > 1) {
      let i = line.length;
      while (i > 1 && doc.widthOfString(line.slice(0, i)) > maxWidth) i--;
      lines.push(line.slice(0, i));
      line = line.slice(i);
    }
  }
  if (line.trim()) lines.push(line.replace(/\s+$/, ''));
  return lines.length ? lines : [''];
}

// インライン装飾を除去（pdfkitの単純レイアウト向け）
function stripInline(s) {
  return s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`(.+?)`/g, '$1');
}

/**
 * Markdownの鑑定書をPDF化する。
 * @param {string} markdown 鑑定書本文
 * @param {string} outPath 出力PDFパス
 */
export async function renderReadingPdf(markdown, outPath) {
  const fontPath = resolveFont();
  const doc = new PDFDocument({ size: 'A4', margins: { top: 64, bottom: 64, left: 64, right: 64 } });
  doc.registerFont('jp', fontPath);
  doc.font('jp');

  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  const left = doc.page.margins.left;
  const maxWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const bottom = () => doc.page.height - doc.page.margins.bottom;

  // 改ページ判定して必要なら addPage
  const ensure = (needed) => {
    if (doc.y + needed > bottom()) doc.addPage();
  };

  // 1ブロック(複数行)を描画
  const drawLines = (text, { size, color, gap = 0, indent = 0, align = 'left', lineGap = 4 }) => {
    doc.fontSize(size).fillColor(color);
    const lines = wrapToLines(doc, text, maxWidth - indent);
    const lineH = doc.currentLineHeight() + lineGap;
    for (const ln of lines) {
      ensure(lineH);
      const w = doc.widthOfString(ln);
      const x = align === 'center' ? left + (maxWidth - w) / 2 : left + indent;
      doc.text(ln, x, doc.y, { lineBreak: false });
      doc.y += lineH;
    }
    doc.y += gap;
  };

  const hr = () => {
    ensure(16);
    doc.moveTo(left, doc.y + 6)
      .lineTo(left + maxWidth, doc.y + 6)
      .lineWidth(0.8)
      .strokeColor(COLORS.rule)
      .stroke();
    doc.y += 18;
  };

  // ヘッダー（エンブレム的な一行）
  drawLines('✦  FORTUNE READING  ✦', { size: 9, color: COLORS.eyebrow, align: 'center', gap: 2, lineGap: 2 });

  const rawLines = markdown.replace(/\r\n/g, '\n').split('\n');
  for (let raw of rawLines) {
    const lineText = raw.trimEnd();
    if (!lineText.trim()) { doc.y += 5; continue; }

    if (/^#\s+/.test(lineText)) {
      drawLines(stripInline(lineText.replace(/^#\s+/, '')), { size: 21, color: COLORS.h1, align: 'center', gap: 4, lineGap: 6 });
      hr();
    } else if (/^##\s+/.test(lineText)) {
      doc.y += 6;
      drawLines(stripInline(lineText.replace(/^##\s+/, '')), { size: 14.5, color: COLORS.h2, gap: 4, lineGap: 5 });
    } else if (/^###\s+/.test(lineText)) {
      drawLines(stripInline(lineText.replace(/^###\s+/, '')), { size: 12, color: COLORS.h3, gap: 3 });
    } else if (/^[-*]\s+/.test(lineText)) {
      drawLines('・' + stripInline(lineText.replace(/^[-*]\s+/, '')), { size: 10.5, color: COLORS.body, indent: 10, gap: 2, lineGap: 4 });
    } else if (/^---+$/.test(lineText) || /^___+$/.test(lineText)) {
      hr();
    } else if (/^[>※]/.test(lineText)) {
      drawLines(stripInline(lineText.replace(/^>\s?/, '')), { size: 9, color: COLORS.muted, gap: 2, lineGap: 3 });
    } else {
      drawLines(stripInline(lineText), { size: 11, color: COLORS.body, gap: 4, lineGap: 5 });
    }
  }

  doc.end();
  await new Promise((res, rej) => {
    stream.on('finish', res);
    stream.on('error', rej);
  });
  return outPath;
}
