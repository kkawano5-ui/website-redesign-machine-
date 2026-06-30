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
 *   6. ステータスが「アポ獲得」「電話アポ」になった行を、
 *      商談CRMタブへ自動転送（onEditトリガー）。会社情報・アポ日時・形式を
 *      コピーし、商談ステータス/次アクション/商談メモを商談CRM側で管理。
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

// ----------------------------------------------------------------------------
//  メイン: 一度だけ実行する
// ----------------------------------------------------------------------------
function setupCallTracking() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const crm = getSheet_(ss, CONFIG.CRM_SHEET);
  if (!crm) {
    throw new Error('「' + CONFIG.CRM_SHEET + '」タブが見つかりません。タブ名をご確認ください。');
  }

  // 1) メモ列・アポ列を整備（ヘッダー名基準で挿入）
  ensureCrmColumns_(crm);

  // 2) プルダウン（データ入力規則）
  applyCrmValidations_(crm);

  // 3) 条件付き書式（色付け）
  applyCrmConditionalFormat_(crm);

  // 4) 現在ステータスの自動計算
  applyCurrentStatusFormula_(crm);

  // 5) 列幅など軽い体裁
  tidyCrmLayout_(crm);

  // 6) 商談CRMタブの整備（ヘッダー・プルダウン）
  setupDealSheet_(ss);

  // 7) アポ自動転送トリガーのインストール
  installEditTrigger_(ss);

  // 8) 運用ガイドの更新
  refreshGuideSheet_(ss);

  ss.toast('架電シートのセットアップが完了しました。', '✅ 完了', 6);
}

// ----------------------------------------------------------------------------
//  CRM: 列の整備（メモ列・アポ列）
// ----------------------------------------------------------------------------
function ensureCrmColumns_(sheet) {
  // 各回のステータスの直後に「N回目_メモ」を追加
  for (let n = 1; n <= CONFIG.ROUNDS; n++) {
    ensureColumnAfter_(sheet, n + '回目_メモ', n + '回目_ステータス');
  }
  // アポ日 → アポ時間 → アポ形式 の順で整備
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

  // ステータス列（3回分）の範囲
  const statusRanges = [];
  for (let n = 1; n <= CONFIG.ROUNDS; n++) {
    const c = map[n + '回目_ステータス'];
    if (c) statusRanges.push(sheet.getRange(2, c, maxRows - 1, 1));
  }

  const statusColors = {
    'アポ獲得': '#b7e1cd',     // 緑
    '電話アポ': '#b7e1cd',     // 緑
    '後日掛け直し': '#ffe599', // 黄
    '資料送付': '#cfe2f3',     // 青
    'お断り': '#f4cccc',       // 赤
    '留守': '#fff2cc',         // 薄黄
    '廃業': '#d9d9d9',         // グレー
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

  // 現在ステータス列
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

  // アポ行でアポ日/時間/形式が未入力なら警告色
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
        .setBackground('#fce5cd') // アポなのにアポ日未入力
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
//  商談CRM: ヘッダー・プルダウン整備
// ----------------------------------------------------------------------------
const DEAL_HEADERS = [
  'CRM行',        // A 転送元キー（自動・編集しない）
  'place_id',     // B 自動
  '会社名',       // C 自動
  '業種',         // D 自動
  'エリア',       // E 自動
  '電話',         // F 自動
  'マップURL',    // G 自動
  'アポ種別',     // H 自動（アポ獲得/電話アポ）
  '架電担当',     // I 自動（アポを取った担当）
  'アポ日',       // J 自動（CRMから同期）
  'アポ時間',     // K 自動（CRMから同期）
  '形式',         // L 自動（CRMから同期）
  '商談ステータス', // M 手動管理
  '次アクション日', // N 手動管理
  '商談メモ',     // O 手動管理
];
const DEAL_AUTO_COLS = 12; // A..L は自動同期、M以降は手動管理（上書きしない）

function setupDealSheet_(ss) {
  let sheet = getSheet_(ss, CONFIG.DEAL_SHEET);
  if (!sheet) sheet = ss.insertSheet(CONFIG.DEAL_SHEET);

  // 既存の見出し/プレースホルダを掃除してヘッダーを敷き直す（データ行は保持）
  const lastRow = sheet.getLastRow();
  const existingHeader = lastRow >= 1
    ? sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0]
    : [];
  const alreadySetup = existingHeader[0] === 'CRM行';

  if (!alreadySetup) {
    // 旧プレースホルダ（「アポ取得行なし…」など）を消す
    sheet.clearContents();
  }
  sheet.getRange(1, 1, 1, DEAL_HEADERS.length).setValues([DEAL_HEADERS]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, DEAL_HEADERS.length).setFontWeight('bold').setBackground('#d9ead3');

  const map = dealHeaderMap_(sheet);
  const numRows = Math.max(sheet.getMaxRows() - 1, 1);
  setListValidation_(sheet, map['形式'], CONFIG.FORMATS, 2, numRows);
  setListValidation_(sheet, map['商談ステータス'], CONFIG.DEAL_STATUSES, 2, numRows);

  // 自動列はうっすらグレーで「触らない」ことを明示
  sheet.getRange(2, 1, numRows, DEAL_AUTO_COLS).setBackground('#f3f3f3');
}

// ----------------------------------------------------------------------------
//  トリガー: アポ自動転送
// ----------------------------------------------------------------------------
function installEditTrigger_(ss) {
  // 既存の onCrmEdit トリガーを除去（重複防止）
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
    if (row < 2) return; // ヘッダー

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
    let appt = null; // {status, caller}
    for (let n = CONFIG.ROUNDS; n >= 1; n--) {
      const st = get(n + '回目_ステータス');
      if (CONFIG.APPT_STATUSES.indexOf(st) >= 0) {
        appt = { status: st, caller: get(n + '回目_架電担当') };
        break;
      }
    }
    if (!appt) return; // この行はアポ対象でない

    const ss = e.source || SpreadsheetApp.getActiveSpreadsheet();
    upsertDealRow_(ss, row, get, appt);

    // アポ日/時間/形式が未入力なら入力を促す
    if (!get('アポ日') || !get('アポ時間') || !get('アポ形式')) {
      ss.toast('アポ獲得！ アポ日・時間・形式を入力してください（商談CRMにも反映されます）。', '📅 入力をお願いします', 6);
    }
  } catch (err) {
    // トリガー内の例外は握りつぶす（編集を妨げない）
    console.error('onCrmEdit error: ' + err);
  }
}

function upsertDealRow_(ss, crmRow, get, appt) {
  const deal = getSheet_(ss, CONFIG.DEAL_SHEET);
  if (!deal) return;
  const map = dealHeaderMap_(deal);

  const autoValues = {
    'CRM行': crmRow,
    'place_id': get('place_id'),
    '会社名': get('店名'),
    '業種': get('業種・種別'),
    'エリア': get('エリア'),
    '電話': get('電話'),
    'マップURL': get('マップURL'),
    'アポ種別': appt.status,
    '架電担当': appt.caller,
    'アポ日': get('アポ日'),
    'アポ時間': get('アポ時間'),
    '形式': get('アポ形式'),
  };

  // CRM行 をキーに既存行を探す
  const lastRow = deal.getLastRow();
  const keyCol = map['CRM行'];
  let targetRow = -1;
  if (lastRow >= 2) {
    const keys = deal.getRange(2, keyCol, lastRow - 1, 1).getValues();
    for (let i = 0; i < keys.length; i++) {
      if (Number(keys[i][0]) === Number(crmRow)) { targetRow = i + 2; break; }
    }
  }

  if (targetRow === -1) {
    // 新規追加（手動管理列はデフォルトのみ）
    const newRow = lastRow < 1 ? 2 : lastRow + 1;
    Object.keys(autoValues).forEach(function (name) {
      if (map[name]) deal.getRange(newRow, map[name]).setValue(autoValues[name]);
    });
    if (map['商談ステータス']) deal.getRange(newRow, map['商談ステータス']).setValue('訪問予定');
    deal.getRange(newRow, 1, 1, DEAL_AUTO_COLS).setBackground('#f3f3f3');
  } else {
    // 既存行は自動列だけ更新（商談ステータス/次アクション/商談メモは触らない）
    Object.keys(autoValues).forEach(function (name) {
      if (map[name]) deal.getRange(targetRow, map[name]).setValue(autoValues[name]);
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
    ['CRM: ISの架電CRM（架電履歴3セット・各回メモ付き・現在ステータス自動）'],
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
    ['2. 商談ステータス（訪問予定→訪問済→商談中→成約/見送り）を更新'],
    ['3. 次アクション日・商談メモを記入'],
    ['4. 成約時はCRMタブの 商談日/成約日/商品/売上 も入力（現在ステータスが自動更新）'],
    [''],
    ['■ 通電の定義（集計用）'],
    ['通電 = ステータスが「後日掛け直し/資料送付/お断り/アポ獲得/電話アポ」のいずれか'],
    ['（留守・廃業は通電に含めない）'],
    [''],
    ['■ 注意'],
    ['商談CRMの A〜L 列は自動同期（グレー）。M〜O 列（商談ステータス/次アクション/商談メモ）を手入力。'],
    ['一度転送した行は自動削除されません。'],
  ];
  sheet.getRange(1, 1, lines.length, 1).setValues(lines);
  sheet.getRange(1, 1).setFontWeight('bold');
  sheet.setColumnWidth(1, 720);
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

function dealHeaderMap_(sheet) {
  return headerMap_(sheet);
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
