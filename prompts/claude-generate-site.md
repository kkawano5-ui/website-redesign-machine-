あなたはプロのWebデザイナー兼フロントエンドエンジニアです。

以下のWebサイト制作仕様書をもとに、営業デモ用の1ページWebサイトを作成してください。

# 会社情報

会社名：{{company_name}}
URL：{{url}}
業種：{{industry}}

# 制作仕様書

{{site_spec}}

# 技術要件

- Astro + Tailwind CSS
- 1ページLP
- レスポンシブ対応
- Cloudflare Pagesで公開できる構成
- 画像はプレースホルダーでよい
- 外部有料素材は使わない
- 既存サイトの文章をそのままコピーしない
- フッターに小さく「Demo redesign concept」と入れる

# 必須ファイル

以下をJSON配列で返してください。

[
  {
    "path": "package.json",
    "content": "..."
  },
  {
    "path": "astro.config.mjs",
    "content": "..."
  },
  {
    "path": "tailwind.config.mjs",
    "content": "..."
  },
  {
    "path": "src/pages/index.astro",
    "content": "..."
  },
  {
    "path": "src/styles/global.css",
    "content": "..."
  }
]

注意：
- JSON以外の文章は返さない
- content内の改行やクォートはJSONとして正しくエスケープする
