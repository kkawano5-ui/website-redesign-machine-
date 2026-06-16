# Website Redesign Machine

地方中小企業向けに、古いWebサイトをモダンにリニューアルした営業デモサイトを半自動生成するプロジェクト。

> 🔮 **四柱推命×手相 自動鑑定サービス**（ココナラ向け）も同梱しています。詳細は [`docs/coconala-fortune-service.md`](docs/coconala-fortune-service.md) と下記「占い鑑定サービス」セクションを参照。

## 目的

- 営業時に見せるデモサイトURLを量産する
- 営業メール送信は当面やらない
- まずは1社ずつ半自動で高品質なデモを作る

## 基本フロー

Google Sheets / CSV
→ Manusで既存サイトリサーチ
→ GPTでサイト制作仕様書生成
→ ClaudeでAstro + Tailwindコード生成
→ CodexでNode.jsパイプライン実装
→ GitHub保存
→ Cloudflare Pages公開
→ GPTレビュー
→ SheetsまたはCSVに結果保存

## 役割分担

- Manus：既存サイト・競合・会社情報のリサーチ
- GPT：提案整理、サイト仕様書、品質レビュー
- Claude：Webサイトコード生成
- Codex：Node.jsスクリプト、GitHub/Cloudflare/Sheets連携の実装
- Cloudflare：デモサイト公開
- GitHub：コード管理

## 重要方針

- 既存サイトの文章をそのままコピーしない
- 著作権リスクのある画像を使わない
- 地方中小企業向けに、信頼感・清潔感・現代感を重視
- 奇抜すぎるデザインにしない
- 最初から完全自動化しない
- まずは5社で検証する
- 1サイトあたりの人間修正時間を10分以内にする

## ManusリサーチJSON仕様（`data/inputs/sample.json`）

### 必須項目
以下が**1つでも欠けるとエラー終了**します。

- `companyName` (string): 会社名
- `website` (string): 既存サイトURL
- `companyOverview` (string[] | string): 会社概要
- `currentSiteIssues` (string[] | string): 既存サイトの課題
- `targetCustomers` (string[] | string): 想定ターゲット
- `siteConcept` (string[] | string): 新サイトのコンセプト
- `recommendedPages` (string[] | string): 推奨ページ構成
- `firstViewIdeas` (string[] | string): ファーストビュー訴求案
- `ctaIdeas` (string[] | string): CTA案
- `designTone` (string[] | string): デザイントーン
- `buildInstruction` (string[] | string): 生成AI向け制作指示

### 任意項目
- `companySlug` (string): 出力ファイル名に使うslug。未指定時は `companyName` または入力ファイル名から自動生成。
- `avoidExpressions` (string[] | string): 避ける表現や法務・表現上の注意。

### 最小サンプル
`data/inputs/sample.json` を参照。

## MVP実行方法（Manus JSON -> サイト制作仕様書）

1. `data/inputs/*.json` にManusのリサーチ結果JSONを配置
2. 以下コマンドで1件分の仕様書Markdownを生成

```bash
npm run run:one -- data/inputs/sample.json
```

生成物:
- `data/outputs/{slug}-site-spec.md`
- `slug` は `companySlug` があればそれを優先、なければ会社名またはファイル名から生成


## 実運用のコツ（業種汎用化）

- `industry`（例: 墓石・霊園 / 病院 / 士業 / 製造業 / 介護）を入力すると、仕様書内の信頼要素・画像方針・注意表現が業種寄りになります。
- `recommendedPages` と `ctaIdeas` は業種に合わせて具体名で記述してください（例: 見学予約、診療予約、資料請求、面談申込）。
- 誇大表現・断定表現を避けるため、`avoidExpressions` に業界特有のNG表現を必ず追加してください。

## サンプル入力

- 標準サンプル: `data/inputs/sample.json`
- 旧来業界サンプル（霊園・墓石）: `data/inputs/memorial-sample.json`

## 実行例

```bash
npm run run:one -- data/inputs/memorial-sample.json
```

---

## 占い鑑定サービス（四柱推命 × 手相）

手のひらの写真と生年月日から、**四柱推命の命式を土台に手相を重ねた複合鑑定書**を自動生成する。ココナラでの個人サービス運用を想定。事業設計は [`docs/coconala-fortune-service.md`](docs/coconala-fortune-service.md)。

### 構成

- `scripts/fortune/bazi.js` … 四柱推命の命式計算（年/月/日/時の干支・日主・通変星・五行）。決定論的でAPIキー不要。日柱は `(JDN+49) mod 60`、年柱・月柱は太陽黄経で節入りを判定。
- `scripts/fortune/palm.js` … 手相画像をClaude Visionで観察（`prompts/palm-vision.md`）。
- `scripts/fortune/generate-reading.js` … 命式＋手相を統合し鑑定書を生成（`prompts/fortune-reading.md`）。
- `scripts/run-fortune.js` … CLIエントリ。
- `fortune/index.html` … 集客用LP。

### 使い方

```bash
# 命式だけ確認（APIキー不要・節入り境界の検証に便利）
npm run fortune -- data/fortune-inputs/sample.json --bazi-only

# 鑑定書を生成（要 ANTHROPIC_API_KEY）
npm run fortune -- data/fortune-inputs/sample.json
# → data/fortune-outputs/<日付>-<ニックネーム>.md

# エンジンの検算（日柱・年柱・時柱）
npm run fortune:test
```

依頼1件 = `data/fortune-inputs/*.json` 1ファイル（`birth`＋`palmImage`＋`concern`）。フォーマットは `data/fortune-inputs/sample.json` を参照。

### 自動化の範囲

命式計算・手相読み取り・鑑定文生成は全自動。ココナラは自動納品APIを公開していないため、**受注・納品（トークへのコピペ）のみ手作業**（1件5分以内が目標）。

### 注意

- エンタメ・自己理解目的。健康・病気・寿命の診断や断定はしない（`prompts/fortune-reading.md` にルール内蔵）。
- 節入り当日生まれ・出生時刻不明のケースは精度が下がるため、命式を `--bazi-only` で確認してから鑑定する。
