# 【3本目】KATALYS 広告 — ChatGPT/gpt-image 画像生成プロンプト集 ＆ 素材一覧

> 役割分担：**ChatGPT/gpt-image＝高品質イラスト生成**、**Claude＝監督・編集・実装（Remotion）**。
> AI画像内に**日本語・英語・数字・ロゴ・透かしは入れない**。テロップ/数字/CTAはRemotion側で後乗せ。
> 生成した画像は **`ad3/public/ad3/assets/`** に、下表の**ファイル名のまま**保存すれば差し替え完了。

## 0. 共通プロンプト（毎回先頭に付ける）

```
Vertical 9:16 illustration, 1080x1920 composition, high-quality flat 2D animation style,
clean Japanese B2B advertising design, soft white and pale blue background, navy accents,
small warm orange accent, refined and trustworthy, not childish, not cheap stock-illustration,
generous empty space for text overlay, no text, no letters, no numbers, no logo, no watermark.
```

**人物ルール**（人物が出るシーンに付ける）
```
Japanese business people, natural realistic proportions, friendly but professional,
subtle facial expressions, modern office clothing, not anime, not manga, not overly cute,
suitable for B2B corporate advertising, clean hands, no distorted faces.
```

**構図ルール**
```
Leave large empty space in the upper-center / middle for text overlay. Keep key subjects in
the lower half or sides. Avoid clutter. Simple shapes, clear silhouettes, readable on a phone.
```

**禁止（共通）**：日本語/英語/UI風の偽テキスト・数字・ロゴ・透かし・実写・崩れた手や顔・乱雑な背景・Instagram UI。

---

## 1. シーン別プロンプト（ベース＋差分）

### Scene 1 — 落ち込む担当者　`s1.png`（背景:濃紺）
```
[共通][人物] A single Japanese office worker sitting alone in a dim office at night, looking
down at a smartphone with a quietly disappointed expression, shoulders slightly dropped.
Around the phone, a few faint abstract icons (a low flat graph, a muted heart, a silent bell)
float subtly. Dark navy mood, cinematic but flat 2D, lots of empty space in the upper third.
```
- 差分 `s1_face_down.png`（表情差分：さらに落ち込む／眉と口角をより下げる、構図同一）
- 差分 `s1_bg_dark.png`（背景差分：さらに暗い／アイコンを減らす）

### Scene 2 — 投稿に追われる担当者　`s2.png`（濃紺）
```
[共通][人物] A Japanese marketing manager at a desk with a laptop, looking tired and
overwhelmed, one hand near the temple. Many social-media post cards and a crowded content
calendar are piled around them. Navy mood, flat 2D, empty space in the upper third.
```
- 透過素材 `s2_cards.png`：`A neat stack of blank social-media post cards (rounded rectangles with a small play glyph and gray bars, NO text), flat 2D, transparent background.`
- 透過素材 `s2_calendar.png`：`A simple flat calendar icon with an orange header and small blue/gray day cells, NO numbers, NO text, transparent background.`

### Scene 3 — 明るくなる担当者　`s3.png`（淡い水色）
```
[共通][人物] The same Japanese worker, now in soft warm morning light, slowly lifting their
face with a relieved, hopeful expression. Background shifting to pale blue, gentle light from
upper-left. Minimal, flat 2D, generous empty space in the upper half.
```
- 差分 `s3_relieved.png`（安心した表情を強める）／`s3_light.png`（光を強めた差分）

### Scene 4 — 原因の再定義　`s4.png`（淡い水色）
```
[共通] Three abstract flat cards arranged in a row, representing (left) posting volume as
stacked bars, (center) video editing as a play symbol, (right) follower count as small person
icons. Clean B2B infographic, pale blue & white, NO text, large empty space above for a headline.
```
- 透過素材 `s4_center.png`：`A single highlighted blue rounded card representing "people-centered SNS" — a friendly person silhouette inside, soft glow, flat 2D, transparent background, NO text.`

### Scene 5 — 人が見えるSNS　`s5.png`（白）＋ 3カード透過
```
[共通] Clean white-to-pale-blue background with soft light, large empty space in the upper
third for a headline. Flat 2D B2B style. (Base background only; the cards are separate assets.)
```
- `s5_ceo.png`：`A vertical social-media post card showing a friendly Japanese company president speaking naturally to camera, warm, trustworthy, flat 2D, rounded card with gray placeholder bars (NO text), transparent background.`
- `s5_staff.png`：`...Japanese employees smiling together at work...` 同型
- `s5_site.png`：`...a behind-the-scenes worksite / office moment...` 同型

### Scene 6 — 実績　`s6.png`（濃紺）
```
[共通] A flat vector infographic background on deep navy: many small audience profile icons
spread across the frame, a smoothly rising line graph in a white card near the bottom, and a
few soft play-button icons. LARGE EMPTY SPACE in the vertical center for big numbers to be
added later. Energetic but clean, NO text, NO numbers.
```
- 任意差分：`s6_followers.png`（フォロワーアイコンを密に）／`s6_graph.png`（グラフのみ）

### Scene 7 — SNSで会社を調べる　`s7.png`（淡い水色）＋ 2カード透過
```
[共通] Pale blue background with large empty space in the upper third. Two large smartphone
frames stand side by side (empty). Flat 2D B2B. (Profile contents are separate card assets.)
```
- `s7_empty.png`：`A company profile card that looks empty and uncertain: gray avatar, gray
  bars, a faint question feeling, flat 2D, transparent background, NO text.`
- `s7_warm.png`：`A company profile card that feels warm and trustworthy: a friendly person
  photo-style avatar, people-centered content thumbnails, a small orange heart accent, flat 2D,
  transparent background, NO text.`

### Scene 8 — もったいない　`s8.png`（淡い水色）＋ reveal透過
```
[共通] A warm, good small-company building illustration centered, but partly hidden behind a
translucent gray layer (its charm is obscured). Pale blue background, flat 2D, empty space in
the upper third. NO text.
```
- `s8_reveal.png`：`Several friendly social-media content cards (each with a smiling Japanese
  person silhouette) arranged around a company, revealing its personality, warm and bright,
  flat 2D, transparent background, NO text.`

### Scene 9 — 無料相談CTA　`s9.png`（白）
```
[共通][人物] A friendly online consultation: a Japanese SNS advisor and a business owner
smiling calmly at each other through a laptop video call. Clean white & light blue, trustworthy
B2B atmosphere, LARGE EMPTY SPACE at the bottom for a CTA button. Flat 2D, NO text, NO logo.
```
- `s9_endcard.png`（任意）：`A clean brand-color end-card background, soft pale-blue to white
  gradient with a subtle orange accent shape at the bottom, large empty center, flat 2D, NO text.`

---

## 2. 素材一覧（ファイル名 → 配置先 `ad3/public/ad3/assets/`）

| シーン | ベース | 差分 / 透過素材 |
|---|---|---|
| 1 | `s1.png` | `s1_face_down.png`, `s1_bg_dark.png` |
| 2 | `s2.png` | `s2_cards.png`, `s2_calendar.png` |
| 3 | `s3.png` | `s3_relieved.png`, `s3_light.png` |
| 4 | `s4.png` | `s4_center.png` |
| 5 | `s5.png` | `s5_ceo.png`, `s5_staff.png`, `s5_site.png` |
| 6 | `s6.png` | `s6_followers.png`, `s6_graph.png` |
| 7 | `s7.png` | `s7_empty.png`, `s7_warm.png` |
| 8 | `s8.png` | `s8_reveal.png` |
| 9 | `s9.png` | `s9_endcard.png` |

> 現状は `gen_placeholders.py` が生成した**プレースホルダ**が入っている。上記プロンプトで作った画像を**同名で上書き**するだけで本番化する。

---

## 3. テロップ一覧（Remotion側で後乗せ／`src/data/storyboard.ts`）

| 秒 | 1行目 | 2行目 | 種別 |
|---|---|---|---|
| 0–4 | 投稿してるのに | 伸びない… | 通常 / ペイン |
| 4–8 | 自分のやり方が | 悪いのかな？ | 通常 / ペイン |
| 8–12 | でも、大丈夫 | 努力不足じゃない | 救済 / 救済 |
| 12–17 | 伸びる理由は | そこじゃない（青） | 通常 |
| 17–23 | SNSに | **人**（特大・青）＋ が見えているか | 強調 |
| 23–31 | 広告費0円（帯） | **18万人 / 100万回再生 / 50本以上**（数字アニメ） | 強調・カウントアップ |
| 31–36 | 今は、まずSNSで | 会社を調べる時代（青） | 通常 |
| 36–41 | 良さが伝わらないのは | **もったいない**（橙・強調） | 強調 |
| 41–45 | 無料相談会で | 一緒に考えます（青）＋ CTA「プロフィールTOPから／無料相談会へ」 | 通常 + CTA |

文字アニメ仕様（実装済み）：通常=opacity0→1 / y24→0 / scale .98→1 / 0.35s・2行目0.08s遅れ。ペイン=表示後に沈む＋わずかに減光。救済=背景を明るく＋後光＋scale .95→1.05→1.0。強調=scale .8→1.12→1.0＋水色ハイライト帯を左→右にワイプ。数字=0からカウントアップ＋完了時バウンド＋円形グロー。CTA=下からスライドイン＋ポップ＋2秒に一度の微パルス（点滅なし）。

---

## 4. 出力チェック（生成後に必ず確認）

- 画像内に文字（日本語/英語/数字/UI）が入っていないか
- 顔が崩れていないか／手が大きく崩れていないか
- 9:16で**上1/3に余白**があるか（テロップを載せる）
- 色味がKATALYS（白・淡い水色・ネイビー＋オレンジ少量）に合うか
- BtoB広告として安っぽくないか・子どもっぽくないか

## 5. 再生成が必要なときの改善プロンプト指針

- **文字が入った** → 末尾に `absolutely no text, no letters, no numbers, no UI labels, blank surfaces only` を追加し再生成。
- **手・顔が崩れた** → `hands hidden or simplified, clean undistorted face, simple flat shapes` を追加、人物を小さめ・後ろ向き寄りに。
- **余白が足りない** → `subject in lower 60%, keep the top third empty and clean` を強調。
- **安っぽい/素材サイト風** → `refined editorial flat illustration, limited palette, soft shadows, premium B2B look` を追加。
- **色がズレる** → `strict palette: #FFFFFF, #DCEEF8, #15294B with a small #F59648 accent only`。
