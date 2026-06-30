# Slackスタンプ 一括作成ツール

自作の文字スタンプ（Slackカスタム絵文字）を **128×128の透過PNG** でまとめて生成し、
Slackに一括アップロードするためのツールです。
文字には白フチが付いているので、**Slackのライトモード／ダークモード両方で読めます**。

> ⚠️ 前提：Slackのカスタム絵文字は**ワークスペース全体**で共有されます。
> 「特定のチャンネルだけ」に入れることはできません（登録すれば全チャンネルで使えます）。

## 収録セット

| 定義ファイル | 出力先 | 内容 |
|--------------|--------|------|
| `stamps.json`        | `out/`        | カジュアル系（了解！/ それな！/ 優勝 など） |
| `stamps-polite.json` | `out-polite/` | **丁寧語系（承知しました / お疲れ様です / ご確認ください など）** |

```bash
node generate.mjs                          # stamps.json -> out/
node generate.mjs stamps-polite.json out-polite   # 丁寧語セット -> out-polite/
```

文字は **枠いっぱいまで自動拡大**＋**均等改行**（孤立した1文字行を作らない）で、
長い丁寧語でも崩れず大きく表示されます。

---

## 1. スタンプの中身を決める（`stamps.json`）

`stamps.json` を編集するだけで、好きな文字・色のスタンプを追加できます。

```json
[
  { "name": "ryoukai", "text": "了解！", "color": "#ff3b30" },
  { "name": "kami",    "text": "神",     "color": "#d4a017" }
]
```

| キー    | 意味 |
|---------|------|
| `name`  | Slackでの絵文字名（`:ryoukai:` で呼び出す）。**半角英数・小文字・アンダースコアのみ** |
| `text`  | スタンプに表示する文字（日本語OK・2〜4文字くらいが映える） |
| `color` | 文字色（CSSカラー。`#ff3b30` など） |

## 2. 画像を生成する

```bash
cd scripts/slack-stamps
npm install        # 初回のみ（puppeteer-core を入れる）
node generate.mjs  # out/ に PNG が出力される
```

- Chrome / Chromium を自動検出します。見つからない場合は環境変数で指定：
  ```bash
  CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node generate.mjs
  ```
- 仕上がりは `out/` フォルダに `了解 → ryoukai.png` のように出力されます。
- 全体プレビューは `contact-sheet.png` を参照。

## 3. Slackに一括アップロード

Slackには公式の一括追加機能がないため、次のどちらかで入れます。

### 方法A：Chrome拡張「Slack Emoji Tools」（ノーコード・おすすめ）
1. Chromeに **Slack Emoji Tools** 拡張を追加
2. `https://(あなたのワークスペース).slack.com/customize/emoji` を開く
3. 拡張が追加する一括アップロード欄に `out/` の画像をまとめてドラッグ＆ドロップ
   （ファイル名がそのまま絵文字名になります）

### 方法B：emojme（CLIで自動化）
```bash
npx emojme upload --subdomain ワークスペース名 --token xoxc-... --src ./out
```
※ トークンはブラウザの開発者ツールから取得が必要です。

---

## 画像の仕様（Slackの条件）
- 128×128px / 正方形
- 128KB以下（本ツールの出力は数KB〜十数KBで余裕）
- PNG（透過対応）

## 顔・人物スタンプを追加したい場合
写真を用意し、切り抜き（背景透過）した正方形PNGを `out/` に置けば、そのままアップロード対象になります。
切り抜きや加工が必要なら別途対応します。
