#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KATALYS — SNS運用支援サービス 縦型広告（ペイン訴求 / フラット2Dアニメ）
9:16 / 1080x1920 / 30fps / ~45s

AI画像/動画APIがこの環境に無いため、ブリーフのデザイン方向性に沿って
全編をプロシージャルなフラット2Dベクター・モーショングラフィックスとして描画する。
（白/淡い水色/ネイビー基調・オレンジ少量・余白多め・清潔感あるBtoB）
日本語テロップ・数字カウントアップ・指定イージングを実装。
"""
import os, math, subprocess, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import imageio_ffmpeg

REPO  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = "/tmp/reel/fonts"; OUT = "/tmp/reel/out"; DBG = "/tmp/reel/kat_dbg"
os.makedirs(OUT, exist_ok=True); os.makedirs(DBG, exist_ok=True)
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
W, H, FPS = 1080, 1920, 30
random.seed(11)

# palette
WHITE=(255,255,255); PALE=(220,238,248); PALE2=(193,225,243); PALE3=(173,213,238)
NAVY=(20,40,74); NAVY2=(28,60,108); BLUE=(43,135,232); BLUEd=(33,108,196)
ORANGE=(245,150,72); BAND=(202,230,250); SKIN=(245,214,186); HAIR=(33,47,72)
INK=(20,40,74); GRAYO=(120,132,150)

SANS = os.path.join(FONTS,"NotoSansJP.ttf")
_FC={}
def font(sz,w=700):
    k=(sz,w)
    if k not in _FC:
        f=ImageFont.truetype(SANS,sz)
        try:f.set_variation_by_axes([w])
        except Exception:pass
        _FC[k]=f
    return _FC[k]

def clamp(v,a=0.0,b=1.0):return a if v<a else b if v>b else v
def eoc(p):p=clamp(p);return 1-(1-p)**3                      # easeOutCubic
def eob(p):p=clamp(p);c=1.70158+1;return 1+c*(p-1)**3+1.70158*(p-1)**2  # easeOutBack
def eio(p):p=clamp(p);return .5-.5*math.cos(math.pi*p)

def rrect(d,box,r,fill=None,outline=None,width=1):
    d.rounded_rectangle([int(box[0]),int(box[1]),int(box[2]),int(box[3])],radius=int(r),
                        fill=fill,outline=outline,width=width)

# ---------- text base cache ----------
_LC={}
def line_img(text,sz,color,w=800,shadow=False):
    key=(text,sz,color,w,shadow)
    if key in _LC:return _LC[key]
    f=font(sz,w); asc,desc=f.getmetrics()
    tw=int(sum(f.getlength(c) for c in text))+40; th=asc+desc+30
    im=Image.new("RGBA",(tw,th),(0,0,0,0)); d=ImageDraw.Draw(im)
    d.text((20,15),text,font=f,fill=color+(255,))
    if shadow:
        a=im.split()[3].point(lambda v:int(v*.5)); sh=Image.new("RGBA",im.size,(0,0,0,0))
        sh.putalpha(a); sh=sh.filter(ImageFilter.GaussianBlur(5))
        base=Image.new("RGBA",im.size,(0,0,0,0)); base.alpha_composite(sh,(0,3)); base.alpha_composite(im); im=base
    _LC[key]=im; return im

def scaled(im,s):
    if abs(s-1)<0.01:return im
    return im.resize((max(1,int(im.width*s)),max(1,int(im.height*s))),Image.BILINEAR)
def with_alpha(im,a):
    if a>=0.999:return im
    im=im.copy(); im.putalpha(im.split()[3].point(lambda v:int(v*clamp(a)))); return im

# ---------- telop animators ----------
def put_normal(fr,im,cx,cy,lt,ts,kind="normal"):
    p=clamp((lt-ts)/0.35); a=eoc(p); yoff=(1-a)*24; sc=0.98+0.02*a
    if a<=0:return
    if kind=="pain":
        ps=clamp((lt-ts-0.45)/0.6); sc-=0.02*ps; a*=(1-0.12*ps); yoff+=5*ps
    img=with_alpha(scaled(im,sc),a)
    fr.alpha_composite(img,(int(cx-img.width/2),int(cy-img.height/2+yoff)))

def put_relief(fr,im,cx,cy,lt,ts):
    p=clamp((lt-ts)/0.5)
    if p<=0:return
    sc=0.95+0.05*eoc(p)+0.05*math.sin(math.pi*p)
    glow=Image.new("RGBA",(W,H),(0,0,0,0))
    gr=int(im.width*sc*0.7+90)
    ImageDraw.Draw(glow).ellipse([cx-gr,cy-gr*0.5,cx+gr,cy+gr*0.5],fill=(255,255,255,int(150*p)))
    fr.alpha_composite(glow.filter(ImageFilter.GaussianBlur(60)))
    img=with_alpha(scaled(im,sc),p)
    fr.alpha_composite(img,(int(cx-img.width/2),int(cy-img.height/2)))

def emph_scale(p):
    if p<=0:return 0.8
    if p<0.6:return 0.8+(1.12-0.8)*eoc(p/0.6)
    return 1.12-(0.12)*eoc((p-0.6)/0.4)

def put_emphasis(fr,im,cx,cy,lt,ts,band=True,bandh=None):
    p=clamp((lt-ts)/0.45)
    if p<=0:return
    sc=emph_scale(p); w=im.width*sc; h=im.height*sc
    if band:
        pb=clamp((lt-ts-0.1)/0.4); bw=(w+44)*eoc(pb)
        if bw>6:
            bh=bandh or h*0.7
            bl=Image.new("RGBA",(W,H),(0,0,0,0))
            rrect(ImageDraw.Draw(bl),[cx-w/2-22,cy-bh/2,cx-w/2-22+bw,cy+bh/2],14,fill=BAND+(255,))
            fr.alpha_composite(bl)
    img=with_alpha(scaled(im,sc),clamp(p*1.3))
    fr.alpha_composite(img,(int(cx-img.width/2),int(cy-img.height/2)))

def put_number(fr,cx,cy,lt,ts,target,suffix,prefix="",num_sz=210,aff_sz=70,glow=True):
    p=clamp((lt-ts)/0.85); val=int(round(target*eoc(p)))
    if p>=1:val=target
    bounce=1.0+0.08*math.sin(min(1,(lt-ts-0.85)/0.35)*math.pi) if lt>ts+0.85 and lt<ts+1.2 else 1.0
    nf=font(int(num_sz*bounce),900); af=font(aff_sz,800); pf=font(aff_sz,800)
    ns=f"{val:,}"
    nw=nf.getlength(ns); aw=af.getlength(suffix); pw=pf.getlength(prefix)
    total=pw+nw+aw+(18 if prefix else 0)+14
    x=cx-total/2
    a=clamp(p*2)
    if glow:
        g=Image.new("RGBA",(W,H),(0,0,0,0))
        gr=int(nw/2+150)
        ImageDraw.Draw(g).ellipse([cx-gr,cy-gr,cx+gr,cy+gr],fill=(BLUE+(int(60*a),)))
        fr.alpha_composite(g.filter(ImageFilter.GaussianBlur(70)))
    d=ImageDraw.Draw(fr)
    yb=cy-nf.getmetrics()[0]*0.62
    if prefix:
        d.text((x,cy-af.getmetrics()[0]*0.5),prefix,font=pf,fill=NAVY+(int(255*a),)); x+=pw+18
    d.text((x,yb),ns,font=nf,fill=BLUE+(int(255*a),)); x+=nw+14
    d.text((x,cy-af.getmetrics()[0]*0.5),suffix,font=af,fill=NAVY+(int(255*a),))

# ---------- flat illustration primitives ----------
def draw_person(fr,cx,by,s,mood="neutral",shirt=NAVY2,phone=False,hand_head=False,face_up=False,accent=ORANGE):
    d=ImageDraw.Draw(fr)
    tw,th=200*s,170*s
    rrect(d,[cx-tw/2,by,cx+tw/2,by+th],90*s,fill=shirt)
    rrect(d,[cx-30*s,by-6*s,cx+30*s,by+50*s],20*s,fill=SKIN)        # neck
    # collar accent
    d.polygon([(cx-26*s,by+6*s),(cx,by+58*s),(cx+26*s,by+6*s)],fill=tuple(min(255,int(c*1.2)) for c in shirt))
    hr=78*s; hy=by-92*s
    d.ellipse([cx-hr,hy-hr,cx+hr,hy+hr],fill=HAIR)                   # hair
    d.ellipse([cx-hr*0.9,hy-hr*0.5,cx+hr*0.9,hy+hr*1.02],fill=SKIN)  # face
    ey=hy+(8 if not face_up else -2)*s; ex=30*s; er=7*s
    d.ellipse([cx-ex-er,ey-er,cx-ex+er,ey+er],fill=INK)
    d.ellipse([cx+ex-er,ey-er,cx+ex+er,ey+er],fill=INK)
    # brows
    bw=22*s; byy=ey-26*s
    if mood=="sad":
        d.line([(cx-ex-bw,byy+6*s),(cx-ex+bw,byy-2*s)],fill=INK,width=int(5*s))
        d.line([(cx+ex-bw,byy-2*s),(cx+ex+bw,byy+6*s)],fill=INK,width=int(5*s))
    elif mood=="relieved":
        d.arc([cx-ex-bw,byy-6*s,cx-ex+bw,byy+10*s],200,340,fill=INK,width=int(5*s))
        d.arc([cx+ex-bw,byy-6*s,cx+ex+bw,byy+10*s],200,340,fill=INK,width=int(5*s))
    else:
        d.line([(cx-ex-bw,byy),(cx-ex+bw,byy)],fill=INK,width=int(5*s))
        d.line([(cx+ex-bw,byy),(cx+ex+bw,byy)],fill=INK,width=int(5*s))
    # mouth
    my=ey+40*s; mw=26*s
    if mood in("sad","tired"):
        d.arc([cx-mw,my,cx+mw,my+26*s],200,340,fill=INK,width=int(5*s))
    elif mood=="relieved":
        d.arc([cx-mw,my-10*s,cx+mw,my+18*s],20,160,fill=INK,width=int(5*s))
    else:
        d.line([(cx-mw*0.6,my+6*s),(cx+mw*0.6,my+6*s)],fill=INK,width=int(5*s))
    if hand_head:
        d.ellipse([cx-hr-34*s,hy-6*s,cx-hr+18*s,hy+46*s],fill=SKIN)  # hand at temple
        rrect(d,[cx-hr-30*s,hy+30*s,cx-hr+6*s,by+40*s],18*s,fill=shirt)
    if phone:
        px,py=cx,by+30*s
        rrect(d,[px-46*s,py-78*s,px+46*s,py+78*s],16*s,fill=NAVY)
        rrect(d,[px-38*s,py-68*s,px+38*s,py+68*s],10*s,fill=PALE)
        d.ellipse([px-58*s,py+48*s,px-6*s,py+100*s],fill=SKIN)       # hand
        d.ellipse([px+6*s,py+48*s,px+58*s,py+100*s],fill=SKIN)

def icon_card(fr,cx,cy,w,h,fill=WHITE,outline=PALE2,r=22,shadow=True):
    if shadow:
        sh=Image.new("RGBA",(W,H),(0,0,0,0))
        rrect(ImageDraw.Draw(sh),[cx-w/2,cy-h/2+8,cx+w/2,cy+h/2+8],r,fill=(20,40,74,40))
        fr.alpha_composite(sh.filter(ImageFilter.GaussianBlur(10)))
    rrect(ImageDraw.Draw(fr),[cx-w/2,cy-h/2,cx+w/2,cy+h/2],r,fill=fill,outline=outline,width=3)

def icon_bell(d,cx,cy,s=1.0,col=ORANGE):
    rrect(d,[cx-16*s,cy-18*s,cx+16*s,cy+12*s],14*s,fill=col)
    d.rectangle([cx-22*s,cy+10*s,cx+22*s,cy+16*s],fill=col)
    d.ellipse([cx-5*s,cy+16*s,cx+5*s,cy+26*s],fill=col)
def icon_heart(d,cx,cy,s=1.0,col=ORANGE):
    d.ellipse([cx-14*s,cy-12*s,cx-1*s,cy+2*s],fill=col); d.ellipse([cx+1*s,cy-12*s,cx+14*s,cy+2*s],fill=col)
    d.polygon([(cx-13*s,cy-3*s),(cx+13*s,cy-3*s),(cx,cy+16*s)],fill=col)
def icon_play(d,cx,cy,s=1.0,col=BLUE):
    d.ellipse([cx-22*s,cy-22*s,cx+22*s,cy+22*s],fill=col)
    d.polygon([(cx-7*s,cy-11*s),(cx-7*s,cy+11*s),(cx+12*s,cy)],fill=WHITE)
def icon_person_dot(d,cx,cy,s=1.0,col=PALE3):
    d.ellipse([cx-9*s,cy-14*s,cx+9*s,cy-0*s],fill=col)
    rrect(d,[cx-15*s,cy+2*s,cx+15*s,cy+20*s],10*s,fill=col)
def graph(fr,x0,y0,w,h,prog,rising=True,col=BLUE):
    d=ImageDraw.Draw(fr)
    rrect(d,[x0,y0,x0+w,y0+h],18,fill=WHITE,outline=PALE2,width=3)
    pts=[]
    n=6
    for i in range(n+1):
        t=i/n; px=x0+20+t*(w-40)
        if rising: yy=y0+h-20-(h-40)*(t**1.2)
        else:      yy=y0+20+(h-40)*(t**1.1)
        pts.append((px,yy))
    k=clamp(prog)*n
    show=[]
    for i,(px,py) in enumerate(pts):
        if i<=k: show.append((px,py))
    if len(show)>=2:
        d.line(show,fill=col,width=8,joint="curve")
        d.ellipse([show[-1][0]-9,show[-1][1]-9,show[-1][0]+9,show[-1][1]+9],fill=ORANGE)

# ---------- background ----------
def bg(color):
    im=Image.new("RGBA",(W,H),color+(255,)); return im
def soft_light(fr,cx,cy,r,a,col=(255,255,255)):
    g=Image.new("RGBA",(W,H),(0,0,0,0))
    ImageDraw.Draw(g).ellipse([cx-r,cy-r,cx+r,cy+r],fill=col+(int(a),))
    fr.alpha_composite(g.filter(ImageFilter.GaussianBlur(120)))

# ===================== SCENES =====================
def s1(lt,dur):  # 投稿してるのに / 伸びない…
    fr=bg(NAVY)
    soft_light(fr,W*0.5,H*0.34,520,40,(60,90,150))
    # floating fading icons
    for i,(dx,dy,kind) in enumerate([(-300,-360,"bell"),(300,-300,"heart"),(280,40,"bell"),(-320,20,"heart")]):
        a=clamp(1-(lt-0.6-i*0.25)/0.5)
        if a<=0:continue
        lay=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(lay)
        cx,cy=W*0.5+dx,H*0.34+dy
        if kind=="bell":icon_bell(d,cx,cy,1.4,(90,120,180))
        else:icon_heart(d,cx,cy,1.5,(90,120,180))
        fr.alpha_composite(with_alpha(lay,a*0.9))
    drop=eoc(clamp((lt-1.2)/1.0))*16
    draw_person(fr,W*0.5,H*0.40+drop,1.45,"sad",shirt=NAVY2,phone=True)
    # falling graph card
    icon_card(fr,W*0.5,H*0.66,520,260,fill=(36,66,116),outline=(60,96,150))
    graph(fr,int(W*0.5-230),int(H*0.66-95),460,200,clamp((lt-0.4)/1.2),rising=False,col=(120,160,220))
    put_normal(fr,line_img("投稿してるのに",60,WHITE),W*0.5,H*0.16,lt,0.2)
    put_normal(fr,line_img("伸びない…",92,(120,160,220)),W*0.5,H*0.245,lt,0.5,kind="pain")
    return fr

def s2(lt,dur):  # 自分のやり方が / 悪いのかな？
    fr=bg((30,52,92))
    soft_light(fr,W*0.5,H*0.4,500,30,(20,36,68))
    draw_person(fr,W*0.5,H*0.46,1.5,"tired",shirt=NAVY2,hand_head=True)
    # stacked post cards piling
    for i in range(5):
        a=eoc(clamp((lt-0.2-i*0.18)/0.4))
        if a<=0:continue
        yy=H*0.72 - i*54*a; xx=W*0.5 + (i-2)*16
        lay=Image.new("RGBA",(W,H),(0,0,0,0))
        icon_card(lay,xx,yy,360,80,fill=WHITE,outline=PALE2,shadow=False)
        d=ImageDraw.Draw(lay); icon_play(d,xx-150,yy,0.7,PALE3)
        d.rectangle([xx-110,yy-14,xx+150,yy-4],fill=PALE2); d.rectangle([xx-110,yy+6,xx+90,yy+16],fill=PALE2)
        fr.alpha_composite(with_alpha(lay,a))
    # calendar
    icon_card(fr,W*0.22,H*0.2,200,170,fill=WHITE,outline=PALE2)
    d=ImageDraw.Draw(fr); d.rectangle([W*0.22-80,H*0.2-70,W*0.22+80,H*0.2-44],fill=ORANGE)
    for r in range(3):
        for c in range(4):
            d.rectangle([W*0.22-78+c*40,H*0.2-30+r*36,W*0.22-78+c*40+28,H*0.2-30+r*36+24],
                        fill=PALE if (r*4+c)%3 else BLUE)
    put_normal(fr,line_img("自分のやり方が",58,WHITE),W*0.5,H*0.135,lt,0.2)
    put_normal(fr,line_img("悪いのかな？",78,(150,185,235)),W*0.5,H*0.215,lt,0.5,kind="pain")
    return fr

def s3(lt,dur):  # でも、大丈夫 / 努力不足じゃない
    p=eio(clamp((lt-0.2)/1.1))
    base=tuple(int(NAVY[i]+(PALE[i]-NAVY[i])*p) for i in range(3))
    fr=bg(base)
    soft_light(fr,W*0.5,H*0.34,560,90*p,(255,255,255))
    draw_person(fr,W*0.5,H*0.52,1.5,"relieved" if p>0.5 else "sad",
                shirt=BLUE,face_up=p>0.5)
    put_relief(fr,line_img("でも、大丈夫",70,NAVY if p>0.5 else WHITE),W*0.5,H*0.2,lt,0.6)
    put_relief(fr,line_img("努力不足じゃない",58,BLUEd if p>0.5 else WHITE),W*0.5,H*0.285,lt,0.95)
    return fr

def s4(lt,dur):  # 伸びる理由は / そこじゃない  (3カード ×, 中央カード)
    fr=bg(PALE)
    labels=["投稿数","編集","フォロワー数"]
    xs=[W*0.28,W*0.5,W*0.72]; cyc=H*0.5
    for i,(xx,lb) in enumerate(zip(xs,labels)):
        ap=eoc(clamp((lt-0.3-i*0.3)/0.4))
        if ap<=0:continue
        fade=clamp(1-(lt-2.0-i*0.15)/0.6)*0.6+0.4
        lay=Image.new("RGBA",(W,H),(0,0,0,0))
        icon_card(lay,xx,cyc,210,250,fill=WHITE,outline=PALE2,shadow=False)
        d=ImageDraw.Draw(lay)
        if i==0:
            for r in range(3):
                d.rectangle([xx-60,cyc-60+r*36,xx+60,cyc-60+r*36+22],fill=PALE3)
        elif i==1: icon_play(d,xx,cyc-10,1.6,PALE3)
        else:
            for c in range(3):icon_person_dot(d,xx-50+c*50,cyc-10,1.2,PALE3)
        lay2=line_img(lb,30,NAVY,800); lay.alpha_composite(lay2,(int(xx-lay2.width/2),int(cyc+78)))
        # × mark appears
        if lt>2.0+i*0.15:
            xr=28; d.line([(xx-xr,cyc-xr),(xx+xr,cyc+xr)],fill=ORANGE,width=10)
            d.line([(xx-xr,cyc+xr),(xx+xr,cyc-xr)],fill=ORANGE,width=10)
        fr.alpha_composite(with_alpha(lay,ap*fade))
    # central card
    pc=eob(clamp((lt-2.8)/0.6))
    if pc>0:
        wc,hc=380*clamp(pc),200*clamp(pc)
        icon_card(fr,W*0.5,H*0.5,wc,hc,fill=BLUE,outline=BLUEd)
        if pc>0.6:
            t=line_img("人が見える",44,WHITE,900)
            fr.alpha_composite(t,(int(W*0.5-t.width/2),int(H*0.5-t.height/2)))
    put_normal(fr,line_img("伸びる理由は",58,NAVY),W*0.5,H*0.15,lt,0.2)
    put_normal(fr,line_img("そこじゃない",70,BLUE),W*0.5,H*0.235,lt,0.45)
    return fr

def s5(lt,dur):  # SNSに / “人”が見えているか
    fr=bg(WHITE)
    soft_light(fr,W*0.5,H*0.5,600,40,PALE)
    cards=[("社長",ORANGE),("社員",BLUE),("現場",NAVY2)]
    for i,(lb,col) in enumerate(cards):
        ap=eoc(clamp((lt-0.4-i*0.45)/0.5))
        if ap<=0:continue
        slide=(1-ap)*120
        yy=H*0.62; xx=W*0.27+i*W*0.23
        lay=Image.new("RGBA",(W,H),(0,0,0,0))
        icon_card(lay,xx+slide,yy,260,330,fill=WHITE,outline=PALE2,shadow=False)
        d=ImageDraw.Draw(lay)
        rrect(d,[xx+slide-110,yy-150,xx+slide+110,yy-20],16,fill=PALE)
        draw_person(lay,xx+slide,yy-40,0.62,"relieved",shirt=col)
        rrect(d,[xx+slide-90,yy+72,xx+slide+90,yy+90],8,fill=PALE2)
        rrect(d,[xx+slide-90,yy+102,xx+slide+30,yy+118],8,fill=PALE2)
        icon_heart(d,xx+slide+78,yy+108,0.9,ORANGE)
        fr.alpha_composite(with_alpha(lay,ap))
    put_normal(fr,line_img("SNSに",58,NAVY),W*0.5,H*0.14,lt,0.2)
    # big blue 人 emphasis + rest
    put_emphasis(fr,line_img("“人”",120,BLUE,900),W*0.5,H*0.245,lt,0.6,bandh=150)
    put_normal(fr,line_img("が見えているか",50,NAVY),W*0.5,H*0.325,lt,0.95)
    return fr

def s6(lt,dur):  # 実績 数字
    fr=bg(NAVY)
    # spreading audience dots
    sp=eoc(clamp(lt/2.5))
    for i,(ang) in enumerate(range(0,360,18)):
        rr=120+sp*420+ (i%3)*30
        x=W*0.5+math.cos(math.radians(ang))*rr; y=H*0.5+math.sin(math.radians(ang))*rr*1.4
        d=ImageDraw.Draw(fr); icon_person_dot(d,x,y,1.0,(70,100,160))
    graph(fr,int(W*0.5-260),int(H*0.74),520,180,clamp((lt-1.0)/2.0),rising=True)
    for i in range(4):
        if lt>3.5+i*0.2:
            d=ImageDraw.Draw(fr); icon_play(d,W*0.2+i*W*0.2,H*0.2,clamp((lt-3.5-i*0.2)/0.3)*1.1,BLUE)
    # number sequence
    put_emphasis(fr,line_img("広告費 0円",72,WHITE,900),W*0.5,H*0.2,lt,0.2,band=True,bandh=110)
    if lt>1.4:  put_number(fr,W*0.5,H*0.42,lt,1.4,18,"万人",prefix="フォロワー")
    if lt>3.4:  put_number(fr,W*0.5,H*0.42,lt,3.4,100,"万回再生")
    if lt>5.2:  put_number(fr,W*0.5,H*0.42,lt,5.2,50,"本以上")
    return fr

def s7(lt,dur):  # 今は、まずSNSで / 会社を調べる時代
    fr=bg(PALE)
    # split: left empty/dim phone, right warm/bright phone
    for side,(xx,warm) in enumerate([(W*0.30,False),(W*0.70,True)]):
        ap=eoc(clamp((lt-0.3-side*0.25)/0.5))
        if ap<=0:continue
        lay=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(lay)
        rrect(d,[xx-150,H*0.5-260,xx+150,H*0.5+260],46,fill=NAVY)
        rrect(d,[xx-132,H*0.5-238,xx+132,H*0.5+238],34,fill=WHITE if warm else (224,230,238))
        # profile card
        rrect(d,[xx-110,H*0.5-200,xx+110,H*0.5-70],16,fill=PALE if warm else (210,216,224))
        if warm:
            draw_person(lay,xx,H*0.5-120,0.5,"relieved",shirt=ORANGE)
            for r in range(3):rrect(d,[xx-95,H*0.5-30+r*44,xx+95,H*0.5-30+r*44+28],10,fill=PALE2)
            icon_heart(d,xx+70,H*0.5+160,1.1,ORANGE)
        else:
            d.ellipse([xx-30,H*0.5-150,xx+30,H*0.5-90],fill=(190,196,206))
            for r in range(3):rrect(d,[xx-95,H*0.5-30+r*44,xx+95,H*0.5-30+r*44+28],10,fill=(205,211,220))
            d.text((xx-12,H*0.5+120),"?",font=font(70,900),fill=(170,178,190))
        # magnifier
        d.ellipse([xx+70,H*0.5-300,xx+130,H*0.5-240],outline=BLUE if warm else GRAYO,width=8)
        d.line([(xx+126,H*0.5-244),(xx+150,H*0.5-220)],fill=BLUE if warm else GRAYO,width=9)
        lay=with_alpha(lay,ap*(1.0 if warm else 0.78))
        fr.alpha_composite(lay)
    put_normal(fr,line_img("今は、まずSNSで",52,NAVY),W*0.5,H*0.13,lt,0.2)
    put_normal(fr,line_img("会社を調べる時代",58,BLUE),W*0.5,H*0.205,lt,0.45)
    return fr

def s8(lt,dur):  # 良さが伝わらないのは / もったいない
    fr=bg(PALE)
    # company building
    cx,cy=W*0.5,H*0.52
    d=ImageDraw.Draw(fr)
    rrect(d,[cx-160,cy-180,cx+160,cy+180],20,fill=WHITE,outline=PALE2,width=3)
    for r in range(4):
        for c in range(3):
            d.rectangle([cx-120+c*90,cy-140+r*78,cx-120+c*90+58,cy-140+r*78+50],fill=PALE2)
    rrect(d,[cx-44,cy+110,cx+44,cy+180],10,fill=ORANGE)
    # gray overlay clearing
    clear=eoc(clamp((lt-1.2)/1.4))
    ov=Image.new("RGBA",(W,H),(0,0,0,0))
    rrect(ImageDraw.Draw(ov),[cx-180,cy-200,cx+180,cy+200],26,fill=GRAYO+(int(150*(1-clear)),))
    fr.alpha_composite(ov)
    # SNS cards revealing personality
    for i,(dx,dy) in enumerate([(-280,-120),(300,-60),(-300,160),(290,200)]):
        ap=eoc(clamp((lt-1.6-i*0.25)/0.4))*clear
        if ap<=0:continue
        lay=Image.new("RGBA",(W,H),(0,0,0,0))
        icon_card(lay,cx+dx,cy+dy,200,120,fill=WHITE,outline=PALE2,shadow=False)
        draw_person(lay,cx+dx,cy+dy+8,0.4,"relieved",shirt=[ORANGE,BLUE,NAVY2,ORANGE][i])
        fr.alpha_composite(with_alpha(lay,ap))
    put_normal(fr,line_img("良さが伝わらないのは",46,NAVY),W*0.5,H*0.13,lt,0.2)
    put_emphasis(fr,line_img("もったいない",72,ORANGE,900),W*0.5,H*0.205,lt,0.5,band=False)
    return fr

def s9(lt,dur):  # 無料相談会 CTA
    fr=bg(WHITE)
    soft_light(fr,W*0.5,H*0.4,600,50,PALE)
    # laptop with two people
    cx,cy=W*0.5,H*0.4
    d=ImageDraw.Draw(fr)
    rrect(d,[cx-230,cy-150,cx+230,cy+120],22,fill=NAVY)
    rrect(d,[cx-210,cy-132,cx+210,cy+100],14,fill=PALE)
    d.polygon([(cx-270,cy+170),(cx+270,cy+170),(cx+230,cy+120),(cx-230,cy+120)],fill=NAVY2)
    draw_person(fr,cx-105,cy+30,0.66,"relieved",shirt=BLUE)
    draw_person(fr,cx+105,cy+30,0.66,"relieved",shirt=ORANGE)
    d.line([(cx,cy-150),(cx,cy+100)],fill=PALE2,width=4)
    put_normal(fr,line_img("無料相談会で",58,NAVY),W*0.5,H*0.115,lt,0.2)
    put_emphasis(fr,line_img("一緒に考えます",60,BLUE,900),W*0.5,H*0.19,lt,0.5,band=False)
    # CTA button pop + pulse
    pc=eob(clamp((lt-1.4)/0.6))
    if pc>0:
        pulse=1.0+0.02*math.sin((lt-1.4)*math.pi/1.0) if lt>2.0 else 1.0
        yb=H*0.78; bw,bh=720*clamp(pc)*pulse,210*clamp(pc)
        sh=Image.new("RGBA",(W,H),(0,0,0,0))
        rrect(ImageDraw.Draw(sh),[W*0.5-bw/2,yb-bh/2+12,W*0.5+bw/2,yb+bh/2+12],40,fill=(245,150,72,90))
        fr.alpha_composite(sh.filter(ImageFilter.GaussianBlur(16)))
        rrect(ImageDraw.Draw(fr),[W*0.5-bw/2,yb-bh/2,W*0.5+bw/2,yb+bh/2],40,fill=ORANGE)
        if pc>0.6:
            t1=line_img("プロフィールTOPから",40,WHITE,900)
            t2=line_img("無料相談会へ",58,WHITE,900)
            fr.alpha_composite(t1,(int(W*0.5-t1.width/2),int(yb-66)))
            fr.alpha_composite(t2,(int(W*0.5-t2.width/2),int(yb-4)))
    return fr

SCENES=[(s1,4),(s2,4),(s3,4),(s4,5),(s5,6),(s6,7),(s7,5),(s8,5),(s9,5)]

def main():
    durs=[d for _,d in SCENES]; starts=[sum(durs[:i]) for i in range(len(durs))]
    total=sum(durs); n=int(total*FPS)
    print(f"Rendering {n} frames ({total}s)...")
    OUTFILE=os.path.join(OUT,"katalys_ad.mp4")
    proc=subprocess.Popen([FFMPEG,"-y","-f","rawvideo","-pix_fmt","rgb24","-s",f"{W}x{H}",
        "-r",str(FPS),"-i","-","-an","-c:v","libx264","-crf","19","-preset","medium",
        "-pix_fmt","yuv420p","-movflags","+faststart",OUTFILE],stdin=subprocess.PIPE)
    def render(ti):
        si=0
        for k in range(len(durs)):
            if ti>=starts[k]:si=k
        lt=ti-starts[si]; fr=SCENES[si][0](lt,durs[si])
        # clean quick fade-in per scene (cut feel)
        fin=clamp(lt/0.25)
        if fin<1:
            fr=Image.blend(Image.new("RGBA",(W,H),(255,255,255,255)),fr,fin)
        return fr
    for fi in range(n):
        t=fi/FPS; fr=render(t)
        g=1.0
        if t>total-0.6:g=max(0.0,(total-t)/0.6)
        rgb=fr.convert("RGB")
        if g<0.999:
            from PIL import ImageEnhance; rgb=ImageEnhance.Brightness(rgb).enhance(g)
        proc.stdin.write(rgb.tobytes())
        if fi%90==0:print(f"  {fi}/{n}")
    proc.stdin.close(); proc.wait()
    for ti,name in [(2,"s1"),(6,"s2"),(10,"s3"),(14.5,"s4"),(19,"s5"),(25.5,"s6"),(32,"s7"),(37,"s8"),(43,"s9")]:
        render(ti).convert("RGB").save(os.path.join(DBG,f"{name}.png"))
    print("DONE:",OUTFILE)

if __name__=="__main__":
    main()
