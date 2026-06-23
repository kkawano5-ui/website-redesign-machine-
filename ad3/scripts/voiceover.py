#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KATALYS v2 ナレーション生成（日本語女性・固定尺43.05秒）。完全オフライン。
- TTS: pyopenjtalk + HTSEngine, 女性ボイス mei_normal（落ち着いた成人女性, 48kHz）
- 全文使用・発音正規化済み。文ごとに生成→前後無音トリム→短い間で連結＝詰まった自然なテンポ。
- 実測時間ベースで speed を自動調整（最後の発話が ~42.5s で終わるよう収束）。
- 冒頭は落ち着いた早め→後半テンポUP の微エンベロープ。
出力: /tmp/voice_raw.wav (48k), /tmp/voice_timing.json
"""
import json, numpy as np, soundfile as sf, pyopenjtalk
from pyopenjtalk.htsengine import HTSEngine

VOICE = "/usr/local/lib/python3.11/dist-packages/pyopenjtalk/htsvoice/mei_normal.htsvoice"
ENG = HTSEngine(VOICE.encode("utf-8"))
SR = ENG.get_sampling_frequency()     # 48000
LEAD = 0.08
TARGET_RAW = 42.35

# (テキスト, 文末の間[秒])  ※数字・御社などは確実な読みのため かな表記
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

def trim(a, thresh=0.006, pad=int(0.012 * SR)):
    idx = np.where(np.abs(a) > thresh)[0]
    if len(idx) == 0:
        return a[:0]
    s = max(0, idx[0] - pad); e = min(len(a), idx[-1] + pad)
    return a[s:e]

def env(i, n):
    # 冒頭0.96 → 末尾1.04 の微エンベロープ（落ち着き→テンポUP）
    return 0.96 + 0.08 * (i / max(1, n - 1))

def synth(base_speed):
    parts, timing, cum = [], [], 0.0
    n = len(SENTENCES)
    for i, (text, gap) in enumerate(SENTENCES):
        ENG.set_speed(base_speed * env(i, n))
        labels = pyopenjtalk.extract_fullcontext(text)
        w = np.asarray(ENG.synthesize(labels), dtype=np.float32)
        a = trim(w)
        start = cum
        parts.append(a); cum += len(a) / SR
        end = cum
        parts.append(np.zeros(int(gap * SR), np.float32)); cum += gap
        timing.append({"text": text, "start": round(LEAD + start, 3), "end": round(LEAD + end, 3)})
    audio = np.concatenate(parts)
    # peak guard before loudnorm stage
    peak = np.max(np.abs(audio)) or 1.0
    audio = (audio / peak * 0.97).astype(np.float32)
    return audio, cum, timing

def main():
    speed = 1.0
    for it in range(7):
        audio, raw_len, timing = synth(speed)
        print(f"iter {it}: base_speed={speed:.4f} raw_len={raw_len:.3f}s")
        if 42.1 <= raw_len <= 42.6:
            break
        speed = max(0.7, min(2.3, speed * (raw_len / TARGET_RAW)))
    sf.write("/tmp/voice_raw.wav", audio, SR)
    json.dump({"voice": "pyopenjtalk/mei_normal", "speed": round(speed, 4),
               "raw_len": round(raw_len, 3), "lead": LEAD, "sr": SR, "segments": timing},
              open("/tmp/voice_timing.json", "w"), ensure_ascii=False, indent=2)
    print("DONE raw_len", round(raw_len, 3), "base_speed", round(speed, 4))

if __name__ == "__main__":
    main()
