# Reel制作レシピ：Tsumugi（紡）× Raha Kenya風

> 題材：`wedding/`（Tsumugi — Heritage Weddings in Japan / "Marry where your roots began"）
> 作風：**Raha Kenya風**＝温かい陽光トーン／実在の人物・感情ドリブン／"ルーツ・自分らしさ・一歩踏み出すきっかけ"のエンパワメント物語／励まし系の手書き風テロップ。
> 形式：縦型 9:16（1080×1920）／尺 25〜30秒／無音でも読める字幕設計＋エモいBGM。

---

## 0. なぜこの組み合わせが効くか

Raha Kenya（スワヒリ語 RAHA＝"Be Happy"）の核は **「ルーツに触れて、自分らしい一歩を踏み出す」**。
Tsumugi の核は **「Marry where your roots began（ルーツの国で誓う）」**。
→ 両者は "ルーツ／belonging／背中を押す" で完全に一致。だから Raha Kenya の温かく感情的な語り口を、そのまま Tsumugi の訴求に乗せられる。

## 1. ビジュアル仕様

| 項目 | 指定 |
|---|---|
| 比率/解像度 | 9:16 / 1080×1920 |
| カラーパレット | 陽光ゴールド `#c9a24b`／クリーム `#f6efe6`／桜 `#e6c2bd`／墨 `#14100e`（Tsumugi LPと統一） |
| 色調 | 全カット **暖色・ゴールデンアワー**寄りにグレーディング（Raha Kenyaの陽だまり感） |
| フォント | 見出し=明朝/セリフ（Cormorant Garamond 等）、テロップ=手書き風 or 丸ゴシックで"人の声"感 |
| テロップ演出 | 1行ずつフェード＋わずかに上スライド。キーワードだけゴールドで色変え |
| BGM | 温かいピアノ＋弦の上り基調（Epidemic Sound「emotional / heartwarming / wedding」系）。サビ立ち上がりをCTAに合わせる |
| トランジション | クロスディゾルブ（硬いカット切替は避け、しっとり繋ぐ） |

## 2. 絵コンテ／台本（7カット）

> テロップは **日本語（Raha Kenya風・主）** と **英語（Tsumugiの実ターゲット＝在米日系カップル向け・代替）** を併記。
> 本番ターゲットが米国側なら英語版を主にする。

| # | 尺 | 使用素材 | 画面テロップ（日本語／English） | 動き |
|---|---|---|---|---|
| 1 フック | 0–4s | `wedding/hero.jpg`（夕暮れ京都・二人） | 「いつか、おじいちゃんの国で。」／*"One day… in the country we come from."* | ゆっくりズームイン＋桜の粒子 |
| 2 共感 | 4–8s | `wedding/shrine.jpg` or `ceremony.jpg` | 「"日本で挙げたい"。でも 言葉も段取りも、全部むこう側。」／*"You dream of Japan — but the language, the planning… all of it feels far away."* | 縦パン |
| 3 転換（背中を押す） | 8–12s | `wedding/sakura`（桜並木の二人） | 「大丈夫。あなたは"想い"だけ、持ってくればいい。」／*"It's okay. Bring only what matters — we carry the rest."* | クロスディゾルブ＋テロップ強調 |
| 4 価値① | 12–16s | `wedding/kimono.jpg`（白無垢） | 「神社の儀式も、着物も、料理も——英語で、ぜんぶ。」／*"Shrine rites, kimono, cuisine — handled, in English."* | 寄り→引き |
| 5 価値② | 16–20s | `wedding/family.jpg`（家族の乾杯） | 「家族の旅まで、ひとつの窓口で。」／*"Even your family's journey — one planner, one contact."* | 微ズーム |
| 6 証拠 | 20–24s | `wedding/showcase-ryokan.jpg` or `details.jpg` | 「50組以上の "ルーツに還る一日" を。」／*"50+ celebrations. 50+ families, home again."* | 数字「50+」をゴールドで強調 |
| 7 CTA | 24–28s | `wedding/hero.jpg` 暗転 or 無地ゴールド | ロゴ **Tsumugi 紡** ＋「あなたの物語を、聞かせて。」「▶ まずは無料相談」／*"Tell us your story. → Free consultation"* | ロゴフェードイン＋ボタン点滅 |

### コピーのトーン指針（Raha Kenya風）
- 上から目線で売らない。**隣で背中を押す**口調（「大丈夫」「〜でいい」「一歩」）。
- 数字・機能は1つだけ強調（"英語でぜんぶ" "ひとつの窓口" "50組+"）。盛り込みすぎない。
- 最後は必ず**問いかけ＋やさしいCTA**で締める。

## 3. 使う外部サービスと手順

1. **下地（テロップ・尺・トランジション・BGM）= Canva**（縦型 1080×1920 / "ストーリー"または動画）
   - `wedding/*.jpg` をアップロードし、上記7カットに配置。テキストアニメ＋クロスディゾルブ＋BGM。
   - 書き出し：MP4・9:16。
   - 量産・テロップ強化なら **CapCut**／日本語自動字幕なら **Vrew** に持ち替え可。
2. **補助の動くカット（任意）= 静止画→動画AI**
   - 桜が舞う・夕日が滲む等の"生きた"質感を足すなら Runway / Kling / Luma に `wedding/hero.jpg`・`sakura` を入れて数秒の微速モーション化。
3. **BGM** = Epidemic Sound / Artlist の "emotional wedding / heartwarming piano"（商用可音源のみ）。

### 補助AIカット用プロンプト例（任意）
- *"Cinematic, warm golden-hour, a couple in wedding attire overlooking Kyoto at sunset, cherry petals drifting, subtle slow push-in, film grain, emotional, 9:16."*
- *"Sun-dappled sakura tunnel, bride and groom walking toward camera, petals falling, soft warm light, gentle handheld, 9:16."*

## 4. 注意（LP脚注に準拠）
- 実績数字（50+）等は事実に即した範囲で。未取得の受賞・資格は表記しない。
- 写真は本リポジトリの `wedding/` 素材を使用（権利クリア前提）。差し替え時も著作権に注意。

---

### 差し替えメモ
題材を Concierge（`concierge/`）や Night（`lp/`）に変える場合は、§2の素材と訴求を各LPのヒーロー文言に置換すれば同じ骨格で量産可能。

---

## 5. 背景モーション（扉/光のカット）について

冒頭の「扉が開いて光が差す」級の**背景そのものが動く実写/3D**は、本来 **AI動画生成（image-to-video）** が必要なレイヤー。
ただし本リポジトリの実行環境には AI動画API/MCP が無いため、`scripts/build_reel_anim.py` 内の `render_intro_frame()` で
**プロシージャル（両扉パーティング＋光芒＋ブルーム＋火の粉）に擬似再現**している（= `wedding/reel/reel_tsumugi_rahakenya_intro.mp4` の冒頭2.8秒）。

### 本物のAI動画に差し替える手順（外部で生成）
1. **画像→動画ツール**：Runway Gen-3 / Kling / Luma Dream Machine / Pika いずれか。`wedding/hero.jpg` を入力。
2. **プロンプト例**（3〜4秒、9:16）：
   > *"Cinematic, two large wooden Japanese doors slowly opening from center, warm golden light and god-rays flooding through, cherry petals drifting, dust sparkles, slow push-in, shallow depth of field, film grain, anamorphic, 9:16, no text."*
   - 光だけ版：*"A sliver of warm sunrise light widening to fill the frame, volumetric god-rays, lens flare, dust motes, slow reveal of Kyoto at golden hour, 9:16, no text."*
3. **書き出し**：1080×1920・mp4・3〜4秒。
4. **差し込み（合成）**：生成クリップを `intro_ai.mp4` として置き、本編と0.4sクロスフェードで連結：
   ```bash
   FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
   "$FF" -i intro_ai.mp4 -i wedding/reel/reel_tsumugi_rahakenya_anim.mp4 \
     -filter_complex "[0:v]scale=1080:1920,setsar=1[a];[1:v]scale=1080:1920,setsar=1[b];\
     [a][b]xfade=transition=fade:duration=0.4:offset=3.0,format=yuv420p[v]" \
     -map "[v]" -c:v libx264 -crf 19 -pix_fmt yuv420p reel_with_ai_intro.mp4
   ```
   （`offset` は intro_ai の尺−0.4 に合わせる）
