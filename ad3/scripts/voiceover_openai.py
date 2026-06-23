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

MODEL = "tts-1-hd"
VOICE = "sage"
LEAD = 0.08
TARGET_RAW = 42.35

def get_key():
    k = os.environ.get("OPENAI_API_KEY", "").strip()
    if not k and os.path.exists("/tmp/oai.key"):
        k = open("/tmp/oai.key").read().strip()
    if not k:
        raise SystemExit("OPENAI_API_KEY not set (env or /tmp/oai.key)")
    return k
KEY = get_key()

SENTENCES = [
    ("毎月、広告と求人にいくら払っていますか？", 0.13),
    ("そのお金、本当に意味があるといえますか？", 0.15),
    ("広告も求人媒体も、止めたら消えます。", 0.09),
    ("毎月払い続けて、手元には何も残らない。", 0.15),
    ("その一方で、同じ会社でも、ある状態をつくるだけで、選ばれ方が変わります！", 0.15),
    ("私たち自身、広告費ゼロえんでフォロワーをじゅうはちまんにんまで増やし、その発信だけで、集客はごてんごばい。", 0.10),
    ("求人媒体にお金をかけずに、にひゃくめいの応募がきました。", 0.10),
    ("エスエヌエスは、続けるほど資産として積み上がります。", 0.15),
    ("特別なことはしていません。", 0.09),
    ("社長やスタッフの人が見える発信を続けただけ。", 0.15),
    ("お客さまも、これから働く人も、まず会社をエスエヌエスで調べる時代。", 0.10),
    ("そこで人が見えるだけで、選ばれる会社になります。", 0.15),
    ("その始め方を、無料の相談会でお話ししています。", 0.10),
    ("おんしゃの集客や採用のお悩みをお聞きして、エスエヌエスで何ができるか、いっしょに考えさせてください。", 0.15),
    ("少しでも気になったら、プロフィールトップのリンクからチェック。", 0.0),
]
INSTRUCTIONS = ("落ち着いた30代後半〜40代前半の日本人女性。中低音で知的、信頼感のある標準語。"
                "テンポは良いが焦らず、語尾を上げすぎず、数字は明瞭に。")

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
    speed = 1.12
    for it in range(5):
        audio, raw_len, timing, sr = synth(speed)
        print(f"iter {it}: speed={speed:.3f} raw_len={raw_len:.3f}s")
        if 42.1 <= raw_len <= 42.6: break
        speed = max(0.7, min(2.0, speed * (raw_len / TARGET_RAW)))
    sf.write("/tmp/voice_raw.wav", audio, sr)
    json.dump({"voice": f"openai/{MODEL}/{VOICE}", "speed": round(speed, 3),
               "raw_len": round(raw_len, 3), "lead": LEAD, "sr": sr, "segments": timing},
              open("/tmp/voice_timing.json", "w"), ensure_ascii=False, indent=2)
    print("DONE raw_len", round(raw_len, 3), "speed", round(speed, 3))

if __name__ == "__main__":
    main()
