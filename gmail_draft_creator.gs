/**
 * Gmail下書き一括作成スクリプト v3
 * チラシ添付（Google Drive）+ 日程調整URL自動挿入 + HTML太字版
 *
 * 【変更点】
 * - Driveフォルダのチラシファイルを各下書きに添付
 * - 本文の「候補日をいくつかいただけますと幸いです」をSpir URLに置換
 * - 重要フレーズを <strong> タグで太字化（最大7箇所）
 * - HTMLメール形式で下書き作成（plainBodyも同時にセット）
 * - メールは送信しない（下書き作成のみ）
 */

// ============================================================
// ▼ 設定（ここだけ変更すれば動く）
// ============================================================

// チラシが入っているGoogle DriveフォルダのID
const FLYER_FOLDER_ID = '1hWliC-FizJHyCpW_wtZ8QJOp25caVZPr';

// 日程調整URL（Spir）
const SCHEDULE_URL = 'https://app.spirinc.com/t/lH7s5QtOzh9e4QKm6Z5_q/as/GbO-VlrFmSDEq2AnmZhTl/confirm';

// 本文の置換（候補日テキスト → 日程調整URL）
const SCHEDULE_OLD = 'ご関心をお持ちいただけましたら、候補日をいくつかいただけますと幸いです。';
const SCHEDULE_NEW = 'ご関心をお持ちいただけましたら、以下よりご都合の良い日時をお選びください。\n' + SCHEDULE_URL;

// 太字にするフレーズ（長い順に並べて、部分一致による二重太字を防ぐ）
const BOLD_PHRASES = [
  '生成AI・ChatGPTの正しい活用を全国の中小企業へ広げる',
  '九州工業大学 鈴木章央先生監修',
  '共催による無料セミナー開催',
  '新富町商工会議所での開催実績',
  '新富町商工会議所様にて実施',
  '30分ほどオンラインでご相談',
  '無料のAI活用セミナー',
  '無料AI活用セミナー',
  '鈴木章央先生監修',
  '共催のご相談',
  '16,000名以上の会員',
  '候補日をいくつかいただけますと幸いです',
];

const MAX_BOLD = 7;

// ============================================================
// カスタムメニュー（スプレッドシートを開くと自動追加）
// ============================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📧 Gmail下書き作成')
    .addItem('【テスト】優先度A・上位20件のみ', 'createDraftsTest')
    .addSeparator()
    .addItem('【全件】メール対象をすべて作成', 'createDraftsAll')
    .addToUi();
}

// ============================================================
// チラシBlobをフォルダから取得
// ============================================================
function getFlyerBlob_() {
  try {
    const folder = DriveApp.getFolderById(FLYER_FOLDER_ID);
    const files  = folder.getFiles();
    if (!files.hasNext()) {
      Logger.log('チラシフォルダが空です（フォルダID: ' + FLYER_FOLDER_ID + '）');
      return null;
    }
    const file = files.next();
    Logger.log('添付ファイル: ' + file.getName() + ' (' + file.getMimeType() + ')');
    return file.getBlob();
  } catch (e) {
    Logger.log('チラシ取得エラー: ' + e.message);
    return null;
  }
}

// ============================================================
// HTML変換（エスケープ → 太字 → 改行）
// ============================================================

/**
 * 既存の <strong> ブロックを避けながら phrase を1箇所だけ太字化する。
 * 戻り値: { html: string, applied: boolean }
 */
function applyBoldOnce_(html, phrase) {
  var result   = '';
  var remaining = html;
  var applied  = false;

  while (remaining.length > 0) {
    var sStart = remaining.indexOf('<strong>');
    if (sStart === -1) {
      // 残りに <strong> タグなし → ここで置換試行
      if (!applied && remaining.indexOf(phrase) !== -1) {
        result  += remaining.replace(phrase, '<strong>' + phrase + '</strong>');
        applied  = true;
      } else {
        result += remaining;
      }
      remaining = '';
      break;
    }

    // <strong> より前のテキストで置換試行
    var before = remaining.substring(0, sStart);
    if (!applied && before.indexOf(phrase) !== -1) {
      result  += before.replace(phrase, '<strong>' + phrase + '</strong>');
      applied  = true;
    } else {
      result += before;
    }

    // <strong>...</strong> ブロックをそのまま通す
    var sEnd = remaining.indexOf('</strong>', sStart);
    if (sEnd === -1) {
      result   += remaining.substring(sStart);
      remaining = '';
      break;
    }
    var blockEnd = sEnd + '</strong>'.length;
    result   += remaining.substring(sStart, blockEnd);
    remaining = remaining.substring(blockEnd);
  }

  return { html: result, applied: applied };
}

/**
 * プレーンテキストをHTML本文に変換する。
 *  1. HTML特殊文字をエスケープ
 *  2. BOLD_PHRASES を最大 MAX_BOLD 箇所 <strong> で太字化
 *  3. 改行を <br> に変換
 */
function convertToHtml_(text) {
  // 1. HTML エスケープ
  var html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 2. 太字化（最大 MAX_BOLD 箇所）
  var boldCount = 0;
  for (var i = 0; i < BOLD_PHRASES.length; i++) {
    if (boldCount >= MAX_BOLD) break;
    var res = applyBoldOnce_(html, BOLD_PHRASES[i]);
    if (res.applied) {
      html = res.html;
      boldCount++;
    }
  }

  // 3. 改行 → <br>
  return html.replace(/\n/g, '<br>\n');
}

// ============================================================
// ヘッダー名 → 列インデックス（0始まり）マップ
// ============================================================
function getColumnMap_(headerRow) {
  const map = {};
  headerRow.forEach(function(name, i) {
    const trimmed = name.toString().trim();
    if (trimmed) map[trimmed] = i;
  });
  return map;
}

// ============================================================
// 必須列の存在チェック
// ============================================================
function checkRequiredColumns_(col) {
  const required = [
    'メールアドレス', '送信方法', '送信ステータス',
    '件名', '送信用本文', '営業優先度',
  ];
  return required.filter(function(c) { return col[c] === undefined; });
}

// ============================================================
// テスト実行: 優先度A・上位20件
// ============================================================
function createDraftsTest() {
  const ui = SpreadsheetApp.getUi();
  const answer = ui.alert(
    '【テスト実行】確認',
    '以下の条件でGmail下書きを作成します。\n\n' +
    '  ・対象: 送信方法「メール」かつ営業優先度「A」の上位20件\n' +
    '  ・チラシ（Driveのファイル）を添付\n' +
    '  ・日程調整URLを本文に追加（Spir）\n' +
    '  ・重要フレーズを太字化（HTMLメール）\n' +
    '  ・メールは送信しません（下書き作成のみ）\n\n' +
    'よろしいですか？',
    ui.ButtonSet.OK_CANCEL
  );
  if (answer !== ui.Button.OK) { ui.alert('キャンセルしました。'); return; }
  createDrafts_({ priorityFilter: 'A', limit: 20 });
}

// ============================================================
// 全件実行
// ============================================================
function createDraftsAll() {
  const ui = SpreadsheetApp.getUi();
  const answer = ui.alert(
    '【全件実行】確認',
    '以下の条件でGmail下書きをすべて作成します。\n\n' +
    '  ・対象: 送信方法「メール」の全行\n' +
    '  ・チラシ（Driveのファイル）を添付\n' +
    '  ・日程調整URLを本文に追加（Spir）\n' +
    '  ・重要フレーズを太字化（HTMLメール）\n' +
    '  ・メールは送信しません（下書き作成のみ）\n\n' +
    '件数が多い場合は時間がかかります。よろしいですか？',
    ui.ButtonSet.OK_CANCEL
  );
  if (answer !== ui.Button.OK) { ui.alert('キャンセルしました。'); return; }
  createDrafts_({});
}

// ============================================================
// 共通処理
// ============================================================
function createDrafts_(options) {
  const ui      = SpreadsheetApp.getUi();
  const pFilter = options.priorityFilter || null;
  const limit   = options.limit          || Infinity;

  // ----- チラシを事前取得（全件で使い回す） -----
  const flyerBlob = getFlyerBlob_();
  if (!flyerBlob) {
    const cont = ui.alert(
      'チラシが見つかりません',
      'Driveフォルダにファイルが見つかりませんでした。\n\n' +
      'チラシなしで下書きを作成しますか？\n' +
      '（OK = チラシなしで続行　／　キャンセル = 中止）',
      ui.ButtonSet.OK_CANCEL
    );
    if (cont !== ui.Button.OK) { ui.alert('キャンセルしました。'); return; }
  }

  // ----- シートとデータ取得 -----
  const sheet   = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < 2) { ui.alert('データが1行もありません。'); return; }

  const allData = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const col     = getColumnMap_(allData[0]);

  // ----- 必須列チェック -----
  const missing = checkRequiredColumns_(col);
  if (missing.length > 0) {
    ui.alert(
      '列が見つかりません',
      '以下の列がヘッダー行にありません:\n' + missing.join(', ') +
      '\n\n1行目がヘッダーになっているか確認してください。',
      ui.ButtonSet.OK
    );
    return;
  }

  const COL_EMAIL   = col['メールアドレス'];
  const COL_METHOD  = col['送信方法'];
  const COL_STATUS  = col['送信ステータス'];
  const COL_SUBJECT = col['件名'];
  const COL_BODY    = col['送信用本文'];
  const COL_PRIO    = col['営業優先度'];

  const logCreated = [];
  const logSkipped = [];
  const logErrors  = [];
  let   created    = 0;

  // ----- 行ループ -----
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];

    const sendMethod = (row[COL_METHOD]  || '').toString().trim();
    const email      = (row[COL_EMAIL]   || '').toString().trim();
    const status     = (row[COL_STATUS]  || '').toString().trim();
    const priority   = (row[COL_PRIO]    || '').toString().trim();
    const subject    = (row[COL_SUBJECT] || '').toString().trim();
    const rawBody    = (row[COL_BODY]    || '').toString();

    // 送信方法フィルター
    if (sendMethod !== 'メール') continue;

    // 優先度フィルター（テストモード）
    if (pFilter && priority !== pFilter) continue;

    // メールアドレス空欄スキップ
    if (!email) {
      logSkipped.push('行' + (i + 1) + ': アドレス空欄');
      continue;
    }

    // 処理済みスキップ
    if (status === '下書き作成済み' || status === '送信済み') {
      logSkipped.push('行' + (i + 1) + ': ' + status + 'のためスキップ (' + email + ')');
      continue;
    }

    // 上限チェック
    if (created >= limit) break;

    // 本文に日程調整URLを挿入（テキスト置換）
    const plainBody = rawBody.replace(SCHEDULE_OLD, SCHEDULE_NEW);

    // HTML本文（太字 + 改行 <br>）
    const htmlBody = convertToHtml_(plainBody);

    // ----- Gmail下書き作成 -----
    try {
      const draftOptions = { htmlBody: htmlBody };
      if (flyerBlob) {
        // copyBlob()で毎回フレッシュなコピーを作成（同一Blobの使い回し防止）
        draftOptions.attachments = [flyerBlob.copyBlob()];
      }

      GmailApp.createDraft(email, subject, plainBody, draftOptions);
      sheet.getRange(i + 1, COL_STATUS + 1).setValue('下書き作成済み');

      logCreated.push('行' + (i + 1) + ': ' + email);
      created++;
      Utilities.sleep(300); // API負荷軽減

    } catch (e) {
      sheet.getRange(i + 1, COL_STATUS + 1).setValue('下書き作成エラー');
      logErrors.push('行' + (i + 1) + ' (' + email + '): ' + e.message);
      Logger.log('エラー 行' + (i + 1) + ': ' + e.message);
    }
  }

  // ----- 完了ダイアログ -----
  const flyerMsg = flyerBlob ? 'チラシ添付あり ✅' : 'チラシ添付なし ⚠️';
  const summary = [
    '【完了】' + flyerMsg + '　HTMLメール ✅',
    '',
    '✅ 下書き作成: ' + logCreated.length + '件',
    '⏭️  スキップ:   ' + logSkipped.length + '件',
    '❌ エラー:     ' + logErrors.length + '件',
    '',
    logErrors.length > 0
      ? 'エラー行は「下書き作成エラー」と記録されました。\n詳細は Apps Script → 実行数 → ログで確認できます。'
      : 'Gmailの下書き箱をご確認ください。',
  ].join('\n');

  ui.alert('Gmail下書き作成 結果', summary, ui.ButtonSet.OK);
}
