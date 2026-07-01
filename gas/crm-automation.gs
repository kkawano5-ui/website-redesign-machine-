/**
 * 営業CRM 自動化（みらい編集）— ①KPI集計 ②アポ→商談CRM転記 ③CRM整形（次回アクション列/メモ削除/ステータスDD）
 *  ※ これ1本で運用。Apps Scriptに全文貼り替え → setupAll を実行。
 *
 *  ① 集計:  「集計」タブに 上=月次 / 下=日次。担当は「担当者」タブで管理。列幅は固定75pxで見やすく。
 *          通電=後日掛け直し/資料送付/お断り/アポ獲得/電話アポ/担当不在/本社管理、非通電=留守/廃業。
 *  ② 商談CRM: アポ（アポ獲得/電話アポ or アポ日入力）の行を「商談CRM」A〜K列へ自動転記（CRM行で重複防止=
 *            既存はA〜K上書き・L列以降の手入力は保持）。架電担当DDは「担当者」参照。日付/時刻は整形して転記。
 *  ③ CRM整形: 「メモ」列を削除／1〜3回目それぞれの_メモの右に「次回アクション日・時間」を挿入／
 *            現在ステータス・各回ステータスのプルダウンを最新の選択肢に更新。
 *
 *  使い方: 拡張機能→Apps Scriptに全文貼付→ setupAll を▶実行（初回権限承認）。以後は自動更新。
 *          上部メニュー「営業CRM」から個別実行も可。シート1/シート2には触れません。
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
    name: ['店名', '会社名', '店舗名'],
    genre: ['業種・種別', '業種/種別', '業種', '種別'],
    area: ['エリア', 'エリア格'],
    tel: ['電話', 'TEL', '電話番号'],
    mapUrl: ['マップURL', 'マップ', 'GoogleマップURL'],
    apoDate: 'アポ日',
    apoTime: 'アポ時間',
    apoType: 'アポ形式',
    attempts: [
      { rep: '1回目_架電担当', date: '1回目_日付', status: '1回目_ステータス' },
      { rep: '2回目_架電担当', date: '2回目_日付', status: '2回目_ステータス' },
      { rep: '3回目_架電担当', date: '3回目_日付', status: '3回目_ステータス' },
    ],
  },

  connectedKeywords: ['後日掛け直し', '資料送付', 'お断り', 'アポ獲得', '電話アポ', '担当不在', '本社管理'],
  apoKeywords: ['アポ獲得', '電話アポ'],

  // ③-a ステータスのプルダウン選択肢（運用に合わせて編集可）
  statusCols: ['現在ステータス', '1回目_ステータス', '2回目_ステータス', '3回目_ステータス'],
  statusOptions: ['未着手', '不通', '留守', '担当不在・本社管理', 'お断り', '後日掛け直し', '資料送付', 'アポ獲得', '電話アポ', '廃業'],

  // ③-b 削除するメモ列（完全一致。1回目_メモ等は消さない）
  memoCol: 'メモ',

  // ③-c 各回の _メモ の右に挿入する「次回アクション」列
  roundActions: [
    { after: '1回目_メモ', cols: ['1回目_次回アクション日', '1回目_次回アクション時間'] },
    { after: '2回目_メモ', cols: ['2回目_次回アクション日', '2回目_次回アクション時間'] },
    { after: '3回目_メモ', cols: ['3回目_次回アクション日', '3回目_次回アクション時間'] },
  ],

  // ② 商談CRM A〜K の見出し（実タブに合わせる）
  dealHeaders: ['CRM行', '会社名', '業種', 'エリア', '電話', 'マップURL', 'アポ種別', '架電担当', 'アポ日', 'アポ時間', '形式'],
};

const METRICS = ['架電数', '通電率', '通電数', 'アポ数', '設定率'];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('営業CRM')
    .addItem('▶ 一括セットアップ（初回）', 'setupAll')
    .addSeparator()
    .addItem('集計を更新（月次＋日次）', 'buildAllKpi')
    .addItem('アポを商談CRMへ転記', 'syncDeals')
    .addSeparator()
    .addItem('CRM: 次回アクション列を配置', 'setupCrmActionColumns')
    .addItem('CRM: メモ列を削除', 'removeMemoColumn')
    .addItem('CRM: ステータスDDを更新', 'setupStatusDropdown')
    .addSeparator()
    .addItem('自動更新をON（トリガー設置）', 'setupTriggers')
    .addItem('自動更新をOFF', 'removeTriggers')
    .addToUi();
}

function setupAll() {
  removeMemoColumn();
  setupCrmActionColumns();
  setupStatusDropdown();
  buildAllKpi();
  syncDeals();
  setupTriggers();
  toast('一括セットアップ完了（メモ削除/次回アクション/DD更新/集計/商談CRM/自動更新）');
}

// ============ 共通 ============
function norm(v) { return String(v == null ? '' : v).trim(); }
function hit(s, list) { return list.some((k) => s.indexOf(k) >= 0); }
function toast(m) { SpreadsheetApp.getActive().toast(m, '営業CRM', 6); }
function p2(n) { return n < 10 ? '0' + n : '' + n; }

// ヘッダ配列から別名候補で列番号(0基)を返す
function idxOf(header, name) {
  const names = Array.isArray(name) ? name : [name];
  for (const n of names) { const i = header.indexOf(n); if (i >= 0) return i; }
  return -1;
}

function loadCrm() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(CONFIG.crmSheet);
  if (!sh) throw new Error('CRMタブが見つかりません: ' + CONFIG.crmSheet);
  const data = sh.getDataRange().getValues();
  const header = data[0].map(String);
  const idx = (name) => idxOf(header, name);
  const fmtDate = (v) => { if (v instanceof Date && !isNaN(v.getTime())) return v.getFullYear() + '/' + p2(v.getMonth() + 1) + '/' + p2(v.getDate()); return norm(v); };
  const fmtTime = (v) => { if (v instanceof Date && !isNaN(v.getTime())) return v.getHours() + ':' + p2(v.getMinutes()); return norm(v); };
  const dateKey = (v) => {
    if (v instanceof Date) return isNaN(v.getTime()) ? '' : (v.getFullYear() + '-' + p2(v.getMonth() + 1) + '-' + p2(v.getDate()));
    let s = norm(v); if (!s) return '';
    if (/^\d{1,2}\/\d{1,2}$/.test(s)) s = (new Date().getFullYear()) + '/' + s;
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : (d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()));
  };
  return { ss, sh, data, header, idx, dateKey, fmtDate, fmtTime };
}

function extractRows(crm) {
  const { data, idx, dateKey, fmtDate, fmtTime } = crm;
  const C = CONFIG.cols;
  const iName = idx(C.name), iGenre = idx(C.genre), iArea = idx(C.area), iTel = idx(C.tel),
    iMap = idx(C.mapUrl), iApoD = idx(C.apoDate), iApoT = idx(C.apoTime), iApoType = idx(C.apoType),
    iOwner = idx(C.rowOwner), iNo = idx(C.rowNo);
  const calls = [], repsFound = {}, dealRows = [];
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    if (iName >= 0 && !norm(row[iName])) continue;
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
    const apoDate = iApoD >= 0 ? fmtDate(row[iApoD]) : '';
    if (apoStatus || apoDate) {
      dealRows.push({
        'CRM行': iNo >= 0 ? norm(row[iNo]) : String(r + 1),
        '会社名': iName >= 0 ? norm(row[iName]) : '',
        '業種': iGenre >= 0 ? norm(row[iGenre]) : '',
        'エリア': iArea >= 0 ? norm(row[iArea]) : '',
        '電話': iTel >= 0 ? norm(row[iTel]) : '',
        'マップURL': iMap >= 0 ? norm(row[iMap]) : '',
        'アポ種別': apoStatus || 'アポ',
        '架電担当': apoRep || owner || '',
        'アポ日': apoDate,
        'アポ時間': iApoT >= 0 ? fmtTime(row[iApoT]) : '',
        '形式': iApoType >= 0 ? norm(row[iApoType]) : '',
      });
    }
  }
  return { calls, repsFound, dealRows };
}

// ============ ① 集計 ============
function loadReps(ss) {
  let sh = ss.getSheetByName(CONFIG.repsSheet);
  if (!sh) {
    sh = ss.insertSheet(CONFIG.repsSheet);
    sh.getRange(1, 1).setValue('架電担当（この順で集計の列が並びます／1名1行・ここに足すと集計に反映）').setFontWeight('bold').setBackground('#e8eaed');
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
  for (const c of calls) { const k = keyFn(c.dk); if (!k) continue; for (const g of ['全体', c.rep]) { const x = cell(k, g); x.call += 1; if (c.isConn) x.conn += 1; if (c.isApo) x.apo += 1; } }
  return agg;
}

function sectionMatrix(agg, groups, keyLabel) {
  const rate = (a, b) => (b ? a / b : 0);
  const lineFor = (label, pick) => { const line = [label]; for (const g of groups) { const c = pick(g) || { call: 0, conn: 0, apo: 0 }; line.push(c.call, rate(c.conn, c.call), c.conn, c.apo, rate(c.apo, c.conn)); } return line; };
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
    o.setColumnWidth(1, 92);                              // 日付/年月列
    if (nCols > 1) o.setColumnWidths(2, nCols - 1, 75);   // 指標列は固定75pxで視認性UP
    toast('集計更新: 架電' + calls.length + '件 / 担当' + (groups.length - 1) + '名');
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

// ============ ② アポ → 商談CRM（A〜K, upsert） ============
function syncDeals() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return;
  try {
    const crm = loadCrm();
    const { dealRows } = extractRows(crm);
    let d = crm.ss.getSheetByName(CONFIG.dealSheet);
    if (!d) { d = crm.ss.insertSheet(CONFIG.dealSheet); d.getRange(1, 1, 1, CONFIG.dealHeaders.length).setValues([CONFIG.dealHeaders]).setFontWeight('bold').setBackground('#d9ead3'); }
    const akLen = CONFIG.dealHeaders.length;
    const dHeader = d.getRange(1, 1, 1, Math.max(d.getLastColumn(), akLen)).getValues()[0].map(String);
    const keyCol = dHeader.indexOf('CRM行') >= 0 ? dHeader.indexOf('CRM行') : 0;

    // 既存 CRM行 → 行番号
    const rowByKey = {};
    if (d.getLastRow() > 1) d.getRange(2, keyCol + 1, d.getLastRow() - 1, 1).getValues().forEach((r, i) => { const k = norm(r[0]); if (k) rowByKey[k] = i + 2; });

    const akValues = (dr) => { const out = []; for (let c = 0; c < akLen; c++) { const v = dr[dHeader[c]]; out.push(v == null ? '' : v); } return out; };
    let updated = 0, appended = 0, nextRow = d.getLastRow() + 1;
    for (const dr of dealRows) {
      const key = dr['CRM行'];
      if (rowByKey[key]) { d.getRange(rowByKey[key], 1, 1, akLen).setValues([akValues(dr)]); updated++; }
      else { d.getRange(nextRow, 1, 1, akLen).setValues([akValues(dr)]); rowByKey[key] = nextRow; nextRow++; appended++; }
    }

    // 架電担当(H)のプルダウンを「担当者」参照に張り替え
    const hCol = dHeader.indexOf('架電担当');
    const repsSh = crm.ss.getSheetByName(CONFIG.repsSheet);
    if (hCol >= 0 && repsSh && repsSh.getLastRow() >= 2) {
      const rule = SpreadsheetApp.newDataValidation().requireValueInRange(repsSh.getRange(2, 1, repsSh.getLastRow() - 1, 1), true).setAllowInvalid(true).build();
      const rows = Math.max(d.getLastRow() - 1, 1);
      d.getRange(2, hCol + 1, rows, 1).setDataValidation(rule);
    }
    toast('商談CRM: 更新' + updated + ' / 新規' + appended + '（アポ計' + dealRows.length + '件）');
  } finally { lock.releaseLock(); }
}

// ============ ③-a メモ列削除 ============
function removeMemoColumn() {
  const crm = loadCrm();
  const ci = crm.header.indexOf(CONFIG.memoCol); // 完全一致（〇回目_メモは対象外）
  if (ci < 0) { toast('メモ列は既に削除済みです'); return; }
  crm.sh.deleteColumn(ci + 1);
  toast('CRMの「メモ」列を削除しました');
}

// ============ ③-c 次回アクション列を各回の_メモの右へ ============
function setupCrmActionColumns() {
  const crm = loadCrm();
  const sh = crm.sh;
  let header = crm.header;
  const placed = CONFIG.roundActions.every((ra) => { const ai = header.indexOf(ra.after), ci = header.indexOf(ra.cols[0]); return ai >= 0 && ci === ai + 1; });
  if (placed) { toast('次回アクション列は各回の右に配置済みです'); return; }
  // 既存のアクション列（末尾など）を右から削除
  const all = CONFIG.roundActions.reduce((a, ra) => a.concat(ra.cols), []);
  all.map((n) => header.indexOf(n)).filter((i) => i >= 0).sort((a, b) => b - a).forEach((ci) => sh.deleteColumn(ci + 1));
  header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  // 各回_メモの右へ挿入（右のアンカーから：以降のインデックスがずれないように）
  CONFIG.roundActions.map((ra) => ({ ra, idx: header.indexOf(ra.after) })).filter((x) => x.idx >= 0).sort((a, b) => b.idx - a.idx)
    .forEach(({ ra, idx }) => { sh.insertColumnsAfter(idx + 1, ra.cols.length); sh.getRange(1, idx + 2, 1, ra.cols.length).setValues([ra.cols]).setFontWeight('bold').setBackground('#fce5cd'); });
  toast('次回アクション列を各回の_メモの右に配置しました');
}

// ============ ③-a ステータスDD更新 ============
function setupStatusDropdown() {
  const crm = loadCrm();
  const sh = crm.sh, header = crm.header, last = sh.getLastRow();
  if (last < 2) { toast('CRMにデータ行がありません'); return; }
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(CONFIG.statusOptions, true).setAllowInvalid(true).build();
  let n = 0;
  for (const name of CONFIG.statusCols) { const ci = header.indexOf(name); if (ci < 0) continue; sh.getRange(2, ci + 1, last - 1, 1).setDataValidation(rule); n++; }
  toast('ステータスDD更新: ' + n + '列 / ' + CONFIG.statusOptions.length + '択');
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
    [CONFIG.cols.rowOwner, CONFIG.cols.apoDate, CONFIG.cols.apoTime, CONFIG.cols.apoType].forEach((nm) => { const i = idxOf(header, nm); if (i >= 0) watch.push(i + 1); });
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
  toast('自動更新ON（入力時＋毎時：集計＆商談CRM転記）');
}
function removeTriggers() {
  ScriptApp.getProjectTriggers().forEach((t) => { if (['onEditUpdate', 'buildAllKpi', 'syncDeals'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t); });
}
