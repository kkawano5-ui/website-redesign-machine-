# ウェディング｜Google検索広告 30分セットアップ手順書

> 目的：少額(〜¥5万)で「直販で有効リードが取れるか・1件いくら(CPQL)か」を実測し、**推定CPAが目標¥100k圏に入るか**を見る。
> 送り先：`wedding/index.html`（UTM計測ライブ）。広告クリック→フォーム送信がUTMで自動的に紐づく。
> 親：`validation/wedding-validation-plan.md`

---

## 0. 使うリンク（UTM付き・コピペ用）

広告の **Final URL** にこれを使う（**広告専用LP `/ads/`** ＝離脱口ゼロ・フォーム最上部の高CVR版）。デプロイ後の実URLに置き換える：
```
https://YOUR-WEDDING-LP.vercel.app/ads/?utm_source=google&utm_medium=cpc&utm_campaign=smoke_wed
```
コミュニティ/SNS投稿用（本サイトトップでもOK）：
```
https://YOUR-WEDDING-LP.vercel.app/ads/?utm_source=pinterest&utm_medium=social&utm_campaign=smoke_wed
https://YOUR-WEDDING-LP.vercel.app/?utm_source=community&utm_medium=referral&utm_campaign=smoke_wed
```

---

## 1. アカウント作成（Expertモードで）
1. **ads.google.com** →「今すぐ開始」。
2. 目標を聞かれたら下部の **「エキスパートモードに切り替え」**（簡易版だとKW/単価を細かく制御できない）。
3. 「キャンペーンなしでアカウントを作成」→ お支払い情報を登録。

## 2. キャンペーン設定
- **タイプ**：**検索（Search）**のみ。
- ネットワーク：ディスプレイ・検索パートナーは**両方オフ**。
- **地域**：**United States のみ**（ターゲット＝アメリカ一択）。
  - 初動は全米でOK。データが溜まったら**高単価・該当層が濃い都市/州に寄せる**：California（特にLA・SF/Bay）・Hawaii・New York・Washington・Texas・Illinois。
  - 「**この地域にいる/定期的にいるユーザー**（Presence）」を選択（“興味がある人”は外す）。
- **言語**：English。
- **予算**：1日 **¥1,500〜2,500**（2〜3週間で〜¥5万）。
- **入札**：**クリック数の最大化**＋上限クリック単価 **¥250前後**（暴騰防止。低競合なので安く取れる想定）。

## 3. キーワード（フレーズ/完全一致で登録）
**グループ1：destination wedding Japan（中核・低競合）**
```
"destination wedding japan"
"destination wedding kyoto"
"wedding in japan for foreigners"
"get married in japan"
```
**グループ2：ヘリテージ/伝統（楔）**
```
"japanese heritage wedding"
"shinto wedding ceremony"
"traditional japanese wedding ceremony"
"shrine wedding japan"
```
**グループ3：プランナー意図（刈り取り）**
```
"japan wedding planner english"
"kyoto wedding planner"
"luxury wedding japan"
```
- `" "` = フレーズ一致、`[ ]` = 完全一致。中核は完全一致も併用して無駄打ちを抑える。

### 除外キーワード（必ず入れる）
```
cheap, free, diy, budget, dress, "wedding dress", invitation, vows, speech, quotes, ideas, games,
anime, manga, sims, minecraft, simulator, cosplay, costume, jobs, salary, "near me", template, course
```

## 4. 広告文（レスポンシブ検索広告／コピペ）
**見出し（Headlines）**
```
Marry Where Your Roots Began
Heritage Weddings in Japan
A Wedding in Japan, in English
Shrine & Traditional Ceremonies
Planned, Reserved & Hosted for You
50+ Celebrations, Fully Handled
For Families With Ties to Japan
Your Wedding, Your Family's Reunion
```
**説明文（Descriptions）**
```
A private, English-speaking wedding house for couples with roots in Japan. Designed end to end.
Shrine ceremony, venue, kimono, cuisine and your family's stay — one planner, one clear plan.
50+ weddings for couples and families flying in from across the United States. By private enquiry.
Nothing lost in translation. We carry the language and the relationships; you carry the meaning.
```
**Final URL**：§0のUTM付きリンク。

## 5. 公開 → 審査
- 公開後、審査に数時間〜1営業日。新規アカウントは立ち上がりに1〜2日かかることがある。

---

## 6. 結果の読み方（go/kill）
数日〜3週間回したら集計（広告費=管理画面、リード=Formspree＋`leads-tracker.csv`）：
```
CPQL（有効リード単価） = 広告費 ÷ 有効問い合わせ数
推定CPA（=CAC）       = CPQL ÷ 成約率   ← 成約率は実測 or 暫定15%
```
| 推定CPA | 判定 |
|---|---|
| ≤ **¥150k** | **GO**：有料直販が成立。月1.5〜2件で本稼働→採用で拡大 |
| ¥150k〜¥400k | グレー：紹介・コミュニティ・Pinterestと混ぜてCPAを薄める前提 |
| > **¥400k** or 反応ほぼ無し | **KILL**：有料検索は今は不経済→紹介・コミュニティ・SEO・提携へ集中 |

- **有効問い合わせ**＝実在／日系ルーツ or 日本挙式の明確な意向／日程・人数・関心が埋まっている（スパム除外）。
- 目標¥100kはこの「GO」帯のさらに内側。低競合KWとプランナーの実写真クリエイティブで届く可能性は高いが、**数字で確認してから**増額する。

## 7. 注意
- まず**少額・短期**で“刺さるKW/コピー”の当たりを見て、良いものに寄せてから増やす。
- 表示URLは当面 `vercel.app`。承認・信頼の観点で将来は**独自ドメイン**へ移行推奨。
- ターゲットは**米国一択**（ゆめちゃん談：顧客の質が最良）。香港/インドネシアは当面やらない。
- データが溜まったら、上記の濃い都市/州へ入札を寄せ、刺さるKW/コピーに予算を集中。
