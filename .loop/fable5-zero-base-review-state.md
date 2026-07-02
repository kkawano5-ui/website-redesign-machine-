# Fable5 ゼロベース総点検 state

- 最終更新: 2026-07-02 (iteration 2)
- 手順書: `.loop/fable5-zero-base-review.md`

## 領域ステータス

| # | 領域 | 状態 |
|---|------|------|
| 1 | scripts/ + package.json | done (iter 1) |
| 2 | lp/index.html | done (iter 2) |
| 3 | concierge/index.html | done (iter 2) |
| 4 | wedding/ | pending |
| 5 | mirai-edit/index.html | pending |
| 6 | vercel.json 群 | pending |
| 7 | data/ + prompts/ | pending |
| 8 | docs/ + validation/ + README | pending |
| 9 | 総括 | pending |

## Findings

### iteration 1: scripts/ + package.json（2026-07-02）

**修正済み（コミット済み）**
1. `scripts/create-site-spec.js` renderPagePlan: `- CTA: - ${cta}` の二重ハイフンで
   出力Markdownが崩れていた → `- CTA: ${cta}` に修正。既存の sample / memorial-sample
   出力も再生成して反映。
2. `scripts/run-one.js` slug生成: 日本語社名は `createSafeSlug` で空文字になり、
   `companySlug` 未指定の全企業が `site-site-spec.md` に衝突（上書き）していた
   → 候補（companySlug → companyName → 入力ファイル名）を順に試し、空でない
   slugが得られるまでフォールバックするよう修正。合成入力（社名「サンプル工務店」・
   slugなし）で `yamada-komuten-site-spec.md` が生成されることを確認。
3. `scripts/create-site-spec.js` detectIndustry: seed全体を小文字化していなかったため
   `B2B` 等の大文字表記が manufacturing 判定にヒットしなかった → seed全体を
   `.toLowerCase()` するよう修正。

**要判断（未修正・記録のみ）**
- `data/outputs/sake-whisky-night-site-spec.md` は生成物に「※手動追記」セクション
  （画像配置プラン）が混在。再生成すると手動追記が消えるため今回は再生成を取り消し。
  手動追記は別ファイル（例: `data/outputs/sake-whisky-night-image-plan.md`）に分離
  するのが安全。
- `package.json` の dependencies（`@anthropic-ai/sdk`, `openai`, `dotenv`）は現状
  どのスクリプトからも import されていない（generate-site.js は未実装スタブ）。
  将来実装用に残すか削るかは方針次第。lockfile も無い。
- `run-one.js` validateInputJson は「空文字のみの配列」（例: `[""]`）を通す。
  実害は小さいが、厳密にするなら要素の trim 後チェックを追加。

**観察メモ**
- `createSafeSlug` の `-{2,}` 圧縮は `[^a-z0-9]+` の時点で連続ハイフンが発生しない
  ため実質デッドコード（無害）。

### iteration 2: lp/index.html + concierge/index.html（2026-07-02）

**修正済み**
- なし（機能的なバグは検出されず。アンカーリンク・ローカル画像参照・vercel.json は
  すべて整合。concierge の Formspree ID は設定済みで送信JSも正常な作り）

**要判断（未修正・記録のみ）**
- lp: 予約CTAの宛先が `hello@tokyoinsider.example`（実在しないプレースホルダー
  ドメイン）。本番導線としては機能しない。origin に `email-update` ブランチが
  存在するため、そちらで更新済みの可能性あり → 取り込み要否を判断。
- lp: OTAリンク（Viator / GetYourGuide / Klook）が `href="#"` のプレースホルダー。
- lp: 画像PNGが各1.8〜2.2MB。CSSの多層背景は全レイヤーをダウンロードするため、
  ローカルPNG + Pexelsフォールバックの両方が読み込まれる（ヒーローだけで約4MB超）。
  WebP化・Pexelsフォールバック削除で大幅改善可能。
- lp/concierge 共通: `og:image` 未設定（SNSシェア時にサムネイルなし）。
- concierge: `https://tokyo-sake-whisky-lp.vercel.app/` へのリンクは本環境の
  ネットワークポリシーで到達確認できず（未検証）。
- concierge: フォームコメントに「replace YOUR_FORM_ID」と残っているが実IDは設定済み。
  送信JS内の `YOUR_FORM_ID` チェックは実質デッドコード（無害）。

**観察メモ**
- 星5表示 + プレースホルダーレビューは「placeholder」明記済みで、ローンチ時に
  実レビューへ差し替える設計。掲載したまま公開すると誤認リスクがあるため、
  公開前チェックリストに含めるのを推奨。

## 総括レポート

（全領域完了後に記載）
