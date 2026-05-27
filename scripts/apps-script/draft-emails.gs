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

  // 署名（複数行可。後で差し替え）
  signature: [
    '--',
    '河野',
    'RAHA KENYA',
    'Mail: info@rahakenya.jp',
    'HP: https://raha-kenya.com',
  ].join('\n'),

  // シートのヘッダー列名（CSVと同じ名前を想定）
  columns: {
    companyName: 'companyName',
    contact: 'contact',
    emailValueProposition: 'emailValueProposition',
    status: 'emailStatus',
    draftedAt: 'draftedAt',
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
    .addItem('1行プレビュー（最初の未処理行）', 'previewFirstUnprocessed')
    .addSeparator()
    .addItem('下書きを一括生成', 'generateDrafts')
    .addSeparator()
    .addItem('ステータスをリセット（強制再生成）', 'resetStatus')
    .addToUi();
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

    if (!companyName || !contact || !valueProp || !isValidEmail_(contact)) {
      continue;
    }

    const subject = CONFIG.subjectTemplate.replace('{companyName}', companyName);
    const body = buildBody_(companyName, valueProp);
    const options = { from: CONFIG.fromEmail, name: CONFIG.fromName };
    if (attachment) options.attachments = [attachment];

    GmailApp.createDraft(contact, subject, body, options);
    sheet.getRange(i + 1, col.status + 1).setValue('drafted');
    sheet.getRange(i + 1, col.draftedAt + 1).setValue(new Date());

    ui.alert(`プレビュー下書きを作成しました\n\n社名: ${companyName}\n宛先: ${contact}\n件名: ${subject}\n\nGmailの「下書き」フォルダで実物を確認してください。`);
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
      const body = buildBody_(companyName, valueProp);
      const options = { from: CONFIG.fromEmail, name: CONFIG.fromName };
      if (attachment) options.attachments = [attachment];

      GmailApp.createDraft(contact, subject, body, options);
      sheet.getRange(i + 1, col.status + 1).setValue('drafted');
      sheet.getRange(i + 1, col.draftedAt + 1).setValue(new Date());
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
  const statusCol = headers.indexOf(CONFIG.columns.status);
  const draftedAtCol = headers.indexOf(CONFIG.columns.draftedAt);
  if (statusCol < 0) { ui.alert('ステータス列が見つかりません'); return; }

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
  for (const [key, name] of Object.entries(CONFIG.columns)) {
    col[key] = headers.indexOf(name);
  }
  for (const k of ['companyName', 'contact', 'emailValueProposition']) {
    if (col[k] < 0) { ui.alert(`必須列「${CONFIG.columns[k]}」が見つかりません`); return null; }
  }

  let lastCol = headers.length;
  if (col.status < 0) {
    col.status = lastCol++;
    sheet.getRange(1, col.status + 1).setValue(CONFIG.columns.status);
  }
  if (col.draftedAt < 0) {
    col.draftedAt = lastCol++;
    sheet.getRange(1, col.draftedAt + 1).setValue(CONFIG.columns.draftedAt);
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
    'RAHA KENYAの河野と申します。',
    '弊社は自社でショート動画を制作・運用し、TikTok・Instagram・YouTube 合計フォロワー18.6万人、公式LINE 1.2万人、4都市POPUPで1,050人動員などを達成しております。現在はそのノウハウを企業様向けに、SNS運用・コミュニティ形成支援としてご提供しております。',
    '',
    valueProposition,
    '',
    '添付に、直近の事例や運用イメージをまとめた資料がございます。ご一読いただき、ご興味ございましたら30分ほどオンラインでお話できればと存じます。下記より日程ご調整いただけますと幸いです。',
    '',
    '▼ 日程調整（Spir）',
    spirLine,
    '',
    'ご返信、もしくは「不要」の一言だけでも頂戴できますと幸いです。',
    '何卒よろしくお願い申し上げます。',
    '',
    CONFIG.signature,
  ].join('\n');
}

function isValidEmail_(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
