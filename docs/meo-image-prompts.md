# デモ画像の生成（ChatGPT / gpt-image-1）

デモサイトの hero と「作例ギャラリー」を、業種ごとの画像で差し替える仕組み。
画像は**業種共通**（社名非依存）＝1業種で使い回す。1業種 = hero 1枚 + gallery 6枚。

> **このリポジトリ（リモート環境）では画像生成は実行できません**
> （`OPENAI_API_KEY` 無し・`api.openai.com` への egress 遮断）。生成はローカルMacで行います。

## 配置ルール（これだけ守れば自動で反映）

```
assets/<業種key>/hero.png        … heroの画像（横長）
assets/<業種key>/1.png 〜 6.png   … 作例ギャラリー6枚（正方形）
```

- 業種key一覧: `kenchiku, fitness, pet, biyoclinic, lodging, retail, beauty_relax,
  amusement, outdoor, sauna, workshop, fortune, rental`
  （対応表は `docs/meo-new-verticals-scan.md`、シーン定義は `scripts/demo/image-prompts.js`）
- `npm run generate:sites` 実行時に `assets/` が `sites/assets/` にコピーされ、各デモに反映。
- 画像が無い業種は**プレースホルダ表示のまま**（`onerror` フォールバックで壊れない）。

## 生成方法（どれでもOK）

### A. 同梱スクリプト（推奨・依存ゼロ）。OpenAI か Google を選べる

```bash
# --- OpenAI（gpt-image-1 / dall-e-3）---
OPENAI_API_KEY=sk-proj-... npm run gen:images
OPENAI_API_KEY=sk-proj-... npm run gen:images -- --genre lodging --model dall-e-3

# --- Google Imagen（Placesと同じGoogle系。GoogleキーでOK）---
GOOGLE_API_KEY=AIza... npm run gen:images -- --provider google
GOOGLE_API_KEY=AIza... npm run gen:images -- --provider google --genre lodging,sauna
```

- どちらの鍵も**実際の文字列**を入れる（`本物の鍵` 等のプレースホルダはエラーで停止）。
- プロンプトは `scripts/demo/image-prompts.js`（`STYLE` + 業種別シーン）。調整はここで。
- OpenAI で `gpt-image-1` が未認証エラーなら `--model dall-e-3`。既存ファイルは上書きしない（`--force` で上書き）。
- **Google Imagen の鍵**: Places用キーはMapsに制限されている場合が多いので、`aistudio.google.com` で
  **Gemini APIキー**を新規発行するのが確実（同じGoogleアカウント／課金プロジェクトに紐付け）。Imagen は有料。
  共有済みのPlacesキーは念のため**再発行**を。

### B. ChatGPT（手動）

`image-prompts.js` の各プロンプトを ChatGPT で生成し、上記の名前で `assets/<業種>/` に保存。

### C. 既存の image-gen パイプライン

`/Users/kuni/image-gen` 側で生成しても、出力先を `assets/<業種>/` に合わせればそのまま反映。

## スタイル・コンプラ方針

- 共通: 実写風・自然光・清潔感・日本の小規模店舗らしさ。**文字/ロゴ/識別可能な顔は入れない**（著作権・肖像リスク回避）。
- 美容・リラク / 美容医療: 効果を想起させる加工・ビフォーアフター・過度な施術演出は避け、清潔な空間中心。
- アミューズメント: 賭博・金銭を想起させる演出は避ける。
- 温浴・サウナ: 健康効果を断定する演出は避ける。
- 占い: 不安を煽る/オカルト過剰な演出は避け、落ち着いた雰囲気に。

## コスト・運用

- 全13業種 × 7枚 ≈ **91枚**。料金は OpenAI の最新価格を要確認。
- まず `--genre` で1〜2業種だけ試し、出来を見てから全体生成を推奨。
- `assets/` はバイナリなので、Git管理から外したい場合は `.gitignore` に `assets/` を追加（公開は `sites/assets/` 経由で行われる）。
