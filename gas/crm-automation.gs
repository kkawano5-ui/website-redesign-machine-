/**
 * 営業CRM 自動化（みらい編集）— ①KPI集計（月次＋日次） ②アポ→商談CRM自動転記 ③CRMに次回アクション列
 *  ※ これ1本で従来の daily-kpi.gs を置き換えます（Apps Scriptに全文貼り替え）。
 *
 *  ① 集計:  「集計」タブに 上=月次 / 下=日次 を出力。担当は「担当者」タブで管理。
 *          指標=架電数/通電率/通電数/アポ数/設定率（通電率=通電/架電, 設定率=アポ/通電）。
 *          通電=後日掛け直し/資料送付/お断り/アポ獲得/電話アポ/担当不在/本社管理、非通電=留守/廃業。
 *  ② 商談CRM: 架電結果がアポ（アポ獲得/電話アポ、またはアポ日入力）になった行を「商談CRM」タブの
 *            A〜K列（CRM行/会社名/業種/エリア/電話/マップURL/アポ種別/架電担当/アポ日/アポ時間/形式）へ
 *            自動転記。CRM行(#)で重複防止。L列以降（商談ステータス等）は手入力用に触りません。
 *  ③ CRM: 1〜3回目それぞれに「次回アクション日 / 次回アクション時間」列を末尾に追加（重複作成しない）。
 *
 *  使い方:
 *   1) 対象スプレッドシートで「拡張機能 → Apps Script」を開き、全文を貼り付けて保存
 *   2) 関数選択で setupAll を ▶実行（初回のみ権限承認）
 *        → 集計・担当者タブ生成、商談CRM転記、CRMに次回アクション列追加、自動更新トリガー設置 を一括
 *   3) 以後は自動更新（架電入力→数秒で集計更新＆アポは商談CRMへ）。
 *   ※ 上部メニュー「営業CRM」からも各操作を個別実行できます。
 *   ※ 「シート1 / シート2」など他タブには一切触れません。
 */

const CONFIG = {
  crmSheet: 'CRM',
  outSheet: '集計',
  dealSheet: '商談CRM',
  repsSheet: '担当者',
  repsSeed: ['高橋', '河野', '北尾'],

  cols: {
    rowNo: '#',
    rowOwner: '担当',
    name: '店名',
    genre: '業種・種別',
    area: 'エリア',
    tel: '電話',
    mapUrl: 'マップURL',
    apoDate: 'アポ日',
    apoTime: 'アポ時間',
    apoType: 'アポ形式',
    attempts: [
      { rep: '1回目_架電担当', date: '1回目_日付', status: '1回目_ステータス' },
      { rep: '2回目_架電担当', date: '2回目_日付', status: '2回目_ステータス' },
      { rep: '3回目_架電担当', date: '3回目_日付', status: '3回目_ステータス' },
    ],
  },

  // ステータスの言葉（部分一致）。担当不在/本社管理も「通電」に含める。
  connectedKeywords: ['後日掛け直し', '資料送付', 'お断り', 'アポ獲得', '電話アポ', '担当不在', '本社管理'],
  apoKeywords: ['アポ獲得', '電話アポ'],

  // 商談CRM A〜K の見出し（実タブに合わせる）と、CRMのどの値を入れるか
  dealHeaders: ['CRM行', '会社名', '業種', 'エリア', '電話', 'マップURL', 'アポ種別', '架電担当', 'アポ日', 'アポ時間', '形式'],

  // ③ 各回に足す「次回アクション」列（末尾に追加。既存列はずらさない＝数式を壊さない）
  actionCols: ['1回目_次回アクション日', '1回目_次回アクション時間', '2回目_次回アクション日', '2回目_次回アクション時間', '3回目_次回アクション日', '3回目_次回アクション時間'],
};

const METRICS = ['架電数', '通電率', '通電数', 'アポ数', '設定率'];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('営業CRM')
    .addItem('▶ 一括セットアップ（初回）', 'setupAll')
    .addSeparator()
    .addItem('集計を更新（月次＋日次）', 'buildAllKpi')
    .addItem('アポを商談CRMへ転記', 'syncDeals')
    .addItem('CRMに次回アクション列を追加', 'setupCrmActionColumns')
    .addSeparator()
    .addItem('自動更新をON（トリガー設置）', 'setupTriggers')
    .addItem('自動更新をOFF', 'removeTriggers')
    .addToUi();
}

function setupAll() {
  setupCrmActionColumns();
  buildAllKpi();
  syncDeals();
  setupTriggers();
  SpreadsheetApp.getActive().toast('一括セットアップ完了（集計・商談CRM転記・次回アクション列・自動更新）', '営業CRM', 6);
}

// ============ 共通: CRM読み込み ============
function norm(v) { return String(v == null ? '' : v).trim(); }
function hit(s, list) { return list.some((k) => s.indexOf(k) >= 0); }

function loadCrm() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(CONFIG.crmSheet);
  if (!sh) throw new Error('CRMタブが見つかりません: ' + CONFIG.crmSheet);
  const data = sh.getDataRange().getValues();
  const header = data[0].map(String);
  const idx = (name) => header.indexOf(name);
  // タイムゾーン依存の Utilities.formatDate は使わず手動整形（TZエラー回避）
  const p2 = (n) => (n < 10 ? '0' + n : '' + n);
  const fmt = (d) => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  const dateKey = (v) => {
    if (v instanceof Date) return isNaN(v.getTime()) ? '' : fmt(v);
    let s = norm(v);
    if (!s) return '';
    if (/^\d{1,2}\/\d{1,2}$/.test(s)) s = (new Date().getFullYear()) + '/' + s;
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : fmt(d);
  };
  return { ss, sh, data, header, idx, dateKey };
}

// 各行→架電レコード（集計用）＋アポ判定・会社情報（商談CRM用）
function extractRows(crm) {
  const { data, idx, dateKey } = crm;
  const C = CONFIG.cols;
  const iName = idx(C.name), iGenre = idx(C.genre), iArea = idx(C.area), iTel = idx(C.tel),
    iMap = idx(C.mapUrl), iApoD = idx(C.apoDate), iApoT = idx(C.apoTime), iApoType = idx(C.apoType),
    iOwner = idx(C.rowOwner), iNo = idx(C.rowNo);
  const calls = [], repsFound = {}, rows = [];
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    if (iName >= 0 && !norm(row[iName])) continue; // 空行スキップ
    const owner = iOwner >= 0 ? norm(row[iOwner]) : '';
    let apoStatus = '', apoRep = '';
    for (const a of C.attempts) {
      const di = idx(a.date); if (di < 0) continue;
      const dk = dateKey(row[di]); if (!dk) continue;
      const rep = (idx(a.rep) >= 0 && norm(row[idx(a.rep)])) || owner || '不明';
      const status = idx(a.status) >= 0 ? norm(row[idx(a.status)]) : '';
      const isApo = hit(status, CONFIG.apoKeywords);
      calls.push({ dk, rep, isConn: hit(status, CONFIG.connectedKeywords), isApo });
      repsFound[rep] = true;
      if (isApo && !apoStatus) { apoStatus = status; apoRep = rep; }
    }
    const apoDateStr = iApoD >= 0 ? norm(row[iApoD]) : '';
    const isDeal = !!apoStatus || !!apoDateStr; // アポ成立 = アポ系ステータス or アポ日入力
    if (isDeal) {
      rows.push({
        rowNo: iNo >= 0 ? norm(row[iNo]) : String(r + 1),
        name: iName >= 0 ? norm(row[iName]) : '',
        genre: iGenre >= 0 ? norm(row[iGenre]) : '',
        area: iArea >= 0 ? norm(row[iArea]) : '',
        tel: iTel >= 0 ? norm(row[iTel]) : '',
        mapUrl: iMap >= 0 ? norm(row[iMap]) : '',
        apoType: apoStatus || 'アポ',
        rep: apoRep || owner || '',
        apoDate: apoDateStr,
        apoTime: iApoT >= 0 ? norm(row[iApoT]) : '',
        form: iApoType >= 0 ? norm(row[iApoType]) : '',
      });
    }
  }
  return { calls, repsFound, dealRows: rows };
}

// ============ ① 集計（月次＋日次） ============
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

function aggregate(calls, keyFn) {
  const agg = {};
  const cell = (k, g) => { agg[k] = agg[k] || {}; agg[k][g] = agg[k][g] || { call: 0, conn: 0, apo: 0 }; return agg[k][g]; };
  for (const c of calls) {
    const k = keyFn(c.dk); if (!k) continue;
    for (const g of ['全体', c.rep]) { const x = cell(k, g); x.call += 1; if (c.isConn) x.conn += 1; if (c.isApo) x.apo += 1; }
  }
  return agg;
}

function sectionMatrix(agg, groups, keyLabel) {
  const rate = (a, b) => (b ? a / b : 0);
  const lineFor = (label, pick) => {
    const line = [label];
    for (const g of groups) { const c = pick(g) || { call: 0, conn: 0, apo: 0 }; line.push(c.call, rate(c.conn, c.call), c.conn, c.apo, rate(c.apo, c.conn)); }
    return line;
  };
  const h1 = [''], h2 = [keyLabel];
  for (const g of groups) { h1.push(g); for (let i = 1; i < METRICS.length; i++) h1.push(''); for (const m of METRICS) h2.push(m); }
  const rows = [h1, h2];
  const keys = Object.keys(agg).sort();
  for (const k of keys) rows.push(lineFor(k, (g) => agg[k][g]));
  const totals = {};
  for (const k of keys) for (const g of groups) { const s = totals[g] || (totals[g] = { call: 0, conn: 0, apo: 0 }); const c = agg[k][g] || {}; s.call += c.call || 0; s.conn += c.conn || 0; s.apo += c.apo || 0; }
  if (keys.length) rows.push(lineFor('合計', (g) => totals[g]));
  return rows;
}

function buildAllKpi() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return;
  try {
    const crm = loadCrm();
    const { calls, repsFound } = extractRows(crm);
    const groups = ['全体'];
    loadReps(crm.ss).forEach((rp) => { if (rp && groups.indexOf(rp) < 0) groups.push(rp); });
    Object.keys(repsFound).sort().forEach((rp) => { if (groups.indexOf(rp) < 0) groups.push(rp); });

    const mRows = sectionMatrix(aggregate(calls, (d) => d.slice(0, 7)), groups, '年月');
    const dRows = sectionMatrix(aggregate(calls, (d) => d), groups, '日付');
    const nCols = mRows[0].length;
    const blank = new Array(nCols).fill('');
    const titleRow = (t) => { const r = new Array(nCols).fill(''); r[0] = t; return r; };
    const matrix = [];
    matrix.push(titleRow('■ 月次サマリー'));
    const mHead = matrix.length + 1; mRows.forEach((r) => matrix.push(r));
    matrix.push(blank.slice()); matrix.push(titleRow('■ 日次'));
    const dHead = matrix.length + 1; dRows.forEach((r) => matrix.push(r));

    let o = crm.ss.getSheetByName(CONFIG.outSheet);
    if (!o) o = crm.ss.insertSheet(CONFIG.outSheet);
    o.clear(); o.setFrozenRows(0); o.setFrozenColumns(0);
    o.getRange(1, 1, matrix.length, nCols).setValues(matrix);
    [1, dHead - 1].forEach((tr) => o.getRange(tr, 1, 1, nCols).setFontWeight('bold').setBackground('#e8eaed').setHorizontalAlignment('left'));
    formatBlock(o, mHead, groups, nCols, '年月', mRows.length - 2);
    formatBlock(o, dHead, groups, nCols, '日付', dRows.length - 2);
    o.setFrozenColumns(1);
    for (let c = 1; c <= nCols; c++) o.autoResizeColumn(c);
    SpreadsheetApp.getActive().toast('集計更新: 架電' + calls.length + '件 / 担当' + (groups.length - 1) + '名', '営業CRM', 4);
  } finally { lock.releaseLock(); }
}

function formatBlock(o, headRow, groups, nCols, keyLabel, dataRows) {
  o.getRange(headRow, 1, 2, nCols).setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle');
  o.getRange(headRow, 1, 2, 1).merge(); o.getRange(headRow, 1).setValue(keyLabel);
  const palette = ['#1a73e8', '#34a853', '#fbbc04', '#ea4335', '#9334e6', '#00897b', '#e8710a', '#7cb342', '#5c6bc0', '#d81b60'];
  const dataStart = headRow + 2;
  for (let gi = 0; gi < groups.length; gi++) {
    const base = 2 + gi * METRICS.length;
    o.getRange(headRow, base, 1, METRICS.length).merge().setBackground(palette[gi % palette.length]).setFontColor('#ffffff');
    o.getRange(headRow + 1, base, 1, METRICS.length).setBackground('#f1f3f4');
    if (dataRows > 0) [base + 1, base + 4].forEach((col) => o.getRange(dataStart, col, dataRows, 1).setNumberFormat('0.0%'));
  }
  if (dataRows > 0) o.getRange(dataStart + dataRows - 1, 1, 1, nCols).setFontWeight('bold').setBackground('#fff8e1');
  o.getRange(headRow, 1, 2 + Math.max(dataRows, 0), nCols).setBorder(true, true, true, true, true, true, '#dadce0', SpreadsheetApp.BorderStyle.SOLID);
}

// ============ ② アポ → 商談CRM 自動転記（A〜K） ============
function syncDeals() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return;
  try {
    const crm = loadCrm();
    const { dealRows } = extractRows(crm);
    let d = crm.ss.getSheetByName(CONFIG.dealSheet);
    if (!d) { d = crm.ss.insertSheet(CONFIG.dealSheet); d.getRange(1, 1, 1, CONFIG.dealHeaders.length).setValues([CONFIG.dealHeaders]).setFontWeight('bold').setBackground('#d9ead3'); }
    const dHeader = d.getRange(1, 1, 1, Math.max(d.getLastColumn(), CONFIG.dealHeaders.length)).getValues()[0].map(String);
    const dcol = (name) => dHeader.indexOf(name);
    // 既存のCRM行(重複判定キー)
    const keyCol = dcol('CRM行') >= 0 ? dcol('CRM行') : 0;
    const existing = {};
    if (d.getLastRow() > 1) d.getRange(2, keyCol + 1, d.getLastRow() - 1, 1).getValues().forEach((r) => { const k = norm(r[0]); if (k) existing[k] = true; });

    // dealRow の値を商談CRMの見出し順に並べる
    const valOf = (dr, headerName) => ({
      'CRM行': dr.rowNo, '会社名': dr.name, '業種': dr.genre, 'エリア': dr.area, '電話': dr.tel,
      'マップURL': dr.mapUrl, 'アポ種別': dr.apoType, '架電担当': dr.rep, 'アポ日': dr.apoDate,
      'アポ時間': dr.apoTime, '形式': dr.form,
    }[headerName]);
    const toAppend = [];
    for (const dr of dealRows) {
      if (existing[dr.rowNo]) continue; // 重複防止
      const line = dHeader.map((h) => { const v = valOf(dr, h); return v == null ? '' : v; });
      toAppend.push(line); existing[dr.rowNo] = true;
    }
    if (toAppend.length) {
      d.getRange(d.getLastRow() + 1, 1, toAppend.length, dHeader.length).setValues(toAppend);
    }
    SpreadsheetApp.getActive().toast('商談CRM: 新規' + toAppend.length + '件を転記（アポ計' + dealRows.length + '件）', '営業CRM', 4);
  } finally { lock.releaseLock(); }
}

// ============ ③ CRMに「次回アクション日/時間」列を末尾追加（回数ごと） ============
function setupCrmActionColumns() {
  const crm = loadCrm();
  const { sh, header } = crm;
  const missing = CONFIG.actionCols.filter((c) => header.indexOf(c) < 0);
  if (!missing.length) { SpreadsheetApp.getActive().toast('次回アクション列は追加済みです', '営業CRM', 4); return; }
  const start = sh.getLastColumn() + 1;
  sh.getRange(1, start, 1, missing.length).setValues([missing]).setFontWeight('bold').setBackground('#fce5cd');
  sh.setFrozenRows(Math.max(sh.getFrozenRows(), 1));
  SpreadsheetApp.getActive().toast('CRM末尾に次回アクション列を' + missing.length + '個追加しました', '営業CRM', 5);
}

// ============ 自動更新トリガー ============
function onEditUpdate(e) {
  try {
    if (!e || !e.range) return;
    const name = e.range.getSheet().getName();
    if (name === CONFIG.repsSheet) { buildAllKpi(); return; }
    if (name !== CONFIG.crmSheet) return;
    const sh = e.range.getSheet();
    const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    const watch = [];
    for (const a of CONFIG.cols.attempts) [a.date, a.status, a.rep].forEach((n) => { const i = header.indexOf(n); if (i >= 0) watch.push(i + 1); });
    [CONFIG.cols.rowOwner, CONFIG.cols.apoDate, CONFIG.cols.apoTime, CONFIG.cols.apoType].forEach((n) => { const i = header.indexOf(n); if (i >= 0) watch.push(i + 1); });
    const c0 = e.range.getColumn(), c1 = c0 + e.range.getNumColumns() - 1;
    if (!watch.some((w) => w >= c0 && w <= c1)) return;
    buildAllKpi();
    syncDeals();
  } catch (err) { /* 自動更新は静かに失敗 */ }
}

function setupTriggers() {
  removeTriggers();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.newTrigger('onEditUpdate').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('buildAllKpi').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('syncDeals').timeBased().everyHours(1).create();
  SpreadsheetApp.getActive().toast('自動更新ON（入力時＋毎時：集計＆商談CRM転記）', '営業CRM', 5);
}
function removeTriggers() {
  ScriptApp.getProjectTriggers().forEach((t) => { if (['onEditUpdate', 'buildAllKpi', 'syncDeals'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t); });
}
