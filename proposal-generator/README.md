# MEO提案書ジェネレーター

**Googleマップのリンクを1本入れるだけで、MEO提案書（PPTX）を自動生成**します。
クラン様向けに作った提案書デザインをテンプレにして、店舗ごとに変わる部分
（会社名・エリア・業種テーマ・検索KW・現状診断8行）だけを差し替えます。

```
Googleマップのリンク
  → Place ID 抽出
  → Places API (New) で店舗データ取得
  → 業種自動判定＋現状診断
  → テンプレPPTXに差し込み
  → 提案書PPTX 出力（デザインはそのまま）
```

## セットアップ

```bash
cd proposal-generator
pip install -r requirements.txt
cp .env.example .env      # PLACES_API_KEY=... を記入
```

`PLACES_API_KEY` は Google Cloud で **Places API (New)** を有効化して発行したキー。
（omiya-meo-scan で使っているキーが Places API (New) 対応なら流用可）

## 使い方

```bash
# 本番：マップのリンクから生成
python generate.py --url "https://www.google.com/maps/place/?q=place_id:ChIJ..."

# 出力先・日付を指定
python generate.py --url "<link>" --out out/提案書_○○.pptx --date 2026年7月

# APIキー無しで動作確認（サンプル美容室）
python generate.py --mock
```

出力は `out/提案書_<店名>.pptx`。

## 店舗ごとに変わる部分（テンプレのどこが可変か）

| スライド | 可変内容 |
|---|---|
| 1 タイトル | 会社名・日付 |
| 3 USER BEHAVIOR | エリア名・検索KW例×6 |
| 4 DIAGNOSIS | 会社名＋現状診断8行（店舗データから自動判定） |
| 8 RECOMMENDATION | 業種テーマ語 |
| 9/期待効果 | エリア名・業種テーマ語 |

固定スライド（WHAT IS MEO/SOLUTION/PLANS/COMPARISON/ONBOARDING/HONESTY等）は変更しません。

## 業種の追加・KW調整

`industries.py` の `PROFILES` に1ブロック足すだけ（テーマ語・検索KW・薬機法フラグ）。
`GOOGLE_TYPE_MAP` に Google のカテゴリ→業種キーの対応を追記。

- `beauty`(美容) / `nail` / `esthetic`(エステ) / `seikotsu`(整骨) / `clinic`(歯科・医療) /
  `legal`(士業) / `real_estate`(不動産) / `restaurant`(飲食) / `general`(汎用)
- ⚠️ `yakkihou: True` の業種（エステ・整骨・医療）は薬機法・医療広告の注意対象。
  診断・テーマは効能標榜を避けた保守的表現にしてある。投稿・口コミ本文の生成時も
  `docs/meo-escalation-rules.md` のルールで機械チェックすること。

## 現状診断のロジック（`diagnose.py`）

Places APIで取れる項目はデータで判定、取れない項目は見込み客の実態に即した既定値：

| 診断項目 | 判定元 |
|---|---|
| 基本情報 | 営業時間・電話の有無 |
| サービス内容 | 業種テーマ |
| 写真 | 写真枚数（<5/5-15/15+） |
| 口コミ | 件数・評価（0/≤10/10+） |
| 口コミ返信 | 既定「要整備」（APIで取りにくい） |
| 投稿 | 既定「要運用」（API外） |
| 競合比較 | 既定（将来 omiya-meo-scan と連携で精緻化可） |
| 問い合わせ導線 | 電話・サイトの有無 |

## 制限・今後
- 口コミ返信率・投稿有無はPlaces APIで取れないため既定値（実務上は見込み客でほぼ当たる）。
  精緻化するならマップページのスクレイピング or 顧客のGBP権限が必要。
- 競合比較は現状ひな型。`omiya-meo-scan` のエリアスキャン結果を渡せば実データ化できる。
- 出力はPPTX。Google Slides化したい場合は Drive にアップロードして変換。
