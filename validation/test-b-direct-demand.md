# テストB｜直販スモークテスト（検索広告 + コミュニティ）

> 目的：**直販で有効リードが取れるか、1件いくら(CPQL)か**を少額(〜¥5万)で実測する。
> 物差し：有効リード **≤ ¥2.5万**ならGO（成約20%でCAC≤¥12.5万 < A Day粗利¥10万超〜Journey¥35万超）。

---

## 0. 前提（Step 0 必須）
- LPに**実フォーム＋実メール＋UTM＋解析**が入っていること（`acquisition-validation-plan.md` Step0）。
- これが無いと「広告→クリック→問い合わせ」の数が取れず、テスト不成立。

---

## 1. Google検索広告（高意図・少額）

### キーワード（高意図 = 今まさに探している人）
**グループ1：コンシェルジュ/プランナー**
- `private concierge Tokyo`
- `luxury Japan travel planner`
- `Japan luxury trip designer`
- `private travel concierge Japan`

**グループ2：予約困難の課題**
- `impossible restaurant reservation Tokyo`
- `how to book omakase Tokyo`
- `hard to book sushi Tokyo`
- `private dining concierge Tokyo`

**グループ3：私的体験/多日程**
- `private cultural experiences Kyoto`
- `bespoke Japan itinerary luxury`
- `private guide Tokyo high end`

設定：完全一致＋フレーズ一致中心、地域＝米/豪/英/加、言語＝英語、**1日上限を低く**（例 ¥1,500〜2,000/日）で2週間。

**除外KW**：`cheap`, `free`, `jobs`, `salary`, `JR pass`, `hostel`, `budget`, `template`。

### レスポンシブ検索広告（見出し/説明・素案）
**見出し（15本まで・抜粋）**
- The Japan You Can't Book Yourself
- Private Tokyo Concierge
- Impossible Reservations, Handled
- Omakase Counters Others Can't Get
- English-Speaking, Discreet, On the Ground
- Curated by Locals, Not a Call Center
- Hosted Days & Bespoke Journeys
- Dining, Culture & Private Nights

**説明（4本）**
- We open the doors that stay closed to outsiders—counter omakase, private bars, artisan visits. English-speaking, discreet.
- A boutique private concierge in Tokyo. You tell us the trip; we design, reserve and host it. By private enquiry.
- Hard-to-book dining, private cultural access and bespoke multi-day journeys across Japan.
- Fee for our service; dining, stays and transport at cost. Quietly handled, end to end.

**最終URL**：concierge LP（`?utm_source=google&utm_medium=cpc&utm_campaign=smoke_a`）

---

## 2. コミュニティ（¥0・価値提供ファースト）

⚠️ 多くの場は**直接宣伝NG**。「答えてから、必要な人にだけ自然に橋渡し」する。

| 場 | 動き方 |
|---|---|
| Reddit **r/JapanTravel** / r/JapanTravelTips | 「高級・記念旅行の相談」スレに**具体的に役立つ回答**→プロフィール/DMで導線。露骨な宣伝は削除対象なので注意 |
| Facebook「Japan luxury travel」「Tokyo expats」系グループ | 質問に答える、許可された範囲で紹介 |
| 既存の**酒/ウイスキーLP**流入 | 「夕食後の私的二軒目」フックで concierge LPへ内部送客 |

### 投稿/返信テンプレ（価値ファースト）
> For a special-occasion trip, the things that make it unforgettable in Japan are usually the ones you can't book online—counter omakase that doesn't take outside reservations, private bars, artisan visits. Happy to share how to approach these (timing, deposits, intros). Feel free to DM if you want specifics for your dates.

> ※ プラットフォーム規約を守る。宣伝禁止の場では“役立つ情報”に徹し、興味を示した個人にのみ個別対応。

---

## 3. 計測（CPQL）

`leads-tracker.csv` に全リードを記録。広告費は管理画面から取得。

```
CPQL（有効リード単価） = 広告費 ÷ 有効問い合わせ数
推定CAC               = CPQL ÷ 成約率
```
- **有効問い合わせ**の定義：実在の人物／英語圏HNW想定／旅行月・人数・関心が埋まっている（スパム・冷やかし除外）。

### go/kill
| 結果 | 判定 |
|---|---|
| 有効リード ≤ **¥2.5万** が見える | **GO**：直販は成立。KW/コピーを磨いて拡大 |
| ¥2.5〜5万 | グレー：B2B/紹介/PRと併用前提で再設計 |
| > **¥5万** or ほぼ刺さらない | **KILL**：今は直販高すぎ。B2B2C・PR・紹介に資源集中 |

---

## 4. 注意（戦略メモ §5 準拠）
- 広告・表記で**保有しない資格を主張しない**（「登録旅行業者と提携」等、事実準拠）。
- 違法・グレー（エスコート的訴求等）は決済/広告で詰むので**絶対に使わない**。夜は「合法な会員制バー/文化としての夜」に限定。
