/**
 * RAHA KENYA - 営業メール下書き自動生成（Google Apps Script）
 *
 * セットアップ手順:
 * 1. 対象スプレッドシートを開く → 拡張機能 > Apps Script
 * 2. このファイルの内容を貼り付け、プロジェクト名を「RAHA-Outreach」等に変更
 * 3. 下の CONFIG セクションを自分の環境に合わせて編集
 *    - spirUrl: Spirの予約URL
 *    - materialFileId: Google DriveにアップしたPDFのID
 *    - signature: 署名（複数行可）
 * 4. 保存 → スプレッドシートをリロードすると「RAHA」メニューが出る
 * 5. 「RAHA > 1行プレビュー」で1件試す → 問題なければ「下書きを一括生成」
 * 6. 初回は権限承認が必要（Gmail / Drive / Sheets）
 *
 * 送信元 info@rahakenya.jp で下書きを作る場合:
 *   - そのアカウントでログインした状態でApps Scriptを実行する、OR
 *   - 別アカウントで実行する場合、Gmail > 設定 > アカウント > 「他のメールアドレスを追加」で
 *     info@rahakenya.jp をエイリアスに追加してから実行
 */

// ========== CONFIG ==========
const CONFIG = {
  // 送信元
  fromEmail: 'info@rahakenya.jp',
  fromName: '河野',

  // 件名テンプレート（{companyName} は社名に置換）
  subjectTemplate: '{companyName}様の集客・採用について、SNS活用のご提案',

  // Spir 調整リンク
  spirUrl: 'https://app.spirinc.com/t/lH7s5QtOzh9e4QKm6Z5_q/as/GbO-VlrFmSDEq2AnmZhTl/confirm',

  // 添付PDFのGoogle DriveファイルID
  materialFileId: '1paLoTQO_38q-Q1BwRcE6P5c66F2E9BEh',

  // 署名
  signature: [
    '□□□───────────────────────────',
    '　　　合同会社 Asante Sana・RAHA KENYA',
    '　　　執行役員　河野 邦彦 / Kawano Kunihiko',
    '　　　電話　：070-8311-7053',
    '　　　メール：info@rahakenya.jp',
    '───────────────────────────□□□',
  ].join('\n'),

  // シートのヘッダー列名（日本語/英語のどちらでもOK）
  // 配列の先頭が「新規追加時に使う正式名」、それ以降はエイリアス
  columns: {
    companyName: ['会社名', 'companyName'],
    contact: ['問い合わせ窓口', 'contact'],
    emailValueProposition: ['メール挿入用 提案文', 'emailValueProposition'],
    emailBody: ['メール本文', 'emailBody'],
    status: ['送信ステータス', 'emailStatus'],
    draftedAt: ['下書き作成日時', 'draftedAt'],
  },

  // 1回の実行で生成する最大件数（Apps Scriptの実行時間制限対策）
  maxDraftsPerRun: 200,

  // 各下書き作成間のスリープ（ms）
  sleepBetweenDrafts: 200,
};
// =============================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('RAHA')
    .addItem('① メール文面をJ列に書き出し', 'fillEmailBodies')
    .addSeparator()
    .addItem('② Gmail下書きを一括生成（J列の本文を使用）', 'generateDrafts')
    .addItem('　└ 1行プレビュー（最初の未処理行を試す）', 'previewFirstUnprocessed')
    .addSeparator()
    .addItem('ステータスをリセット（再生成用）', 'resetStatus')
    .addItem('J列の本文をクリア', 'clearEmailBodies')
    .addToUi();
}

function fillEmailBodies() {
  const ctx = prepareContext_(false);
  if (!ctx) return;
  const { sheet, data, col, ui } = ctx;

  // 既存セルがあるか確認
  let existingCount = 0;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col.emailBody] || '').trim()) existingCount++;
  }

  let overwrite = false;
  if (existingCount > 0) {
    const ans = ui.alert(
      `既に ${existingCount} 件のセルに本文が入っています。\n\n` +
      `[はい] 全部上書きする\n[いいえ] 空セルだけ書き出し\n[キャンセル] 中止`,
      ui.ButtonSet.YES_NO_CANCEL
    );
    if (ans === ui.Button.CANCEL || ans === ui.Button.CLOSE) return;
    overwrite = (ans === ui.Button.YES);
  }

  let written = 0, skipped = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const companyName = String(row[col.companyName] || '').trim();
    const contact = String(row[col.contact] || '').trim();
    const valueProp = String(row[col.emailValueProposition] || '').trim();
    const existingBody = String(row[col.emailBody] || '').trim();

    if (!overwrite && existingBody) continue;
    if (!companyName || !contact || !valueProp) { skipped++; continue; }
    if (!isValidEmail_(contact)) { skipped++; continue; }

    const body = buildBody_(companyName, valueProp);
    sheet.getRange(i + 1, col.emailBody + 1).setValue(body);
    written++;
  }

  ui.alert(`完了\n書き出し: ${written} 件\nスキップ: ${skipped} 件`);
}

function clearEmailBodies() {
  const ui = SpreadsheetApp.getUi();
  const ans = ui.alert('J列（メール本文）を全行クリアします。よろしいですか？', ui.ButtonSet.YES_NO);
  if (ans !== ui.Button.YES) return;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
  const bodyCol = findColumnIndex_(headers, CONFIG.columns.emailBody);
  if (bodyCol < 0) { ui.alert('メール本文の列が見つかりません'); return; }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  sheet.getRange(2, bodyCol + 1, lastRow - 1, 1).clearContent();
  ui.alert('クリア完了');
}

function previewFirstUnprocessed() {
  const ctx = prepareContext_(true);
  if (!ctx) return;
  const { sheet, data, col, attachment, ui } = ctx;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = String(row[col.status] || '').trim();
    if (status === 'drafted' || status === 'skipped') continue;

    const companyName = String(row[col.companyName] || '').trim();
    const contact = String(row[col.contact] || '').trim();
    const valueProp = String(row[col.emailValueProposition] || '').trim();
    const bodyFromSheet = String(row[col.emailBody] || '').trim();

    if (!companyName || !contact || !valueProp || !isValidEmail_(contact)) {
      continue;
    }

    const subject = CONFIG.subjectTemplate.replace('{companyName}', companyName);
    const body = bodyFromSheet || buildBody_(companyName, valueProp);
    const options = { from: CONFIG.fromEmail, name: CONFIG.fromName };
    if (attachment) options.attachments = [attachment];

    GmailApp.createDraft(contact, subject, body, options);
    sheet.getRange(i + 1, col.status + 1).setValue('drafted');
    sheet.getRange(i + 1, col.draftedAt + 1).setValue(new Date());
    if (!bodyFromSheet) sheet.getRange(i + 1, col.emailBody + 1).setValue(body);

    ui.alert(`プレビュー下書きを作成しました\n\n社名: ${companyName}\n宛先: ${contact}\n件名: ${subject}\n本文ソース: ${bodyFromSheet ? 'J列の内容を使用' : '新規生成（J列にも保存）'}\n\nGmailの「下書き」フォルダで実物を確認してください。`);
    return;
  }
  ui.alert('未処理の有効行が見つかりませんでした');
}

function generateDrafts() {
  const ctx = prepareContext_(true);
  if (!ctx) return;
  const { sheet, data, col, attachment, ui } = ctx;

  let drafted = 0, skipped = 0, failed = 0;

  for (let i = 1; i < data.length; i++) {
    if (drafted >= CONFIG.maxDraftsPerRun) break;

    const row = data[i];
    const companyName = String(row[col.companyName] || '').trim();
    const contact = String(row[col.contact] || '').trim();
    const valueProp = String(row[col.emailValueProposition] || '').trim();
    const status = String(row[col.status] || '').trim();

    if (status === 'drafted' || status === 'skipped') continue;

    if (!companyName || !contact || !valueProp) {
      sheet.getRange(i + 1, col.status + 1).setValue('skipped');
      sheet.getRange(i + 1, col.draftedAt + 1).setValue('missing fields');
      skipped++;
      continue;
    }

    if (!isValidEmail_(contact)) {
      sheet.getRange(i + 1, col.status + 1).setValue('skipped');
      sheet.getRange(i + 1, col.draftedAt + 1).setValue('not email (form URL)');
      skipped++;
      continue;
    }

    try {
      const subject = CONFIG.subjectTemplate.replace('{companyName}', companyName);
      const bodyFromSheet = String(row[col.emailBody] || '').trim();
      const body = bodyFromSheet || buildBody_(companyName, valueProp);
      const options = { from: CONFIG.fromEmail, name: CONFIG.fromName };
      if (attachment) options.attachments = [attachment];

      GmailApp.createDraft(contact, subject, body, options);
      sheet.getRange(i + 1, col.status + 1).setValue('drafted');
      sheet.getRange(i + 1, col.draftedAt + 1).setValue(new Date());
      if (!bodyFromSheet) sheet.getRange(i + 1, col.emailBody + 1).setValue(body);
      drafted++;
      Utilities.sleep(CONFIG.sleepBetweenDrafts);
    } catch (e) {
      sheet.getRange(i + 1, col.status + 1).setValue('failed');
      sheet.getRange(i + 1, col.draftedAt + 1).setValue(String(e).substring(0, 200));
      failed++;
    }
  }

  ui.alert(`完了\n下書き生成: ${drafted} 件\nスキップ: ${skipped} 件\nエラー: ${failed} 件\n\nGmail「下書き」を確認してください。`);
}

function resetStatus() {
  const ui = SpreadsheetApp.getUi();
  const ans = ui.alert('全行のステータスを消去します。よろしいですか？\n（Gmail側の下書きは削除されません）', ui.ButtonSet.YES_NO);
  if (ans !== ui.Button.YES) return;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
  const statusCol = findColumnIndex_(headers, CONFIG.columns.status);
  const draftedAtCol = findColumnIndex_(headers, CONFIG.columns.draftedAt);
  if (statusCol < 0) { ui.alert('送信ステータス列が見つかりません'); return; }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  sheet.getRange(2, statusCol + 1, lastRow - 1, 1).clearContent();
  if (draftedAtCol >= 0) sheet.getRange(2, draftedAtCol + 1, lastRow - 1, 1).clearContent();
  ui.alert('リセット完了');
}

// ========== 内部ヘルパー ==========

function prepareContext_(loadAttachment) {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) { ui.alert('データが空です'); return null; }

  const headers = data[0].map(h => String(h).trim());
  const col = {};
  for (const [key, names] of Object.entries(CONFIG.columns)) {
    col[key] = findColumnIndex_(headers, names);
  }
  for (const k of ['companyName', 'contact', 'emailValueProposition']) {
    if (col[k] < 0) {
      const list = Array.isArray(CONFIG.columns[k]) ? CONFIG.columns[k] : [CONFIG.columns[k]];
      ui.alert(`必須列「${list.join(' / ')}」のいずれかが見つかりません`);
      return null;
    }
  }

  // 不足列を順番に追加：送信ステータス(H) → 下書き作成日時(I) → メール本文(J)
  // 元CSVは A〜G の 7列のため、この順で追加すれば「メール本文」が J列に来る
  let lastCol = headers.length;
  for (const key of ['status', 'draftedAt', 'emailBody']) {
    if (col[key] < 0) {
      col[key] = lastCol++;
      sheet.getRange(1, col[key] + 1).setValue(primaryColumnName_(CONFIG.columns[key]));
    }
  }

  let attachment = null;
  if (loadAttachment && CONFIG.materialFileId) {
    try {
      attachment = DriveApp.getFileById(CONFIG.materialFileId).getBlob();
    } catch (e) {
      const ans = ui.alert(`添付ファイルが取得できません（ID: ${CONFIG.materialFileId}）。添付なしで続行しますか？`, ui.ButtonSet.YES_NO);
      if (ans !== ui.Button.YES) return null;
    }
  }
  return { sheet, data, col, attachment, ui };
}

function buildBody_(companyName, valueProposition) {
  const spirLine = CONFIG.spirUrl
    ? CONFIG.spirUrl
    : '（日程調整リンクは追って共有いたします）';
  return [
    `${companyName} ご担当者様`,
    '',
    '突然のご連絡失礼いたします。',
    '合同会社 Asante Sana / RAHA KENYA の河野と申します。',
    'ケニアを拠点に「ケニアの河野家」としてSNS発信を続けている、',
    '現役のクリエイター集団です。',
    '',
    '▼ 自社運用の主な実績（すべて広告費ゼロ）',
    '　・ショート動画 総フォロワー約18.6万人 / 100万回再生超を50本以上',
    '　・公式LINE 登録者 1.2万人',
    '　・POPUP 4都市で1,050人動員',
    '　・求人媒体費ゼロで日本人スタッフ応募200名弱 / 採用14名',
    '　・アパレル販売・ケニア現地ツアー成約・ゲストハウス集客もSNS導線のみで完結',
    '',
    '弊社の強みは、「ニッチで魅力が伝わりにくい商材」を、',
    '切り口次第で何万人もの共感に変えていく企画・編集力です。',
    'BtoB・専門商材・地方拠点・採用難ポジションなど、',
    '"説明動画になりがちな領域" こそ、私たちが力を発揮してきた場所です。',
    '',
    valueProposition,
    '',
    'サービス内容・料金プラン（月35万円〜）・導入フローは、',
    '添付の資料にまとめております。',
    'ご興味ございましたら、30分ほどのオンラインミーティングで、',
    '貴社に合わせた具体的な切り口をご提案させていただきたく存じます。',
    '',
    '▼ 日程調整（Spir）',
    spirLine,
    '',
    'ご返信、もしくは「不要」の一言だけでも頂戴できますと幸いです。',
    '何卒よろしくお願い申し上げます。',
    '',
    '',
    CONFIG.signature,
  ].join('\n');
}

function isValidEmail_(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function findColumnIndex_(headers, names) {
  const list = Array.isArray(names) ? names : [names];
  for (const n of list) {
    const idx = headers.indexOf(n);
    if (idx >= 0) return idx;
  }
  return -1;
}

function primaryColumnName_(names) {
  return Array.isArray(names) ? names[0] : names;
}
