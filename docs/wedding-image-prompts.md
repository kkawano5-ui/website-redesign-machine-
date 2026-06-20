# ウェディングLP｜画像生成プロンプト（10枚）

> ChatGPT（GPT-4o 画像生成 / DALL·E 3）に **共通プリアンブル＋各プロンプト** を貼って生成。
> 生成→ダウンロード→**指定ファイル名にリネーム**→ GitHubの `wedding/` フォルダ（mainブランチ）にアップロード → Vercelが自動再デプロイ。
> ⚠️ これはAIプレースホルダー。**最終的には権利クリア済みの実写真**に差し替える前提（IP注意は `docs/benchmark-yu-experiences.md` §7）。

## ★キャスティング（最重要）
顧客＝**アメリカの外国人カップル**。LPの人物も**外国人にする**（日本人カップルだと「日本人向け式場」に見えてしまう）。
- 既定＝**欧米系（白人）の国際カップル**を中心に。
- うち2枚は**ルーツ訴求**として **日系アメリカ人 or ミックス（白人×アジア系）カップル**。
- 衣装は**和装（白無垢/紋付）と洋装（ドレス/タキシード）をミックス**＝「外国人が日本で挙げる」感を出す。
- 家族・ゲストも**欧米系の家族**（海外から来た親族）。

## 共通プリアンブル（毎回これを先頭に付ける）
```
Photorealistic editorial wedding photograph, cinematic, medium-format film look,
soft natural light, warm golden tone, deep shadows, refined understated luxury,
shallow depth of field, fine film grain. Mood/palette: sumi black, antique gold,
cream, soft blush. Authentic, respectful Japanese setting (no kitsch, no costume look).
The couple are international (non-Japanese) wedding clients getting married in Japan.
Natural realistic anatomy and hands. No text, no logos, no watermarks, no captions.
```

---

### 1. `hero.jpg` — ヒーロー背景（横長 16:9 / 左上を暗く・テキスト用の余白）
```
Wide cinematic establishing shot at golden hour: a Western (Caucasian) couple seen from
behind walking through a path of vermilion torii gates toward a Kyoto shrine. Bride in a
white shiromuku kimono, groom in black montsuki haori. Soft mist, glowing stone lanterns,
rich deep shadows in the upper-left third for text space. Epic, emotional, a sense of
arrival and belonging. Muted gold and charcoal tones. Landscape 16:9.
```

### 2. `ceremony.jpg` — Why Japan 大判（横長 3:2）
```
Intimate Shinto wedding ceremony inside a wooden shrine hall: a Western (Caucasian) couple
performing the san-san-kudo sake ritual, a Japanese Shinto priest in white robes, tatami
and cedar pillars, diffused light through shoji screens. The foreign couple are moved and
reverent. Warm amber tones. Landscape 3:2.
```

### 3. `shrine.jpg` — 「Ceremony & rites」カード（横長 3:2）
```
Close editorial detail at a shrine wedding: hands offering a stacked lacquered sake cup,
a sakaki branch and gold ritual objects, white and vermilion accents, shallow focus.
Sacred, minimal, elegant. (No faces needed.) Landscape 3:2.
```

### 4. `kimono.jpg` — 「Venue, attire & table」カード（縦長 2:3）
```
Editorial bridal portrait: a Western (Caucasian) bride in an exquisite white shiromuku
with a tsunokakushi headpiece and a deep-red uchikake detail, kanzashi hair ornaments,
being styled by a Japanese kimono dresser. Focus on silk texture and gold embroidery;
the bride's face softly turned away. Refined, luxurious, soft window light. Portrait 2:3.
```

### 5. `family.jpg` — 「Family & guest journey」カード（横長 3:2）
```
Warm candid moment at a wedding banquet: a Western family who travelled from abroad
(grandparents to children) raising sake cups in a toast around a beautifully set table
with lanterns and florals. Joyful yet tasteful, golden evening light, gentle motion,
film grain. Landscape 3:2.
```

### 6. `showcase-sakura.jpg` — Showcase 京都・春（横長 3:2）
```
A Western (Caucasian) wedding couple in elegant Western attire (white gown and black tux)
walking beneath full-bloom cherry blossoms on a Kyoto temple path, petals drifting in the
air, soft pink and gold, dreamy backlight. Cinematic and romantic. Landscape 3:2.
```

### 7. `showcase-ryokan.jpg` — Showcase 箱根・秋の温泉旅館（横長 3:2 / ★ルーツ枠）
```
An intimate onsen-ryokan wedding in autumn: a Japanese-American / mixed-heritage couple
(one partner East Asian, one Caucasian) in kimono on a wooden engawa veranda of a
traditional inn, moss garden and crimson momiji maple leaves, lanterns, faint steam rising.
Serene and luxurious, warm rust-and-gold palette. Landscape 3:2.
```

### 8. `showcase-tokyo.jpg` — Showcase 東京・夜のアフターパーティ（横長 3:2）
```
A chic modern wedding after-party in Tokyo at night: a stylish international (Western)
couple in contemporary cocktail attire in a candlelit modern venue / a converted heritage
space with city lights beyond, sophisticated guests, moody warm lighting. Editorial and
glamorous. Landscape 3:2.
```

### 9. `planner.jpg` — プランナー紹介セクション（縦長 2:3 / 顔は写さない）
```
Behind-the-scenes editorial: a Japanese wedding planner's hands arranging place cards and
florals, or adjusting a bride's obi sash, at a beautifully styled Japanese venue. No clear
face; focus on care and craftsmanship. Soft daylight, refined. Portrait 2:3.
```

### 10. `details.jpg` — フル幅の「間」バンド（横長 16:9 / 暗めの上に重なるので光は豊かに）
```
Opulent macro still life of Japanese wedding details on dark lacquer: mizuhiki cord knots,
gold leaf, a folded silk obi, a pair of wedding rings, a sprig of sakura or pine, warm
candlelight, deep shadows. Tactile, gold-on-black, luxurious. (No people.) Landscape 16:9.
```

---

## 使い方メモ
- まず **1（hero）** を生成し、**左上に文字が乗っても読めるか**（暗部があるか）を確認。明るすぎたら "darker upper-left, more negative space" を追記して再生成。
- 人物が**日本人寄りに出たら** "the couple are clearly Western / non-Japanese foreigners" を強めに追記。
- 縦横比は ChatGPT では landscape / portrait / square で指定可。上記の 16:9・3:2・2:3 を言葉で添える。
- 特定の有名人・実在人物に**似せない**（顔は伏せ気味が安全＆後で実写に差し替えやすい）。
- 10枚そろったら `wedding/` にアップ。ファイル名は**完全一致**（例 `showcase-sakura.jpg`）で。
