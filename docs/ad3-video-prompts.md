# 【3本目】KATALYS 広告 — 画像→動画(image-to-video)プロンプト集

> 目的：各シーンの静止画（`ad3/public/ad3/assets/s1.png` 〜 `s9.png`）を、
> **Runway Gen-3 / Kling / Luma Dream Machine / Pika** などの **image-to-video** に入れて、
> **3〜5秒の"中身が動く"ループ素材**にする。これをRemotionに差し込めば、文字・数字・CTAは
> そのまま上に乗ったまま、**人物やモノが動く**広告になる。

## 使い方（全体の流れ）
1. 各シーンの**静止画を入力画像**として image-to-video ツールにアップロード。
2. 下の**Motion prompt**を貼って 3〜5秒・**9:16**で生成（ループ向き・カメラは大きく動かさない）。
3. 書き出した動画を **`s1.mp4` 〜 `s9.mp4`** という名前にする。
4. **私に9本アップロード**してください（または `ad3/public/ad3/assets/` に置く）。
5. 私が `src/data/storyboard.ts` の `SCENES_WITH_VIDEO` に対象シーンを追加 → `npm run render` で**動く本番動画**に。

## 共通の指示（全シーンに付ける）
```
Subtle, natural, loopable motion. Keep the original composition, colors, character
identity and art style unchanged. No camera cuts, only a very slight slow push-in or
parallax. Do NOT add or change any text, numbers, UI or logos. No face warping, no
distorted hands, no morphing. Clean flat 2D animation feel, 9:16, 3-5 seconds.
```
Negative（対応ツールのみ）: `text, letters, numbers, watermark, logo, extra fingers, distorted face, morphing, flicker, jump cut`.

---

## シーン別 Motion prompt

### S1 `s1.png`（暗い夜オフィス・落ち込む担当者）
```
The man keeps looking down at the glowing smartphone; his shoulders sink very slightly and
he exhales. The small floating UI icons (heart, muted bell) gently fade out one by one, and
the faint downward graph line slowly droops a little lower. Phone screen glow flickers softly.
Quiet, melancholic, slow. Loop. [共通指示]
```

### S2 `s2.png`（投稿に追われる・頭を抱える）
```
The man slowly rubs his temple and gives a tired sigh, head tilting slightly down. The stacked
social post cards on the desk sway and settle a little; the desk calendar's top page flips once.
Soft ambient movement. Overwhelmed but calm pace. Loop. [共通指示]
```

### S3 `s3.png`（救い・見上げて安心）
```
The lighting gradually brightens and warm light spreads across the room. The man slowly lifts
his face from the phone and his expression eases into a relieved, hopeful look; a gentle breath.
Smooth, uplifting, hopeful. Loop. [共通指示]
```

### S4 `s4.png`（3カード：投稿数/編集/フォロワー）
```
The three cards gently float and softly pulse with light. The bar chart bars subtly shimmer,
the play button and timeline gently glow, the follower icons breathe slightly. Clean motion-
graphics feel, no text change. Loop. [共通指示]
```

### S5 `s5.png`（明るいオフィス背景）
```
Soft light drifts through the window, dust motes float gently, the plant leaves sway a touch,
and there is a very subtle slow push-in. Calm, bright, premium. Loop. [共通指示]
```
> ※S5は人物カードを重ねる演出も可能（任意）。その場合は `s5_ceo/staff/site` の透過カードを別途生成し、私がスライドインさせます。

### S6 `s6.png`（実績：人物アイコン＋上昇グラフ／紺）
```
The circle of audience profile icons slowly drifts outward and softly twinkles. The blue line
graph in the bottom card animates drawing upward to its peak, the arrow tip glows. The play
icons gently pulse. Energetic but clean, data-driven. Keep large empty center. Loop. [共通指示]
```

### S7 `s7.png`（スマホ2台）
```
Subtle scrolling motion appears inside both phone screens. The left (empty) phone dims slightly
and feels uncertain; the right (people-centered) phone brightens and feels warm and trustworthy.
Gentle, comparative. Loop. [共通指示]
```

### S8 `s8.png`（霞んだ店舗ビル）
```
The gray haze/veil over the building slowly clears and the scene becomes brighter and warmer,
revealing the shop's charm; the small entrance light glows softly, a little warmth returns.
Emotional, gentle reveal. Loop. [共通指示]
```

### S9 `s9.png`（オンライン無料相談）
```
The two people in the video call nod slightly and smile warmly at each other; the laptop screen
glows gently; steam rises faintly from the coffee mug. Calm, friendly, trustworthy. Loop.
[共通指示]
```

---

## 仕上げのコツ
- **尺**：各クリップ 3〜5秒でOK（シーンが長い場合はRemotion側で自動ループします）。
- **音**：不要（無音で書き出し）。ナレ・BGMは最後に編集で乗せます。
- **重要**：クリップ内に**文字を入れない**（テロップはコード側）。動きが激しすぎると破綻するので**控えめ**に。
- うまく動かない場合は §「再生成の改善」（`ad3-image-prompts.md` の方針）と同様、Motionを弱める・対象を限定する。

## 私の差し込み作業（あなたがクリップを送った後）
1. `s1.mp4`〜`s9.mp4` を `ad3/public/ad3/assets/` に配置
2. `src/data/storyboard.ts` の `SCENES_WITH_VIDEO` に対象シーンidを追加（例 `[1,2,3,4,5,6,7,8,9]`）
3. `npm run render` → **人物・モノが動く本番MP4**を納品
