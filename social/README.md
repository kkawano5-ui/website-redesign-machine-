# SNS自動投稿（Instagram / X）

`social/queue.json` に入れた投稿を、配信日になったら **Instagram と X に自動投稿**する仕組みです。
毎日 GitHub Actions（`.github/workflows/social-autopost.yml`）が動き、「今日が配信日かつ未投稿」のものだけを投稿します。

> ⚠️ **アカウント作成は手動です。** Instagram / X の新規登録は電話番号認証などが必要で、自動化できません（規約上もNG）。下記トークンも、ご自身のアカウントでしか発行できません。

---

## 仕組み

```
social/
  queue.json        ← 投稿内容＋配信日（ここを編集して投稿を足す）
  images/           ← 投稿画像（ファイル名を queue.json の image に書く）
  run.js            ← 配信日が来た未投稿を各SNSへ投稿し、posted に記録
  post-x.js         ← X API v2
  post-instagram.js ← Instagram Graph API
  lib/oauth1.js     ← X用 OAuth1 署名
```

`run.js` は投稿に成功すると `queue.json` の各投稿の `posted.x` / `posted.instagram` に
投稿日時とIDを書き込み、二重投稿を防ぎます（GitHub Actions が自動でコミットします）。

---

## セットアップ

### 0. ローカル確認（投稿しない・ドライラン）

```bash
npm run social:preview   # 何がいつ投稿されるかをログ表示（実際には投稿しない）
```

`SOCIAL_TODAY=2026-06-20 npm run social:preview` のように日付を指定して確認できます。

### 1. X（Twitter）のトークン

1. https://developer.x.com/ でデベロッパー登録 → アプリ作成
2. アプリの権限を **Read and write** に設定
3. 次の4つを発行してメモ：
   - API Key（= `X_API_KEY`）
   - API Key Secret（= `X_API_SECRET`）
   - Access Token（= `X_ACCESS_TOKEN`）
   - Access Token Secret（= `X_ACCESS_SECRET`）

> 無料枠でも投稿は可能ですが月の上限があります。上限に達したら有料プランを検討。

### 2. Instagram のトークン

Instagram の自動投稿は **プロアカウント（ビジネス/クリエイター）＋Facebookページ連携** が必須です。

1. Instagram をプロアカウントに切替 → Facebookページと連携
2. https://developers.facebook.com/ でアプリ作成（Graph API）
3. **長期アクセストークン**を取得（= `IG_ACCESS_TOKEN`）
4. Instagram の **ユーザーID**を取得（= `IG_USER_ID`）
   - 例: `GET /me/accounts` → ページ → `instagram_business_account`
5. 投稿には `instagram_content_publish` などの権限が必要（アプリ審査）

> 画像は**公開URL**が必要です。本リポジトリでは `social/images/` に置いた画像を
> `raw.githubusercontent.com` 経由で参照します（後述の `SOCIAL_IMAGE_BASE_URL`）。

### 3. GitHub に登録

リポジトリの **Settings → Secrets and variables → Actions** で登録：

**Secrets（秘密情報）**
| 名前 | 中身 |
|---|---|
| `X_API_KEY` | XのAPI Key |
| `X_API_SECRET` | XのAPI Key Secret |
| `X_ACCESS_TOKEN` | XのAccess Token |
| `X_ACCESS_SECRET` | XのAccess Token Secret |
| `IG_ACCESS_TOKEN` | Instagram長期トークン |
| `IG_USER_ID` | InstagramビジネスアカウントのユーザーID |

**Variables（公開設定でOK）**
| 名前 | 例 |
|---|---|
| `SOCIAL_IMAGE_BASE_URL` | `https://raw.githubusercontent.com/<owner>/<repo>/<branch>/social/images`（未設定でもActions上では自動推定します） |

---

## 投稿を追加・編集する

`social/queue.json` の `posts` に追記します。

```json
{
  "id": "11-example",
  "date": "2026-07-01",
  "platforms": ["x", "instagram"],
  "image": "11-example.png",
  "x_text": "X用の短文（任意）。無ければ caption を使用。",
  "caption": "Instagram用のキャプション本文。",
  "hashtags": ["#四柱推命", "#手相"]
}
```

- `image` に書いたファイルを `social/images/` に置く（**Instagramは画像必須**）。
- 画像が無い投稿は **Xはテキストのみ投稿**、**Instagramはスキップ**します。
- `date` は配信予定日。その日以降に初めて動いたActionsで投稿されます。

## 手動実行

GitHub の **Actions → Social auto-post → Run workflow** から手動実行できます
（`dry_run = true` で投稿せずログだけ確認可）。
