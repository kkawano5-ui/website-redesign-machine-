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
