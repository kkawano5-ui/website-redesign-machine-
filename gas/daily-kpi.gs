/**
 * 営業CRM 架電KPI 集計（みらい編集）— 日次＋月次、自動更新対応
 *  CRMタブの 1回目/2回目/3回目 の架電列から、日付/年月 × 担当 × 全体 のKPIを集計。
 *   日次 → 「集計」タブ ／ 月次 → 「集計_月次」タブ
 *
 * 指標: 架電数 / 通電率 / 通電数 / アポ数 / 設定率
 *   通電率 = 通電数 ÷ 架電数 ／ 設定率 = アポ数 ÷ 通電数（通電からのアポ率）
 * ステータス分類:
 *   通電   = 後日掛け直し / 資料送付 / お断り / アポ獲得 / 電話アポ
 *   非通電 = 留守 / 廃業 ／ アポ = アポ獲得 / 電話アポ
 *
 * 使い方:
 *  1) CRMで「拡張機能 → Apps Script」を開き、この全文を貼り付けて保存
 *  2) 関数選択で buildAllKpi を ▶実行（初回のみ権限承認）→「集計」「集計_月次」が出来る
 *  3) ★自動更新: 関数選択で setupTriggers を ▶実行（1回だけ）
 *       → 以後、誰かが架電結果を入力すると 1〜2秒で集計が自動更新（＋毎時の保険更新）
 *  ※ シートを開くと「KPI集計」メニューからも各操作ができます。
 */

const CONFIG = {
  crmSheet: 'CRM',                 // 架電データのタブ名
  outSheetDaily: '集計',           // 日次の出力タブ
  outSheetMonthly: '集計_月次',    // 月次の出力タブ
  reps: ['国重', '原', '櫻井', '谷', '三鵄'],  // 既知の担当（この順で列が並ぶ。他はデータから自動追加）

  cols: {
    rowOwner: '担当',              // 各回の架電担当が空のときのフォールバック
    attempts: [
      { rep: '1回目_架電担当', date: '1回目_日付', status: '1回目_ステータス' },
      { rep: '2回目_架電担当', date: '2回目_日付', status: '2回目_ステータス' },
      { rep: '3回目_架電担当', date: '3回目_日付', status: '3回目_ステータス' },
    ],
  },

  // ステータスの言葉（部分一致。固定ドロップダウンの文言）
  connectedKeywords: ['後日掛け直し', '資料送付', 'お断り', 'アポ獲得', '電話アポ'],
  apoKeywords: ['アポ獲得', '電話アポ'],
};

const METRICS = ['架電数', '通電率', '通電数', 'アポ数', '設定率'];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('KPI集計')
    .addItem('日次＋月次を更新', 'buildAllKpi')
    .addSeparator()
    .addItem('日次だけ更新', 'buildDailyKpi')
    .addItem('月次だけ更新', 'buildMonthlyKpi')
    .addSeparator()
    .addItem('自動更新をON（トリガー設置）', 'setupTriggers')
    .addItem('自動更新をOFF', 'removeTriggers')
    .addToUi();
}

// ---- CRMを1回読み、架電を1件ずつ展開（日次/月次で共有） ----
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
      if (!dk) continue; // その回は未架電
      const rep = (idx(a.rep) >= 0 && norm(row[idx(a.rep)])) || owner || '不明';
      const status = idx(a.status) >= 0 ? norm(row[idx(a.status)]) : '';
      calls.push({ dk, rep, isConn: hit(status, CONFIG.connectedKeywords), isApo: hit(status, CONFIG.apoKeywords) });
      repsFound[rep] = true;
    }
  }

  const groups = ['全体'];
  for (const rp of CONFIG.reps) if (groups.indexOf(rp) < 0) groups.push(rp);
  Object.keys(repsFound).sort().forEach((rp) => { if (groups.indexOf(rp) < 0) groups.push(rp); });

  return { ss, calls, groups };
}

// ---- keyFn(dk) で集計の粒度を切替（日次=そのまま / 月次=先頭7文字 yyyy-MM）----
function renderKpi(ctx, sheetName, keyFn, keyLabel) {
  const { ss, calls, groups } = ctx;
  const agg = {};
  const cell = (k, g) => {
    agg[k] = agg[k] || {};
    agg[k][g] = agg[k][g] || { call: 0, conn: 0, apo: 0 };
    return agg[k][g];
  };
  for (const c of calls) {
    const k = keyFn(c.dk);
    if (!k) continue;
    for (const g of ['全体', c.rep]) {
      const x = cell(k, g);
      x.call += 1;
      if (c.isConn) x.conn += 1;
      if (c.isApo) x.apo += 1;
    }
  }

  const rate = (a, b) => (b ? a / b : 0);
  const lineFor = (label, pick) => {
    const line = [label];
    for (const g of groups) {
      const c = pick(g) || { call: 0, conn: 0, apo: 0 };
      line.push(c.call, rate(c.conn, c.call), c.conn, c.apo, rate(c.apo, c.conn)); // 架電/通電率/通電/アポ/設定率
    }
    return line;
  };

  const h1 = [''], h2 = [keyLabel];
  for (const g of groups) {
    h1.push(g);
    for (let i = 1; i < METRICS.length; i++) h1.push('');
    for (const m of METRICS) h2.push(m);
  }
  const out = [h1, h2];
  const keys = Object.keys(agg).sort();
  for (const k of keys) out.push(lineFor(k, (g) => agg[k][g]));
  const totals = {};
  for (const k of keys) for (const g of groups) {
    const s = totals[g] || (totals[g] = { call: 0, conn: 0, apo: 0 });
    const c = agg[k][g] || {};
    s.call += c.call || 0; s.conn += c.conn || 0; s.apo += c.apo || 0;
  }
  if (keys.length) out.push(lineFor('合計', (g) => totals[g]));

  const nRows = out.length, nCols = out[0].length;
  let o = ss.getSheetByName(sheetName);
  if (!o) o = ss.insertSheet(sheetName);
  o.clear();
  o.getRange(1, 1, nRows, nCols).setValues(out);

  o.getRange(1, 1, 2, nCols).setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle');
  o.getRange(1, 1, 2, 1).merge();
  o.getRange(1, 1).setValue(keyLabel);
  const palette = ['#1a73e8', '#34a853', '#fbbc04', '#ea4335', '#9334e6', '#00897b', '#e8710a', '#7cb342'];
  for (let gi = 0; gi < groups.length; gi++) {
    const base = 2 + gi * METRICS.length;
    o.getRange(1, base, 1, METRICS.length).merge()
      .setBackground(palette[gi % palette.length]).setFontColor('#ffffff');
    o.getRange(2, base, 1, METRICS.length).setBackground('#f1f3f4');
    if (nRows > 2) [base + 1, base + 4].forEach((col) => // 通電率 / 設定率 を%
      o.getRange(3, col, nRows - 2, 1).setNumberFormat('0.0%'));
  }
  if (keys.length) o.getRange(nRows, 1, 1, nCols).setFontWeight('bold').setBackground('#fff8e1');
  o.getRange(1, 1, nRows, nCols).setBorder(true, true, true, true, true, true, '#dadce0', SpreadsheetApp.BorderStyle.SOLID);
  o.setFrozenRows(2);
  o.setFrozenColumns(1);
  for (let c = 1; c <= nCols; c++) o.autoResizeColumn(c);
  return keys.length;
}

function buildDailyKpi() { renderKpi(loadCalls(), CONFIG.outSheetDaily, (d) => d, '日付'); }
function buildMonthlyKpi() { renderKpi(loadCalls(), CONFIG.outSheetMonthly, (d) => d.slice(0, 7), '年月'); }

function buildAllKpi() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return; // 既に別の更新が走っていればスキップ（保険トリガーが拾う）
  try {
    const ctx = loadCalls();
    const nd = renderKpi(ctx, CONFIG.outSheetDaily, (d) => d, '日付');
    renderKpi(ctx, CONFIG.outSheetMonthly, (d) => d.slice(0, 7), '年月');
    SpreadsheetApp.getActive().toast('集計を更新（' + nd + '日分 / 担当' + (ctx.groups.length - 1) + '名）', 'KPI集計', 4);
  } finally { lock.releaseLock(); }
}

// ---- 編集時に自動更新（架電結果の入力で即反映）----
function onEditUpdate(e) {
  try {
    if (!e || !e.range || e.range.getSheet().getName() !== CONFIG.crmSheet) return;
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

// ---- トリガー設置/解除（1回だけ実行）----
function setupTriggers() {
  removeTriggers();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.newTrigger('onEditUpdate').forSpreadsheet(ss).onEdit().create();      // 入力で即更新
  ScriptApp.newTrigger('buildAllKpi').timeBased().everyHours(1).create();         // 毎時の保険更新
  SpreadsheetApp.getActive().toast('自動更新をONにしました（入力時＋毎時）', 'KPI集計', 5);
}
function removeTriggers() {
  ScriptApp.getProjectTriggers().forEach((t) => {
    if (['onEditUpdate', 'buildAllKpi'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
}
