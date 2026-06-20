# さいたま市 飲食店リード抽出 → Web / MEO 提案

Google Places API (New) を使い、さいたま市の飲食店から「**website未登録**」または
「**口コミ10件以下**」の店舗を抽出し、Webサイト制作と MEO（Googleマップ最適化）の
営業リストを作るためのツールと進め方。

## なぜこの条件が刺さるのか

| 条件 | 店舗が抱える課題 | こちらの提案 |
| --- | --- | --- |
| website 未登録 | 検索しても比較情報が出ず、機会損失。予約・問い合わせ導線が無い | Webサイト制作（このリポジトリのデモ生成パイプライン） |
| 口コミ10件以下 | マップ上で埋もれる。新規来店につながりにくい | MEO（プロフィール最適化・口コミ獲得・投稿運用） |

どちらも「集客の入口がGoogleマップで完結していない店」であり、低予算でも効果が見えやすい。

## セットアップ

1. Google Cloud で **Places API (New)** を有効化し、APIキーを発行。請求先（課金）設定が必須。
2. キーを `.env` に設定。

   ```bash
   cp .env.example .env
   # .env を編集
   GOOGLE_MAPS_API_KEY=AIza...
   ```

## 実行

```bash
# 既定（さいたま市全域 / restaurant / 口コミ10件以下 or website無し）
npm run find:leads

# まずコストを見積もる（API課金なし、グリッド数だけ表示）
npm run find:leads -- --dry-run

# 条件を絞る例：口コミ5件以下、カフェと居酒屋も対象、グリッドを細かく
npm run find:leads -- --max-reviews=5 --types=restaurant,cafe,bar --step=400
```

### 地域ごとに回す（おすすめ）

区単位で回すと、コストを小さく刻めて「どのエリアにターゲットが多いか」が一目で分かる。

```bash
# 利用可能な地域プリセット一覧（さいたま市10区）
npm run find:leads -- --list-regions

# 1区だけ（浦和区）
npm run find:leads -- --region=urawa

# 複数区
npm run find:leads -- --region=omiya,urawa,minami

# 10区を順に走査 → 区ごとCSV + 「営業優先エリア」サマリー表
npm run find:leads -- --all-regions
```

`--all-regions` の出力例（リード多い順に並ぶので、上から営業に回ると効率が良い）:

```
==== サマリー（リード多い順 = 営業優先エリア） ====
  岩槻区   リード 180件  ████████████████████████████████████
  緑区     リード 120件  ████████████████████████
  ...
  合計リクエスト: 1074回 / 推定コスト: ¥5,826
```

区ごとに `data/leads/saitama-<区key>-YYYY-MM-DD.csv` が出力される。

### 主なオプション

| オプション | 既定 | 説明 |
| --- | --- | --- |
| `--max-reviews=N` | 10 | 口コミ件数の上限しきい値 |
| `--types=a,b,c` | restaurant | Places の店舗タイプ（restaurant, cafe, bar, bakery など） |
| `--region=key` | － | 地域プリセットを指定（`--list-regions` で一覧）。カンマ区切りで複数可 |
| `--all-regions` | － | さいたま市10区を順に走査し、区ごとCSV＋サマリーを出力 |
| `--list-regions` | － | 地域プリセット一覧を表示して終了 |
| `--step=M` | 600 | グリッド間隔(m)。小さいほど網羅的・高コスト |
| `--radius=M` | 500 | 各セルの検索半径(m) |
| `--south/--north/--west/--east` | さいたま市 | 検索範囲の矩形を区単位などに絞る |
| `--dry-run` | off | API を呼ばずグリッド数（=リクエスト数）のみ表示 |

### 出力

`data/leads/saitama-restaurants-YYYY-MM-DD.csv` に以下の列で出力（口コミ少ない順）。

```
name, reason, review_count, rating, has_website, website, phone,
address, category, business_status, maps_url, place_id
```

`reason` 列が `website無し` / `口コミ少` で、そのまま営業トークの切り口になる。

## コストの目安と注意点

- **課金**：Nearby Search (New) は今回のフィールド構成で約 $0.032/リクエスト。グリッド数 = リクエスト数。
  まず `--dry-run` でグリッド数を確認し、無料枠($200/月)内に収める。市域を区ごとに分けて回すのも有効。
- **1リクエスト20件まで**：新Nearby Searchはページング非対応。密集地は取りこぼしが出るため、
  網羅性を上げたい区は `--step` を小さくして再走査する。
- **Google ToS**：place_id 以外の取得データの長期キャッシュには制限（原則30日）。
  自社の営業リード用途は可だが、データ転売やGoogle競合DBの構築は不可。
- **電話営業/訪問**：連絡先は自社の営業活動に使う前提。特定電子メール法・各種規約に沿って運用する。

## このリポジトリの営業フローへの接続

1. `npm run find:leads` でターゲットCSVを生成
2. 上位店舗を Manus でリサーチ → `data/inputs/*.json` 化
3. `npm run run:one -- data/inputs/<店舗>.json` でサイト制作仕様書を生成
4. デモサイトを作って商談（既存パイプライン）
5. 口コミ少の店には MEO 提案を合わせて提示
