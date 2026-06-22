#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate NEUTRAL placeholder assets so the Remotion project renders before the
real ChatGPT/gpt-image illustrations are dropped in. These are obvious scaffolds
(labelled "PLACEHOLDER"), NOT final art — replace each file with the same name.
Outputs to ad3/public/ad3/assets/.
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(HERE, "public", "ad3", "assets")
os.makedirs(OUT, exist_ok=True)

def fp(sz):
    for p in ["/tmp/reel/fonts/NotoSansJP.ttf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]:
        if os.path.exists(p):
            try: return ImageFont.truetype(p, sz)
            except Exception: pass
    return ImageFont.load_default()

BG = {"dark": (21, 41, 75), "pale": (220, 238, 248), "white": (244, 250, 254)}
INK = {"dark": (150, 180, 220), "pale": (90, 120, 160), "white": (120, 150, 185)}

def silhouette(d, cx, cy, s, col):
    d.ellipse([cx-70*s, cy-150*s, cx+70*s, cy-20*s], fill=col)        # head
    d.pieslice([cx-150*s, cy-10*s, cx+150*s, cy+260*s], 180, 360, fill=col)  # shoulders

def base(name, bgk, label, person=True):
    w, h = 1080, 1920
    im = Image.new("RGB", (w, h), BG[bgk]); d = ImageDraw.Draw(im)
    ink = INK[bgk]
    # dashed border
    for x in range(40, w-40, 40):
        d.line([(x, 40), (x+22, 40)], fill=ink, width=3)
        d.line([(x, h-40), (x+22, h-40)], fill=ink, width=3)
    for y in range(40, h-40, 40):
        d.line([(40, y), (40, y+22)], fill=ink, width=3)
        d.line([(w-40, y), (w-40, y+22)], fill=ink, width=3)
    if person:
        silhouette(d, w//2, int(h*0.66), 1.2, tuple(min(255, c+25) if bgk == "dark" else max(0, c-10) for c in ink))
    # labels
    d.text((w//2, 150), "PLACEHOLDER", font=fp(54), fill=ink, anchor="mm")
    d.text((w//2, 215), name, font=fp(40), fill=ink, anchor="mm")
    d.text((w//2, h-150), label, font=fp(34), fill=ink, anchor="mm")
    d.text((w//2, h-100), "replace with ChatGPT / gpt-image (no text)", font=fp(26), fill=ink, anchor="mm")
    im.save(os.path.join(OUT, name))

def card(name, w, h, label, dim=False):
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    fill = (255, 255, 255, 235) if not dim else (224, 230, 238, 235)
    d.rounded_rectangle([6, 6, w-6, h-6], radius=28, fill=fill, outline=(193, 225, 243, 255), width=4)
    ink = (120, 150, 185)
    silhouette(d, w//2, int(h*0.5), min(w, h)/360, (200, 214, 230, 255))
    d.text((w//2, h-46), label, font=fp(28), fill=ink, anchor="mm")
    im.save(os.path.join(OUT, name))

# base scenes
base("s1.png", "dark", "S1 落ち込む担当者")
base("s2.png", "dark", "S2 投稿に追われる担当者")
base("s3.png", "pale", "S3 明るくなる担当者")
base("s4.png", "pale", "S4 3つの抽象カード背景", person=False)
base("s5.png", "white", "S5 人が見えるSNS 背景", person=False)
base("s6.png", "dark", "S6 実績(グラフ/アイコン)背景", person=False)
base("s7.png", "pale", "S7 会社をSNSで調べる 背景", person=False)
base("s8.png", "pale", "S8 魅力が隠れている会社", person=False)
base("s9.png", "white", "S9 オンライン無料相談")

# overlays (transparent)
card("s2_calendar.png", 360, 320, "calendar")
card("s2_cards.png", 620, 460, "post cards")
card("s4_center.png", 520, 320, "people-SNS card")
card("s5_ceo.png", 360, 460, "CEO post")
card("s5_staff.png", 360, 460, "staff post")
card("s5_site.png", 360, 460, "worksite post")
card("s7_empty.png", 380, 560, "empty company", dim=True)
card("s7_warm.png", 380, 560, "warm company")
card("s8_reveal.png", 980, 620, "SNS cards reveal")

print("placeholders written to", OUT)
