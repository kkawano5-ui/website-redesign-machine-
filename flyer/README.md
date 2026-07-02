# 営業チラシ（A4両面）— 株式会社AIスキル 法人研修事業部

大企業の人事・総務部門向け、人材開発支援助成金（人開金）活用の生成AI研修チラシ。

- `index.html` … チラシ本体（1ページ目=表面、2ページ目=裏面）。A4サイズの印刷用CSSを内包
- `aiskill_flyer_A4.pdf` … 印刷用PDF（A4・2ページ）
- `preview-1.png` / `preview-2.png` … 表面・裏面のプレビュー画像

## 再生成方法

HTMLを編集後、Chromium（ヘッドレス）でPDF化する:

```bash
chromium --headless=new --no-pdf-header-footer \
  --print-to-pdf=aiskill_flyer_A4.pdf "file://$PWD/index.html"
pdftoppm -png -r 100 aiskill_flyer_A4.pdf preview   # プレビュー画像
```

※ 日本語フォント（Noto Sans CJK JP）が必要。

## ビジュアルについて（v2）

- 会社紹介デッキのトーンに合わせた白基調＋ネイビー＋細ゴールド罫線のデザイン
- 見出しは明朝（Noto Serif CJK JP）、本文はゴシック（Noto Sans CJK JP）
- ヒーローはアブストラクト表現（円環・コンスタレーション・スカイライン）のインラインSVG。
  生成画像（ChatGPT/gpt-image-1等）に差し替える場合は `.hero-art` のSVGを `<img>` か
  背景画像に置き換える（ヒーロー全面 210mm×76mm、右側6割が見えるよう左側は暗めに）

## トンマナ

- 堅実・信頼: ネイビー（#0A1C38〜#1E477F）＋ゴールド（#A8842C/#B9974B）＋白
- 料金・実績数値は提供資料（会社紹介デッキ・料金表スライド）準拠
