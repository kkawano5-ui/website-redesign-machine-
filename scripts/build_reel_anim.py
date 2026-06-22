#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Animated ("kinetic typography") v2 of the Tsumugi x Raha Kenya reel.

Replicates the motion language of the reference Instagram ad:
  - line-by-line text reveal (fade + rise, eased)
  - emphasis box that wipes in behind the punch line
  - warm light-burst transitions between scenes
  - drifting sakura petals
  - Ken Burns push on every photo

Renders the whole thing as a 30fps RGB frame stream piped straight into
ffmpeg (libx264).  No Canva required.
"""
import os, math, subprocess, random
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter, ImageChops
import imageio_ffmpeg

REPO  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WED   = os.path.join(REPO, "wedding")
FONTS = "/tmp/reel/fonts"
OUT   = "/tmp/reel/out"
DBG   = "/tmp/reel/anim_dbg"
os.makedirs(OUT, exist_ok=True); os.makedirs(DBG, exist_ok=True)
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

W, H, FPS = 1080, 1920, 30
CREAM = (246, 239, 230); GOLD = (224, 196, 122); GOLD2 = (201, 162, 75); SUMI = (20, 16, 14)
SERIF = os.path.join(FONTS, "NotoSerifJP.ttf"); SANS = os.path.join(FONTS, "NotoSansJP.ttf")
COLORS = {"cream": CREAM, "gold": GOLD}
random.seed(7)

def font(path, size, weight=None):
    f = ImageFont.truetype(path, size)
    if weight is not None:
        try: f.set_variation_by_axes([weight])
        except Exception: pass
    return f

def ease_out(p):  return 1 - (1 - p) ** 3
def clamp(v, a=0.0, b=1.0): return a if v < a else b if v > b else v

# ---------- text line rendering (tight RGBA w/ soft shadow) ----------
def line_width(f, s, tr): return sum(f.getlength(c) for c in s) + tr * (len(s) - 1) if s else 0
def fit_font(path, size, s, maxw, weight):
    f = font(path, size, weight)
    while size > 22 and line_width(f, s, 0) > maxw:
        size -= 2; f = font(path, size, weight)
    return f

def render_line(s, f, fill, tr=2, shadow=True):
    asc, desc = f.getmetrics(); lh = asc + desc
    w = int(math.ceil(line_width(f, s, tr))) + 44; h = lh + 44
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    x = 22.0
    for c in s:
        d.text((x, 22), c, font=f, fill=fill + (255,)); x += f.getlength(c) + tr
    if shadow:
        a = img.split()[3]; sh = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        sh.putalpha(a.point(lambda v: int(v * 0.8))); sh = sh.filter(ImageFilter.GaussianBlur(7))
        base = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        base.alpha_composite(sh, (0, 5)); base.alpha_composite(img, (0, 0)); img = base
    return img

# ---------- warm cinematic grade (size-agnostic) ----------
def cover(img, w, h):
    iw, ih = img.size; s = max(w / iw, h / ih)
    img = img.resize((int(iw * s + 1), int(ih * s + 1)), Image.LANCZOS); iw, ih = img.size
    return img.crop(((iw - w)//2, (ih - h)//2, (iw - w)//2 + w, (ih - h)//2 + h))

def warm_grade(img, dark=0.0):
    w, h = img.size
    img = ImageEnhance.Color(img).enhance(1.14)
    img = ImageEnhance.Contrast(img).enhance(1.07)
    img = ImageEnhance.Brightness(img).enhance(1.02 - dark)
    r, g, b = img.split()
    r = r.point(lambda v: min(255, int(v * 1.07 + 6))); b = b.point(lambda v: int(v * 0.93))
    img = Image.merge("RGB", (r, g, b))
    glow = Image.new("RGB", (w, h), (255, 186, 112)); mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).ellipse([-w*0.3, -h*0.25, w*1.3, h*0.6], fill=70)
    mask = mask.filter(ImageFilter.GaussianBlur(int(w*0.2)))
    img = Image.composite(ImageChops.screen(img, glow), img, mask)
    vig = Image.new("L", (w, h), 0)
    ImageDraw.Draw(vig).ellipse([-w*0.18, -h*0.12, w*1.18, h*1.12], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(int(w*0.24)))
    img = Image.composite(img, ImageEnhance.Brightness(img).enhance(0.62), vig)
    return img

def bottom_scrim(top=820, a_bot=224):
    col = Image.new("L", (1, H), 0)
    for y in range(H):
        v = 0 if y < top else int(a_bot * (((y-top)/(H-top)) ** 1.35))
        col.putpixel((0, y), v)
    sc = col.resize((W, H)); layer = Image.new("RGBA", (W, H), (8, 6, 5, 0)); layer.putalpha(sc)
    return layer

# ---------- petal sprite + field ----------
def petal_sprite(size=26):
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse([size*0.18, size*0.05, size*0.82, size*0.95], fill=(247, 214, 214, 235))
    d.ellipse([size*0.30, size*0.12, size*0.70, size*0.6], fill=(255, 235, 235, 120))
    return im
PETAL = petal_sprite()
PETALS = [dict(x=random.uniform(0, W), y=random.uniform(-H, H), v=random.uniform(36, 80),
               amp=random.uniform(18, 55), w=random.uniform(0.5, 1.4), ph=random.uniform(0, 6.28),
               sc=random.uniform(0.45, 1.15), rot=random.uniform(0, 360),
               rv=random.uniform(-40, 40)) for _ in range(26)]

def draw_petals(layer, t):
    for p in PETALS:
        y = (p["y"] + p["v"] * t) % (H + 80) - 40
        x = (p["x"] + p["amp"] * math.sin(p["w"] * t + p["ph"])) % (W + 60) - 30
        spr = PETAL.resize((max(6, int(26*p["sc"])),)*2, Image.BILINEAR).rotate(
            p["rot"] + p["rv"]*t, expand=True, resample=Image.BILINEAR)
        layer.alpha_composite(spr, (int(x), int(y)))

# ---------- scene model ----------
FRAMES = [
    dict(img="hero.jpg", kicker="MARRY WHERE YOUR ROOTS BEGAN", kb="in",
         jp=[("いつか、","cream",1.0,0),("おじいちゃんの国で。","cream",1.0,1)],
         en="One day, in the country we come from."),
    dict(img="shrine.jpg", kb="out",
         jp=[("「日本で挙げたい」。","cream",1.0,0),("でも、言葉も段取りも、","cream",0.92,0),
             ("全部むこう側。","cream",1.0,1)],
         en="The language, the planning, it all feels far away."),
    dict(img="showcase-sakura.jpg", kb="in",
         jp=[("大丈夫。","gold",1.25,1),("「想い」だけ、持ってくればいい。","cream",0.92,0)],
         en="Bring only what matters. We carry the rest."),
    dict(img="kimono.jpg", kb="out",
         jp=[("神社の儀式も、着物も、料理も。","cream",0.9,0),("——英語で、ぜんぶ。","gold",1.1,1)],
         en="Shrine rites, kimono, cuisine, handled in English."),
    dict(img="family.jpg", kb="in",
         jp=[("家族の旅まで、","cream",1.0,0),("ひとつの窓口で。","cream",1.0,1)],
         en="Even your family's journey, one planner, one contact."),
    dict(img="showcase-ryokan.jpg", kicker="OUR STORY SO FAR", kb="out",
         jp=[("これまで、","cream",0.82,0),("50組以上の","gold",1.55,1),
             ("「ルーツに還る一日」を。","cream",0.94,0)],
         en="50+ celebrations. Families, home again."),
    dict(img="hero.jpg", cta=True, kb="in",
         jp=[("あなたの物語を、","cream",1.0,0),("聞かせて。","cream",1.0,0)],
         en="Tell us your story", button="▶ まずは無料相談"),
]

SCENE_DUR = 3.7
FLASH = 0.42

def build_scene(spec):
    """Return dict with base_big image, placed text items, kicker item, scrim."""
    photo = Image.open(os.path.join(WED, spec["img"])).convert("RGB")
    base = warm_grade(cover(photo, int(W*1.2), int(H*1.2)), dark=0.05 if spec.get("cta") else 0.0)
    items = []
    maxw = W - 170; cx = W // 2
    if spec.get("cta"):
        return dict(base=base, cta=True, spec=spec)
    # kicker
    kick = None
    if spec.get("kicker"):
        kick = render_line(spec["kicker"], font(SANS, 30, 600), GOLD, tr=10)
    # jp lines
    lines = []
    for (s, col, scale, hl) in spec["jp"]:
        f = fit_font(SERIF, int(84*scale), s, maxw, 600)
        lines.append((render_line(s, f, COLORS[col], tr=2), hl))
    en_img = render_line(spec["en"], fit_font(SERIF, 40, spec["en"], maxw, 400), (228,218,205), tr=1)
    # stack from bottom
    gap = 16; en_gap = 30
    total = (kick.height + 34 if kick else 0) + sum(l.height for l, _ in lines) + gap*(len(lines)-1) + en_gap + en_img.height
    y = H - 250 - total
    placed = []
    if kick:
        placed.append(dict(img=kick, x=cx-kick.width//2, y=y, ts=0.12, hl=0)); y += kick.height + 34
    for k, (l, hl) in enumerate(lines):
        ts = 0.34 + k*0.17
        placed.append(dict(img=l, x=cx-l.width//2, y=y, ts=ts, hl=hl)); y += l.height + gap
    placed.append(dict(img=en_img, x=cx-en_img.width//2, y=y-gap+en_gap, ts=0.34+len(lines)*0.17, hl=0))
    return dict(base=base, items=placed, scrim=bottom_scrim(), cta=False, spec=spec)

def ken_window(base, kb, p):
    """Crop a Ken Burns window from base(1.2x) at progress p in [0,1]; return 1080x1920."""
    bw, bh = base.size
    t = p if kb == "in" else (1 - p)
    win_w = bw - t * (bw - W); win_h = bh - t * (bh - H)
    x0 = (bw - win_w) / 2; y0 = (bh - win_h) / 2
    return base.crop((int(x0), int(y0), int(x0+win_w), int(y0+win_h))).resize((W, H), Image.BILINEAR)

def render_caption_frame(scene, lt):
    base = ken_window(scene["base"], scene["spec"]["kb"], clamp(lt/SCENE_DUR))
    frame = base.convert("RGBA")
    frame.alpha_composite(scene["scrim"])
    pet = Image.new("RGBA", (W, H), (0,0,0,0)); draw_petals(pet, lt); frame.alpha_composite(pet)
    d = ImageDraw.Draw(frame)
    for it in scene["items"]:
        p = ease_out(clamp((lt - it["ts"]) / 0.46));
        if p <= 0: continue
        yoff = int((1 - p) * 30)
        if it["hl"]:
            pbox = ease_out(clamp((lt - it["ts"] + 0.05) / 0.5))
            bx0 = it["x"] - 26; by0 = it["y"] + yoff + 6; by1 = it["y"] + yoff + it["img"].height - 6
            full_w = it["img"].width + 52; cur = int(full_w * pbox)
            if cur > 8:
                box = Image.new("RGBA", (W, H), (0,0,0,0)); bd = ImageDraw.Draw(box)
                bd.rounded_rectangle([bx0, by0, bx0+cur, by1], radius=14, fill=(20,16,14,150),
                                     outline=GOLD+(int(220*pbox),), width=3)
                frame.alpha_composite(box)
        layer = it["img"].copy(); a = layer.split()[3].point(lambda v: int(v*p)); layer.putalpha(a)
        frame.alpha_composite(layer, (it["x"], it["y"] + yoff))
    # gold hairline grows
    hp = ease_out(clamp((lt-0.9)/0.5)); hw = int(46*hp)
    if hw > 2:
        ImageDraw.Draw(frame).line([(W//2-hw, H-205),(W//2+hw, H-205)], fill=GOLD+(210,), width=3)
    return frame

def render_cta_frame(scene, lt):
    spec = scene["spec"]
    base = ken_window(scene["base"], "in", clamp(lt/SCENE_DUR))
    frame = base.convert("RGBA")
    frame.alpha_composite(Image.new("RGBA",(W,H),(10,8,6,150)))
    pet = Image.new("RGBA",(W,H),(0,0,0,0)); draw_petals(pet, lt); frame.alpha_composite(pet)
    cx = W//2; maxw = W-170
    logo = render_line("Tsumugi", font(SERIF,132,600), CREAM, tr=4)
    mark = render_line("紡", font(SERIF,56,500), GOLD, tr=0)
    jp = [render_line(s, fit_font(SERIF,int(78*sc),s,maxw,600), COLORS[c], tr=2) for (s,c,sc,_) in spec["jp"]]
    items = [("logo",logo,0.15),("mark",mark,0.30)] + [("jp",jp[i],0.55+i*0.16) for i in range(len(jp))]
    heights = [logo.height,6,mark.height,70] + sum([[j.height,14] for j in jp],[])
    total = sum(heights) - 14
    y = (H-total)/2 - 70
    pos = {}
    pos["logo"]=y; y+=logo.height+6; pos["mark"]=y; y+=mark.height+70
    jp_y=[];
    for j in jp: jp_y.append(y); y+=j.height+14
    end_y = y - 14 + 56
    # draw with fade+rise
    def put(img, ts, X, Y):
        p = ease_out(clamp((lt-ts)/0.5));
        if p<=0: return
        yo=int((1-p)*26); l=img.copy(); a=l.split()[3].point(lambda v:int(v*p)); l.putalpha(a)
        frame.alpha_composite(l,(int(X),int(Y+yo)))
    put(logo,0.15,cx-logo.width/2,pos["logo"]); put(mark,0.30,cx-mark.width/2,pos["mark"])
    for i,j in enumerate(jp): put(j,0.55+i*0.16, cx-j.width/2, jp_y[i])
    # button pop (scale overshoot)
    bts=0.95; bp=clamp((lt-bts)/0.45)
    if bp>0:
        s = 1.08 - 0.08*ease_out(bp) if bp<1 else 1.0
        scale = (0.6+0.4*ease_out(bp))*s
        bf=font(SANS,44,700); label=spec["button"]
        bw=int(line_width(bf,label,1))+110; bh=116
        btn=Image.new("RGBA",(bw,bh),(0,0,0,0)); bd=ImageDraw.Draw(btn)
        bd.rounded_rectangle([0,0,bw-1,bh-1],radius=bh//2,fill=GOLD2+(255,))
        lbl=render_line(label,bf,SUMI,tr=1,shadow=False); btn.alpha_composite(lbl,(int((bw-lbl.width)/2),int((bh-lbl.height)/2)))
        nw,nh=max(2,int(bw*scale)),max(2,int(bh*scale)); btn=btn.resize((nw,nh),Image.BILINEAR)
        a=btn.split()[3].point(lambda v:int(v*clamp(bp*1.4))); btn.putalpha(a)
        frame.alpha_composite(btn,(int(cx-nw/2),int(end_y+(bh-nh)/2)))
    # en subline
    ef=font(SERIF,36,400); en=render_line(spec["en"]+"  ·  Free consultation",ef,(224,214,200),tr=2)
    p=ease_out(clamp((lt-1.3)/0.5))
    if p>0:
        l=en.copy(); a=l.split()[3].point(lambda v:int(v*p)); l.putalpha(a)
        frame.alpha_composite(l,(int(cx-en.width/2),int(end_y+116+34)))
    return frame

def main():
    print("Preparing scenes...")
    scenes = [build_scene(s) for s in FRAMES]
    total_t = SCENE_DUR * len(scenes)
    n = int(total_t * FPS)
    print(f"Rendering {n} frames ({total_t:.1f}s)...")
    proc = subprocess.Popen([FFMPEG,"-y","-f","rawvideo","-pix_fmt","rgb24","-s",f"{W}x{H}",
        "-r",str(FPS),"-i","-","-an","-c:v","libx264","-crf","19","-preset","medium",
        "-pix_fmt","yuv420p","-movflags","+faststart",
        os.path.join(OUT,"reel_tsumugi_rahakenya_anim.mp4")], stdin=subprocess.PIPE)
    flash_col = (255, 240, 214)
    for fi in range(n):
        t = fi / FPS
        si = min(len(scenes)-1, int(t / SCENE_DUR)); lt = t - si*SCENE_DUR
        sc = scenes[si]
        frame = render_cta_frame(sc, lt) if sc.get("cta") else render_caption_frame(sc, lt)
        # light-burst transition near scene boundary (out-going tail + in-coming head)
        tail = SCENE_DUR - lt
        fa = 0.0
        if si < len(scenes)-1 and tail < FLASH:        # outgoing half (rising)
            fa = (1 - tail/FLASH) ** 2
        if si > 0 and lt < FLASH:                       # incoming half (falling)
            fa = max(fa, (1 - lt/FLASH) ** 2)
        if fa > 0.01:
            fl = Image.new("RGBA",(W,H),flash_col+(int(205*clamp(fa)),)); frame.alpha_composite(fl)
        # global fade in/out
        g = 1.0
        if t < 0.5: g = t/0.5
        if t > total_t-0.8: g = max(0.0,(total_t-t)/0.8)
        rgb = frame.convert("RGB")
        if g < 0.999:
            rgb = ImageEnhance.Brightness(rgb).enhance(g)
        proc.stdin.write(rgb.tobytes())
        if fi % 60 == 0: print(f"  {fi}/{n}")
    proc.stdin.close(); proc.wait()
    # debug stills mid-reveal
    for (si, lt, name) in [(1,1.0,"reveal_a"),(1,1.55,"reveal_b"),(5,1.6,"emph"),(6,1.4,"cta")]:
        sc=scenes[si]; fr = render_cta_frame(sc,lt) if sc.get("cta") else render_caption_frame(sc,lt)
        fr.convert("RGB").save(os.path.join(DBG,f"{name}.png"))
    print("DONE:", os.path.join(OUT,"reel_tsumugi_rahakenya_anim.mp4"))

if __name__ == "__main__":
    main()
