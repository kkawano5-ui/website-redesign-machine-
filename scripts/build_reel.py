#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build a Raha Kenya-style 9:16 emotional reel for Tsumugi (heritage weddings),
from the photos in wedding/.  No Canva required.

Pipeline:
  1) Compose 7 vertical 1080x1920 frames (warm grade + serif JP caption + scrim).
  2) Turn each into a 4s Ken Burns clip (ffmpeg zoompan).
  3) Crossfade-chain the clips into one MP4 (~24s), with fade in/out.

Outputs to OUT_DIR:
  frame_1..7.png   (flattened preview stills)
  reel_tsumugi_rahakenya.mp4
"""
import os, subprocess, math
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter, ImageChops
import imageio_ffmpeg

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WED  = os.path.join(REPO, "wedding")
FONTS= "/tmp/reel/fonts"
OUT  = "/tmp/reel/out"
os.makedirs(OUT, exist_ok=True)
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

W, H = 1080, 1920
CREAM = (246, 239, 230)
GOLD  = (224, 196, 122)
GOLD2 = (201, 162, 75)
SUMI  = (20, 16, 14)

SERIF = os.path.join(FONTS, "NotoSerifJP.ttf")
SANS  = os.path.join(FONTS, "NotoSansJP.ttf")

def font(path, size, weight=None):
    f = ImageFont.truetype(path, size)
    if weight is not None:
        try: f.set_variation_by_axes([weight])
        except Exception: pass
    return f

COLORS = {"cream": CREAM, "gold": GOLD}

# ---------- text rendering with soft shadow + letter tracking ----------
def line_width(f, s, tracking):
    if not s: return 0
    return sum(f.getlength(c) for c in s) + tracking * (len(s) - 1)

def render_line(s, f, fill, tracking=0, shadow=True):
    """Return an RGBA image tightly fit to the (tracked) text, with a soft drop shadow."""
    asc, desc = f.getmetrics()
    lh = asc + desc
    w = int(math.ceil(line_width(f, s, tracking))) + 40
    h = lh + 40
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    x = 20.0
    y = 20
    for c in s:
        d.text((x, y), c, font=f, fill=fill + (255,))
        x += f.getlength(c) + tracking
    if shadow:
        alpha = img.split()[3]
        sh = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        sh.putalpha(alpha.point(lambda a: int(a * 0.78)))
        sh = sh.filter(ImageFilter.GaussianBlur(7))
        base = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        base.alpha_composite(sh, (0, 4))
        base.alpha_composite(img, (0, 0))
        img = base
    return img

def fit_font(path, size, s, maxw, weight):
    f = font(path, size, weight)
    while size > 24 and line_width(f, s, 0) > maxw:
        size -= 2
        f = font(path, size, weight)
    return f

# ---------- warm cinematic grade ----------
def cover(img, w, h):
    iw, ih = img.size
    s = max(w / iw, h / ih)
    img = img.resize((int(iw * s + 1), int(ih * s + 1)), Image.LANCZOS)
    iw, ih = img.size
    return img.crop(((iw - w)//2, (ih - h)//2, (iw - w)//2 + w, (ih - h)//2 + h))

def warm_grade(img, dark=0.0):
    img = ImageEnhance.Color(img).enhance(1.14)
    img = ImageEnhance.Contrast(img).enhance(1.07)
    img = ImageEnhance.Brightness(img).enhance(1.02 - dark)
    r, g, b = img.split()
    r = r.point(lambda v: min(255, int(v * 1.07 + 6)))
    b = b.point(lambda v: int(v * 0.93))
    img = Image.merge("RGB", (r, g, b))
    # warm light bloom from upper area
    glow = Image.new("RGB", img.size, (255, 186, 112))
    mask = Image.new("L", img.size, 0)
    md = ImageDraw.Draw(mask)
    md.ellipse([-W*0.3, -H*0.25, W*1.3, H*0.6], fill=70)
    mask = mask.filter(ImageFilter.GaussianBlur(220))
    img = Image.composite(ImageChops.screen(img, glow), img, mask)
    # vignette
    vig = Image.new("L", img.size, 0)
    vd = ImageDraw.Draw(vig)
    vd.ellipse([-W*0.18, -H*0.12, W*1.18, H*1.12], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(260))
    dark_img = ImageEnhance.Brightness(img).enhance(0.62)
    img = Image.composite(img, dark_img, vig)
    return img

def bottom_scrim(top=820, a_top=0, a_bot=224):
    sc = Image.new("L", (1, H), 0)
    for y in range(H):
        if y < top:
            v = 0
        else:
            t = (y - top) / (H - top)
            v = int(a_top + (a_bot - a_top) * (t ** 1.35))
        sc.putpixel((0, y), v)
    sc = sc.resize((W, H))
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    layer.putalpha(sc)
    black = Image.new("RGBA", (W, H), (8, 6, 5, 0))
    black.putalpha(sc)
    return black

# ---------- frame builder ----------
def build_frame(spec, idx):
    photo = Image.open(os.path.join(WED, spec["img"])).convert("RGB")
    bg = warm_grade(cover(photo, W, H), dark=0.06 if spec.get("cta") else 0.0)
    bg.save(os.path.join(OUT, f"bg_{idx}.png"))

    txt = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if spec.get("cta"):
        full = Image.new("RGBA", (W, H), (10, 8, 6, 150))
        txt.alpha_composite(full)
    else:
        txt.alpha_composite(bottom_scrim())

    cx = W // 2
    maxw = W - 170

    if spec.get("cta"):
        _build_cta(txt, spec, cx, maxw)
    else:
        _build_caption(txt, spec, cx, maxw)

    txt.save(os.path.join(OUT, f"txt_{idx}.png"))
    flat = bg.convert("RGBA")
    flat.alpha_composite(txt)
    flat.convert("RGB").save(os.path.join(OUT, f"frame_{idx}.png"), quality=95)

def _stack(layer, items, cx, top_y, gaps):
    y = top_y
    for i, im in enumerate(items):
        layer.alpha_composite(im, (int(cx - im.width / 2), int(y)))
        y += im.height + (gaps[i] if i < len(gaps) else 0)
    return y

def _build_caption(txt, spec, cx, maxw):
    items, gaps = [], []
    if spec.get("kicker"):
        kf = font(SANS, 30, 600)
        items.append(render_line(spec["kicker"], kf, GOLD, tracking=10, shadow=True))
        gaps.append(34)
    base = 84
    for (s, col, scale) in spec["jp"]:
        size = int(base * scale)
        f = fit_font(SERIF, size, s, maxw, 600)
        items.append(render_line(s, f, COLORS[col], tracking=2))
        gaps.append(16)
    gaps[-1] = 30
    ef = fit_font(SERIF, 40, spec["en"], maxw, 400)
    items.append(render_line(spec["en"], ef, (228, 218, 205), tracking=1))
    gaps.append(0)
    total = sum(im.height for im in items) + sum(gaps)
    top = H - 250 - total
    _stack(txt, items, cx, top, gaps)
    # gold hairline under text block
    d = ImageDraw.Draw(txt)
    d.line([(cx - 46, H - 205), (cx + 46, H - 205)], fill=GOLD + (200,), width=3)

def _build_cta(txt, spec, cx, maxw):
    d = ImageDraw.Draw(txt)
    # logo lockup
    logo_f = font(SERIF, 132, 600)
    logo = render_line("Tsumugi", logo_f, CREAM, tracking=4)
    mark_f = font(SERIF, 56, 500)
    mark = render_line("紡", mark_f, GOLD, tracking=0)
    items = [logo, mark]
    gaps = [6, 70]
    # JP message
    for (s, col, scale) in spec["jp"]:
        f = fit_font(SERIF, int(78 * scale), s, maxw, 600)
        items.append(render_line(s, f, COLORS[col], tracking=2))
        gaps.append(14)
    gaps[-1] = 56
    total = sum(im.height for im in items) + sum(gaps)
    top = (H - total) / 2 - 60
    end_y = _stack(txt, items, cx, top, gaps)

    # CTA button (gold pill)
    bf = font(SANS, 44, 700)
    label = spec["button"]
    bw = int(line_width(bf, label, 1)) + 110
    bh = 116
    bx0 = cx - bw // 2
    by0 = int(end_y)
    d.rounded_rectangle([bx0, by0, bx0 + bw, by0 + bh], radius=bh//2, fill=GOLD2 + (255,))
    lbl = render_line(label, bf, SUMI, tracking=1, shadow=False)
    txt.alpha_composite(lbl, (int(cx - lbl.width/2), int(by0 + (bh - lbl.height)/2)))
    # EN subline
    ef = font(SERIF, 36, 400)
    en = render_line(spec["en"] + "  ·  Free consultation", ef, (224, 214, 200), tracking=2)
    txt.alpha_composite(en, (int(cx - en.width/2), by0 + bh + 34))

FRAMES = [
    dict(img="hero.jpg", kicker="MARRY WHERE YOUR ROOTS BEGAN",
         jp=[("いつか、", "cream", 1.0), ("おじいちゃんの国で。", "cream", 1.0)],
         en="One day, in the country we come from.", kb="in"),
    dict(img="shrine.jpg",
         jp=[("「日本で挙げたい」。", "cream", 1.0), ("でも、言葉も段取りも、", "cream", 0.92),
             ("全部むこう側。", "cream", 1.0)],
         en="The language, the planning, it all feels far away.", kb="out"),
    dict(img="showcase-sakura.jpg",
         jp=[("大丈夫。", "gold", 1.25), ("「想い」だけ、持ってくればいい。", "cream", 0.92)],
         en="Bring only what matters. We carry the rest.", kb="in"),
    dict(img="kimono.jpg",
         jp=[("神社の儀式も、着物も、料理も。", "cream", 0.9), ("——英語で、ぜんぶ。", "gold", 1.1)],
         en="Shrine rites, kimono, cuisine, handled in English.", kb="out"),
    dict(img="family.jpg",
         jp=[("家族の旅まで、", "cream", 1.0), ("ひとつの窓口で。", "cream", 1.0)],
         en="Even your family's journey, one planner, one contact.", kb="in"),
    dict(img="showcase-ryokan.jpg", kicker="OUR STORY SO FAR",
         jp=[("これまで、", "cream", 0.82), ("50組以上の", "gold", 1.55),
             ("「ルーツに還る一日」を。", "cream", 0.94)],
         en="50+ celebrations. Families, home again.", kb="out"),
    dict(img="hero.jpg", cta=True,
         jp=[("あなたの物語を、", "cream", 1.0), ("聞かせて。", "cream", 1.0)],
         en="Tell us your story", button="▶ まずは無料相談", kb="in"),
]

def run(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        print("CMD FAIL:", " ".join(cmd[:6]), "...")
        print(p.stderr[-1500:])
        raise SystemExit(1)

def zoom_expr(kb):
    if kb == "in":
        z = "min(1.0+0.00085*on,1.10)"
    else:
        z = "max(1.10-0.00085*on,1.0)"
    x = "iw/2-(iw/zoom/2)"
    y = "ih/2-(ih/zoom/2)"
    return f"zoompan=z='{z}':x='{x}':y='{y}':d=120:s={W}x{H}:fps=30"

def main():
    print("Building frames...")
    for i, spec in enumerate(FRAMES, 1):
        build_frame(spec, i)
        print("  frame", i, spec["img"])

    print("Rendering clips...")
    DUR = 4.0
    clips = []
    for i, spec in enumerate(FRAMES, 1):
        clip = os.path.join(OUT, f"clip_{i}.mp4")
        zp = zoom_expr(spec["kb"])
        fc = (f"[0:v]scale=2160:3840:force_original_aspect_ratio=increase,"
              f"crop=2160:3840,{zp},setsar=1[bg];"
              f"[bg][1:v]overlay=0:0,format=yuv420p[v]")
        run([FFMPEG, "-y", "-loop", "1", "-t", str(DUR), "-i", os.path.join(OUT, f"bg_{i}.png"),
             "-loop", "1", "-t", str(DUR), "-i", os.path.join(OUT, f"txt_{i}.png"),
             "-filter_complex", fc, "-map", "[v]",
             "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30",
             "-t", str(DUR), clip])
        clips.append(clip)
        print("  clip", i)

    print("Crossfading...")
    XF = 0.7
    inputs = []
    for c in clips:
        inputs += ["-i", c]
    parts = []
    prev = "[0:v]"
    cum = DUR
    for i in range(1, len(clips)):
        off = cum - XF
        out = f"[x{i}]"
        parts.append(f"{prev}[{i}:v]xfade=transition=fade:duration={XF}:offset={off:.3f}{out}")
        prev = out
        cum = cum + DUR - XF
    total = cum
    fc = ";".join(parts) + f";{prev}fade=t=in:st=0:d=0.5,fade=t=out:st={total-0.8:.3f}:d=0.8,format=yuv420p[v]"
    final = os.path.join(OUT, "reel_tsumugi_rahakenya.mp4")
    run([FFMPEG, "-y", *inputs, "-filter_complex", fc, "-map", "[v]",
         "-c:v", "libx264", "-crf", "19", "-pix_fmt", "yuv420p", "-r", "30",
         "-movflags", "+faststart", final])
    print("DONE:", final, f"(~{total:.1f}s)")

if __name__ == "__main__":
    main()
