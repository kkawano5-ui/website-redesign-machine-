# ウェディングLP｜画像生成プロンプト（10枚）

> ChatGPT（GPT-4o 画像生成 / DALL·E 3）に **共通プリアンブル＋各プロンプト** を貼って生成。
> 生成→ダウンロード→**指定ファイル名にリネーム**→ GitHubの `wedding/` フォルダ（mainブランチ）にアップロード → Vercelが自動再デプロイ。
> ⚠️ これはAIプレースホルダー。**最終的には権利クリア済みの実写真**に差し替える前提（IP注意は `docs/benchmark-yu-experiences.md` §7）。

## 共通プリアンブル（毎回これを先頭に付ける）
```
Photorealistic editorial wedding photograph, cinematic, medium-format film look,
soft natural light, warm golden tone, deep shadows, refined understated luxury,
shallow depth of field, fine film grain. Mood/palette: sumi black, antique gold,
cream, soft blush. Authentic, respectful Japanese setting (no kitsch, no costume look).
Natural realistic anatomy and hands. No text, no logos, no watermarks, no captions.
```

---

### 1. `hero.jpg` — ヒーロー背景（横長 16:9 / 左上を暗く・テキスト用の余白）
```
Wide cinematic establishing shot at golden hour: a couple seen from behind walking
through a path of vermilion torii gates toward a Kyoto shrine. Bride in a white
shiromuku kimono, groom in black montsuki haori. Soft mist, glowing stone lanterns,
rich deep shadows in the upper-left third for text space. Epic, emotional, a sense of
homecoming and roots. Muted gold and charcoal tones. Landscape 16:9.
```

### 2. `ceremony.jpg` — Why Japan 大判（横長 3:2）
```
Intimate Shinto wedding ceremony inside a wooden shrine hall: a couple performing the
san-san-kudo sake ritual, a Shinto priest in white robes, tatami and cedar pillars,
diffused light through shoji screens. Reverent, quiet, ceremonial. Warm amber tones.
Landscape 3:2.
```

### 3. `shrine.jpg` — 「Ceremony & rites」カード（横長 3:2）
```
Close editorial detail at a shrine wedding: hands offering a stacked lacquered sake cup,
a sakaki branch and gold ritual objects, white and vermilion accents, shallow focus.
Sacred, minimal, elegant. Landscape 3:2.
```

### 4. `kimono.jpg` — 「Venue, attire & table」カード（縦長 2:3）
```
Editorial bridal portrait: a bride in an exquisite white shiromuku with a tsunokakushi
headpiece and a deep-red uchikake detail, kanzashi hair ornaments, being styled.
Focus on silk texture and gold embroidery; face softly turned away. Refined, luxurious,
soft window light. Portrait 2:3.
```

### 5. `family.jpg` — 「Family & guest journey」カード（横長 3:2）
```
Warm candid moment at a wedding banquet: a multigenerational family (grandparents to
children) raising sake cups in a toast around a beautifully set table with lanterns and
florals. Joyful yet tasteful, golden evening light, gentle motion, film grain.
Landscape 3:2.
```

### 6. `showcase-sakura.jpg` — Showcase 京都・春（横長 3:2）
```
A wedding couple in formal attire walking beneath full-bloom cherry blossoms on a Kyoto
temple path, petals drifting in the air, soft pink and gold, dreamy backlight.
Cinematic and romantic. Landscape 3:2.
```

### 7. `showcase-ryokan.jpg` — Showcase 箱根・秋の温泉旅館（横長 3:2）
```
An intimate onsen-ryokan wedding in autumn: a traditional Japanese inn with a moss
garden and crimson momiji maple leaves, a couple in kimono on a wooden engawa veranda,
lanterns, faint steam rising. Serene and luxurious, warm rust-and-gold palette.
Landscape 3:2.
```

### 8. `showcase-tokyo.jpg` — Showcase 東京・夜のアフターパーティ（横長 3:2）
```
A chic modern wedding after-party in Tokyo at night: a stylish couple in a candlelit
contemporary venue / a converted heritage space with city lights beyond, sophisticated
guests, moody warm lighting. Editorial and glamorous. Landscape 3:2.
```

### 9. `planner.jpg` — プランナー紹介セクション（縦長 2:3 / 顔は写さない）
```
Behind-the-scenes editorial: an elegant wedding planner's hands arranging place cards
and florals, or adjusting the bride's obi sash, at a beautifully styled Japanese venue.
No clear face; focus on care and craftsmanship. Soft daylight, refined. Portrait 2:3.
```

### 10. `details.jpg` — フル幅の「間」バンド（横長 16:9 / 暗めの上に重なるので光は豊かに）
```
Opulent macro still life of Japanese wedding details on dark lacquer: mizuhiki cord
knots, gold leaf, a folded silk obi, a pair of wedding rings, a sprig of sakura or pine,
warm candlelight, deep shadows. Tactile, gold-on-black, luxurious. Landscape 16:9.
```

---

## 使い方メモ
- まず **1（hero）** を生成し、**左上に文字が乗っても読めるか**（暗部があるか）を確認。明るすぎたら「darker upper-left, more negative space」を追記して再生成。
- 縦横比は ChatGPT では「landscape / portrait / square」で指定可。上記の 16:9・3:2・2:3 を言葉で添える。
- 人物は**特定の有名人・実在人物に似せない**こと（顔は伏せ気味が安全＆後で実写に差し替えやすい）。
- 10枚そろったら `wedding/` にアップ。ファイル名は**完全一致**（例 `showcase-sakura.jpg`）で。
