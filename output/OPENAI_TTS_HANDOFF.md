# 引き継ぎ：OpenAI TTSで女性ナレーションを差し替える手順（新セッション用）

このリポジトリの KATALYS 広告 v2（`ad3/preview/katalys-ad3-v2.mp4`, 9:16 / 43.05秒）に、
**OpenAIの高品質女性ナレーション**を乗せて、**映像は無加工(-c:v copy)・固定尺43.050667秒**で出力する。

## 前提（このセッションで満たすこと）
- 環境の **Network access = Custom**、Allowed domains に `api.openai.com` と `*.openai.com` を追加済み。
- `OPENAI_API_KEY` を使えること（環境変数 or チャットで受け取って `/tmp/oai.key` に保存）。
  - キーは**リポジトリに絶対コミットしない**。`/tmp` のみ。使用後はユーザーに Revoke を促す。

## 実行コマンド（2つ）
```bash
# 1) 依存（軽量）: soundfile / ffmpeg は imageio-ffmpeg を使用
pip install -q soundfile imageio-ffmpeg numpy

# 2) ナレーション生成（OpenAI tts-1-hd / voice=sage / speed自動調整）
export OPENAI_API_KEY=sk-...        # または /tmp/oai.key に保存
python3 ad3/scripts/voiceover_openai.py     # -> /tmp/voice_raw.wav, /tmp/voice_timing.json

# 3) 整音＋固定尺43.050667s＋映像コピー結合＋検証ファイル出力
python3 ad3/scripts/finalize_voiceover.py   # -> output/ に mp4/wav/json/report
```

## 仕様（finalize が保証）
- 映像: `-c:v copy`（全1290フレーム保持、映像ストリームMD5 入=出）。
- 音声: 48kHz / AAC 192k / ステレオ(センター) / loudnorm I=-16 LUFS, TP=-1.5 / 冒頭末尾フェード。
- 尺: サンプル単位で **43.050667s**。冒頭 0.08s 無音、末尾に余韻。
- 発音正規化: ゼロえん / じゅうはちまんにん / ごてんごばい / にひゃくめい / エスエヌエス / トップ / チェック / おんしゃ。

## 出力
- `output/katalysad3v2_voiceover_43sec.mp4`
- `output/katalysad3v2_voiceover_43sec.wav`
- `output/timing_43sec.json`
- `output/build_report_43sec.md`

## メモ
- 速度はTTS側 `speed` を実測ベースで自動調整（atempo乱用なし）。
- 声を変える場合は `voiceover_openai.py` の `VOICE`（sage/nova/coral/shimmer 等）を変更。
- うまく繋がらない場合は `api.openai.com` への 403（Host not in allowlist）が出ていないか確認。出たらネットワーク設定の反映（新セッション化）を待つ。
