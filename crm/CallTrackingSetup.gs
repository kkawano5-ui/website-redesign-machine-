/**
 * ============================================================================
 *  営業CRM 架電シート セットアップ + 商談CRM 自動転送
 *  対象スプレッドシート: 「50_営業CRM_727件」
 * ============================================================================
 *
 *  このスクリプトがやること（CRMタブを架電用にしっかり作り替える）:
 *   1. 各架電回（1回目/2回目/3回目）に「メモ」列を追加
 *   2. すべての架電列にプルダウン（データ入力規則）を設定
 *        - 架電担当 : 河野 / 高橋 / 北尾
 *        - ステータス: 後日掛け直し / 資料送付 / お断り / アポ獲得 / 電話アポ / 留守 / 廃業
 *   3. アポ用の列「アポ日 / アポ時間 / アポ形式」を整備
 *        - アポ形式 : オンライン / オフライン / 電話（プルダウン）
 *   4. ステータスに応じた色付け（条件付き書式）
 *   5. 「現在ステータス」列を新ステータス語彙に合わせて自動計算
 *   6. 「担当」列（M列）に、最新の架電担当を自動表示（手動上書き可）
 *   7. ステータスが「アポ獲得」「電話アポ」になった行を、
 *      商談CRMタブへ自動転送（onEditトリガー）。会社情報・アポ日時・形式に加え、
 *      サイト区分 / 既存website / 検出メール / うちのデモURL（AF〜AJ）も初期コピーし、
 *      商談CRM上でマネージできるようにする。
 *      ※ 一度転送した行は商談が進んでも残り続けます（自動削除しません）。
 *
 *  使い方:
 *   1. 対象スプレッドシートを開く
 *   2. メニュー「拡張機能」→「Apps Script」
 *   3. このファイルの内容をすべて貼り付けて保存（Ctrl/Cmd+S）
 *   4. 関数選択で「setupCallTracking」を選び ▶ 実行
 *      （初回は Google アカウントの承認ダイアログが出ます → 許可）
 *   5. 完了トーストが出れば構築完了。以降は通常どおり架電入力するだけ。
 *
 *  再実行しても安全（冪等）です。列やプルダウンが既にあれば二重作成しません。
 * ============================================================================
 */

const CONFIG = {
  CRM_SHEET: 'CRM',
  DEAL_SHEET: '商談CRM',
  GUIDE_SHEET: '運用ガイド',
  ROUNDS: 3,

  CALLERS: ['河野', '高橋', '北尾'],

  STATUSES: ['後日掛け直し', '資料送付', 'お断り', 'アポ獲得', '電話アポ', '留守', '廃業'],

  // 商談CRMへ転送するステータス
  APPT_STATUSES: ['アポ獲得', '電話アポ'],

  // 「通電」とみなすステータス（留守・廃業は通電に含めない）
  CONNECTED_STATUSES: ['後日掛け直し', '資料送付', 'お断り', 'アポ獲得', '電話アポ'],

  // アポ形式
  FORMATS: ['オンライン', 'オフライン', '電話'],

  // 商談CRM側の商談ステータス
  DEAL_STATUSES: ['訪問予定', '訪問済', '商談中', '成約', '見送り'],
};

/**
 * 商談CRMタブの列定義。
 *   role:
 *     'auto'    … 転送のたびにCRMの最新値で上書き（グレー＝触らない）
 *     'initial' … 転送時にCRMから初期コピー、以降は商談CRMで編集（薄黄＝編集可）
 *     'managed' … スクリプトは触らない。商談CRMで手入力（白＝編集可）
 *   from: roleが auto/initial のとき、CRM側のヘッダー名（値の取得元）
 *   def : managed列の初期値
 *   validation: プルダウンに使う CONFIG キー
 */
const DEAL_COLUMNS = [
  { name: 'CRM行',          role: 'auto', from: '__ROW__' },
  { name: 'place_id',       role: 'auto', from: 'place_id' },
  { name: '会社名',         role: 'auto', from: '店名' },
  { name: '業種',           role: 'auto', from: '業種・種別' },
  { name: 'エリア',         role: 'auto', from: 'エリア' },
  { name: '電話',           role: 'auto', from: '電話' },
  { name: 'マップURL',      role: 'auto', from: 'マップURL' },
  { name: 'サイト区分',     role: 'initial', from: 'サイト区分' },
  { name: '既存website',    role: 'initial', from: '既存website' },
  { name: '検出メール',     role: 'initial', from: '検出メール' },
  { name: 'うちのデモURL',  role: 'initial', from: 'うちのデモURL' },
  { name: 'アポ種別',       role: 'auto', from: '__STATUS__' },
  { name: '架電担当',       role: 'auto', from: '__CALLER__' },
  { name: 'アポ日',         role: 'auto', from: 'アポ日' },
  { name: 'アポ時間',       role: 'auto', from: 'アポ時間' },
  { name: '形式',           role: 'auto', from: 'アポ形式', validation: 'FORMATS' },
  { name: '商談ステータス', role: 'managed', def: '訪問予定', validation: 'DEAL_STATUSES' },
  { name: '次アクション日', role: 'managed' },
  { name: '商談メモ',       role: 'managed' },
];

// ----------------------------------------------------------------------------
//  メイン: 一度だけ実行する
// ----------------------------------------------------------------------------
function setupCallTracking() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const crm = getSheet_(ss, CONFIG.CRM_SHEET);
  if (!crm) {
    throw new Error('「' + CONFIG.CRM_SHEET + '」タブが見つかりません。タブ名をご確認ください。');
  }

  ensureCrmColumns_(crm);          // 1) メモ列・アポ列を整備
  applyCrmValidations_(crm);       // 2) プルダウン
  applyCrmConditionalFormat_(crm); // 3) 条件付き書式
  applyCurrentStatusFormula_(crm); // 4) 現在ステータス自動計算
  applyOwnerFormula_(crm);         // 5) 担当（M列）に最新架電担当を自動表示
  tidyCrmLayout_(crm);             // 6) 体裁
  setupDealSheet_(ss);             // 7) 商談CRM整備
  installEditTrigger_(ss);         // 8) アポ自動転送トリガー
  refreshGuideSheet_(ss);          // 9) 運用ガイド更新

  ss.toast('架電シートのセットアップが完了しました。', '✅ 完了', 6);
}

// ----------------------------------------------------------------------------
//  CRM: 列の整備（メモ列・アポ列）
// ----------------------------------------------------------------------------
function ensureCrmColumns_(sheet) {
  for (let n = 1; n <= CONFIG.ROUNDS; n++) {
    ensureColumnAfter_(sheet, n + '回目_メモ', n + '回目_ステータス');
  }
  ensureColumnAfter_(sheet, 'アポ時間', 'アポ日');
  ensureColumnAfter_(sheet, 'アポ形式', 'アポ時間');
}

/**
 * headerName が無ければ afterName の直後に列を挿入してヘッダーを設定する。
 * afterName が無い場合は末尾に追加する。返り値は最新のヘッダーマップ。
 */
function ensureColumnAfter_(sheet, headerName, afterName) {
  let map = headerMap_(sheet);
  if (map[headerName]) return map; // 既に存在

  let afterIdx = map[afterName] || sheet.getLastColumn();
  sheet.insertColumnAfter(afterIdx);
  sheet.getRange(1, afterIdx + 1).setValue(headerName);
  return headerMap_(sheet);
}

// ----------------------------------------------------------------------------
//  CRM: プルダウン
// ----------------------------------------------------------------------------
function applyCrmValidations_(sheet) {
  const map = headerMap_(sheet);
  const firstRow = 2;
  const numRows = Math.max(sheet.getMaxRows() - 1, 1);

  for (let n = 1; n <= CONFIG.ROUNDS; n++) {
    setListValidation_(sheet, map[n + '回目_架電担当'], CONFIG.CALLERS, firstRow, numRows);
    setListValidation_(sheet, map[n + '回目_ステータス'], CONFIG.STATUSES, firstRow, numRows);
  }
  setListValidation_(sheet, map['アポ形式'], CONFIG.FORMATS, firstRow, numRows);
}

function setListValidation_(sheet, col, list, firstRow, numRows) {
  if (!col) return;
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(list, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(firstRow, col, numRows, 1).setDataValidation(rule);
}

// ----------------------------------------------------------------------------
//  CRM: 条件付き書式
// ----------------------------------------------------------------------------
function applyCrmConditionalFormat_(sheet) {
  const map = headerMap_(sheet);
  const maxRows = sheet.getMaxRows();

  const statusRanges = [];
  for (let n = 1; n <= CONFIG.ROUNDS; n++) {
    const c = map[n + '回目_ステータス'];
    if (c) statusRanges.push(sheet.getRange(2, c, maxRows - 1, 1));
  }

  const statusColors = {
    'アポ獲得': '#b7e1cd',
    '電話アポ': '#b7e1cd',
    '後日掛け直し': '#ffe599',
    '資料送付': '#cfe2f3',
    'お断り': '#f4cccc',
    '留守': '#fff2cc',
    '廃業': '#d9d9d9',
  };

  const rules = [];
  if (statusRanges.length) {
    CONFIG.STATUSES.forEach(function (s) {
      rules.push(
        SpreadsheetApp.newConditionalFormatRule()
          .whenTextEqualTo(s)
          .setBackground(statusColors[s] || '#ffffff')
          .setRanges(statusRanges)
          .build()
      );
    });
  }

  const cur = map['現在ステータス'];
  if (cur) {
    const curRange = [sheet.getRange(2, cur, maxRows - 1, 1)];
    const curColors = {
      'アポ': '#b7e1cd',
      '商談': '#a4c2f4',
      '成約': '#6aa84f',
      'お断り': '#f4cccc',
      '廃業': '#d9d9d9',
      '未着手': '#f3f3f3',
    };
    Object.keys(curColors).forEach(function (k) {
      rules.push(
        SpreadsheetApp.newConditionalFormatRule()
          .whenTextEqualTo(k)
          .setBackground(curColors[k])
          .setRanges(curRange)
          .build()
      );
    });
  }

  const apoDate = map['アポ日'], apoTime = map['アポ時間'], apoFmt = map['アポ形式'];
  if (cur && apoDate && apoTime && apoFmt) {
    const warnRange = [
      sheet.getRange(2, apoDate, maxRows - 1, 1),
      sheet.getRange(2, apoTime, maxRows - 1, 1),
      sheet.getRange(2, apoFmt, maxRows - 1, 1),
    ];
    const curA1 = colLetter_(cur);
    const apoDateA1 = colLetter_(apoDate);
    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=AND($' + curA1 + '2="アポ",$' + apoDateA1 + '2="")')
        .setBackground('#fce5cd')
        .setRanges(warnRange)
        .build()
    );
  }

  sheet.setConditionalFormatRules(rules);
}

// ----------------------------------------------------------------------------
//  CRM: 現在ステータス 自動計算（行ごとの数式・手動上書き可）
// ----------------------------------------------------------------------------
function applyCurrentStatusFormula_(sheet) {
  const map = headerMap_(sheet);
  const cur = map['現在ステータス'];
  if (!cur) return;

  const s1 = colLetter_(map['1回目_ステータス']);
  const s2 = colLetter_(map['2回目_ステータス']);
  const s3 = colLetter_(map['3回目_ステータス']);
  const dDeal = map['商談日'] ? colLetter_(map['商談日']) : null;
  const dClose = map['成約日'] ? colLetter_(map['成約日']) : null;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const formulas = [];
  for (let r = 2; r <= lastRow; r++) {
    const latest =
      'IF(' + s3 + r + '<>"",' + s3 + r + ',IF(' + s2 + r + '<>"",' + s2 + r + ',' + s1 + r + '))';
    let f = 'LET(s,' + latest + ',' +
      'IF(OR(s="アポ獲得",s="電話アポ"),"アポ",IF(s="","未着手",IF(s="お断り","お断り",IF(s="廃業","廃業",s)))))';
    if (dClose) f = 'IF(' + dClose + r + '<>"","成約",' + f + ')';
    if (dDeal) f = 'IF(' + dDeal + r + '<>"","商談",' + f + ')';
    formulas.push(['=' + f]);
  }
  sheet.getRange(2, cur, formulas.length, 1).setFormulas(formulas);
}

// ----------------------------------------------------------------------------
//  CRM: 担当（M列）= 最新の架電担当を自動表示（手動上書き可）
// ----------------------------------------------------------------------------
function applyOwnerFormula_(sheet) {
  const map = headerMap_(sheet);
  const owner = map['担当'];
  if (!owner) return;

  const c1 = colLetter_(map['1回目_架電担当']);
  const c2 = colLetter_(map['2回目_架電担当']);
  const c3 = colLetter_(map['3回目_架電担当']);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const formulas = [];
  for (let r = 2; r <= lastRow; r++) {
    // 後の回を優先。どこにも担当が無ければ空欄
    formulas.push([
      '=IF(' + c3 + r + '<>"",' + c3 + r +
      ',IF(' + c2 + r + '<>"",' + c2 + r +
      ',IF(' + c1 + r + '<>"",' + c1 + r + ',"")))'
    ]);
  }
  sheet.getRange(2, owner, formulas.length, 1).setFormulas(formulas);
}

// ----------------------------------------------------------------------------
//  CRM: 軽い体裁
// ----------------------------------------------------------------------------
function tidyCrmLayout_(sheet) {
  const map = headerMap_(sheet);
  for (let n = 1; n <= CONFIG.ROUNDS; n++) {
    if (map[n + '回目_メモ']) sheet.setColumnWidth(map[n + '回目_メモ'], 220);
  }
  sheet.setFrozenRows(1);
}

// ----------------------------------------------------------------------------
//  商談CRM: ヘッダー・プルダウン・色分け整備
// ----------------------------------------------------------------------------
function setupDealSheet_(ss) {
  let sheet = getSheet_(ss, CONFIG.DEAL_SHEET);
  if (!sheet) sheet = ss.insertSheet(CONFIG.DEAL_SHEET);

  const headers = DEAL_COLUMNS.map(function (c) { return c.name; });
  const lastRow = sheet.getLastRow();
  const dataRows = Math.max(lastRow - 1, 0);

  // データが無ければ完全リセット（書式・入力規則も含めて敷き直す）
  if (dataRows <= 0) sheet.clear();

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#d9ead3');

  const map = headerMap_(sheet);
  const numRows = Math.max(sheet.getMaxRows() - 1, 1);

  const lists = { FORMATS: CONFIG.FORMATS, DEAL_STATUSES: CONFIG.DEAL_STATUSES };
  DEAL_COLUMNS.forEach(function (col) {
    if (col.validation && map[col.name]) {
      setListValidation_(sheet, map[col.name], lists[col.validation], 2, numRows);
    }
  });

  // 役割に応じた色分け
  paintDealRoles_(sheet, 2, numRows, map);
}

function paintDealRoles_(sheet, startRow, numRows, map) {
  DEAL_COLUMNS.forEach(function (col) {
    const c = map[col.name];
    if (!c) return;
    let bg = null;
    if (col.role === 'auto') bg = '#f3f3f3';        // 自動同期＝触らない
    else if (col.role === 'initial') bg = '#fff2cc'; // 初期コピー＝編集可
    if (bg) sheet.getRange(startRow, c, numRows, 1).setBackground(bg);
  });
}

// ----------------------------------------------------------------------------
//  トリガー: アポ自動転送
// ----------------------------------------------------------------------------
function installEditTrigger_(ss) {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'onCrmEdit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onCrmEdit').forSpreadsheet(ss).onEdit().create();
}

/**
 * CRMタブが編集されるたびに呼ばれる。
 * 対象行が「アポ獲得/電話アポ」を含む場合、商談CRMへ upsert する。
 */
function onCrmEdit(e) {
  try {
    if (!e || !e.range) return;
    const sheet = e.range.getSheet();
    if (sheet.getName() !== CONFIG.CRM_SHEET) return;

    const row = e.range.getRow();
    if (row < 2) return;

    const map = headerMap_(sheet);
    const editedCol = e.range.getColumn();

    // 関連列の編集だけ反応（ステータス/架電担当/アポ日/アポ時間/アポ形式）
    const watched = {};
    for (let n = 1; n <= CONFIG.ROUNDS; n++) {
      watched[map[n + '回目_ステータス']] = true;
      watched[map[n + '回目_架電担当']] = true;
    }
    watched[map['アポ日']] = true;
    watched[map['アポ時間']] = true;
    watched[map['アポ形式']] = true;
    if (!watched[editedCol]) return;

    const rowVals = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    const get = function (name) {
      const c = map[name];
      return c ? rowVals[c - 1] : '';
    };

    // アポを取った回（後の回を優先）を特定
    let appt = null;
    for (let n = CONFIG.ROUNDS; n >= 1; n--) {
      const st = get(n + '回目_ステータス');
      if (CONFIG.APPT_STATUSES.indexOf(st) >= 0) {
        appt = { status: st, caller: get(n + '回目_架電担当') };
        break;
      }
    }
    if (!appt) return;

    const ss = e.source || SpreadsheetApp.getActiveSpreadsheet();
    upsertDealRow_(ss, row, get, appt);

    if (!get('アポ日') || !get('アポ時間') || !get('アポ形式')) {
      ss.toast('アポ獲得！ アポ日・時間・形式を入力してください（商談CRMにも反映されます）。', '📅 入力をお願いします', 6);
    }
  } catch (err) {
    console.error('onCrmEdit error: ' + err);
  }
}

/** DEAL_COLUMNS の from 定義に従って、CRM側の値を解決する */
function dealValueFor_(col, crmRow, get, appt) {
  switch (col.from) {
    case '__ROW__': return crmRow;
    case '__STATUS__': return appt.status;
    case '__CALLER__': return appt.caller;
    default: return col.from ? get(col.from) : '';
  }
}

function upsertDealRow_(ss, crmRow, get, appt) {
  const deal = getSheet_(ss, CONFIG.DEAL_SHEET);
  if (!deal) return;
  const map = headerMap_(deal);
  const keyCol = map['CRM行'];
  if (!keyCol) return;

  // CRM行 をキーに既存行を探す
  const lastRow = deal.getLastRow();
  let targetRow = -1;
  if (lastRow >= 2) {
    const keys = deal.getRange(2, keyCol, lastRow - 1, 1).getValues();
    for (let i = 0; i < keys.length; i++) {
      if (Number(keys[i][0]) === Number(crmRow)) { targetRow = i + 2; break; }
    }
  }

  if (targetRow === -1) {
    // 新規追加: auto/initial はCRMから、managed は初期値のみ
    const newRow = lastRow < 1 ? 2 : lastRow + 1;
    DEAL_COLUMNS.forEach(function (col) {
      const c = map[col.name];
      if (!c) return;
      if (col.role === 'auto' || col.role === 'initial') {
        deal.getRange(newRow, c).setValue(dealValueFor_(col, crmRow, get, appt));
      } else if (col.def) {
        deal.getRange(newRow, c).setValue(col.def);
      }
    });
    paintDealRoles_(deal, newRow, 1, map);
  } else {
    // 既存行: auto 列だけ最新化（initial / managed は商談CRMの編集を尊重）
    DEAL_COLUMNS.forEach(function (col) {
      if (col.role !== 'auto') return;
      const c = map[col.name];
      if (c) deal.getRange(targetRow, c).setValue(dealValueFor_(col, crmRow, get, appt));
    });
  }
}

// ----------------------------------------------------------------------------
//  運用ガイド更新
// ----------------------------------------------------------------------------
function refreshGuideSheet_(ss) {
  let sheet = getSheet_(ss, CONFIG.GUIDE_SHEET);
  if (!sheet) sheet = ss.insertSheet(CONFIG.GUIDE_SHEET);
  sheet.clearContents();

  const lines = [
    ['■ シート構成（4タブ）'],
    ['CRM: ISの架電CRM（架電履歴3セット・各回メモ付き・現在ステータス/担当 自動）'],
    ['商談CRM: アポ獲得/電話アポを取った行を自動転送。FSが商談を管理'],
    ['集計: 月次/日次/担当者別/エリア別/業種別'],
    ['運用ガイド: このページ'],
    [''],
    ['■ 架電列（各回 5列）'],
    ['N回目_架電担当（河野/高橋/北尾） / N回目_日付 / N回目_時間 / N回目_ステータス / N回目_メモ'],
    [''],
    ['■ ステータス（プルダウン）'],
    ['後日掛け直し / 資料送付 / お断り / アポ獲得 / 電話アポ / 留守 / 廃業'],
    [''],
    ['■ 担当（M列・自動）'],
    ['最新の架電回（3回目→2回目→1回目）で入っている架電担当を自動表示。手動上書き可。'],
    [''],
    ['■ 現在ステータス（自動・手動上書き可）'],
    ['アポ獲得 or 電話アポ → 「アポ」。商談日入力 → 「商談」。成約日入力 → 「成約」。'],
    ['お断り/廃業/留守 等は最新回の結果を表示。未架電は「未着手」。'],
    [''],
    ['■ ISの動き（架電）'],
    ['1. 該当行の N回目_架電担当（プルダウン）'],
    ['2. N回目_日付・時間を入力'],
    ['3. N回目_ステータス（プルダウン）。必要に応じて N回目_メモ'],
    ['4. アポ獲得/電話アポ → アポ日・アポ時間・アポ形式（オンライン/オフライン/電話）を入力'],
    ['5. 自動で商談CRMタブへ転送される'],
    [''],
    ['■ FSの動き（商談・商談CRMタブ）'],
    ['1. 商談CRMで当日のアポを確認（会社名・業種・エリア・電話・マップURL）'],
    ['2. サイト区分/既存website/検出メール/うちのデモURL を確認・更新（商談準備）'],
    ['3. 商談ステータス（訪問予定→訪問済→商談中→成約/見送り）を更新'],
    ['4. 次アクション日・商談メモを記入'],
    ['5. 成約時はCRMタブの 商談日/成約日/商品/売上 も入力（現在ステータスが自動更新）'],
    [''],
    ['■ 商談CRMの列の色（役割）'],
    ['グレー = 自動同期（CRMの最新値で上書き・触らない）'],
    ['薄黄 = 初期コピー（転送時にCRMから取得、以降は商談CRMで編集）: サイト区分/既存website/検出メール/うちのデモURL'],
    ['白 = 商談管理（手入力）: 商談ステータス/次アクション日/商談メモ'],
    [''],
    ['■ 通電の定義（集計用）'],
    ['通電 = ステータスが「後日掛け直し/資料送付/お断り/アポ獲得/電話アポ」のいずれか'],
    ['（留守・廃業は通電に含めない）'],
    [''],
    ['■ 注意'],
    ['一度転送した行は自動削除されません。'],
  ];
  sheet.getRange(1, 1, lines.length, 1).setValues(lines);
  sheet.getRange(1, 1).setFontWeight('bold');
  sheet.setColumnWidth(1, 760);
}

// ----------------------------------------------------------------------------
//  集計タブの監査（旧ステータス語彙の参照を検出してログ出力）
//  ※ 数式の自動書き換えは行いません。検出結果をもとに手当てしてください。
// ----------------------------------------------------------------------------
function auditSummaryFormulas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getSheet_(ss, '集計');
  if (!sheet) { console.log('集計タブが見つかりません'); return; }

  const oldTokens = ['通電', '不在', '再架電', '訪問', '"アポ"'];
  const rng = sheet.getDataRange();
  const formulas = rng.getFormulas();
  const hits = [];
  for (let r = 0; r < formulas.length; r++) {
    for (let c = 0; c < formulas[r].length; c++) {
      const f = formulas[r][c];
      if (!f) continue;
      if (oldTokens.some(function (t) { return f.indexOf(t) >= 0; })) {
        hits.push(colLetter_(c + 1) + (r + 1) + ' : ' + f);
      }
    }
  }
  if (hits.length === 0) {
    console.log('旧ステータス語彙を参照する数式は見つかりませんでした。');
  } else {
    console.log('▼ 見直し候補（旧語彙参照の数式）:\n' + hits.join('\n'));
  }
}

// ----------------------------------------------------------------------------
//  ユーティリティ
// ----------------------------------------------------------------------------
function getSheet_(ss, name) {
  return ss.getSheetByName(name);
}

function headerMap_(sheet) {
  const lastCol = sheet.getLastColumn();
  const header = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const map = {};
  for (let i = 0; i < header.length; i++) {
    const key = String(header[i]).trim();
    if (key) map[key] = i + 1; // 1-based
  }
  return map;
}

function colLetter_(col) {
  let s = '';
  let c = col;
  while (c > 0) {
    const m = (c - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    c = Math.floor((c - 1) / 26);
  }
  return s;
}
