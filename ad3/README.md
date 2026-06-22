# KATALYS 広告(3本目) — Remotion 実装

9:16 / 1080×1920 / 30fps / 45秒。**ChatGPT/gpt-imageで作った高品質イラストを素材に、テロップ・数字・CTA・画面遷移をコードでアニメーション化**する構成。

## 役割分担
- **ChatGPT / gpt-image**：各シーンの高品質イラスト（`public/ad3/assets/`、AI画像内に文字なし）
- **Remotion (このプロジェクト)**：ズーム/パン/パララックス/フェード/スライド/ポップ、日本語テロップ、数字カウントアップ、CTA、画面遷移

## ディレクトリ
```
ad3/
├─ src/
│  ├─ data/storyboard.ts      # ★データ駆動：尺・テロップ・素材パス・アニメ種別
│  ├─ components/             # Telop / NumberStat / Overlay / Cta / SceneView
│  ├─ Ad3.tsx Root.tsx index.ts fonts.ts theme.ts helpers.ts
├─ public/ad3/assets/         # 画像素材（今はプレースホルダ）
├─ scripts/gen_placeholders.py
└─ package.json
```

## 使い方
```bash
cd ad3
npm install

# 1) ChatGPT/gpt-imageで画像を生成し、docs/ad3-image-prompts.md の
#    ファイル名のまま public/ad3/assets/ に上書き保存する
#    （未生成のうちはプレースホルダのまま動く）

# 2) プレビュー（ブラウザでスタジオ）
npm run studio

# 3) 書き出し（MP4）
npm run render          # -> out/katalys-ad3.mp4
```

## 編集ポイント
- **文言・尺・タイミング・色**は `src/data/storyboard.ts` を編集するだけ（コード変更不要）。
- 1シーンに複数の差分カードを足したい場合は `overlays` に追記（`enter`/`delay`/位置/幅）。
- ナレーション・BGMは書き出し後に編集ソフトで後乗せ（本プロジェクトは無音）。

## 注意
- AI画像に文字が写り込んでいたら**使わない**（テロップは必ずコード側）。
- 画像は 9:16・上1/3に余白がある構図に。詳細は `docs/ad3-image-prompts.md`。
