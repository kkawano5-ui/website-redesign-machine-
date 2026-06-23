#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ナレーション(/tmp/voice_raw.wav)を整音→固定尺化し、元動画と結合する。
映像は -c:v copy（フレーム完全保持）。出力と検証ファイルを output/ に書き出す。
"""
import json, os, subprocess, re
import numpy as np, soundfile as sf
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()

REPO = "/home/user/website-redesign-machine-"
VIDEO = f"{REPO}/ad3/out/katalys-ad3-v2.mp4"
OUT = f"{REPO}/output"; os.makedirs(OUT, exist_ok=True)
DUR = 43.050667
MP4 = f"{OUT}/katalysad3v2_voiceover_43sec.mp4"
WAV = f"{OUT}/katalysad3v2_voiceover_43sec.wav"

def run(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True)
    return p.returncode, p.stdout, p.stderr

def dur_of(path, stream="v"):
    rc, _, err = run([FF, "-i", path])
    m = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", err)
    total = None
    if m:
        total = int(m.group(1))*3600 + int(m.group(2))*60 + float(m.group(3))
    return total

def vframes(path):
    rc, _, err = run([FF, "-i", path, "-map", "0:v:0", "-f", "null", "-"])
    fr = re.findall(r"frame=\s*(\d+)", err.replace("\r", "\n"))
    return int(fr[-1]) if fr else None

def vstream_md5(path):
    rc, _, err = run([FF, "-i", path, "-map", "0:v:0", "-c", "copy", "-f", "md5", "-"])
    m = re.search(r"MD5=([0-9a-f]+)", err) or re.search(r"^MD5=([0-9a-f]+)", _ or "", re.M)
    rc2, out2, err2 = run([FF, "-i", path, "-map", "0:v:0", "-c", "copy", "-f", "md5", "-"])
    mm = re.search(r"MD5=([0-9a-f]+)", out2 + err2)
    return mm.group(1) if mm else None

# 1a) loudnorm + 48k + fade-in (length ~ content only)
TMP = "/tmp/voice_ln.wav"
rc, _, err = run([FF, "-y", "-i", "/tmp/voice_raw.wav",
                  "-af", "aresample=48000,loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:st=0:d=0.05",
                  "-ar", "48000", "-ac", "1", TMP])
assert rc == 0, err[-1500:]
# 1b) sample-exact: 0.08s lead + pad/truncate to EXACT 43.050667s, fade-out tail
a, sr = sf.read(TMP)
a = a.astype(np.float32)
LEAD = 0.08
a = np.concatenate([np.zeros(int(round(LEAD * sr)), np.float32), a])
N = int(round(DUR * sr))                       # 43.050667 * 48000 = 2066432 samples
a = np.concatenate([a, np.zeros(max(0, N - len(a)), np.float32)])[:N]
fo = int(0.12 * sr)
a[-fo:] *= np.linspace(1.0, 0.0, fo, dtype=np.float32)
np.clip(a, -1.0, 1.0, out=a)
sf.write(WAV, a, sr)

# 2) mux: copy video, AAC audio 192k, faststart
rc, _, err = run([FF, "-y", "-i", VIDEO, "-i", WAV,
                  "-map", "0:v:0", "-map", "1:a:0",
                  "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
                  "-movflags", "+faststart", MP4])
assert rc == 0, err[-1500:]

# 3) verify
v_in_frames, v_out_frames = vframes(VIDEO), vframes(MP4)
md5_in, md5_out = vstream_md5(VIDEO), vstream_md5(MP4)
out_dur = dur_of(MP4)
wav_dur = dur_of(WAV)

timing = json.load(open("/tmp/voice_timing.json"))
segs = timing["segments"]
last_end = segs[-1]["end"]

# key-word target windows (sec) vs containing-sentence actual
KEY = [
    ("広告費ゼロ", "ゼロえん", (15.4, 16.2)),
    ("十八万人", "じゅうはちまんにん", (17.2, 18.5)),
    ("五点五倍", "ごてんごばい", (19.7, 21.0)),
    ("二百名", "にひゃくめい", (21.8, 23.2)),
    ("資産積み上がり終了", "積み上がります", (25.0, 25.4)),
    ("人が見える発信", "人が見える発信", (26.3, 28.2)),
    ("SNSで調べる時代", "調べる時代", (30.0, 31.8)),
    ("選ばれる会社になります終了", "選ばれる会社になります", (33.0, 33.8)),
    ("無料の相談会", "無料の相談会", (34.0, 35.7)),
    ("御社の集客や採用", "集客や採用", (35.8, 37.4)),
    ("いっしょに考えさせてください終了", "考えさせてください", (40.0, 40.6)),
    ("プロフィールトップ", "プロフィールトップ", (40.5, 41.8)),
    ("最後のチェック", "チェック", (42.15, 42.60)),
]
key_report = []
for name, needle, (lo, hi) in KEY:
    seg = next((s for s in segs if needle in s["text"]), None)
    if seg:
        key_report.append({"key": name, "target": [lo, hi],
                           "sentence_start": seg["start"], "sentence_end": seg["end"]})

json.dump({
    "final_duration_target": DUR,
    "final_mp4_duration": out_dur,
    "wav_duration": wav_dur,
    "video_frames_in": v_in_frames, "video_frames_out": v_out_frames,
    "video_stream_md5_in": md5_in, "video_stream_md5_out": md5_out,
    "video_identical": (v_in_frames == v_out_frames and md5_in == md5_out),
    "tts_speed": timing.get("speed"), "raw_speech_len": timing.get("raw_len"),
    "last_word_end": last_end,
    "segments": segs,
    "key_sync": key_report,
}, open(f"{OUT}/timing_43sec.json", "w"), ensure_ascii=False, indent=2)

# 4) build report
rep = f"""# KATALYS v2 ナレーション付き — ビルドレポート

## 出力
- {MP4}
- {WAV}
- output/timing_43sec.json

## 固定尺
- 目標: {DUR}s / 実測MP4: {out_dur}s / WAV: {wav_dur}s
- 最後の発話(チェック)終了: {last_end}s （目標 42.15〜42.60、発話後の余韻 約 {round(DUR-last_end,2)}s）

## 映像の完全保持（再エンコードなし）
- 映像フレーム数: 入力 {v_in_frames} / 出力 {v_out_frames}
- 映像ストリームMD5: 入力 {md5_in} / 出力 {md5_out}
- 同一: **{v_in_frames == v_out_frames and md5_in == md5_out}**（-c:v copy）

## 音声
- 48kHz / AAC 192k / ステレオ(センター) / loudnorm I=-16 LUFS, TP=-1.5 dBTP / 冒頭末尾フェード
- TTS: Kokoro 日本語女性(jf_alpha), speed={timing.get('speed')}（実測ベース自動調整, raw={timing.get('raw_len')}s）
- BGM/効果音/リバーブ無し、ピッチ変更無し、asetrate不使用

## 重要語の同期（参考: 文単位の実測 vs 目標窓）
| 重要語 | 目標(s) | 文の開始/終了(s) |
|---|---|---|
""" + "\n".join(
    f"| {k['key']} | {k['target'][0]}〜{k['target'][1]} | {k['sentence_start']} / {k['sentence_end']} |"
    for k in key_report) + """

> 数字と最後の「チェック」を優先同期。文単位の連続ナレーションのため、語単位は近似。
"""
open(f"{OUT}/build_report_43sec.md", "w").write(rep)
print("OK", out_dur, "frames", v_in_frames, v_out_frames, "identical", md5_in == md5_out, "lastword", last_end)
