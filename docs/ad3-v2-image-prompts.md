# 【3本目・改訂版】KATALYS 広告 ("広告/求人コスト → SNSは資産") — ChatGPT/gpt-image プロンプト集

> 新台本（広告・求人にお金を払い続けても消える／SNSは続けるほど"資産"になる）に対応した画像セット。
> ルールは従来どおり：**AI画像内に文字・数字・ロゴ・透かしは入れない**。テロップ/数字/CTAはRemotion側で後乗せ。
> 生成画像は `ad3/public/ad3/assets/` に**下記ファイル名のまま**保存 → 私が差し込み＆レンダリングします。

## 既存画像の再利用について（重要・あなたの作業を減らせます）
新概念のシーン（S1〜S4）だけ**新規生成が必要**。以下は前回の画像をそのまま使えます：
- **S5（人が見える発信の背景）** → 既存 `s5.png`（明るいオフィス）を流用可
- **S6（SNSで会社を調べる）** → 既存 `s7.png`（スマホ2台）を流用可
- **S7（無料相談会）** → 既存 `s9.png`（オンライン相談）を流用可
- **S8（CTAエンドカード）** → 任意（無地ブランド背景）

→ **最低限つくるのは S1・S2・S3・S4 の4枚**でOK。

---

## 0. 共通プロンプト（毎回先頭に付ける）
```
Vertical 9:16 illustration, 1080x1920 composition, high-quality flat 2D animation style,
clean Japanese B2B advertising design, soft white and pale blue background, navy accents,
small warm orange accent, refined and trustworthy, not childish, not cheap stock-illustration,
generous empty space in the upper third for text overlay, no text, no letters, no numbers,
no logo, no watermark.
```
人物ルール：`Japanese business people, natural realistic proportions, friendly but professional, subtle expressions, modern office clothing, not anime, not overly cute, clean hands, no distorted faces.`
構図ルール：`Key subjects in the lower half or sides, keep the top third clean and empty, simple shapes, clear silhouettes, readable on a phone.`
禁止：`Japanese/English text, fake UI text, numbers, logos, watermarks, realistic photos, messy hands, distorted faces, Instagram UI.`

---

## 1. シーン別プロンプト（新規4枚）

### S1 — 毎月いくら払ってる？（継続コスト：請求書＋カレンダー）　`v2_s1.png`
> ※S2と見た目を明確に分けるため「請求書の山＋カレンダー＝毎月の出費」に変更。
```
[共通] A Japanese small-business owner at a desk looking concerned at a GROWING STACK OF
MONTHLY BILLS AND INVOICES, with a wall calendar beside him where coins drop out on repeated
dates (a recurring monthly payment). Two abstract channels float to the side — a megaphone
(ads) and a magnifier-with-a-person (recruiting) — quietly consuming the money. The
composition emphasizes a repeating monthly cost. White and pale blue, small warm orange
accent on the coins, large empty space in the upper third. No text, no numbers.
```

### S2 — 止めたら消える / 何も残らない（スイッチOFFで霧散・人物なし）　`v2_s2.png`
> ※S1と差別化：机の人物ナシ、スイッチで消える別メタファー。
```
[共通] A conceptual scene with NO desk and NO person: a glowing balloon-like "paid ads /
recruiting" bubble is switched off by a power toggle and DEFLATES, scattering into particles
that fade into nothing, leaving an empty open hand and an empty box below — when you stop
paying, it disappears and nothing remains. Pale blue background, a tiny orange accent on the
vanishing bubble, lots of empty space in the upper third, minimal and slightly melancholic.
No text, no numbers.
```

### S3 — 同じ会社でも"ある状態"で選ばれ方が変わる（2社対比）　`v2_s3.png`
```
[共通] Two identical small-company buildings side by side on a pale background. The LEFT one
looks plain, gray and unnoticed. The RIGHT identical one glows warmly and is surrounded by
small friendly people icons and soft hearts choosing it. A clear before/after contrast of
"ignored" vs "chosen". Flat 2D B2B, navy and pale blue with one warm orange accent on the
chosen side, empty space in the upper third. No text.
```

### S4 — 実績の数字 ＋ "資産"が積み上がる　`v2_s4.png`
```
[共通] A navy flat-vector infographic background. On the sides: small audience profile icons
and a few customer figures, plus a smoothly rising line graph. In the lower-center: stacked
building-block "asset" bricks accumulating upward like a growing tower (representing assets
piling up). Leave a LARGE EMPTY SPACE in the vertical center for big numbers to be added
later. Energetic, clean, data-driven. No text, no numbers.
```
- 任意差分 `v2_s4_blocks.png`：`Only the stack of glowing asset bricks growing upward, flat 2D, transparent background, no text` （積み上がりを別レイヤーでアニメさせたい場合）

---

## 2. 再利用 or 新規（S5〜S8）

### S5 — 社長・スタッフの"人"が見える発信
- 既存 `s5.png`（明るいオフィス背景）流用可。
- 強化したい場合の透過カード（任意・各 `Vertical post card, transparent background, no text`）：
  - `v2_s5_ceo.png`：友好的な日本人の社長が自然に話している
  - `v2_s5_staff.png`：社員が職場で笑顔
  - `v2_s5_site.png`：現場・舞台裏の様子

### S6 — まずSNSで会社を調べる時代
- 既存 `s7.png`（スマホ2台）流用可。新規なら：
```
[共通][人物] A customer and a job-seeker looking at a company's profile on their smartphones,
with a warm, people-centered company profile that feels trustworthy. Pale blue and white,
small orange like/heart accent, empty space above. No readable text.
```

### S7 — 無料相談会
- 既存 `s9.png`（オンライン相談）流用可。

### S8 — CTAエンドカード（任意）　`v2_s8.png`
```
[共通] A clean brand-color end-card background: soft pale-blue to white gradient with a subtle
warm orange accent shape near the bottom, large empty center for a CTA button. Flat 2D. No text.
```

---

## 3. テロップ＆数字（Remotion側で後乗せ・参考）

| シーン | 1行目 / 2行目 | 種別 |
|---|---|---|
| S1 | 広告と求人に / 毎月いくら？ | 通常 / 強調 |
| S1後半 | そのお金、 / 意味ありますか？ | ペイン |
| S2 | 止めたら、消える | 手元に何も残らない | ペイン |
| S3 | 同じ会社でも / 選ばれ方が変わる | 通常 / 強調(青) |
| S4 | 広告費0円 → フォロワー18万人 → 集客5.5倍 → 応募200名 | 数字カウントアップ |
| S4締め | SNSは"資産"になる | 強調 |
| S5 | 特別なことはしていない / 社長・社員の"人"が見える | 通常 |
| S6 | まずSNSで / 会社を調べる時代 | 通常 |
| S7 | 無料相談会で / いっしょに考えます | 通常 |
| S8 | プロフィールTOPから / Check | CTA |

数字（コード側カウントアップ）：**広告費 0円 / フォロワー 18万人 / 集客 5.5倍 / 応募 200名**。

---

## 4. 生成後チェック
画像内に文字/数字/UIが無いか・顔や手が崩れていないか・上1/3に余白があるか・色がKATALYS（白/淡い水色/ネイビー＋オレンジ少量）か・BtoBとして安っぽくないか。問題があれば末尾に
`absolutely no text, no numbers; subject in lower 60%; keep top third empty; refined premium flat illustration; strict palette #FFFFFF/#DCEEF8/#15294B with small #F59648 accent`
を足して再生成。

---

## 5. 画像が揃ったら（私の作業）
新台本に合わせて `storyboard.ts` を組み替え、テロップ・数字（0円/18万人/5.5倍/200名）・CTAを実装し、S1等は前回同様コードで動きを付けてレンダリング → 本番MP4を納品します。
