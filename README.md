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

## 入力JSONフォーマット（実データ投入用）

### 基本方針
- `companyName` と `website` は最低限の入力推奨（未入力でも生成は継続）
- **不足項目があってもエラー終了せず**、`記載なし` として補完して仕様書を生成
- 可能なら配列で入力（1要素=1論点）すると品質が安定

### 推奨スキーマ

| 項目 | 型 | 説明 |
|---|---|---|
| `companyName` | string | 会社名 |
| `companySlug` | string | 出力ファイル名に使うslug（任意） |
| `website` | string | 既存サイトURL |
| `companyOverview` | string / string[] | 会社概要 |
| `currentSiteIssues` | string / string[] | 既存サイト課題 |
| `targetCustomers` | string / string[] | 想定顧客 |
| `siteConcept` | string / string[] | 新サイトのコンセプト |
| `recommendedPages` | string / string[] | 推奨ページ構成 |
| `firstViewIdeas` | string / string[] | FV訴求案 |
| `ctaIdeas` | string / string[] | CTA案 |
| `designTone` | string / string[] | デザイントーン |
| `buildInstruction` | string / string[] | 実装AI向け追加指示 |
| `avoidExpressions` | string / string[] | 避ける表現・法務注意 |

> 別名キーも対応: `overview`, `issues`, `targetAudience`, `proposedConcept`, `siteMap`, `heroIdeas`, `cta`, `designStyle`, `claudeInstruction`, `cautions`

### 実データサンプル
- `data/inputs/real-example.json`
- 既存MVPサンプル: `data/inputs/sample.json`

## 実行コマンド

### 1件実行
```bash
npm run run:one -- data/inputs/real-example.json
```

### 生成物
- `data/outputs/{slug}-site-spec.md`
- `slug` は `companySlug` → `companyName` → 入力ファイル名 の順で自動決定

### 欠損項目があるJSONの確認
```bash
npm run run:one -- data/inputs/sample.json
```
- 欠損推奨項目がある場合は `[WARN]` を表示
- ただし生成は継続され、Markdown内 `0. 入力メタ情報` に未入力項目が記録される

## 確認方法（Markdown品質チェック）

1. `data/outputs/*.md` を開く
2. 以下の順で確認
   - `1. プロジェクト要約` がAI実装者向けに明確か
   - `4. 情報設計（IA）` にページ別要件があるか
   - `6. 実装仕様` が Claude / Cursor / Codex にそのまま渡せる粒度か
   - `7. 納品物チェックリスト` で実装完了条件を判定できるか

