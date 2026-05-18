/**
 * Gmail下書き一括作成スクリプト
 * 対象: output_ai_seminar_v3.csv を貼り付けたGoogleスプレッドシート
 *
 * 【動作概要】
 * - K列「送信方法」が「メール」の行のみ対象
 * - メールアドレス空欄・送信ステータス「下書き作成済み」「送信済み」はスキップ
 * - GmailApp.createDraft() で下書き作成（送信はしない）
 * - 成功後: 送信ステータス → 「下書き作成済み」
 * - 失敗時: 送信ステータス → 「下書き作成エラー」（処理は継続）
 * - 初回送信日は記録しない（送信していないため）
 */

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
// ヘッダー名 → 列インデックス（0始まり）のマップを返す
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
    'メールアドレス',
    '送信方法',
    '送信ステータス',
    '件名',
    '送信用本文',
    '営業優先度',
  ];
  const missing = required.filter(function(c) { return col[c] === undefined; });
  return missing;
}

// ============================================================
// テスト実行: 営業優先度「A」の上位20件
// ============================================================
function createDraftsTest() {
  const ui = SpreadsheetApp.getUi();
  const answer = ui.alert(
    '【テスト実行】確認',
    '以下の条件でGmail下書きを作成します。\n\n' +
    '  ・対象: 送信方法「メール」かつ営業優先度「A」の上位20件\n' +
    '  ・スキップ: アドレス空欄 / 下書き作成済み / 送信済み\n' +
    '  ・メールは送信しません（下書き作成のみ）\n\n' +
    'よろしいですか？',
    ui.ButtonSet.OK_CANCEL
  );
  if (answer !== ui.Button.OK) {
    ui.alert('キャンセルしました。');
    return;
  }
  createDrafts_({ priorityFilter: 'A', limit: 20 });
}

// ============================================================
// 全件実行: 送信方法「メール」の全対象行
// ============================================================
function createDraftsAll() {
  const ui = SpreadsheetApp.getUi();
  const answer = ui.alert(
    '【全件実行】確認',
    '以下の条件でGmail下書きをすべて作成します。\n\n' +
    '  ・対象: 送信方法「メール」の全行\n' +
    '  ・スキップ: アドレス空欄 / 下書き作成済み / 送信済み\n' +
    '  ・メールは送信しません（下書き作成のみ）\n\n' +
    '件数が多い場合は時間がかかります。よろしいですか？',
    ui.ButtonSet.OK_CANCEL
  );
  if (answer !== ui.Button.OK) {
    ui.alert('キャンセルしました。');
    return;
  }
  createDrafts_({});
}

// ============================================================
// 共通処理
// ============================================================
function createDrafts_(options) {
  const ui        = SpreadsheetApp.getUi();
  const pFilter   = options.priorityFilter || null;   // 'A' など。null = 全件
  const limit     = options.limit          || Infinity; // 作成上限（下書き成功数）

  // ----- シートとデータ取得 -----
  const sheet   = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < 2) {
    ui.alert('データが1行もありません。');
    return;
  }

  const allData  = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const col      = getColumnMap_(allData[0]);

  // ----- 必須列チェック -----
  const missing = checkRequiredColumns_(col);
  if (missing.length > 0) {
    ui.alert(
      '列が見つかりません',
      '以下の列名がヘッダー行に存在しません:\n' + missing.join(', ') +
      '\n\n1行目がヘッダー行になっているか確認してください。',
      ui.ButtonSet.OK
    );
    return;
  }

  // 列番号（0始まり → getRange用に+1）
  const COL_EMAIL   = col['メールアドレス'];
  const COL_METHOD  = col['送信方法'];
  const COL_STATUS  = col['送信ステータス'];
  const COL_SUBJECT = col['件名'];
  const COL_BODY    = col['送信用本文'];
  const COL_PRIO    = col['営業優先度'];

  // ----- ログ用配列 -----
  const logCreated = [];
  const logSkipped = [];
  const logErrors  = [];
  let   created    = 0;

  // ----- 行ループ（2行目から） -----
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];

    const sendMethod = (row[COL_METHOD]  || '').toString().trim();
    const email      = (row[COL_EMAIL]   || '').toString().trim();
    const status     = (row[COL_STATUS]  || '').toString().trim();
    const priority   = (row[COL_PRIO]    || '').toString().trim();
    const subject    = (row[COL_SUBJECT] || '').toString().trim();
    const body       = (row[COL_BODY]    || '').toString();

    // 送信方法フィルター
    if (sendMethod !== 'メール') continue;

    // 優先度フィルター（テストモード）
    if (pFilter && priority !== pFilter) continue;

    // メールアドレス空欄スキップ
    if (!email) {
      logSkipped.push('行' + (i + 1) + ': アドレス空欄');
      continue;
    }

    // 送信ステータス確認（処理済みスキップ）
    if (status === '下書き作成済み' || status === '送信済み') {
      logSkipped.push('行' + (i + 1) + ': ' + status + 'のためスキップ (' + email + ')');
      continue;
    }

    // 上限チェック
    if (created >= limit) break;

    // ----- Gmail下書き作成 -----
    try {
      GmailApp.createDraft(email, subject, body);

      // ステータス更新（送信日は記録しない）
      sheet.getRange(i + 1, COL_STATUS + 1).setValue('下書き作成済み');

      logCreated.push('行' + (i + 1) + ': ' + email);
      created++;

      // API負荷軽減
      Utilities.sleep(300);

    } catch (e) {
      sheet.getRange(i + 1, COL_STATUS + 1).setValue('下書き作成エラー');
      logErrors.push('行' + (i + 1) + ' (' + email + '): ' + e.message);
      Logger.log('エラー 行' + (i + 1) + ': ' + e.message);
    }
  }

  // ----- 完了ダイアログ -----
  const summary = [
    '【完了】',
    '',
    '✅ 下書き作成: ' + logCreated.length + '件',
    '⏭️  スキップ:   ' + logSkipped.length + '件',
    '❌ エラー:     ' + logErrors.length + '件',
    '',
    logErrors.length > 0
      ? 'エラーの行は「下書き作成エラー」に更新されています。\n詳細は表示メニュー→ログで確認できます。'
      : 'Gmailの下書き箱をご確認ください。',
  ].join('\n');

  ui.alert('Gmail下書き作成 結果', summary, ui.ButtonSet.OK);
}
