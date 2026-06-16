// 鑑定書 Markdown -> 高級感のある納品用PDF（ブラウザ不要 / pdfkit）
//
// - 表紙(ダークネイビー＋金の二重枠)、命式表、金装飾フレーム付きの本文ページ
// - 日本語フォントは TTF/OTF/TTC を埋め込む。明朝があれば優先（上品）、無ければゴシック。
//   環境変数 FORTUNE_PDF_FONT で明示指定も可。
import fs from 'fs';
import PDFDocument from 'pdfkit';

// 明朝優先 → ゴシック の順で探索（macは明朝, Linuxコンテナはゴシックになる）
const FONT_CANDIDATES = [
  process.env.FORTUNE_PDF_FONT,
  // --- 明朝（上品・占い向き） ---
  '/System/Library/Fonts/ヒラギノ明朝 ProN.ttc', // mac
  '/Library/Fonts/YuMincho.ttc', // mac
  'C:/Windows/Fonts/yumin.ttf', // win 游明朝
  'C:/Windows/Fonts/msmincho.ttc', // win
  '/usr/share/fonts/opentype/ipafont-mincho/ipam.ttf', // linux
  '/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc',
  // --- ゴシック（フォールバック） ---
  '/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc',
  '/usr/share/fonts/opentype/ipafont-gothic/ipagp.ttf',
  '/usr/share/fonts/truetype/fonts-japanese-gothic.ttf',
  '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
  'C:/Windows/Fonts/meiryo.ttc',
].filter(Boolean);

function resolveFont() {
  for (const f of FONT_CANDIDATES) {
    if (f && fs.existsSync(f)) return f;
  }
  throw new Error('日本語フォントが見つかりません。FORTUNE_PDF_FONT に .ttf/.otf/.ttc のパスを指定してください。');
}

const C = {
  ink: '#1c1838', // 濃紺（基調）
  body: '#322e46',
  muted: '#8a8398',
  gold: '#b8923c',
  goldLight: '#d9b86a',
  goldPale: '#efe3c4',
  cream: '#fbf8f1',
  rule: '#e0d3b3',
};

const ELEMENT_COLOR = { 木: '#4a8a5a', 火: '#c0533f', 土: '#b08a3c', 金: '#9a9aa6', 水: '#3f6fb0' };

function jpDate(d) {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

// CJK対応の行折り返し（pdfkitは空白でしか折れないため自前で分割）
function wrapToLines(doc, text, maxWidth) {
  const tokens = text.match(/[A-Za-z0-9_.,!?'"()%/+\-–—:;@#&]+|\s+|[^\sA-Za-z0-9]/g) || [];
  const lines = [];
  let line = '';
  for (const tok of tokens) {
    if (doc.widthOfString(line + tok) <= maxWidth) {
      line += tok;
      continue;
    }
    if (line.trim()) lines.push(line.replace(/\s+$/, ''));
    line = tok.replace(/^\s+/, '');
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

const stripInline = (s) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`(.+?)`/g, '$1');

/**
 * 鑑定書PDFを描画する。
 * @param {string} markdown 本文
 * @param {string} outPath 出力先
 * @param {Object} [opts]
 * @param {Object} [opts.bazi] 命式（あれば表紙の次に命式表を入れる）
 * @param {string} [opts.nickname] 宛名
 * @param {string} [opts.brand] ブランド名（表紙・フッター）
 * @param {Date}   [opts.date] 鑑定日
 */
export async function renderReadingPdf(markdown, outPath, opts = {}) {
  const { bazi = null, nickname = '', brand = 'Luna Mano 鑑定室', date = new Date() } = opts;
  const fontPath = resolveFont();

  const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
  doc.registerFont('jp', fontPath);
  doc.font('jp');

  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  const W = doc.page.width;
  const H = doc.page.height;
  const M = 66; // 本文マージン
  const CW = W - M * 2; // 本文幅
  const TOP = 84;
  const BOTTOM = H - 70;

  // ---------- 表紙 ----------
  // 背景
  doc.rect(0, 0, W, H).fill(C.ink);
  // 金の二重枠
  doc.lineWidth(1.4).strokeColor(C.gold).rect(34, 34, W - 68, H - 68).stroke();
  doc.lineWidth(0.6).strokeColor(C.goldLight).rect(40, 40, W - 80, H - 80).stroke();

  const center = (txt, y, size, color, gap = 0) => {
    doc.font('jp').fontSize(size).fillColor(color);
    const w = doc.widthOfString(txt);
    doc.text(txt, (W - w) / 2, y, { lineBreak: false, characterSpacing: gap });
  };

  center('✦   ☽   ✦', 150, 16, C.goldLight, 6);
  center('四柱推命  ×  手相', 215, 15, C.goldPale, 8);
  center('鑑  定  書', 250, 40, '#ffffff', 14);

  // 金の区切り
  doc.lineWidth(0.8).strokeColor(C.gold)
    .moveTo(W / 2 - 70, 330).lineTo(W / 2 + 70, 330).stroke();
  center('❖', 322, 12, C.goldLight);

  if (nickname) center(`${nickname}  様`, 372, 18, C.goldPale, 4);
  center('— あなたの設計図と、いまを重ねて —', 430, 11, C.muted, 2);

  center(brand, H - 150, 13, C.goldLight, 4);
  center(jpDate(date), H - 122, 10, C.muted, 2);

  // ---------- 本文ページの背景・枠・フッター ----------
  let pageNo = 0;
  const paintContent = () => {
    pageNo += 1;
    doc.rect(0, 0, W, H).fill(C.cream);
    doc.lineWidth(0.8).strokeColor(C.rule).rect(28, 28, W - 56, H - 56).stroke();
    // 四隅の小さな金の装飾
    for (const [cx, cy] of [[28, 28], [W - 28, 28], [28, H - 28], [W - 28, H - 28]]) {
      doc.circle(cx, cy, 2.2).fill(C.gold);
    }
    // フッター
    doc.font('jp').fontSize(8).fillColor(C.muted);
    doc.text(brand, M, H - 50, { lineBreak: false });
    const pn = String(pageNo);
    doc.text(pn, W - M - doc.widthOfString(pn), H - 50, { lineBreak: false });
    doc.y = TOP;
  };

  const newPage = () => { doc.addPage(); paintContent(); };
  const ensure = (need) => { if (doc.y + need > BOTTOM) newPage(); };

  // テキストブロック描画（左/中央）
  const block = (text, { size, color, gap = 0, indent = 0, align = 'left', lineGap = 4, spacing = 0 }) => {
    doc.font('jp').fontSize(size).fillColor(color);
    const lines = wrapToLines(doc, text, CW - indent);
    const lineH = doc.currentLineHeight() + lineGap;
    for (const ln of lines) {
      ensure(lineH);
      const w = doc.widthOfString(ln);
      const x = align === 'center' ? M + (CW - w) / 2 : M + indent;
      doc.text(ln, x, doc.y, { lineBreak: false, characterSpacing: spacing });
      doc.y += lineH;
    }
    doc.y += gap;
  };

  // 金の飾り区切り
  const ornament = () => {
    ensure(28);
    doc.font('jp').fontSize(11).fillColor(C.goldLight);
    const t = '✦   ✦   ✦';
    const w = doc.widthOfString(t);
    doc.text(t, M + (CW - w) / 2, doc.y + 6, { lineBreak: false, characterSpacing: 3 });
    doc.y += 30;
  };

  // 見出し（番号バッジ＋金の下線）
  const heading = (text) => {
    doc.y += 8;
    ensure(40);
    const m = text.match(/^(\d+)[.．]\s*(.+)$/);
    const label = m ? m[2] : text;
    const num = m ? m[1] : null;
    const y0 = doc.y;
    let tx = M;
    if (num) {
      const r = 11;
      doc.circle(M + r, y0 + r, r).fill(C.gold);
      doc.font('jp').fontSize(11).fillColor('#ffffff');
      doc.text(num, M + r - doc.widthOfString(num) / 2, y0 + r - 7, { lineBreak: false });
      tx = M + r * 2 + 10;
    }
    doc.font('jp').fontSize(15).fillColor(C.ink);
    doc.text(label, tx, y0 + 3, { lineBreak: false, width: CW, characterSpacing: 1 });
    doc.y = y0 + 26;
    doc.lineWidth(0.8).strokeColor(C.gold).moveTo(M, doc.y).lineTo(M + CW, doc.y).stroke();
    doc.lineWidth(0.4).strokeColor(C.goldPale).moveTo(M, doc.y + 2.5).lineTo(M + CW, doc.y + 2.5).stroke();
    doc.y += 12;
  };

  // 命式表（4柱カード＋五行バランス）
  const baziTable = (b) => {
    heading('命式 〜あなたの設計図〜');
    const cols = [
      ['年柱', b.pillars.year, b.tenGods.year],
      ['月柱', b.pillars.month, b.tenGods.month],
      ['日柱', b.pillars.day, '日主'],
      ['時柱', b.pillars.hour, b.tenGods.hour],
    ];
    const gap = 12;
    const cw = (CW - gap * 3) / 4;
    const cardH = 104;
    ensure(cardH + 8);
    const y0 = doc.y;
    cols.forEach(([label, pil, god], i) => {
      const x = M + i * (cw + gap);
      doc.roundedRect(x, y0, cw, cardH, 7).lineWidth(0.8).fillAndStroke(C.cream === '#fbf8f1' ? '#ffffff' : C.cream, C.rule);
      // ヘッダ帯
      doc.roundedRect(x, y0, cw, 22, 7).fill(C.ink);
      doc.rect(x, y0 + 14, cw, 8).fill(C.ink);
      doc.font('jp').fontSize(10).fillColor(C.goldLight);
      doc.text(label, x + (cw - doc.widthOfString(label)) / 2, y0 + 6, { lineBreak: false });
      const cx = x + cw / 2;
      if (pil) {
        doc.font('jp').fontSize(22).fillColor(C.ink);
        doc.text(pil.kanshi, cx - doc.widthOfString(pil.kanshi) / 2, y0 + 32, { lineBreak: false });
        doc.font('jp').fontSize(8).fillColor(C.muted);
        doc.text(pil.yomi, cx - doc.widthOfString(pil.yomi) / 2, y0 + 60, { lineBreak: false });
        const tag = god === '日主' ? '日主' : god || '';
        doc.font('jp').fontSize(9).fillColor(C.gold);
        doc.text(tag, cx - doc.widthOfString(tag) / 2, y0 + 78, { lineBreak: false });
      } else {
        doc.font('jp').fontSize(13).fillColor(C.muted);
        doc.text('—', cx - doc.widthOfString('—') / 2, y0 + 44, { lineBreak: false });
        doc.font('jp').fontSize(8).fillColor(C.muted);
        doc.text('（時刻不明）', cx - doc.widthOfString('（時刻不明）') / 2, y0 + 70, { lineBreak: false });
      }
    });
    doc.y = y0 + cardH + 16;

    // 日主＋五行バランス
    block(`日主：${b.dayMaster.stem}（${b.dayMaster.yomi}）／ ${b.dayMaster.element}・${b.dayMaster.yinYang}`,
      { size: 11, color: C.body, gap: 8 });
    ensure(26);
    doc.font('jp').fontSize(11).fillColor(C.body);
    doc.text('五行バランス：', M, doc.y, { lineBreak: false });
    let bx = M + doc.widthOfString('五行バランス：') + 4;
    const by = doc.y;
    for (const el of ['木', '火', '土', '金', '水']) {
      const n = b.elementCount[el] ?? 0;
      doc.circle(bx + 6, by + 6, 6).fill(ELEMENT_COLOR[el]);
      doc.fillColor(C.body).fontSize(11).text(`${el}${n}`, bx + 16, by + 0.5, { lineBreak: false });
      bx += 16 + doc.widthOfString(`${el}${n}`) + 12;
    }
    doc.y = by + 22;
    ornament();
  };

  // ---------- 本文を流し込む ----------
  paintContent(); // 1枚目の本文ページ
  if (bazi) baziTable(bazi);

  let skippedH1 = false;
  for (const raw of markdown.replace(/\r\n/g, '\n').split('\n')) {
    const t = raw.trimEnd();
    if (!t.trim()) { doc.y += 5; continue; }

    if (/^#\s+/.test(t)) {
      if (!skippedH1) { skippedH1 = true; continue; } // タイトルは表紙にあるので本文では省略
      block(stripInline(t.replace(/^#\s+/, '')), { size: 17, color: C.ink, align: 'center', gap: 8 });
    } else if (/^##\s+/.test(t)) {
      heading(stripInline(t.replace(/^##\s+/, '')));
    } else if (/^###\s+/.test(t)) {
      block(stripInline(t.replace(/^###\s+/, '')), { size: 12, color: C.gold, gap: 4 });
    } else if (/^[-*]\s+/.test(t)) {
      ensure(20);
      const y0 = doc.y;
      doc.font('jp').fontSize(10).fillColor(C.gold).text('❖', M + 4, y0 + 1, { lineBreak: false });
      block(stripInline(t.replace(/^[-*]\s+/, '')), { size: 10.5, color: C.body, indent: 22, gap: 3 });
    } else if (/^---+$/.test(t) || /^___+$/.test(t)) {
      ornament();
    } else if (/^[>※]/.test(t)) {
      block(stripInline(t.replace(/^>\s?/, '')), { size: 8.5, color: C.muted, align: 'center', gap: 2, lineGap: 3 });
    } else {
      block(stripInline(t), { size: 11, color: C.body, gap: 5, lineGap: 5.5 });
    }
  }

  doc.end();
  await new Promise((res, rej) => { stream.on('finish', res); stream.on('error', rej); });
  return outPath;
}
