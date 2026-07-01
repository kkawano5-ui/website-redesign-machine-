#!/bin/bash
# みらい編集｜電話番号 自動取得を「毎日◯時に1日N件」で登録する（macOS launchd）。
# 一度これを実行しておけば、あとはMacが起きていれば毎日ひとりでに走ります（スリープ中は次の起床時にまとめて実行）。
#
# 使い方（Macのターミナルでリポジトリ直下から）:
#   bash scripts/install-phones-schedule.sh            # 既定: 毎日 9:00 に 300件
#   bash scripts/install-phones-schedule.sh --hour 8 --daily 200
#   bash scripts/install-phones-schedule.sh --remove    # 登録解除
set -euo pipefail

LABEL="com.miraihen.fetch-phones"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WRAPPER="$REPO/scripts/fetch-phones-daily.sh"
GUI="gui/$(id -u)"

HOUR=9; MIN=0; DAILY=300; REMOVE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --hour)  HOUR="$2"; shift 2;;
    --min)   MIN="$2";  shift 2;;
    --daily) DAILY="$2"; shift 2;;
    --remove) REMOVE=1; shift;;
    *) echo "不明な引数: $1" >&2; exit 1;;
  esac
done

# ---- 登録解除 ----
if [ "$REMOVE" = "1" ]; then
  launchctl bootout "$GUI/$LABEL" 2>/dev/null || launchctl unload "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
  echo "🗑  自動実行を解除しました（$LABEL）。"
  exit 0
fi

chmod +x "$WRAPPER"
mkdir -p "$HOME/Library/LaunchAgents" "$REPO/data/logs"

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$WRAPPER</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict><key>DAILY</key><string>$DAILY</string></dict>
  <key>WorkingDirectory</key><string>$REPO</string>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>$HOUR</integer>
    <key>Minute</key><integer>$MIN</integer>
  </dict>
  <key>RunAtLoad</key><false/>
  <key>StandardOutPath</key><string>$REPO/data/logs/launchd.out.log</string>
  <key>StandardErrorPath</key><string>$REPO/data/logs/launchd.err.log</string>
</dict>
</plist>
PLIST

# ---- 読み込み（新旧どちらのlaunchctlでも）----
launchctl bootout "$GUI/$LABEL" 2>/dev/null || true
launchctl bootstrap "$GUI" "$PLIST" 2>/dev/null || launchctl load "$PLIST"
launchctl enable "$GUI/$LABEL" 2>/dev/null || true

printf '%02d:%02d\n' "$HOUR" "$MIN" >/dev/null
echo "✅ 登録しました: 毎日 $(printf '%02d:%02d' "$HOUR" "$MIN") に 1日${DAILY}件"
echo "   ログ: $REPO/data/logs/fetch-phones.log"
echo "   今すぐ試す:      launchctl kickstart -k $GUI/$LABEL"
echo "   状態を見る:      launchctl print $GUI/$LABEL | head"
echo "   解除する:        bash scripts/install-phones-schedule.sh --remove"
