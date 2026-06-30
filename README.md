# Website Redesign Machine

地方中小企業向けに、古いWebサイトをモダンにリニューアルした営業デモサイトを半自動生成するプロジェクト。

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

## 新業種デモサイトの量産（MEO×Website 営業用）

スキャンで作った企業リストから、社名・エリアを差し込んだ提案用デモサイトを一括生成する。

対象業種（新4種）: 建築・外装 / フィットネス / ペット / 美容医療
（整体・鍼灸は既存「治療院」テンプレで代替するため対象外）

### 使い方

```bash
# 入力は JSON か CSV。CSVは leads_*.csv / 統合営業CRM をそのまま使える。
# 認識フィールド: 会社名 / エリア / 業種 / 口コミ数 / 既存website / place_id
#   （別名は scripts/generate-demo-sites.js の FIELD を参照）
npm run generate:sites -- data/companies/sample-companies.json --base-url https://<公開先>
```

出力:

- `sites/demo/<id>/index.html` … 1社1サイト（id例: k001 / f001 / p001 / c001）
- `sites/index.html` … 一覧ギャラリー
- `sites/demo-urls.csv` … id・会社名・エリア・デモURL（CRMの「うちのデモURL」列に貼る）
- `sites/_headers` … Cloudflare Pages 用ヘッダ（全ページ noindex）

`--base-url` を渡すと `demo-urls.csv` の「デモURL」列が公開URLで埋まる
（例: `https://<公開先>/demo/k001/`）。

### デプロイ（Cloudflare Pages）

デモは Cloudflare Pages に公開する（既存の `mihon-newbiz.pages.dev/demo/<id>` と同じ）。
`sites/` は静的ファイルのみなので、そのままデプロイできる:

```bash
wrangler pages deploy sites --project-name mihon-newbiz
```

> 使い分け: このリポジトリ直下の**公式LP**（mirai-edit / wedding / concierge / ads）は **Vercel**。
> **デモ量産サイト**（`sites/`）は **Cloudflare Pages**。

### スキャン（手順1）

Places API のスキャナ（`scan_area.py`）と `PLACES_API_KEY` はローカル専用。
新業種のキーワード追加と実行手順は
[docs/meo-new-verticals-scan.md](docs/meo-new-verticals-scan.md) を参照。

### 注意

- 写真・実績・お客様の声・料金・連絡先はすべて仮置き（差し替え前提）。掲載情報は捏造しない。
- 美容医療は医療広告ガイドライン・薬機法に配慮（効果断定・ビフォーアフター・体験談での効果保証は不可）。
