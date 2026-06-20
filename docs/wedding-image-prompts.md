# ウェディングLP｜画像生成プロンプト（10枚）

> ChatGPT（GPT-4o 画像生成 / DALL·E 3）に **共通プリアンブル＋各プロンプト** を貼って生成。
> 生成→ダウンロード→**指定ファイル名にリネーム**→ GitHubの `wedding/` フォルダ（mainブランチ）にアップ → Vercelが自動再デプロイ。
> ⚠️ これはAIプレースホルダー。**最終的には権利クリア済みの実写真**に差し替える前提（IP注意は `docs/benchmark-yu-experiences.md` §7）。

## ★ベンチ実態に合わせた方針（白無垢一辺倒にしない）
ゆめちゃんの現職（YUKARI UENO EXPERIENCES）の実ポートフォリオは多彩：
**洋装の国際カップル中心**で、屋外/ガーデン/ラグジュアリーマーキー/寺院ビュー/温泉旅館/モダン会場/テーマ系アフターパーティ（VOGUE例）まで。**和装はその選択肢の一つ**。
→ 画像も以下のバランスで散らす：

- **人物＝外国人（国際）カップル**。既定は**欧米系（白人）**、うち**1〜2枚は日系アメリカ人/ミックス（ルーツ訴求）**。
- **衣装＝洋装（ドレス/タキシード）を主役**に、**和装（白無垢/色打掛）は1〜2枚**だけ。披露宴のカラードレスもあり。
- **ロケ＝散らす**：寺院テラスからの京都ビュー / 屋外ガーデン挙式 / マーキー / 温泉旅館 / モダン都会会場 / 桜。
- 家族・ゲストも**海外から来た欧米系の家族**。

## 共通プリアンブル（毎回これを先頭に付ける）
```
Photorealistic editorial wedding photograph, cinematic, medium-format film look,
soft natural light, warm golden tone, deep shadows, refined understated luxury,
shallow depth of field, fine film grain. Mood/palette: sumi black, antique gold,
cream, soft blush. Authentic, respectful Japanese setting (no kitsch, no costume look).
The couple are international (non-Japanese) clients having a luxury destination wedding
in Japan. Natural realistic anatomy and hands. No text, no logos, no watermarks.
```

---

### 1. `hero.jpg` — ヒーロー背景（横長 16:9 / 左上を暗く・テキスト用の余白）
```
Wide cinematic destination-wedding shot at golden hour: an elegant Western (Caucasian)
couple — bride in a flowing white gown, groom in a black tux — on a temple terrace
overlooking the rooftops and hills of Kyoto, stone lanterns and a distant pagoda, soft
mist. Aspirational and emotional. Rich deep shadows in the upper-left third for text space.
Muted gold and charcoal tones. Landscape 16:9.
```

### 2. `ceremony.jpg` — Why Japan 大判（横長 3:2 / 屋外挙式）
```
An elegant outdoor wedding ceremony in a Japanese garden or temple courtyard: an
international (Western) couple at the altar beneath a torii gate or a floral arch, guests
seated on either side, maple trees and lanterns, a celebrant. Bride in a white gown,
groom in a tux. Emotional, refined, natural daylight. Landscape 3:2.
```

### 3. `shrine.jpg` — 「Ceremony & rites」カード（横長 3:2 / 伝統の儀式オプション）
```
A tasteful detail of an optional traditional Japanese wedding rite: a Western couple in
kimono performing the san-san-kudo sake ritual inside a wooden shrine hall — or a close-up
of stacked lacquered sake cups, a sakaki branch and gold ritual objects, white and
vermilion accents, shallow focus. Sacred, elegant. Landscape 3:2.
```

### 4. `kimono.jpg` — 「Venue, attire & table」カード（縦長 2:3 / 和装オプション）
```
Editorial bridal portrait showing the Japanese-attire option: a Western (Caucasian) bride
in a striking colored iro-uchikake (or white shiromuku) kimono with kanzashi hair
ornaments, styled by a Japanese dresser. Focus on silk texture and gold embroidery; her
face softly turned away. Refined, luxurious, soft window light. Portrait 2:3.
```

### 5. `family.jpg` — 「Family & guest journey」カード（横長 3:2 / 披露宴）
```
Warm candid moment at a stylish wedding reception in a luxury garden marquee or elegant
hall: a Western family who travelled from abroad — grandparents to children — raising
glasses in a toast at a beautifully set table with florals and candlelight. Joyful yet
tasteful, golden evening light, gentle motion, film grain. Landscape 3:2.
```

### 6. `showcase-sakura.jpg` — Showcase 京都・春（横長 3:2）
```
A Western (Caucasian) wedding couple in elegant Western attire (white gown and black tux)
walking beneath full-bloom cherry blossoms on a Kyoto temple path, petals drifting,
soft pink and gold, dreamy backlight. Cinematic and romantic. Landscape 3:2.
```

### 7. `showcase-ryokan.jpg` — Showcase 箱根・秋の温泉旅館（横長 3:2 / ★ルーツ枠）
```
An intimate onsen-ryokan wedding in autumn: a Japanese-American / mixed-heritage couple
(one partner East Asian, one Caucasian) on the wooden engawa veranda of a traditional inn
— one in a soft kimono, one in elegant Western attire — moss garden, crimson momiji maple
leaves, lanterns, faint steam rising. Serene and luxurious, warm rust-and-gold palette.
Landscape 3:2.
```

### 8. `showcase-tokyo.jpg` — Showcase 東京・夜のモダンなアフターパーティ（横長 3:2）
```
A chic, modern wedding after-party in Tokyo at night: a stylish international couple in
contemporary attire in a dramatic converted heritage space or rooftop with city lights
beyond, a creative themed celebration, sophisticated guests, moody warm and softly
neon-tinged lighting. Editorial, glamorous, joyful. Landscape 3:2.
```

### 9. `planner.jpg` — プランナー紹介セクション（縦長 2:3 / 顔は写さない）
```
Behind-the-scenes editorial: a Japanese wedding planner's hands arranging place cards and
florals, or adjusting a bride's sash, at a beautifully styled venue. No clear face; focus
on care and craftsmanship. Soft daylight, refined. Portrait 2:3.
```

### 10. `details.jpg` — フル幅の「間」バンド（横長 16:9 / 暗めの上に重なるので光は豊かに）
```
Opulent macro still life of luxury wedding details on dark lacquer: wedding rings, mizuhiki
cord knots, gold leaf, delicate florals, a sprig of sakura or pine, warm candlelight,
deep shadows. Tactile, gold-on-black, luxurious. No people. Landscape 16:9.
```

---

## 使い方メモ
- まず **1（hero）** を生成し、**左上に文字が乗っても読めるか**（暗部があるか）を確認。明るすぎたら "darker upper-left, more negative space" を追記して再生成。
- 人物が**日本人寄りに出たら** "the couple are clearly Western / non-Japanese foreigners" を強めに追記。
- **和装は #3 と #4 の2枚だけ**。他は洋装・屋外・モダンで散らす（白無垢一辺倒を避ける）。
- 縦横比は ChatGPT では landscape / portrait / square で指定可。上記の 16:9・3:2・2:3 を言葉で添える。
- 特定の有名人・実在人物に**似せない**（顔は伏せ気味が安全＆後で実写に差し替えやすい）。
- 10枚そろったら `wedding/` にアップ。ファイル名は**完全一致**（例 `showcase-sakura.jpg`）で。
