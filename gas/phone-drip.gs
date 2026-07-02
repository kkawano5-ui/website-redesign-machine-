/**
 * 電話番号ドリップ自動取得（シート直結版・みらい編集）
 *  スプレッドシート自身が毎日 Places API (New) を叩き、CRMシートに直接書き込みます。
 *  Mac不要・CSV不要・貼り付け作業ゼロ。無料枠(10,000/月/SKU)内に収まるよう1回最大300件。
 *
 * ■ 初回セットアップ（3分・1回だけ）
 *  1. 拡張機能 > Apps Script（crm-automation と同じプロジェクト）で
 *     「＋ > スクリプト」→ 名前 phone-drip → このファイル全文を貼り付けて保存
 *  2. 左の歯車「プロジェクトの設定」> スクリプト プロパティ > プロパティを追加
 *       プロパティ: PLACES_API_KEY ／ 値: AIza...（Placesのキー）
 *     ※キーの「アプリケーションの制限」は「なし」にしておく（IP制限だとGASから叩けない）。
 *       代わりに「APIの制限」で Places API (New) だけに絞ると安全。
 *  3. エディタ上部で関数 setupPhoneDrip を選んで ▶実行（初回は承認ダイアログ）
 *     → 明日から毎日 朝7時台に自動実行されます
 *
 * ■ 手動実行
 *   testPhoneDrip   … 5件だけ試す（動作確認用）
 *   dripFetchPhones … 今すぐ1回ぶん（最大300件）実行
 *
 * ■ 書き込みルール（既存データを壊さない）
 *   ・電話列: 空/「有」/「-」/「なし」のセルだけ埋める。既にある番号は絶対に上書きしない
 *   ・優先度/website実測/★評価/口コミ実数/営業状態/実測取得日 の6列が無ければ右端に自動作成
 *   ・優先度は毎回全行を再計算。実測が取れた行は実測ベースに自動で切り替わる
 *     （例: 美容×サイト無し×口コミ数件=150 が最上位。0=営業対象外/閉業）
 *   ・叩く順は優先度スコアの高い順（業種スコアのみ。エリア重みなし）
 */

const DRIP = {
  sheetName: 'CRM',
  dailyLimit: 300,     // 1回の実行で叩く最大件数（300×31日=9,300 ≒ 無料枠内）
  triggerHour: 7,      // 毎日この時刻台に自動実行（スクリプトのタイムゾーン基準）
  keyProp: 'PLACES_API_KEY',

  cols: {              // CRMの列名（名前で探すので列の並び替えに強い）
    placeId: ['place_id', 'placeID', 'PlaceID', 'プレイスID'],
    tel: ['電話', 'TEL', '電話番号'],
    genre: ['業種・種別', '業種/種別', '業種', '種別'],
    web: ['既存website', '既存Website', 'website', 'Web'],
    kuchi: ['口コミ', '口コミ数', 'レビュー数'],
  },
  addCols: ['優先度', 'website実測', '★評価', '口コミ実数', '営業状態', '実測取得日'],
  telFillable: ['', '有', '-', 'なし'],  // 電話列がこの値のときだけ番号を書き込む

  // ---- 優先度スコア（scripts/fetch-phones.mjs と同じ重み。編集すれば翌日から反映）----
  serviceWeight: { '美容': 100, '美容医療': 100, 'ネイルサロン': 100, '治療院': 96, '整体': 96, '接骨院': 96, '鍼灸': 96, 'エステ': 92, '歯科': 88 },
  shigyo: ['税理士', '司法書士', '行政書士', '社会保険労務士', '弁護士', '弁護士 法律事務所', '会計事務所', '会計', '弁理士', '中小企業診断士', '士業', '法律事務所'],
  excludeGenre: ['官公庁', '政府機関', '協会/組織', '学校', '教育機関', 'ショッピング モール', '共同オフィス', '企業のオフィス', '卸売業', 'ディスカウント スーパー', 'ドラッグストア', '書店', 'クリーニング店', 'インターネット カフェ', '図書館'],
};

/** 毎日の自動実行を登録（初回に1回だけ実行） */
function setupPhoneDrip() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'dripFetchPhones') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('dripFetchPhones').timeBased().everyDays(1).atHour(DRIP.triggerHour).create();
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DRIP.sheetName);
  if (sh) dripEnsureCols_(sh);
  const key = PropertiesService.getScriptProperties().getProperty(DRIP.keyProp);
  const tz = Session.getScriptTimeZone();
  Logger.log('✅ 毎日 %s時台の自動実行を登録しました（1回 最大%s件・優先度順）', String(DRIP.triggerHour), String(DRIP.dailyLimit));
  if (!key) Logger.log('⚠️ スクリプト プロパティ %s が未設定です。プロジェクトの設定 > スクリプト プロパティ で追加してください。', DRIP.keyProp);
  if (tz !== 'Asia/Tokyo') Logger.log('⚠️ スクリプトのタイムゾーンが %s です。プロジェクトの設定で「(GMT+09:00) 東京」に変更すると朝7時に走ります。', tz);
}

/** 手動テスト: 5件だけ取得して動作確認 */
function testPhoneDrip() { dripRun_(5); }

/** 本体: 1回ぶん（最大 dailyLimit 件）実行。毎日のトリガーはこれを呼ぶ */
function dripFetchPhones() { dripRun_(DRIP.dailyLimit); }

function dripRun_(limit) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30 * 1000)) return; // 多重起動防止
  try {
    const key = PropertiesService.getScriptProperties().getProperty(DRIP.keyProp);
    if (!key) throw new Error('APIキー未設定: プロジェクトの設定 > スクリプト プロパティ に ' + DRIP.keyProp + ' を追加してください');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(DRIP.sheetName);
    if (!sh) throw new Error('シートが見つかりません: ' + DRIP.sheetName);
    dripEnsureCols_(sh);

    const data = sh.getDataRange().getValues();
    const header = data[0].map(function (h) { return String(h).trim(); });
    const idx = {
      pid: dripFindCol_(header, DRIP.cols.placeId),
      tel: dripFindCol_(header, DRIP.cols.tel),
      genre: dripFindCol_(header, DRIP.cols.genre),
      web: dripFindCol_(header, DRIP.cols.web),
      kuchi: dripFindCol_(header, DRIP.cols.kuchi),
      score: header.indexOf('優先度'),
      webReal: header.indexOf('website実測'),
      rating: header.indexOf('★評価'),
      kuchiReal: header.indexOf('口コミ実数'),
      bstat: header.indexOf('営業状態'),
      date: header.indexOf('実測取得日'),
    };
    if (idx.pid < 0) throw new Error('place_id 列が見つかりません（CRMに place_id 列が必要です）');
    if (idx.tel < 0) throw new Error('電話 列が見つかりません');

    // ① 優先度を全行再計算（実測が入った行は実測ベースに自動切替）＋ 今回の取得対象を抽出
    const targets = [];
    for (let r = 1; r < data.length; r++) {
      const pid = String(data[r][idx.pid] || '').trim();
      const score = pid ? dripScoreRow_(data[r], idx) : '';
      data[r][idx.score] = score;
      const notFetched = String(data[r][idx.date] || '').trim() === '';
      if (pid && score !== '' && score > 0 && notFetched) targets.push({ row: r, pid: pid, score: score });
    }
    targets.sort(function (a, b) { return b.score - a.score; });
    const todo = targets.slice(0, Math.max(0, limit));
    const today = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd');

    // ② 10件ずつまとめて取得（電話と同じ1回のAPIで実測も取得＝追加課金ゼロ）
    const FIELD_MASK = 'id,displayName,nationalPhoneNumber,internationalPhoneNumber,websiteUri,rating,userRatingCount,businessStatus';
    let ok = 0, noph = 0, fail = 0;
    const telWrites = [];
    for (let i = 0; i < todo.length; i += 10) {
      const chunk = todo.slice(i, i + 10);
      const reqs = chunk.map(function (t) {
        return {
          url: 'https://places.googleapis.com/v1/places/' + encodeURIComponent(t.pid) + '?languageCode=ja',
          headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': FIELD_MASK },
          muteHttpExceptions: true,
        };
      });
      const resps = UrlFetchApp.fetchAll(reqs);
      for (let k = 0; k < resps.length; k++) {
        const t = chunk[k];
        const row = data[t.row];
        const code = resps[k].getResponseCode();
        if (code === 403) throw new Error('403 PERMISSION_DENIED: キーの制限（アプリケーションの制限=なし推奨）と Places API (New) の有効化を確認してください');
        if (code === 429 || code >= 500) { fail++; continue; } // 実測取得日を付けない＝次回自動リトライ
        if (code === 404) { row[idx.bstat] = '取得不可(place_id無効)'; row[idx.date] = today; continue; }
        let j;
        try { j = JSON.parse(resps[k].getContentText()); } catch (e) { fail++; continue; }
        if (!j || j.error) { fail++; continue; }
        const phone = String(j.nationalPhoneNumber || j.internationalPhoneNumber || '').trim();
        row[idx.webReal] = j.websiteUri || '';
        row[idx.rating] = j.rating != null ? j.rating : '';
        row[idx.kuchiReal] = j.userRatingCount != null ? j.userRatingCount : '';
        row[idx.bstat] = dripBizJa_(j.businessStatus);
        row[idx.date] = today;
        const cur = String(row[idx.tel] == null ? '' : row[idx.tel]).trim();
        if (phone && DRIP.telFillable.indexOf(cur) >= 0) { row[idx.tel] = phone; telWrites.push(t.row); }
        if (phone) ok++; else noph++;
        row[idx.score] = dripScoreRow_(row, idx); // 実測が入ったので優先度も更新
      }
    }

    // ③ 書き戻し。触るのは追加6列（列ごと一括）と、番号が取れた行の電話セルだけ
    dripWriteCol_(sh, data, idx.score);
    dripWriteCol_(sh, data, idx.webReal);
    dripWriteCol_(sh, data, idx.rating);
    dripWriteCol_(sh, data, idx.kuchiReal);
    dripWriteCol_(sh, data, idx.bstat);
    dripWriteCol_(sh, data, idx.date);
    for (let w = 0; w < telWrites.length; w++) {
      const r = telWrites[w];
      sh.getRange(r + 1, idx.tel + 1).setValue(data[r][idx.tel]);
    }
    SpreadsheetApp.flush();
    Logger.log('電話ドリップ完了: 未取得%s件 → 今回%s件（番号取得%s / 番号なし%s / 失敗→次回再試行%s）残り%s件',
      String(targets.length), String(todo.length), String(ok), String(noph), String(fail),
      String(Math.max(0, targets.length - todo.length)));
  } finally {
    lock.releaseLock();
  }
}

// ---- 優先度スコア: 業種ティア + サイト有無 + 口コミ帯（実測があれば実測を優先して判定）----
function dripScoreRow_(row, idx) {
  const genre = String(idx.genre >= 0 ? row[idx.genre] : '').trim();
  if (DRIP.excludeGenre.indexOf(genre) >= 0) return 0;                       // 営業対象外
  if (String(idx.bstat >= 0 ? row[idx.bstat] : '').indexOf('閉業') >= 0) return 0; // 閉業は叩かない
  let w;
  if (DRIP.serviceWeight.hasOwnProperty(genre)) w = DRIP.serviceWeight[genre];
  else if (DRIP.shigyo.indexOf(genre) >= 0) w = 40;   // 士業: Web制作の的だがMEO弱め＝後段
  else w = 55;                                        // その他＝飲食など
  const enriched = String(idx.date >= 0 ? row[idx.date] : '').trim() !== '';
  const web = enriched
    ? String(idx.webReal >= 0 ? (row[idx.webReal] || '') : '').trim()
    : String(idx.web >= 0 ? (row[idx.web] || '') : '').trim();
  if (web === '') w += 30;                            // サイト無し＝Web提案の的
  const kuchiRaw = enriched && idx.kuchiReal >= 0 ? row[idx.kuchiReal] : (idx.kuchi >= 0 ? row[idx.kuchi] : '');
  const digits = String(kuchiRaw == null ? '' : kuchiRaw).replace(/[^0-9]/g, '');
  if (digits !== '') {
    const rev = Number(digits);
    if (rev >= 1 && rev <= 50) w += 20;               // 気にしてるが手が回ってない＝ホット
    else if (rev > 50 && rev <= 200) w += 5;
    else if (rev > 200) w -= 10;                      // ネット強者は後回し（難易度高）
  }
  return w;
}

function dripEnsureCols_(sh) {
  const lastCol = sh.getLastColumn();
  const header = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim(); });
  const missing = DRIP.addCols.filter(function (c) { return header.indexOf(c) < 0; });
  if (missing.length) sh.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
}

function dripFindCol_(header, names) {
  for (let i = 0; i < names.length; i++) {
    const j = header.indexOf(names[i]);
    if (j >= 0) return j;
  }
  return -1;
}

function dripWriteCol_(sh, data, colIdx) {
  if (colIdx < 0 || data.length < 2) return;
  const arr = [];
  for (let r = 1; r < data.length; r++) arr.push([data[r][colIdx]]);
  sh.getRange(2, colIdx + 1, arr.length, 1).setValues(arr);
}

function dripBizJa_(s) {
  if (s === 'OPERATIONAL') return '営業中';
  if (s === 'CLOSED_TEMPORARILY') return '休業中';
  if (s === 'CLOSED_PERMANENTLY') return '閉業';
  return s || '';
}
