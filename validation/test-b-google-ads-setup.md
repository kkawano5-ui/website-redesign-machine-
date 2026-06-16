# テストB｜Google検索広告 30分セットアップ手順書

> 目的：少額(〜¥5万)で「直販で有効リードが取れるか・1件いくら(CPQL)か」を実測。
> 送り先：concierge LP（**フォーム計測ライブ済み**）。広告のクリック→フォーム送信が、UTMで自動的に紐づく。

---

## 0. 使うリンク（UTM付き・コピペ用）

広告の **Final URL** にこれを使う（流入元が自動記録される）：
```
https://tokyo-insider-concierge.vercel.app/?utm_source=google&utm_medium=cpc&utm_campaign=smoke_b
```
コミュニティ投稿用（参考）：
```
https://tokyo-insider-concierge.vercel.app/?utm_source=reddit&utm_medium=social&utm_campaign=smoke_b
```

---

## 1. アカウント作成（Expertモードで）
1. **ads.google.com** → 「今すぐ開始」。
2. 最初に「目標」を聞かれたら、下部の **「エキスパートモードに切り替え」**（Switch to Expert Mode）を選ぶ。
   - ※ これをやらないと簡易版(Smart)になり、キーワードや単価を細かく制御できない。
3. 「キャンペーンなしでアカウントを作成」→ お支払い情報（請求先・カード）を登録。

## 2. キャンペーン設定
- **キャンペーンタイプ**：**検索（Search）**のみ。
- 目標：「目標を指定せずに作成」でOK。
- **ネットワーク**：ディスプレイネットワークと検索パートナーは**両方オフ**（検索のみに絞る）。
- **地域**：United States / Australia / United Kingdom / Canada。
  - 詳細設定で「**この地域にいる/定期的にいるユーザー**（Presence）」を選択（“興味がある人”は外す＝無駄打ち防止）。
- **言語**：English。
- **予算**：1日 **¥1,500〜2,000**（2週間で約¥21,000〜28,000＝上限内）。
- **入札**：**クリック数の最大化（Maximize clicks）**＋「上限クリック単価」を **¥200前後**に設定（暴騰防止）。

## 3. キーワード（フレーズ/完全一致で登録）
```
"private concierge Tokyo"
"luxury Japan travel planner"
"Japan luxury trip designer"
[impossible restaurant reservation Tokyo]
"how to book omakase Tokyo"
"private dining concierge Tokyo"
"private guide Tokyo high end"
"bespoke Japan itinerary luxury"
```
- `" "` = フレーズ一致、`[ ]` = 完全一致。広めに見たいKWはフレーズ、狭く確実なものは完全一致。

### 除外キーワード（必ず入れる）
```
cheap, free, budget, jobs, salary, hostel, "jr pass", template, course, internship, cheapest
```

## 4. 広告文（レスポンシブ検索広告／コピペ）
**見出し（Headlines・最大15／そのまま貼れる分）**
```
The Japan You Can't Book Yourself
Private Tokyo Concierge
Impossible Reservations, Handled
Omakase Counters Others Can't Get
English-Speaking & Discreet
Curated by Locals, Not a Call Center
Hosted Days & Bespoke Journeys
Dining, Culture & Private Nights
```
**説明文（Descriptions・最大4）**
```
We open doors that stay closed to outsiders—counter omakase, private bars, artisan visits.
A boutique private concierge in Tokyo. You tell us the trip; we design, reserve and host it.
Hard-to-book dining, private cultural access and bespoke multi-day journeys across Japan.
Our fee is for our service; dining, stays and transport at cost. Quietly handled, end to end.
```
**Final URL**：§0のUTM付きリンク。表示URL(パス)：`tokyo-insider-concierge.vercel.app`

## 5. 公開 → 審査
- 公開後、**広告審査に数時間〜1営業日**。承認されると配信開始。
- 新規アカウントは配信が立ち上がるまで1〜2日かかることがある。

---

## 6. 結果の読み方（go/kill）
数日回したら集計（広告費はGoogle Ads管理画面、リードはFormspree＋`leads-tracker.csv`）：
```
CPQL（有効リード単価） = 広告費 ÷ 有効問い合わせ数
推定CAC               = CPQL ÷ 成約率
```
| 結果 | 判定 |
|---|---|
| 有効リード ≤ **¥2.5万** | **GO**：直販成立。拡大 |
| ¥2.5〜5万 | グレー：B2B/紹介と併用前提で再設計 |
| > **¥5万** or 反応ほぼ無し | **KILL**：今は直販高すぎ→B2B2C/PRに集中 |

- **有効問い合わせ**＝実在の人物／英語圏HNW想定／日程・人数・関心が埋まっている（スパム除外）。

## 7. 注意
- 表示URLは現状 `vercel.app` サブドメイン。広告ポリシー上は可だが、**独自ドメイン**の方が信頼・承認がスムーズ（将来移行推奨）。
- 広告・LP表記で**保有しない資格を主張しない**（戦略メモ §5）。違法・グレー訴求は決済/広告で詰むので不可。
- まず**少額・短期**で“刺さるKW/コピー”の当たりを見る。良いものに寄せてから増やす。
