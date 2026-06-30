/**
 * 営業CRM 架電KPI 日次集計（みらい編集）
 *  CRMタブの 1回目/2回目/3回目 の架電列から、日付 × 担当者 × 全体 のKPIを集計し「集計」タブに出力する。
 *
 * 列名は現行CRM（#〜施策の40列・担当/1〜3回目_架電担当・日付・ステータス/アポ日）に合わせて設定済み。
 * いまCRMは全件「未着手」（架電データが空）なので、実行すると空の集計フォーマットが出来る。
 * 担当者が架電を記録し始めると、その日付・ステータスを自動で拾って日次集計される。
 *
 * 使い方:
 *  1) CRMのスプレッドシートで「拡張機能 → Apps Script」を開く
 *  2) このコードを全部貼り付けて保存
 *  3) 上部の関数選択で buildDailyKpi を選び ▶実行（初回のみ権限承認）→「集計」タブが出来る
 *  4) （任意）左の時計アイコン(トリガー) → buildDailyKpi / 時間主導型 / 日タイマー で毎日自動更新
 *  5) ★運用開始後、ステータスの言葉が決まったら下の CONFIG（connectedKeywords / apoKeywords）を調整
 *  ※ シートを開くと「KPI集計」メニューからも実行できます。
 */

const CONFIG = {
  crmSheet: 'CRM',              // ← 架電データが入るタブ名（実際のタブ名に合わせる）
  outSheet: '集計',             // 出力タブ（無ければ自動作成）
  reps: ['国重', '原', '櫻井'],  // 担当者。「全体」＋この順で列が並ぶ

  // CRMの列見出し（実ヘッダ名に合わせる）
  cols: {
    rowOwner: '担当',           // 行の担当（各回の架電担当が空のときのフォールバック）
    apoDate: 'アポ日',
    attempts: [
      { rep: '1回目_架電担当', date: '1回目_日付', status: '1回目_ステータス' },
      { rep: '2回目_架電担当', date: '2回目_日付', status: '2回目_ステータス' },
      { rep: '3回目_架電担当', date: '3回目_日付', status: '3回目_ステータス' },
    ],
  },

  // ★ステータスの言葉（自社の運用に合わせて編集）。部分一致で判定。
  connectedKeywords: ['通電', 'アポ', '設定', '見込', '前向き', '検討', '再架電'], // これらを含めば「通電」
  apoKeywords: ['アポ', '設定'], // これらを含む or アポ日が入っていれば「アポ(設定)」1件

  // 指標の定義（必要なら式を変更）:
  //   通電率 = 通電数 / 架電数 ／ 設定率 = アポ数 / 通電数 ／ 転換率 = アポ数 / 架電数
};

const METRICS = ['架電数', '通電数', '通電率', 'アポ数', '設定率', '転換率'];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('KPI集計').addItem('日次KPIを更新', 'buildDailyKpi').addToUi();
}

function buildDailyKpi() {
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

  const groups = ['全体'].concat(CONFIG.reps);
  const agg = {}; // agg[date][group] = {call, conn, apo}
  const cell = (d, g) => {
    agg[d] = agg[d] || {};
    agg[d][g] = agg[d][g] || { call: 0, conn: 0, apo: 0 };
    return agg[d][g];
  };

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const owner = idx(CONFIG.cols.rowOwner) >= 0 ? norm(row[idx(CONFIG.cols.rowOwner)]) : '';
    const apoDk = idx(CONFIG.cols.apoDate) >= 0 ? dateKey(row[idx(CONFIG.cols.apoDate)]) : '';
    for (const a of CONFIG.cols.attempts) {
      const di = idx(a.date);
      if (di < 0) continue;
      const dk = dateKey(row[di]);
      if (!dk) continue; // その回は未架電
      const rep = (idx(a.rep) >= 0 && norm(row[idx(a.rep)])) || owner || '不明';
      const status = idx(a.status) >= 0 ? norm(row[idx(a.status)]) : '';
      const isConn = hit(status, CONFIG.connectedKeywords);
      const isApo = hit(status, CONFIG.apoKeywords) || (apoDk && apoDk === dk);
      const targets = CONFIG.reps.indexOf(rep) >= 0 ? ['全体', rep] : ['全体'];
      for (const g of targets) {
        const c = cell(dk, g);
        c.call += 1;
        if (isConn) c.conn += 1;
        if (isApo) c.apo += 1;
      }
    }
  }

  // 出力テーブル（2段ヘッダ）
  const h1 = [''];
  const h2 = ['日付'];
  for (const g of groups) {
    h1.push(g);
    for (let i = 1; i < METRICS.length; i++) h1.push('');
    for (const m of METRICS) h2.push(m);
  }
  const rate = (a, b) => (b ? a / b : 0);
  const lineFor = (label, pick) => {
    const line = [label];
    for (const g of groups) {
      const c = pick(g) || { call: 0, conn: 0, apo: 0 };
      line.push(c.call, c.conn, rate(c.conn, c.call), c.apo, rate(c.apo, c.conn), rate(c.apo, c.call));
    }
    return line;
  };

  const out = [h1, h2];
  const dates = Object.keys(agg).sort();
  for (const d of dates) out.push(lineFor(d, (g) => agg[d][g]));
  // 期間合計（全日の単純合計から率を再計算）
  const totals = {};
  for (const d of dates) for (const g of groups) {
    const s = totals[g] || (totals[g] = { call: 0, conn: 0, apo: 0 });
    const c = agg[d][g] || {};
    s.call += c.call || 0; s.conn += c.conn || 0; s.apo += c.apo || 0;
  }
  if (dates.length) out.push(lineFor('合計', (g) => totals[g]));

  const nRows = out.length;
  const nCols = out[0].length;
  let o = ss.getSheetByName(CONFIG.outSheet);
  if (!o) o = ss.insertSheet(CONFIG.outSheet);
  o.clear();
  o.getRange(1, 1, nRows, nCols).setValues(out);

  // 見た目: グループ見出しの結合・中央寄せ・色、ヘッダ太字
  o.getRange(1, 1, 2, nCols).setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle');
  o.getRange(1, 1, 2, 1).merge(); // 左上「日付」見出しを縦結合
  o.getRange(2, 1).setValue('日付');
  const palette = ['#1a73e8', '#34a853', '#fbbc04', '#ea4335', '#9334e6', '#00897b'];
  for (let gi = 0; gi < groups.length; gi++) {
    const base = 2 + gi * METRICS.length; // 各グループの先頭列(1-indexed)
    o.getRange(1, base, 1, METRICS.length).merge();
    o.getRange(1, base, 1, METRICS.length)
      .setBackground(palette[gi % palette.length]).setFontColor('#ffffff');
    o.getRange(2, base, 1, METRICS.length).setBackground('#f1f3f4');
    // 率列(通電率/設定率/転換率)を%表示に
    if (nRows > 2) [base + 2, base + 4, base + 5].forEach((col) =>
      o.getRange(3, col, nRows - 2, 1).setNumberFormat('0.0%'));
  }
  // 合計行を強調
  if (dates.length) o.getRange(nRows, 1, 1, nCols).setFontWeight('bold').setBackground('#fff8e1');
  o.getRange(1, 1, nRows, nCols).setBorder(true, true, true, true, true, true, '#dadce0', SpreadsheetApp.BorderStyle.SOLID);
  o.setFrozenRows(2);
  o.setFrozenColumns(1);
  for (let c = 1; c <= nCols; c++) o.autoResizeColumn(c);

  SpreadsheetApp.getActive().toast('集計を更新しました（' + dates.length + '日分）', 'KPI集計', 5);
}
