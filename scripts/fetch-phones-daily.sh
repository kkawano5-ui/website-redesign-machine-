#!/bin/bash
# みらい編集｜電話番号 自動ドリップ取得（1日N件）
# launchd（毎日）から呼ばれる想定。無料枠(10,000/月/SKU ≒ 1日333件)に自動で収めるため件数を絞る。
# 取得済みは自動スキップするので、毎日走らせれば新規追加ぶんだけ少しずつ埋まる。
set -euo pipefail

# ---- リポジトリ直下へ移動（このスクリプトの位置から相対で解決）----
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ---- APIキーの取得（平文で置かない）----
# 推奨: 初回だけ Keychain に登録しておく（1度きり）:
#   security add-generic-password -a "$USER" -s miraihen-places-key -w 'AIza...'
KEY="$(security find-generic-password -a "$USER" -s miraihen-places-key -w 2>/dev/null || true)"
# フォールバック: 環境変数 or リポジトリ直下の .env（GOOGLE_MAPS_API_KEY=AIza...）
if [ -z "${KEY:-}" ] && [ -n "${GOOGLE_MAPS_API_KEY:-}" ]; then KEY="$GOOGLE_MAPS_API_KEY"; fi
if [ -z "${KEY:-}" ] && [ -f .env ]; then KEY="$(grep -E '^GOOGLE_(MAPS|PLACES)_API_KEY=' .env | head -1 | cut -d= -f2- | tr -d '"'"'"' ')"; fi
if [ -z "${KEY:-}" ]; then
  echo "❌ APIキーが見つかりません。Keychain登録 か .env を確認してください。" >&2
  exit 1
fi
export GOOGLE_MAPS_API_KEY="$KEY"

# ---- 1日あたりの件数（無料枠に合わせて調整可。DAILY環境変数で上書きできる）----
DAILY="${DAILY:-300}"
# ---- 実測エンリッチ（website/★/口コミ実数/営業状態を同時取得）。既定ON。REENRICH=0で無効化 ----
# 追加課金ゼロ（電話と同じEnterprise SKU）。優先度順なので、まず既存の勝ち筋業種から実測が埋まる。
REENRICH_FLAG="--reenrich"; [ "${REENRICH:-1}" = "0" ] && REENRICH_FLAG=""

mkdir -p data/logs
LOG=data/logs/fetch-phones.log
{
  echo "===== $(date '+%Y-%m-%d %H:%M:%S') 開始 (1日${DAILY}件・優先度順${REENRICH_FLAG:+・実測エンリッチ}) ====="
  node scripts/fetch-phones.mjs --daily "$DAILY" $REENRICH_FLAG
  echo "===== $(date '+%Y-%m-%d %H:%M:%S') 終了 ====="
  echo ""
} >> "$LOG" 2>&1

# 直近の結果を標準出力にも（手動実行時の確認用）
tail -n 6 "$LOG"
