/**
 * 営業CRM 架電KPI 集計（みらい編集）— 1枚に「月次＋日次」、担当はシートで管理、自動更新対応
 *
 *  出力: 「集計」タブに 上＝月次サマリー / 下＝日次 を縦に並べて表示。
 *  担当: 「担当者」タブの一覧（1名1行）で管理。足す/減らす/並べ替えると集計の列が追従。
 *        ※一覧に無い担当でも、CRMに架電記録があれば右端に自動追加（取りこぼし防止）。
 *
 *  指標: 架電数 / 通電率 / 通電数 / アポ数 / 設定率
 *    通電率 = 通電数 ÷ 架電数 ／ 設定率 = アポ数 ÷ 通電数（通電からのアポ率）
 *  ステータス分類:
 *    通電   = 後日掛け直し / 資料送付 / お断り / アポ獲得 / 電話アポ
 *    非通電 = 留守 / 廃業 ／ アポ = アポ獲得 / 電話アポ
 *
 *  使い方:
 *   1) CRMで「拡張機能 → Apps Script」を開き、この全文を貼り付けて保存
 *   2) 関数選択で buildAllKpi を ▶実行（初回のみ権限承認）
 *        → 「集計」タブ（月次＋日次）と「担当者」タブ（高橋/河野/北尾で初期化）が出来る
 *   3) ★自動更新: 関数選択で setupTriggers を ▶実行（1回だけ）
 *        → 以後、架電結果の入力や担当者の追加で 1〜2秒で自動更新
 *   ※ シート上部「KPI集計」メニューからも操作できます。
 */

const CONFIG = {
  crmSheet: 'CRM',                 // 架電データのタブ名
  outSheet: '集計',                // 出力タブ（月次＋日次を縦に）
  repsSheet: '担当者',             // 担当者を管理するタブ（無ければ自動作成）
  repsSeed: ['高橋', '河野', '北尾'], // 「担当者」タブ初回作成時の初期メンバー

  cols: {
    rowOwner: '担当',              // 各回の架電担当が空のときのフォールバック
    attempts: [
      { rep: '1回目_架電担当', date: '1回目_日付', status: '1回目_ステータス' },
      { rep: '2回目_架電担当', date: '2回目_日付', status: '2回目_ステータス' },
      { rep: '3回目_架電担当', date: '3回目_日付', status: '3回目_ステータス' },
    ],
  },

  connectedKeywords: ['後日掛け直し', '資料送付', 'お断り', 'アポ獲得', '電話アポ'],
  apoKeywords: ['アポ獲得', '電話アポ'],
};

const METRICS = ['架電数', '通電率', '通電数', 'アポ数', '設定率'];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('KPI集計')
    .addItem('集計を更新（月次＋日次）', 'buildAllKpi')
    .addSeparator()
    .addItem('自動更新をON（トリガー設置）', 'setupTriggers')
    .addItem('自動更新をOFF', 'removeTriggers')
    .addToUi();
}

// 「担当者」タブから一覧を取得（無ければ初期メンバーで作成）
function loadReps(ss) {
  let sh = ss.getSheetByName(CONFIG.repsSheet);
  if (!sh) {
    sh = ss.insertSheet(CONFIG.repsSheet);
    sh.getRange(1, 1).setValue('架電担当（この順で集計の列が並びます／1名1行・ここに足すと集計に反映）')
      .setFontWeight('bold').setBackground('#e8eaed');
    if (CONFIG.repsSeed.length) sh.getRange(2, 1, CONFIG.repsSeed.length, 1).setValues(CONFIG.repsSeed.map((n) => [n]));
    sh.setColumnWidth(1, 360);
    return CONFIG.repsSeed.slice();
  }
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 1).getValues().map((r) => String(r[0]).trim()).filter(Boolean);
}

// CRMを1回読み、架電を1件ずつ展開（担当の列順も確定）
function loadCalls() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = ss.getSpreadsheetTimeZone();
  const sh = ss.getSheetByName(CONFIG.crmSheet);
  if (!sh) throw new Error('CRMタブが見つかりません: ' + CONFIG.crmSheet);

  const data = sh.getDataRange().getValues();
  const header = data[0].map(String);
  const idx = (name) => header.indexOf(name);
  const norm = (v) => String(v == null ? '' : v).trim();
  const hit = (s, list) => list.some((k) => s.indexOf(k) >= 0);
  const dateKey = (v) => {
    if (v instanceof Date) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
    let s = norm(v);
    if (!s) return '';
    if (/^\d{1,2}\/\d{1,2}$/.test(s)) s = new Date().getFullYear() + '/' + s; // "6/13" → 今年付与
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : Utilities.formatDate(d, tz, 'yyyy-MM-dd');
  };

  const calls = [];
  const repsFound = {};
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const owner = idx(CONFIG.cols.rowOwner) >= 0 ? norm(row[idx(CONFIG.cols.rowOwner)]) : '';
    for (const a of CONFIG.cols.attempts) {
      const di = idx(a.date);
      if (di < 0) continue;
      const dk = dateKey(row[di]);
      if (!dk) continue;
      const rep = (idx(a.rep) >= 0 && norm(row[idx(a.rep)])) || owner || '不明';
      const status = idx(a.status) >= 0 ? norm(row[idx(a.status)]) : '';
      calls.push({ dk, rep, isConn: hit(status, CONFIG.connectedKeywords), isApo: hit(status, CONFIG.apoKeywords) });
      repsFound[rep] = true;
    }
  }

  // 列順: 全体 → 「担当者」タブの順 → タブに無いが記録のある担当（右端に追加）
  const groups = ['全体'];
  loadReps(ss).forEach((rp) => { if (rp && groups.indexOf(rp) < 0) groups.push(rp); });
  Object.keys(repsFound).sort().forEach((rp) => { if (groups.indexOf(rp) < 0) groups.push(rp); });

  return { ss, calls, groups };
}

// keyFn(dk) で粒度を切替（日次=そのまま / 月次=yyyy-MM）して集計
function aggregate(calls, keyFn) {
  const agg = {};
  const cell = (k, g) => { agg[k] = agg[k] || {}; agg[k][g] = agg[k][g] || { call: 0, conn: 0, apo: 0 }; return agg[k][g]; };
  for (const c of calls) {
    const k = keyFn(c.dk); if (!k) continue;
    for (const g of ['全体', c.rep]) { const x = cell(k, g); x.call += 1; if (c.isConn) x.conn += 1; if (c.isApo) x.apo += 1; }
  }
  return agg;
}

// 1セクション分の行列（[h1, h2, ...data, 合計]）を作る
function sectionMatrix(agg, groups, keyLabel) {
  const rate = (a, b) => (b ? a / b : 0);
  const lineFor = (label, pick) => {
    const line = [label];
    for (const g of groups) {
      const c = pick(g) || { call: 0, conn: 0, apo: 0 };
      line.push(c.call, rate(c.conn, c.call), c.conn, c.apo, rate(c.apo, c.conn));
    }
    return line;
  };
  const h1 = [''], h2 = [keyLabel];
  for (const g of groups) { h1.push(g); for (let i = 1; i < METRICS.length; i++) h1.push(''); for (const m of METRICS) h2.push(m); }
  const rows = [h1, h2];
  const keys = Object.keys(agg).sort();
  for (const k of keys) rows.push(lineFor(k, (g) => agg[k][g]));
  const totals = {};
  for (const k of keys) for (const g of groups) {
    const s = totals[g] || (totals[g] = { call: 0, conn: 0, apo: 0 });
    const c = agg[k][g] || {}; s.call += c.call || 0; s.conn += c.conn || 0; s.apo += c.apo || 0;
  }
  if (keys.length) rows.push(lineFor('合計', (g) => totals[g]));
  return rows;
}

function buildAllKpi() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return; // 既に別更新中ならスキップ（保険トリガーが拾う）
  try {
    const ctx = loadCalls();
    const groups = ctx.groups;
    const mRows = sectionMatrix(aggregate(ctx.calls, (d) => d.slice(0, 7)), groups, '年月');
    const dRows = sectionMatrix(aggregate(ctx.calls, (d) => d), groups, '日付');

    const nCols = mRows[0].length;
    const blank = new Array(nCols).fill('');
    const titleRow = (t) => { const r = new Array(nCols).fill(''); r[0] = t; return r; };

    const matrix = [];
    matrix.push(titleRow('■ 月次サマリー'));
    const mHead = matrix.length + 1;                 // 月次 h1 の行(1-indexed)
    mRows.forEach((r) => matrix.push(r));
    matrix.push(blank.slice());
    matrix.push(titleRow('■ 日次'));
    const dHead = matrix.length + 1;                 // 日次 h1 の行
    dRows.forEach((r) => matrix.push(r));

    const ss = ctx.ss;
    let o = ss.getSheetByName(CONFIG.outSheet);
    if (!o) o = ss.insertSheet(CONFIG.outSheet);
    o.clear();
    o.getRange(1, 1, matrix.length, nCols).setValues(matrix);

    // タイトル行
    [1, dHead - 1].forEach((tr) => o.getRange(tr, 1, 1, nCols).merge()
      .setFontWeight('bold').setBackground('#e8eaed').setHorizontalAlignment('left'));

    formatBlock(o, mHead, groups, nCols, '年月', mRows.length - 2);
    formatBlock(o, dHead, groups, nCols, '日付', dRows.length - 2);

    o.setFrozenColumns(1);
    for (let c = 1; c <= nCols; c++) o.autoResizeColumn(c);
    SpreadsheetApp.getActive().toast('集計を更新（月次＋日次 / 担当' + (groups.length - 1) + '名）', 'KPI集計', 4);
  } finally { lock.releaseLock(); }
}

// ヘッダ2行＋データ行の装飾。headRow=h1の行, dataRows=データ＋合計の行数
function formatBlock(o, headRow, groups, nCols, keyLabel, dataRows) {
  o.getRange(headRow, 1, 2, nCols).setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle');
  o.getRange(headRow, 1, 2, 1).merge();
  o.getRange(headRow, 1).setValue(keyLabel);
  const palette = ['#1a73e8', '#34a853', '#fbbc04', '#ea4335', '#9334e6', '#00897b', '#e8710a', '#7cb342', '#5c6bc0', '#d81b60'];
  const dataStart = headRow + 2;
  for (let gi = 0; gi < groups.length; gi++) {
    const base = 2 + gi * METRICS.length;
    o.getRange(headRow, base, 1, METRICS.length).merge()
      .setBackground(palette[gi % palette.length]).setFontColor('#ffffff');
    o.getRange(headRow + 1, base, 1, METRICS.length).setBackground('#f1f3f4');
    if (dataRows > 0) [base + 1, base + 4].forEach((col) => // 通電率 / 設定率 を%
      o.getRange(dataStart, col, dataRows, 1).setNumberFormat('0.0%'));
  }
  if (dataRows > 0) o.getRange(dataStart + dataRows - 1, 1, 1, nCols).setFontWeight('bold').setBackground('#fff8e1'); // 合計行
  o.getRange(headRow, 1, 2 + Math.max(dataRows, 0), nCols)
    .setBorder(true, true, true, true, true, true, '#dadce0', SpreadsheetApp.BorderStyle.SOLID);
}

// 入力時に自動更新（架電結果の入力／担当者の追加で即反映）
function onEditUpdate(e) {
  try {
    if (!e || !e.range) return;
    const name = e.range.getSheet().getName();
    if (name === CONFIG.repsSheet) { buildAllKpi(); return; } // 担当者を増減したら更新
    if (name !== CONFIG.crmSheet) return;
    const sh = e.range.getSheet();
    const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    const watch = [];
    for (const a of CONFIG.cols.attempts) {
      [a.date, a.status, a.rep].forEach((n) => { const i = header.indexOf(n); if (i >= 0) watch.push(i + 1); });
    }
    const ro = header.indexOf(CONFIG.cols.rowOwner); if (ro >= 0) watch.push(ro + 1);
    const c0 = e.range.getColumn(), c1 = c0 + e.range.getNumColumns() - 1;
    if (!watch.some((w) => w >= c0 && w <= c1)) return; // 関係ない列の編集は無視
    buildAllKpi();
  } catch (err) { /* 自動更新は静かに失敗させる */ }
}

function setupTriggers() {
  removeTriggers();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.newTrigger('onEditUpdate').forSpreadsheet(ss).onEdit().create();  // 入力で即更新
  ScriptApp.newTrigger('buildAllKpi').timeBased().everyHours(1).create();     // 毎時の保険更新
  SpreadsheetApp.getActive().toast('自動更新をONにしました（入力時＋毎時）', 'KPI集計', 5);
}
function removeTriggers() {
  ScriptApp.getProjectTriggers().forEach((t) => {
    if (['onEditUpdate', 'buildAllKpi'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
}
