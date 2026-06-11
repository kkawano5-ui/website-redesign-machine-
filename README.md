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


## 既存サイト診断（根拠あるアウトリーチ）

見込み客の現サイトを解析し、具体的な課題（スマホ非対応・メタ情報欠落・非HTTPS・
古いHTMLタグなど）を検出します。アウトリーチを「拝見したところ〇〇が…」と
根拠ベースにでき、返信・成約率の向上につながります。手作業のリサーチも省けます。

```bash
# 保存したHTMLファイルを診断（ネットワーク制限環境でも動作）
npm run audit -- data/samples/old-site-example.html

# URL指定（取得できない環境では保存HTMLでの実行を案内）
npm run audit -- https://prospect.example.com

# 検出結果を入力JSONの currentSiteIssues に反映
npm run audit -- prospect-saved.html --write data/inputs/foo.json
```

出力: 簡易スコア（低いほど改善余地大）＋検出課題＋`currentSiteIssues` 用のJSON。
`--write` で入力JSONの課題を実測値に差し替えられ、その後の仕様書・デモ・アウトリーチ
すべてに根拠が反映されます。

> 注: 正規表現ベースの簡易ヒューリスティックです。商談で事実として述べる前に裏取りを。

## リード一括展開（CSV -> 入力JSONの量産）

営業先リスト（CSV）を、検証を通る入力JSONに一括変換します。`companyName` と
`website`、`industry` 程度の薄い情報から、業種テンプレートで必須項目を補完します。
これにより「送付デモ数」を増やす入口を量産できます（売上モデルで最も安いレバー）。

```bash
npm run leads -- data/leads/prospects-sample.csv
# 既存JSONを上書きする場合:
npm run leads -- data/leads/prospects-sample.csv --force
```

CSVの列:
- `companyName`（必須）, `website`, `industry`, `companySlug`
- 任意で各必須項目を上書き可能（複数値は `|` 区切り。例: `companyOverview` 列に `A|B`）

業種は `industry` 列または会社名・概要から自動判定し、`recommendedPages` /
`ctaIdeas` / `designTone` などを業種に合わせて補完します。生成物は
`data/inputs/{slug}.json`。既存ファイルは既定でスキップします。

### 量産パイプライン（リスト -> デモ一覧）

```bash
npm run leads -- data/leads/prospects-sample.csv   # CSV -> 入力JSON
npm run build:all                                  # 入力JSON -> デモ + ギャラリー
```

2コマンドで、プロスペクト一覧からデモサイト群と提案用まとめURLまで生成できます。

## デモサイト生成（Manus JSON -> 公開可能な1ページサイト）

仕様書だけでなく、**そのまま公開できる営業デモサイト**を1コマンドで生成します。
LLM APIを呼ばない決定論的生成のため、APIキー不要・追加課金なし・即時・再現可能で、
デモURLを量産できます（営業の核となる導線）。

```bash
npm run build:site -- data/inputs/sample.json
```

生成物:
- `data/sites/{slug}/index.html`（Tailwind CDN利用・ビルド不要の静的1ページ）
- `data/sites/{slug}/_headers`（`noindex` 付与）

特徴:
- 業種を自動判定し、配色テーマ・信頼補強要素・注意表現を業種寄りに最適化
- 会社概要テキストから「◯年」「◯件」などの実績値を抽出してトラストバーに反映
- ヒーロー / 実績 / ページ構成 / 特長 / お客様の声 / FAQ / CTA / フッターのセクション構成
- 成約率を高める要素を標準搭載: 業種別FAQ（来店前の不安を解消）、お客様の声（差し替え枠）、
  モバイル用の固定CTAバー（電話・相談が常に1タップ）
- セマンティックHTML・レスポンシブ・スムーススクロール対応
- フッターに「Demo redesign concept」を明記（提案デモであることを明示）

### 一括生成 + ポートフォリオ（量産）

`data/inputs` 内の全JSONをまとめてサイト化し、全デモへのリンクをまとめた
ギャラリーページ（`data/sites/index.html`）を自動生成します。営業先に見せる
「1つのまとめURL」を1コマンドで用意できます。

```bash
npm run build:all
```

生成物:
- `data/sites/{slug}/`（各社のデモサイト）
- `data/sites/index.html`（全デモを業種別カードで一覧表示するギャラリー）

1社失敗しても他社の生成は継続し、最後に成功/失敗件数を表示します。

### Cloudflare Pages へのデプロイ

`data/sites/{slug}/` を静的ディレクトリとしてアップロードするだけで公開できます
（ビルドコマンド不要、出力ディレクトリにそのフォルダを指定）。`data/sites/` 全体を
公開すれば、`index.html` がそのままデモ一覧のトップページになります。

## 収益化キット（デモ → 売上）

デモを作るだけでは1円も生みません。成約までの「営業の型」と「数値モデル」を同梱しています。

### 売上モデル（¥1億までの道筋を可視化）

```bash
npm run model
# 前提を変える例:
npm run model -- --price 400000 --close 0.08 --demos 60 --retainer 18000
```

初期制作単価・月額保守・月間デモ送付数・成約率などを入力すると、月次の売上/利益/累計利益と
**目標純資産（既定 ¥1億）への到達月**を表示します。最も安く動かせる変数は
`demos`（送付デモ数）＝このマシンの量産機能です。

### 営業資料

- `gtm/pricing.md`: 料金パッケージ、価格の根拠、ユニットエコノミクス
- `gtm/outreach-templates.md`: 価値提供型・法令順守のアウトリーチ文面（送信前チェック付き）

### 個別アウトリーチ生成 + パイプライン管理

入力JSONから、会社ごとにパーソナライズした送付用文面（初回＋フォロー）を生成します。
既存サイトの課題・強み・デモURLを自動で差し込むため、手作業の差し込みが不要になり
送付数（最も安いレバー）を増やせます。

```bash
npm run outreach -- --base-url https://demos.example.com
# 特定の1社だけ:
npm run outreach -- --base-url https://demos.example.com data/inputs/sample.json
```

生成物:
- `data/outreach/{slug}.md`: 送付用の下書き（コンプライアンス確認は `gtm/outreach-templates.md`）
- `data/outreach/pipeline.csv`: 商談管理表（slug/会社名/デモURL/ステータス/最終接触/メモ）

`pipeline.csv` の `status` を手で更新（未送付→送付→返信→商談化→成約 等）すれば、
再実行してもステータスは保持されます。実績の `送付→成約` 率を `npm run model --close`
に反映すれば、到達予測が実データで精緻化します。

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
