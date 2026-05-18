# Sales Prospecting Automation

SNSマーケティング支援サービス（RAHA KENYA / 合同会社Asante Sana）の  
営業先リストを継続的に自動生成するPythonツールです。

## 機能概要

1. **URL収集** — 検索APIを使って対象カテゴリのキーワードで企業公式サイトURLを収集
2. **サイト解析** — 各公式サイトから会社名・法人格・連絡先・SNS URLを抽出
3. **対象外判定** — 個人・小規模EC・営業禁止・重複を自動除外し別シートに記録
4. **Google Sheets保存** — 対象企業を「営業リスト」シートに自動追記
5. **文面生成** — AI APIで法人根拠・褒めポイント・件名・メール本文・フォーム文面を生成
6. **Gmail下書き作成** — メールアドレスがある企業のGmail下書きを自動作成（送信はしない）

---

## 必要なAPIキー

| API | 用途 | 取得先 |
|-----|------|--------|
| Anthropic API または OpenAI API | 文面生成 | [console.anthropic.com](https://console.anthropic.com) / [platform.openai.com](https://platform.openai.com) |
| SerpAPI または Google Custom Search API | Web検索 | [serpapi.com](https://serpapi.com) / [programmablesearchengine.google.com](https://programmablesearchengine.google.com) |
| Google Sheets API + Gmail API | データ保存・下書き作成 | Google Cloud Console |

---

## セットアップ

### 1. リポジトリのクローン・移動

```bash
git clone <repository-url>
cd sales_prospecting
```

### 2. Python仮想環境の作成とパッケージインストール

```bash
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を編集して各APIキーを設定します：

```env
ANTHROPIC_API_KEY=sk-ant-...
SERPAPI_KEY=your_serpapi_key
```

### 4. Google Sheets API と Gmail API の設定

#### 4-1. Google Cloud プロジェクトの作成

1. [Google Cloud Console](https://console.cloud.google.com) を開く
2. 「新しいプロジェクト」を作成（例: `sales-prospecting`）
3. 「APIとサービス」→「ライブラリ」から以下を有効化：
   - **Google Sheets API**
   - **Gmail API**

#### 4-2. OAuth 2.0 クライアントIDの作成（Gmail下書き用）

1. 「APIとサービス」→「認証情報」→「認証情報を作成」→「OAuthクライアントID」
2. アプリケーションの種類：**デスクトップアプリ**
3. 作成後、JSONをダウンロードして `credentials/credentials.json` として保存

#### 4-3. サービスアカウントの作成（Google Sheets専用、任意）

Sheets のみサービスアカウントで操作する場合：

1. 「認証情報」→「サービスアカウントを作成」
2. キーを作成（JSON形式）して `credentials/service_account.json` として保存
3. 作成されたサービスアカウントのメールアドレスを、対象のGoogle Sheetsに「編集者」として共有

> **注意**: Gmail下書き作成にはサービスアカウントは使えません。  
> `credentials.json`（OAuth2）が必要です。

#### 4-4. Google Sheetsの準備

1. 新しいスプレッドシートを作成
2. URLから Spreadsheet ID をコピー  
   例: `https://docs.google.com/spreadsheets/d/`**`1ABC...xyz`**`/edit`
3. `config.yaml` の `google_sheets.spreadsheet_id` に貼り付け

```yaml
google_sheets:
  spreadsheet_id: "1ABC...xyz"
```

#### 4-5. 初回認証（OAuth2）

初回実行時にブラウザが開きGoogleアカウントの認証が求められます。  
認証後、`credentials/token.json` が自動生成されます。

---

## 設定ファイル（config.yaml）

主な設定項目：

```yaml
google_sheets:
  spreadsheet_id: "YOUR_SPREADSHEET_ID"
  sales_sheet_name: "営業リスト"
  excluded_sheet_name: "対象外ログ"

ai:
  provider: "anthropic"   # or "openai"
  model_anthropic: "claude-opus-4-7"

search:
  provider: "serpapi"     # or "google_cse"
  results_per_keyword: 10

gmail:
  enabled: true           # false にするとGmail下書きをスキップ

excluded_domains:         # 検索結果から除外するドメイン
  - "amazon.co.jp"
  ...

excluded_keywords:        # 営業禁止の検出ワード
  - "営業メールはお断り"
  ...
```

---

## 実行コマンド

### URL収集のみ

```bash
python main.py collect --category overseas_send --limit 100
```

カテゴリ一覧：
- `overseas_send` — 海外に日本人を送っている法人
- `overseas_receive` — 海外で日本人を受け入れている法人
- `women_products` — 女性向け商材を扱う法人

### サイト解析 & Sheets保存

```bash
python main.py enrich
```

`logs/pending_urls.json` を読み込み、サイト解析してSheetsに保存します。

### 文面生成

```bash
python main.py generate_copy
```

Sheetsの「収集済み」行にAI生成の文面を書き込みます。

### Gmail下書き作成

```bash
python main.py create_gmail_drafts
```

「文面生成済み」かつメールアドレスあり・推奨手段Email の行に下書きを作成します。

### 全工程を一括実行

```bash
python main.py run_all --category overseas_send --limit 100
```

オプション：
- `--skip-gmail` — Gmail下書き作成をスキップ

### カスタム設定ファイルを指定

```bash
python main.py --config /path/to/custom_config.yaml run_all --category women_products --limit 50
```

---

## Google Sheetsの列構成

| 列 | 項目 | 備考 |
|----|------|------|
| A | 取得日 | 自動 |
| B | 対象カテゴリ | 自動 |
| C | 検索キーワード | 自動 |
| D | 会社名 | 自動抽出 |
| E | 法人格 | 自動抽出 |
| F | 公式サイトURL | 自動 |
| G | 会社概要URL | 自動抽出 |
| H | 業種 | 自動抽出 |
| I | 所在地 | 自動抽出 |
| J | 公開メールアドレス | 自動抽出 |
| K | 問い合わせフォームURL | 自動抽出 |
| L | Instagram URL | 自動抽出 |
| M | TikTok URL | 自動抽出 |
| N | YouTube URL | 自動抽出 |
| O | 法人と判断した根拠 | AI生成 |
| P | 月50万円以上を払える可能性がある理由 | AI生成 |
| Q | 具体的に褒めるべきポイント | AI生成 |
| R | 提案仮説 | AI生成 |
| S | 推奨連絡手段 | Email/Form |
| T | 件名 | AI生成 |
| U | メール本文 | AI生成 |
| V | フォーム送信用文面 | AI生成 |
| W | ステータス | 自動更新 |
| X | 送信日 | 手動入力 |
| Y | 返信有無 | 手動入力 |
| Z | メモ | 自動＋手動 |

### ステータス遷移

```
収集済み → 文面生成済み → Gmail下書き作成済み
                       → フォーム送信待ち（フォームのみの企業）
```

---

## フォーム営業について

問い合わせフォームのみの企業は：
- ステータス：「フォーム送信待ち」
- K列にフォームURL
- V列にフォーム送信用文面

が保存されます。フォームへの送信は**手動**で行ってください。

---

## ログ

実行ログは `logs/prospecting.log` に保存されます。  
収集したURL一覧は `logs/pending_urls.json` に保存されます（次回のenrichで使用）。

---

## 注意事項

- CAPTCHA回避は行いません
- 問い合わせフォームの自動送信は行いません
- メールの自動送信は行いません（Gmail下書き作成のみ）
- `robots.txt` への配慮のため、リクエスト間に待機時間を設けています
- 取得できない項目は「不明」として保存されます
- エラーが発生しても次の企業の処理を継続します

---

## ディレクトリ構成

```
sales_prospecting/
├── main.py                    # CLIエントリポイント
├── config.yaml                # 設定ファイル
├── requirements.txt
├── .env.example               # 環境変数テンプレート
├── .gitignore
├── credentials/               # Google API認証情報（gitignore済み）
│   ├── credentials.json       # OAuth2クライアントID
│   ├── service_account.json   # サービスアカウントキー（任意）
│   └── token.json             # 自動生成されるトークン
├── logs/                      # ログ・中間データ
│   ├── prospecting.log
│   └── pending_urls.json
└── src/
    ├── config.py
    ├── search/
    │   ├── base.py            # 検索APIの抽象インターフェース
    │   ├── serpapi.py         # SerpAPI実装
    │   └── google_cse.py     # Google CSE実装 + ファクトリ
    ├── scraper/
    │   ├── site_analyzer.py  # Webスクレイピング・情報抽出
    │   └── eligibility.py    # 対象外判定・重複チェック
    ├── sheets/
    │   └── client.py         # Google Sheetsクライアント
    ├── gmail/
    │   └── draft.py          # Gmail下書き作成
    ├── ai/
    │   ├── base.py           # AIクライアントの抽象インターフェース
    │   ├── prompt_template.py # プロンプトテンプレート
    │   ├── anthropic_client.py
    │   └── openai_client.py  # + ファクトリ関数
    └── pipeline/
        ├── collector.py      # URL収集パイプライン
        ├── enricher.py       # サイト解析・Sheets保存パイプライン
        ├── copy_generator.py # 文面生成パイプライン
        └── gmail_drafter.py  # Gmail下書き作成パイプライン
```
