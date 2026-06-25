#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KATALYS v2 ナレーション生成（OpenAI TTS版・日本語女性・固定尺43.05秒用）。
- model=tts-1-hd, voice=sage（落ち着いた女性）, speed=TTS側で実測ベース自動調整。
- 全文使用・発音正規化済み。文ごとに生成→前後無音トリム→短い間で連結。
- 出力: /tmp/voice_raw.wav (24k), /tmp/voice_timing.json  → 後は finalize_voiceover.py
キーは環境変数 OPENAI_API_KEY か /tmp/oai.key から読む。
"""
import os, io, json, time, urllib.request, urllib.error
import numpy as np, soundfile as sf

MODEL = "gpt-4o-mini-tts"
VOICE = "sage"
LEAD = 0.08
TARGET_RAW = 36.40   # 新台本(約36.5s)に合わせる

def get_key():
    k = os.environ.get("OPENAI_API_KEY", "").strip()
    if not k and os.path.exists("/tmp/oai.key"):
        k = open("/tmp/oai.key").read().strip()
    if not k:
        raise SystemExit("OPENAI_API_KEY not set (env or /tmp/oai.key)")
    return k
KEY = get_key()

# 新台本（動画の storyboard2New と同一の文・順番）。これで生成すれば動画と同期する。
SENTENCES = [
    ("毎月、広告や求人にいくら払っていますか？", 0.24),
    ("止めれば消える広告や求人媒体に払い続けても、手元には何も残りません。", 0.24),
    ("でも、エスエヌエスは続けるほど、資産になります。", 0.18),
    ("私たちは広告費ぜろえんでフォロワーをじゅうはちまんにんまで増やし、集客はごてんごばい。", 0.16),
    ("求人媒体に頼らず、にひゃくめいの応募がきました。", 0.24),
    ("特別なことはしていません。", 0.14),
    ("社長やスタッフの、人が見える発信を続けただけ。", 0.24),
    ("お客さまも、これから働く人も、まず会社をエスエヌエスで調べる時代。", 0.20),
    ("そこで人が見えるだけで、選ばれる会社になります。", 0.20),
    ("その始め方を、無料の相談会でお話ししています。", 0.20),
    ("気になったら、プロフィールトップのリンクからチェック。", 0.0),
]
INSTRUCTIONS = (
    "ターゲットは日本人視聴者。日本人女性ナレーター（30代後半・東京標準語ネイティブ）として、"
    "すべての言葉を完全な日本語の音韻で発音してください。英語アクセントや外来語的発音は絶対に禁止。"
    "「エスエヌエス」「トップ」「チェック」などのカタカナ語も、日本語の子音と母音で平坦に発音すること。"
    "落ち着いた中低音、知的で信頼感のある語り口。テンポは良いが焦らず、語尾は上げない。"
    "句読点では自然な間を取り、数字（じゅうはちまんにん／ごてんごばい／にひゃくめい）は明瞭に。"
)

SR_OUT = 24000
def tts(text, speed):
    body = json.dumps({"model": MODEL, "voice": VOICE, "input": text,
                       "instructions": INSTRUCTIONS, "response_format": "wav",
                       "speed": round(speed, 3)}).encode()
    req = urllib.request.Request("https://api.openai.com/v1/audio/speech", data=body,
        headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json"})
    for attempt in range(5):
        try:
            data = urllib.request.urlopen(req, timeout=90).read()
            a, sr = sf.read(io.BytesIO(data))
            if a.ndim > 1: a = a.mean(axis=1)
            return a.astype(np.float32), sr
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 4:
                time.sleep(2 * (attempt + 1)); continue
            raise SystemExit(f"OpenAI HTTP {e.code}: {e.read()[:300]}")
    raise SystemExit("tts failed")

def trim(a, sr, thresh=0.006):
    pad = int(0.012 * sr)
    idx = np.where(np.abs(a) > thresh)[0]
    if len(idx) == 0: return a[:0]
    return a[max(0, idx[0]-pad):min(len(a), idx[-1]+pad)]

def synth(speed):
    parts, timing, cum, sr0 = [], [], 0.0, SR_OUT
    for text, gap in SENTENCES:
        a, sr = tts(text, speed); sr0 = sr
        a = trim(a, sr)
        start = cum; parts.append(a); cum += len(a)/sr
        end = cum; parts.append(np.zeros(int(gap*sr), np.float32)); cum += gap
        timing.append({"text": text, "start": round(LEAD+start, 3), "end": round(LEAD+end, 3)})
    audio = np.concatenate(parts)
    peak = np.max(np.abs(audio)) or 1.0
    return (audio/peak*0.97).astype(np.float32), cum, timing, sr0

def main():
    speed = 1.40
    best = None  # (abs_err, audio, raw_len, timing, sr, speed)
    for it in range(7):
        audio, raw_len, timing, sr = synth(speed)
        err = abs(raw_len - TARGET_RAW)
        print(f"iter {it}: speed={speed:.3f} raw_len={raw_len:.3f}s err={err:+.3f}")
        if best is None or err < best[0]:
            best = (err, audio, raw_len, timing, sr, speed)
        if 42.1 <= raw_len <= 42.6: break
        speed = max(0.7, min(2.0, speed * (raw_len / TARGET_RAW)))
    _, audio, raw_len, timing, sr, used_speed = best
    sf.write("/tmp/voice_raw.wav", audio, sr)
    json.dump({"voice": f"openai/{MODEL}/{VOICE}", "speed": round(used_speed, 3),
               "raw_len": round(raw_len, 3), "lead": LEAD, "sr": sr, "segments": timing},
              open("/tmp/voice_timing.json", "w"), ensure_ascii=False, indent=2)
    print("DONE raw_len", round(raw_len, 3), "speed", round(used_speed, 3))

if __name__ == "__main__":
    main()
