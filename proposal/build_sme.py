# -*- coding: utf-8 -*-
"""中小企業版 提案資料ビルダー。具体・中小寄りの方向（取り残されたくない／言い訳外し／実質負担前面）。"""
import os
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from deck_common import *

S=[]
def reg(fn): S.append(fn); return fn

@reg
def cover(prs, i, n):
    s=slide(prs, NAVY); logo(s, MX, Inches(0.62))
    rect(s, MX, Inches(2.0), Inches(0.55), Pt(3), fill=GOLD)
    textbox(s, MX, Inches(2.3), Inches(11), Inches(2.0),
        [[('研修で終わらせない。',{'size':44,'color':WHITE,'bold':True})],
         [('“現場が変わる”',{'size':44,'color':CREAM,'bold':True}),('まで。',{'size':44,'color':WHITE,'bold':True})]], line=1.3)
    textbox(s, MX, Inches(4.35), Inches(10.6), Inches(1.4),
        [[('中小企業の経営者さまへ。',{'size':15.5,'color':CREAM})],
         [('助成金を活用し、受講後に“あの業務が実際に変わっている”状態まで設計してお渡しする、',{'size':15.5,'color':CREAM})],
         [('実践型の法人向け生成AI研修のご提案です。',{'size':15.5,'color':CREAM})]], line=1.6)
    yb=Inches(5.95)
    for k,(lab,v) in enumerate([('ご提案先','◯◯◯◯株式会社 御中'),('ご提案','株式会社AIスキル'),('ご提案日','2026年6月')]):
        xx=MX+Inches(k*3.45)
        textbox(s,xx,yb,Inches(3.2),Inches(0.3),[[(lab,{'size':10.5,'color':RGBColor(0x8F,0xA3,0xC6)})]])
        textbox(s,xx,yb+Inches(0.28),Inches(3.3),Inches(0.4),[[(v,{'size':14,'color':WHITE,'bold':True})]])
    footer(s,i,n,'表紙',dark=True)

@reg
def peer(prs, i, n):
    s=slide(prs); kicker(s,'いま、中小企業で起きていること')
    title(s,[[('先進的な大企業ではなく、',{'size':28,'color':INK,'bold':True})],
             [('御社と',{'size':28,'color':INK,'bold':True}),('同じ規模・業種の“普通の会社”',{'size':28,'color':BLUE,'bold':True}),('が、もう毎日。',{'size':28,'color':INK,'bold':True})]],line=1.26)
    textbox(s,MX,Inches(2.45),Inches(10.6),Inches(0.9),
        [[('「AIはまだ一部の進んだ会社の話」——その前提は、すでに変わりました。',{'size':15,'color':SUB})],
         [('建設・運送・製造・介護・士業・ホテル…あらゆる業種の中小企業が、日常業務で使い始めています。',{'size':15,'color':SUB})]],line=1.7)
    textbox(s,MX,Inches(3.75),Inches(10),Inches(0.3),[[('導入企業の業種の広がり ── 御社に近い会社が、必ずこの中にいます',{'size':12,'color':FAINT})]])
    pill_row(s,['建設・不動産','運輸・物流','製造','福祉・介護','商社・小売','ホテル・サービス','医療','士業・コンサル','IT・通信','北海道〜九州'],MX,Inches(4.15))
    rect(s,MX,Inches(5.2),CW,Inches(0.95),fill=PANEL,rounded=True,radius=0.06)
    textbox(s,MX+Inches(0.4),Inches(5.36),CW-Inches(0.8),Inches(0.7),
        [[('実際には、',{'size':14.5,'color':INK}),('数名〜数十名規模の会社',{'size':14.5,'color':BLUE_D,'bold':True}),('から始めるケースも多く、特別な準備がなくても始められます。',{'size':14.5,'color':INK})]],line=1.5,anchor=MSO_ANCHOR.MIDDLE)
    footer(s,i,n,'現状認識')

@reg
def track(prs, i, n):
    s=slide(prs); kicker(s,'実績')
    title(s,[[('“教える”だけでなく“成果を出す”研修を、',{'size':27,'color':INK,'bold':True})],
             [('数多くの企業・経営者に。',{'size':27,'color':INK,'bold':True})]],y=Inches(1.0),line=1.25)
    stats=[('200','社超','研修・セミナー\n導入企業'),('150,000','名超','のべセミナー\n参加者数'),
           ('20,000','名超','AI学習コミュニティ\n参加者数'),('3,000','名超','経営者が\n研修・セミナー受講'),
           ('800','本超','自社制作の\nAI動画教材')]
    nn=len(stats); gap=Inches(0.24); cw=(CW-gap*(nn-1))/nn; y=Inches(2.55); h=Inches(2.3)
    for k,(num,unit,lab) in enumerate(stats):
        x=MX+k*(cw+gap); rect(s,x,y,cw,h,fill=WHITE,line_color=LINE,rounded=True,radius=0.06)
        ns=26 if len(num)>=6 else 37
        textbox(s,x,y+Inches(0.42),cw,Inches(0.95),
            [[(num,{'size':ns,'color':BLUE_D,'bold':True,'latin':'Arial'}),(unit,{'size':12.5,'color':BLUE,'bold':True})]],
            align=PP_ALIGN.CENTER,anchor=MSO_ANCHOR.MIDDLE)
        rect(s,x+cw/2-Inches(0.18),y+Inches(1.42),Inches(0.36),Pt(2),fill=GOLD)
        textbox(s,x,y+Inches(1.55),cw,Inches(0.7),
            [[(lab.split('\n')[0],{'size':11.5,'color':SUB})],[(lab.split('\n')[1],{'size':11.5,'color':SUB})]],
            align=PP_ALIGN.CENTER,line=1.35)
    textbox(s,MX,Inches(5.25),CW,Inches(0.5),
        [[('中小企業から上場企業まで、全国・全業種で導入。',{'size':14,'color':INK,'bold':True}),
          ('  御社と同じ規模の会社が、すでに数多く動いています。',{'size':14,'color':SUB})]])
    footer(s,i,n,'実績')

@reg
def excuses(prs, i, n):
    s=slide(prs,bg=PAPER); kicker(s,'最初によくいただくお声')
    title(s,[[('最初は、皆さま同じご不安からスタートします。',{'size':28,'color':INK,'bold':True})],
             [('同じような会社も、',{'size':28,'color':INK,'bold':True}),('無理なく始めています。',{'size':28,'color':BLUE,'bold':True})]],line=1.25)
    items=[('「うちはまだ早い」','数名〜数十名規模の会社から始める例も多くあります。'),
           ('「もう乗り遅れた」','まだ“触り始め”の会社が多く、今からでも十分に間に合います。'),
           ('「うちの業界は特殊」','同じ業界の会社でも、共通して使える場面は数多くあります。'),
           ('「高齢の社員が多くて無理」','幅広い年代の方に、ご好評をいただいています。')]
    gap=Inches(0.4); cw=(CW-gap)/2; y=Inches(2.55); rh=Inches(1.45)
    for k,(q,a) in enumerate(items):
        c=k%2; r=k//2; x=MX+c*(cw+gap); yy=y+r*rh
        rect(s,x,yy+Pt(4),Inches(0.34),Inches(0.34),fill=BLUESOFT,rounded=True,radius=0.3)
        textbox(s,x+Pt(2),yy+Pt(2),Inches(0.34),Inches(0.34),[[('→',{'size':14,'color':BLUE_D,'bold':True})]],align=PP_ALIGN.CENTER,anchor=MSO_ANCHOR.MIDDLE)
        textbox(s,x+Inches(0.55),yy,cw-Inches(0.55),Inches(0.4),[[(q,{'size':16,'color':INK,'bold':True})]])
        textbox(s,x+Inches(0.55),yy+Inches(0.42),cw-Inches(0.6),Inches(0.7),[[(a,{'size':13,'color':SUB})]],line=1.5)
    footer(s,i,n,'現状認識')

@reg
def fear(prs, i, n):
    s=slide(prs, NAVY); kicker(s,'投資判断をためらう、最大の理由',dark=True)
    textbox(s,MX,Inches(2.2),Inches(6.4),Inches(2.4),
        [[('研修しても、',{'size':36,'color':WHITE,'bold':True})],
         [('結局、',{'size':36,'color':WHITE,'bold':True}),('誰も使わない。',{'size':36,'color':CREAM,'bold':True})]],line=1.45)
    textbox(s,EW-MX-Inches(5.0),Inches(2.35),Inches(5.0),Inches(2.6),
        [[('AI導入をためらう最大の理由は、費用でも難しさでもなく',{'size':15,'color':CREAM})],
         [('「お金をかけても、現場が元に戻る」という不安です。',{'size':15,'color':CREAM})],
         [('',{'size':8,'color':CREAM})],
         [('私たちが最初に解くのも、この“定着しない”問題。',{'size':15,'color':WHITE,'bold':True})],
         [('だから、研修の設計思想そのものが違います。',{'size':15,'color':WHITE,'bold':True})]],line=1.8)
    footer(s,i,n,'本当の課題',dark=True)

@reg
def problem(prs, i, n):
    s=slide(prs); kicker(s,'多くの会社がぶつかる壁')
    title(s,[[('本当の課題は「ツールを入れること」ではなく、',{'size':27,'color':INK,'bold':True})],
             [('現場で',{'size':27,'color':INK,'bold':True}),('“使われ続けるか”＝定着',{'size':27,'color':BLUE,'bold':True}),('です。',{'size':27,'color':INK,'bold':True})]],line=1.26)
    items=[('01','各自バラバラに触っているだけ','個人で使えても、業務に落とし込めず、社内で活用が揃わない。'),
           ('02','導入しても、一部の人しか使わない','ツールを配ることと、現場で使われ続けることは別問題。'),
           ('03','研修しても、元の業務に戻る','「なるほど」で終わり、翌週には以前のやり方に戻ってしまう。')]
    gap=Inches(0.3); cw=(CW-gap*2)/3; y=Inches(2.7); h=Inches(2.5)
    for k,(no,t,d) in enumerate(items):
        x=MX+k*(cw+gap); rect(s,x,y,cw,h,fill=PANEL,line_color=LINE,rounded=True,radius=0.06)
        textbox(s,x+Inches(0.3),y+Inches(0.3),Inches(1),Inches(0.5),[[(no,{'size':22,'color':RGBColor(0xC2,0xCB,0xDA),'bold':True,'latin':'Arial'})]])
        textbox(s,x+Inches(0.3),y+Inches(0.95),cw-Inches(0.6),Inches(0.8),[[(t,{'size':15,'color':INK,'bold':True})]],line=1.3)
        textbox(s,x+Inches(0.3),y+Inches(1.65),cw-Inches(0.6),Inches(0.8),[[(d,{'size':12.5,'color':SUB})]],line=1.6)
    footer(s,i,n,'課題')

@reg
def pain(prs, i, n):
    s=slide(prs); kicker(s,'御社の現場で起きていること')
    title(s,[[('毎月、こうした業務に“静かに”時間が溶けています。',{'size':27,'color':INK,'bold':True})]])
    textbox(s,MX,Inches(1.7),CW,Inches(0.4),[[('導入企業で実際に圧縮できた定型業務の例です（中小企業の現場での実測）。',{'size':13,'color':SUB})]])
    pains=[('安全書類・取引先ごとの書類作成','月 25時間'),('顧客への月次レポート作成','月 24時間'),
           ('提案・プレゼン資料の作成','月 15時間'),('会議の議事録作成','月 10時間'),
           ('シフト・配置表の作成','月 10時間'),('日報・現場報告の清書','月 10時間')]
    gap=Inches(0.5); cw=(CW-gap)/2; y=Inches(2.3); rh=Inches(0.62)
    for k,(t,h) in enumerate(pains):
        c=k%2; r=k//2; x=MX+c*(cw+gap); yy=y+r*rh
        textbox(s,x,yy+Inches(0.12),cw-Inches(1.4),Inches(0.4),[[(t,{'size':15,'color':INK})]])
        textbox(s,x+cw-Inches(1.5),yy+Inches(0.1),Inches(1.5),Inches(0.4),[[(h,{'size':15,'color':DELTA,'bold':True,'latin':'Arial'})]],align=PP_ALIGN.RIGHT)
        hline(s,x,yy+rh-Inches(0.06),cw,color=LINE2,weight=1.0)
    textbox(s,MX,Inches(5.35),CW,Inches(0.4),[[('こうした「なくならないけれど価値を生まない時間」を、AIに任せられる形にしていきます。',{'size':13.5,'color':INK,'bold':True})]])
    footer(s,i,n,'課題')

@reg
def value(prs, i, n):
    s=slide(prs, NAVY); kicker(s,'私たちが売っているもの',dark=True)
    textbox(s,MX,Inches(2.3),Inches(6.6),Inches(2.4),
        [[('売るのは“研修”ではなく、',{'size':30,'color':WHITE,'bold':True})],
         [('“業務が変わった状態”。',{'size':34,'color':CREAM,'bold':True})]],line=1.45)
    textbox(s,EW-MX-Inches(4.9),Inches(2.4),Inches(4.9),Inches(2.6),
        [[('「使い方を教える研修」なら世の中に数多くあります。',{'size':15,'color':CREAM})],
         [('私たちが大切にするのは、研修後に',{'size':15,'color':CREAM})],
         [('“あの業務が実際に変わっている”状態まで',{'size':15,'color':WHITE,'bold':True})],
         [('持っていくこと。題材も御社の実業務そのものを使います。',{'size':15,'color':CREAM})]],line=1.8)
    footer(s,i,n,'提供価値',dark=True)

@reg
def compare(prs, i, n):
    s=slide(prs); kicker(s,'一般的なAI研修との違い')
    title(s,[[('「知っている」で終わらせず、',{'size':29,'color':INK,'bold':True}),('「使えている」まで。',{'size':29,'color':BLUE,'bold':True})]])
    rows=[('形式','座学・講義型のインプット／e-Learning','実務課題をその場で解く実践ワークショップ'),
          ('教材','汎用サンプル','御社の実業務（マスキング）を題材化'),
          ('成果物','ノート・受講証明書','参加者の数だけ“業務改善AI”が完成'),
          ('研修後','時間が経つと元の業務に戻る','3ヶ月伴走し、社内でPDCAを自走')]
    y=Inches(2.1); rh=Inches(0.86); c0=Inches(1.5); c1=Inches(4.7); x1=MX+c0; x2=x1+c1
    textbox(s,x1,y,c1,Inches(0.4),[[('一般的なAI研修',{'size':12.5,'color':SUB,'bold':True})]])
    textbox(s,x2+Inches(0.25),y,c1+Inches(0.4),Inches(0.4),[[('弊社の実践型研修',{'size':12.5,'color':BLUE_D,'bold':True})]])
    hline(s,MX,y+Inches(0.42),CW,color=LINE,weight=1.2)
    yy=y+Inches(0.5); rect(s,x2,yy,c1+Inches(0.55),rh*4,fill=BLUESOFT,rounded=True,radius=0.04)
    for lab,a,b in rows:
        textbox(s,MX,yy+Inches(0.16),c0,Inches(0.5),[[(lab,{'size':12,'color':FAINT})]])
        textbox(s,x1,yy+Inches(0.14),c1-Inches(0.2),Inches(0.6),[[(a,{'size':13.5,'color':SUB})]],line=1.4)
        textbox(s,x2+Inches(0.25),yy+Inches(0.14),c1+Inches(0.1),Inches(0.6),[[(b,{'size':13.5,'color':BLUE_D,'bold':True})]],line=1.4)
        yy+=rh
        if lab!='研修後': hline(s,MX,yy,CW,color=LINE2,weight=1.0)
    footer(s,i,n,'一般研修との違い')

@reg
def pillars(prs, i, n):
    s=slide(prs); kicker(s,'弊社が選ばれる3つの理由')
    title(s,[[('「定着」を、設計に組み込んでいます。',{'size':29,'color':INK,'bold':True})]])
    items=[('1','定着まで設計','座学で終わらせず、受講者の実業務をその場で題材に。研修後の運用まで伴走し、“使われ続ける状態”を作ります。'),
           ('2','事業を作ってきた人間が設計','研修専業ではなく、実際に事業を立ち上げてきたメンバーが、現場業務とROIの視点で設計します。'),
           ('3','効果の見える化','受講前後で「この業務が何分→何分」を測定。経営に報告できる形で成果を残します。')]
    gap=Inches(0.3); cw=(CW-gap*2)/3; y=Inches(2.35); h=Inches(2.9)
    for k,(no,t,d) in enumerate(items):
        x=MX+k*(cw+gap); rect(s,x,y,cw,h,fill=WHITE,line_color=LINE,rounded=True,radius=0.06)
        rect(s,x+Inches(0.32),y+Inches(0.34),Inches(0.5),Inches(0.5),fill=BLUE_D,rounded=True,radius=0.22)
        textbox(s,x+Inches(0.32),y+Inches(0.34),Inches(0.5),Inches(0.5),[[(no,{'size':16,'color':WHITE,'bold':True,'latin':'Arial'})]],align=PP_ALIGN.CENTER,anchor=MSO_ANCHOR.MIDDLE)
        textbox(s,x+Inches(0.32),y+Inches(1.05),cw-Inches(0.64),Inches(0.8),[[(t,{'size':17,'color':INK,'bold':True})]],line=1.3)
        textbox(s,x+Inches(0.32),y+Inches(1.78),cw-Inches(0.6),Inches(1.0),[[(d,{'size':12.5,'color':SUB})]],line=1.65)
    footer(s,i,n,'選ばれる理由')

@reg
def credibility(prs, i, n):
    s=slide(prs); kicker(s,'信頼の裏づけ')
    title(s,[[('研修屋ではなく、',{'size':27,'color':INK,'bold':True}),('AIの専門性と事業の両方',{'size':27,'color':BLUE,'bold':True}),('を持つチーム。',{'size':27,'color':INK,'bold':True})]])
    # left: company
    rect(s,MX,Inches(2.05),Inches(5.2),Inches(3.0),fill=PANEL,line_color=LINE,rounded=True,radius=0.05)
    textbox(s,MX+Inches(0.4),Inches(2.3),Inches(4.4),Inches(0.5),[[('株式会社AIスキル',{'size':17,'color':INK,'bold':True})]])
    textbox(s,MX+Inches(0.4),Inches(2.78),Inches(4.5),Inches(0.6),[[('「AIで、人を、社会を、未来を変える。」',{'size':12.5,'color':BLUE_D,'bold':True})]],line=1.3)
    info=[('代表者','立石 亮介'),('設立','2024年12月'),('所在地','東京都渋谷区神南1-11-4'),('事業','AI活用支援／教育／コミュニティ')]
    iy=Inches(3.4)
    for kk,(k,v) in enumerate(info):
        textbox(s,MX+Inches(0.4),iy,Inches(1.1),Inches(0.4),[[(k,{'size':10.5,'color':FAINT})]])
        textbox(s,MX+Inches(1.45),iy,Inches(3.6),Inches(0.4),[[(v,{'size':12,'color':INK,'bold':True})]],line=1.2)
        iy+=Inches(0.4)
    # right: supervisor
    bx=MX+Inches(5.6)
    textbox(s,bx,Inches(2.1),Inches(6),Inches(0.3),[[('研修プログラム監修',{'size':11,'color':BLUE,'bold':True,'spacing':1.0})]])
    textbox(s,bx,Inches(2.42),Inches(6),Inches(0.5),[[('鈴木 章央',{'size':22,'color':INK,'bold':True}),('  Suzuki Akihiro',{'size':12,'color':FAINT})]])
    textbox(s,bx,Inches(3.1),Inches(5.4),Inches(1.3),
        [[('国立大学大学院でAIを研究し、修士・博士号を取得。',{'size':13,'color':SUB})],
         [('2017年にAI企業を創業し、開発・技術顧問・教育を展開。',{'size':13,'color':SUB})],
         [('企業のAI導入支援を多数手がけ、AI講座の講師歴は5年。',{'size':13,'color':SUB})]],line=1.7)
    pill_row(s,['AI研究 修士・博士','AI受託開発・技術顧問','講師歴5年'],bx,Inches(4.45),size=11)
    footer(s,i,n,'信頼の裏づけ')

@reg
def retention(prs, i, n):
    s=slide(prs); kicker(s,'「また使われないのでは」への答え')
    title(s,[[('受講者が、',{'size':28,'color':INK,'bold':True}),('自分でAIを作って回し始める',{'size':28,'color':BLUE,'bold':True}),('まで。',{'size':28,'color':INK,'bold':True})]])
    textbox(s,MX,Inches(2.05),Inches(6.5),Inches(0.9),
        [[('「どうせ定着しない」は、皆さん最初に必ず言われます。',{'size':14.5,'color':SUB})],
         [('私たちが最も力を入れているのが、この“その後”です。',{'size':14.5,'color':SUB})]],line=1.6)
    bl=['受講者が自らGPTs等を作成し、研修後も“自走”する状態まで設計。',
        '配って終わりにせず、部署横断で日常的に使われる状態へ。',
        '「この業務が何分→何分」を測り、成果を組織に残す。']
    by=Inches(3.1)
    for b in bl:
        rect(s,MX,by+Pt(3),Inches(0.16),Inches(0.16),fill=BLUE,rounded=True,radius=0.3)
        textbox(s,MX+Inches(0.34),by,Inches(6.0),Inches(0.6),[[(b,{'size':13.5,'color':INK})]],line=1.45); by+=Inches(0.6)
    cx=EW-MX-Inches(4.4); rect(s,cx,Inches(2.0),Inches(4.4),Inches(3.0),fill=NAVY,rounded=True,radius=0.05)
    textbox(s,cx+Inches(0.4),Inches(2.45),Inches(3.6),Inches(1.0),[[('配って終わり、',{'size':22,'color':WHITE,'bold':True})],[('ではありません。',{'size':22,'color':WHITE,'bold':True})]],line=1.35)
    textbox(s,cx+Inches(0.4),Inches(3.75),Inches(3.65),Inches(1.1),
        [[('農機販売や建設の会社でも、受講者が自分でAIを',{'size':12.5,'color':CREAM})],
         [('作り、研修後も現場で使い続けています。',{'size':12.5,'color':CREAM})]],line=1.6)
    footer(s,i,n,'定着の証明')

@reg
def cases(prs, i, n):
    s=slide(prs); kicker(s,'導入企業の成果（実測）')
    title(s,[[('“浮いた時間”が、受講料を回収します。',{'size':29,'color':INK,'bold':True})]])
    cc=[('建設業・51名','安全書類の作成','25h','10h','月15時間削減・60%減','元請けごとに異なる書類をAIが8割作成。議事録も10h→3hに。'),
        ('会計事務所・7名','顧客への月次レポート','24h','12h','月12時間削減・50%減','データ統合〜文面作成を定型化。海外向け提案資料も15h→5h。'),
        ('ホテル・50名','シフト作成業務','10h','5h','月5時間削減・50%減','属人化していた作成を仕組み化。メニュー案作成も10h→6h。')]
    gap=Inches(0.3); cw=(CW-gap*2)/3; y=Inches(2.2); h=Inches(2.95)
    for k,(co,biz,a,b,delta,desc) in enumerate(cc):
        x=MX+k*(cw+gap); rect(s,x,y,cw,h,fill=WHITE,line_color=LINE,rounded=True,radius=0.06)
        textbox(s,x+Inches(0.3),y+Inches(0.28),cw-Inches(0.6),Inches(0.3),[[(co,{'size':12.5,'color':BLUE,'bold':True})]])
        textbox(s,x+Inches(0.3),y+Inches(0.6),cw-Inches(0.6),Inches(0.3),[[(biz,{'size':11.5,'color':FAINT})]])
        textbox(s,x+Inches(0.3),y+Inches(1.0),cw-Inches(0.6),Inches(0.7),
            [[(a,{'size':19,'color':FAINT,'latin':'Arial'}),('  →  ',{'size':15,'color':BLUE}),(b,{'size':34,'color':BLUE_D,'bold':True,'latin':'Arial'})]],anchor=MSO_ANCHOR.MIDDLE)
        rect(s,x+Inches(0.3),y+Inches(1.78),Inches(2.1),Inches(0.34),fill=DELTASOFT,rounded=True,radius=0.5)
        textbox(s,x+Inches(0.3),y+Inches(1.78),Inches(2.1),Inches(0.34),[[(delta,{'size':11,'color':DELTA,'bold':True})]],align=PP_ALIGN.CENTER,anchor=MSO_ANCHOR.MIDDLE)
        textbox(s,x+Inches(0.3),y+Inches(2.25),cw-Inches(0.6),Inches(0.7),[[(desc,{'size':11.5,'color':SUB})]],line=1.55)
    textbox(s,MX,Inches(5.45),CW,Inches(0.4),[[('※ いずれも受講後アンケート・実測値。御社に近い業種・規模の実例をご用意できます。',{'size':11,'color':SUB})]])
    footer(s,i,n,'導入事例')

@reg
def curriculum(prs, i, n):
    s=slide(prs); kicker(s,'研修カリキュラム')
    title(s,[[('全12時間（2時間×6回）。',{'size':28,'color':INK,'bold':True}),('すべて実務に直結。',{'size':28,'color':BLUE,'bold':True})]])
    textbox(s,MX,Inches(1.75),CW,Inches(0.4),[[('講義時間の多くを演習・ワークに充てるハンズオン構成。各回で“その場で動くもの”を作ります。',{'size':13,'color':SUB})]])
    data=[('1','生成AIの基礎とプロンプト設計','出力比較／業務プロンプト作成'),
          ('2','表計算 × AIによる業務効率化','コードによる自動化／データ整形・転記'),
          ('3','データ分析 & レポート・資料作成','レポート作成／スライド生成AI'),
          ('4','画像生成・音声入力 × AI活用','業務用ラフ案生成／短尺PR動画'),
          ('5','GPTs構築・ナレッジ活用','社内資料のQ&A化／RAG型質問応答'),
          ('6','全体振り返りと PoC プランニング','自社業務への適用設計／PoC決定')]
    y=Inches(2.35); rh=Inches(0.62)
    textbox(s,MX,y,Inches(0.6),Inches(0.3),[[('回',{'size':11,'color':FAINT})]])
    textbox(s,MX+Inches(0.7),y,Inches(4),Inches(0.3),[[('テーマ',{'size':11,'color':FAINT})]])
    textbox(s,MX+Inches(5.6),y,Inches(5),Inches(0.3),[[('主なワーク（実技）',{'size':11,'color':FAINT})]])
    hline(s,MX,y+Inches(0.32),CW,color=LINE,weight=1.2); yy=y+Inches(0.42)
    for no,t,w in data:
        textbox(s,MX,yy+Inches(0.1),Inches(0.6),Inches(0.4),[[(no,{'size':14,'color':BLUE,'bold':True,'latin':'Arial'})]])
        textbox(s,MX+Inches(0.7),yy+Inches(0.1),Inches(4.9),Inches(0.5),[[(t,{'size':13.5,'color':INK,'bold':True})]],line=1.2)
        textbox(s,MX+Inches(5.6),yy+Inches(0.1),Inches(5.3),Inches(0.5),[[(w,{'size':12.5,'color':SUB})]],line=1.2)
        yy+=rh; hline(s,MX,yy,CW,color=LINE2,weight=1.0)
    footer(s,i,n,'研修の中身')

@reg
def process(prs, i, n):
    s=slide(prs); kicker(s,'導入の進め方')
    title(s,[[('お渡しして終わりにしない、',{'size':28,'color':INK,'bold':True}),('約半年の伴走。',{'size':28,'color':BLUE,'bold':True})]])
    steps=[('1','事前ヒアリング','業務・課題を把握し、効く領域を見立てる'),('2','専用カリキュラム作成','御社の実業務を題材に内容を設計'),
           ('3','研修の実施','全12時間。オンライン中心、対面も可'),('4','3ヶ月の定着フォロー','運用に伴走し、効果を測定・見える化')]
    cw=CW/4; y=Inches(2.7); hline(s,MX+Inches(0.4),y+Inches(0.25),CW-Inches(0.9),color=LINE,weight=1.4)
    for k,(no,t,d) in enumerate(steps):
        x=MX+k*cw; rect(s,x,y,Inches(0.5),Inches(0.5),fill=BLUE_D,rounded=True,radius=0.5)
        textbox(s,x,y,Inches(0.5),Inches(0.5),[[(no,{'size':15,'color':WHITE,'bold':True,'latin':'Arial'})]],align=PP_ALIGN.CENTER,anchor=MSO_ANCHOR.MIDDLE)
        textbox(s,x,y+Inches(0.75),cw-Inches(0.3),Inches(0.5),[[(t,{'size':15,'color':INK,'bold':True})]],line=1.25)
        textbox(s,x,y+Inches(1.25),cw-Inches(0.4),Inches(0.9),[[(d,{'size':12,'color':SUB})]],line=1.5)
    textbox(s,MX,Inches(5.1),CW,Inches(0.5),
        [[('最低5名から（雇用保険加入者）。',{'size':14,'color':INK,'bold':True}),
          ('  経営者・役員1名は無料でご招待します（5名以上のお申込み時）。',{'size':14,'color':SUB})]])
    footer(s,i,n,'進め方')

@reg
def subsidy(prs, i, n):
    s=slide(prs); kicker(s,'助成金の活用')
    title(s,[[('国の助成金で、研修費の負担を',{'size':28,'color':INK,'bold':True}),('大きく抑えられます。',{'size':28,'color':BLUE,'bold':True})]])
    textbox(s,MX,Inches(1.8),Inches(6.6),Inches(1.0),
        [[('人材開発支援助成金「事業展開等リスキリング支援コース」。',{'size':14,'color':SUB})],
         [('雇用保険の適用事業所が対象で、要件を満たした訓練が助成対象になります。',{'size':14,'color':SUB})]],line=1.6)
    rect(s,MX,Inches(3.05),Inches(3.1),Inches(1.7),fill=NAVY,rounded=True,radius=0.06)
    textbox(s,MX+Inches(0.3),Inches(3.27),Inches(2.5),Inches(0.3),[[('中小企業',{'size':12,'color':CREAM,'bold':True})]])
    textbox(s,MX+Inches(0.28),Inches(3.55),Inches(2.6),Inches(0.8),[[('最大 ',{'size':14,'color':WHITE}),('75',{'size':40,'color':WHITE,'bold':True,'latin':'Arial'}),('%',{'size':22,'color':CREAM,'bold':True})]],anchor=MSO_ANCHOR.MIDDLE)
    textbox(s,MX+Inches(0.3),Inches(4.33),Inches(2.6),Inches(0.3),[[('訓練経費の助成率',{'size':11.5,'color':CREAM})]])
    rect(s,MX+Inches(3.35),Inches(3.05),Inches(3.1),Inches(1.7),fill=PANEL,line_color=LINE,rounded=True,radius=0.06)
    textbox(s,MX+Inches(3.65),Inches(3.27),Inches(2.5),Inches(0.3),[[('（参考）大企業',{'size':12,'color':SUB,'bold':True})]])
    textbox(s,MX+Inches(3.63),Inches(3.55),Inches(2.6),Inches(0.8),[[('最大 ',{'size':14,'color':INK}),('60',{'size':40,'color':BLUE_D,'bold':True,'latin':'Arial'}),('%',{'size':22,'color':BLUE,'bold':True})]],anchor=MSO_ANCHOR.MIDDLE)
    textbox(s,MX+Inches(3.65),Inches(4.33),Inches(2.6),Inches(0.3),[[('訓練経費の助成率',{'size':11.5,'color':FAINT})]])
    cx=EW-MX-Inches(4.3); rect(s,cx,Inches(1.8),Inches(4.3),Inches(2.95),fill=BLUESOFT,line_color=RGBColor(0xDD,0xE6,0xF6),rounded=True,radius=0.05)
    pts=['訓練経費に加え、訓練中の賃金も助成対象（時間に応じ加算）。','申請は実績豊富な提携社労士法人が代行。御社の手間は最小限に。','弊社は社労士の紹介料を一切いただきません。']
    py=Inches(2.1)
    for p in pts:
        rect(s,cx+Inches(0.32),py+Pt(3),Inches(0.14),Inches(0.14),fill=BLUE,rounded=True,radius=0.3)
        textbox(s,cx+Inches(0.6),py,Inches(3.4),Inches(0.7),[[(p,{'size':12,'color':BLUE_D})]],line=1.5); py+=Inches(0.78)
    textbox(s,MX,Inches(5.05),CW,Inches(0.5),[[('※ 助成額・助成率は企業区分・年度・申請内容により異なり、労働局の審査・支給決定が必要です。受給を保証するものではありません。',{'size':10.5,'color':FAINT})]],line=1.4)
    footer(s,i,n,'助成金')

@reg
def price(prs, i, n):
    s=slide(prs); kicker(s,'費用')
    title(s,[[('受講料と、助成金活用時の負担イメージ。',{'size':28,'color':INK,'bold':True})]])
    y=Inches(2.3); h=Inches(2.0)
    rect(s,MX,y,Inches(5.2),h,fill=WHITE,line_color=LINE,rounded=True,radius=0.06)
    textbox(s,MX+Inches(0.4),y+Inches(0.3),Inches(4),Inches(0.3),[[('標準受講料',{'size':12.5,'color':SUB})]])
    textbox(s,MX+Inches(0.38),y+Inches(0.65),Inches(4.6),Inches(0.8),[[('¥300,300',{'size':38,'color':INK,'bold':True,'latin':'Arial'}),(' / 人（税込）',{'size':14,'color':SUB})]],anchor=MSO_ANCHOR.MIDDLE)
    textbox(s,MX+Inches(0.4),y+Inches(1.45),Inches(4.6),Inches(0.5),[[('全12時間（2h×6回）＋ 研修後3ヶ月のフォローアップ込み。最低5名から。',{'size':11.5,'color':SUB})]],line=1.4)
    cx=MX+Inches(5.55); rect(s,cx,y,Inches(5.45),h,fill=NAVY,rounded=True,radius=0.06)
    textbox(s,cx+Inches(0.4),y+Inches(0.3),Inches(4.6),Inches(0.4),[[('助成金を活用した場合の自己負担イメージ（中小企業）',{'size':12,'color':CREAM})]],line=1.2)
    textbox(s,cx+Inches(0.38),y+Inches(0.72),Inches(4.8),Inches(0.8),[[('約 ¥98,675',{'size':38,'color':WHITE,'bold':True,'latin':'Arial'}),(' / 人',{'size':14,'color':CREAM})]],anchor=MSO_ANCHOR.MIDDLE)
    textbox(s,cx+Inches(0.4),y+Inches(1.5),Inches(4.7),Inches(0.4),[[('社労士費用込みの目安（要件を満たし支給決定を受けた場合）。経営者1名は無料招待。',{'size':10.5,'color':CREAM})]],line=1.35)
    textbox(s,MX,Inches(4.55),CW,Inches(0.6),
        [[('浮いた時間で回収できる投資です。',{'size':15,'color':INK,'bold':True}),
          ('  月15時間かかっていた業務が半分になれば、年間で約90時間を本来の業務に戻せます。',{'size':14,'color':SUB})]],line=1.5)
    textbox(s,MX,Inches(5.25),CW,Inches(0.4),[[('※ 上記は一例の目安です。受給可否・金額は要件充足と労働局の審査・支給決定によります。',{'size':10.5,'color':FAINT})]])
    footer(s,i,n,'費用')

@reg
def whynow(prs, i, n):
    s=slide(prs); kicker(s,'なぜ“今”か')
    title(s,[[('差がつくのは、ツールの新しさではなく',{'size':28,'color':INK,'bold':True})],
             [('“',{'size':28,'color':INK,'bold':True}),('土台を作った時期',{'size':28,'color':BLUE,'bold':True}),('”です。',{'size':28,'color':INK,'bold':True})]],line=1.25)
    items=[('取引先・元請けの先行','取引先が先にAI化すると、対応の差がそのまま受注の差に。「追いつくのは“いつか”でなく今」です。'),
           ('複利で開く差','AIは走りながら育てるもの。早く始めた会社ほど、社内にノウハウが蓄積していきます。'),
           ('助成金の活用に期限','活用の好機には期限があり、準備にも時間を要します。検討は早いほど有利です。')]
    gap=Inches(0.3); cw=(CW-gap*2)/3; y=Inches(2.6); h=Inches(2.3)
    for k,(t,d) in enumerate(items):
        x=MX+k*(cw+gap); rect(s,x,y,cw,h,fill=WHITE,line_color=LINE,rounded=True,radius=0.06)
        rect(s,x+Inches(0.3),y+Inches(0.34),Inches(0.34),Pt(3),fill=GOLD)
        textbox(s,x+Inches(0.3),y+Inches(0.5),cw-Inches(0.6),Inches(0.5),[[(t,{'size':15.5,'color':BLUE_D,'bold':True})]],line=1.2)
        textbox(s,x+Inches(0.3),y+Inches(1.15),cw-Inches(0.6),Inches(1.1),[[(d,{'size':12.5,'color':SUB})]],line=1.65)
    footer(s,i,n,'今、始める理由')

@reg
def summary(prs, i, n):
    s=slide(prs, NAVY); kicker(s,'まとめ',dark=True)
    textbox(s,MX,Inches(2.1),Inches(7.0),Inches(2.6),
        [[('完璧を待たず、まず始める。',{'size':32,'color':WHITE,'bold':True})],
         [('最高のスタートを、今。',{'size':32,'color':CREAM,'bold':True})]],line=1.45)
    pts=['研修して終わりにせず、“現場が変わる”まで設計','受講前後で効果を測り、経営に見える形で残す','助成金の活用で、投資負担を抑えて始められる']
    py=Inches(4.5)
    for p in pts:
        rect(s,MX,py+Pt(3),Inches(0.16),Inches(0.16),fill=CREAM,rounded=True,radius=0.3)
        textbox(s,MX+Inches(0.34),py,Inches(10),Inches(0.4),[[(p,{'size':14,'color':WHITE})]]); py+=Inches(0.5)
    footer(s,i,n,'まとめ',dark=True)

@reg
def nextstep(prs, i, n):
    s=slide(prs); kicker(s,'次のステップ')
    title(s,[[('ご導入までの流れ',{'size':29,'color':INK,'bold':True})]])
    steps=[('01','無料相談・デモ','御社の業務に合わせた活用イメージをご覧いただきます。'),
           ('02','活用設計・効果試算','どの業務から始めると効くか、ROIを一緒に試算します。'),
           ('03','お申込み・助成金申請','提携社労士が申請を代行。計画申請から伴走します。'),
           ('04','研修開始・定着支援','専用カリキュラムで研修を実施し、3ヶ月伴走します。')]
    y=Inches(2.25); rh=Inches(0.92)
    for k,(no,t,d) in enumerate(steps):
        yy=y+k*rh; rect(s,MX,yy,Inches(0.62),Inches(0.62),fill=BLUESOFT,rounded=True,radius=0.16)
        textbox(s,MX,yy,Inches(0.62),Inches(0.62),[[(no,{'size':15,'color':BLUE_D,'bold':True,'latin':'Arial'})]],align=PP_ALIGN.CENTER,anchor=MSO_ANCHOR.MIDDLE)
        textbox(s,MX+Inches(0.95),yy+Inches(0.05),Inches(4),Inches(0.5),[[(t,{'size':16,'color':INK,'bold':True})]],anchor=MSO_ANCHOR.MIDDLE)
        textbox(s,MX+Inches(5.0),yy,Inches(6.0),Inches(0.62),[[(d,{'size':13,'color':SUB})]],anchor=MSO_ANCHOR.MIDDLE,line=1.4)
        if k<3: hline(s,MX+Inches(0.95),yy+rh-Inches(0.15),CW-Inches(0.95),color=LINE2,weight=1.0)
    footer(s,i,n,'次のステップ')

@reg
def contact(prs, i, n):
    s=slide(prs, NAVY); logo(s, MX, Inches(0.9))
    textbox(s,MX,Inches(2.2),Inches(10),Inches(0.8),[[('お気軽にご相談ください。',{'size':30,'color':WHITE,'bold':True})]])
    textbox(s,MX,Inches(3.05),Inches(9),Inches(0.8),[[('ご質問・無料デモのご希望など、御社に合わせた進め方をご提案します。',{'size':15,'color':CREAM})]],line=1.6)
    info=[('会社名','株式会社AIスキル'),('代表者','立石 亮介'),('所在地','東京都渋谷区神南1-11-4 FPGリンクス神南 5階'),('事業内容','AI活用サポート事業／教育事業／コミュニティ事業／SNS事業')]
    iy=Inches(4.1)
    for k,v in info:
        textbox(s,MX,iy,Inches(1.6),Inches(0.4),[[(k,{'size':11,'color':RGBColor(0x8F,0xA3,0xC6)})]])
        textbox(s,MX+Inches(1.7),iy,Inches(9),Inches(0.4),[[(v,{'size':13.5,'color':WHITE,'bold':True})]]); iy+=Inches(0.5)
    footer(s,i,n,'お問い合わせ',dark=True)

@reg
def appendix_div(prs, i, n):
    s=slide(prs); textbox(s,MX,Inches(2.9),Inches(4),Inches(0.4),[[('Appendix',{'size':12,'color':BLUE,'bold':True,'spacing':2})]])
    title(s,[[('付録：詳細資料',{'size':34,'color':INK,'bold':True})]],y=Inches(3.3))
    textbox(s,MX,Inches(4.2),Inches(9),Inches(0.5),[[('料金の内訳・よくあるご質問。商談に合わせて必要なページのみご参照ください。',{'size':14,'color':SUB})]])
    footer(s,i,n,'付録')

@reg
def price_detail(prs, i, n):
    s=slide(prs); kicker(s,'付録 ｜ 料金の内訳')
    title(s,[[('助成金活用時の自己負担イメージ（中小企業・1人あたり・目安）',{'size':23,'color':INK,'bold':True})]])
    rows=[('標準受講料','¥300,300'),('訓練経費の助成（最大75%）','約 −¥225,225'),('賃金助成（訓練時間に応じ）','約 −¥12,000'),
          ('社労士費用（助成額の約15%）','約 ＋¥35,600'),('自己負担イメージ','約 ¥98,675')]
    y=Inches(2.1); rh=Inches(0.7); c0=Inches(7.0); cval=Inches(3.5)
    hline(s,MX,y,CW,color=LINE,weight=1.2); yy=y+Inches(0.12)
    for k,(lab,v) in enumerate(rows):
        last=(k==len(rows)-1)
        if last: rect(s,MX-Inches(0.1),yy-Inches(0.05),CW+Inches(0.2),rh,fill=BLUESOFT,rounded=True,radius=0.1)
        textbox(s,MX,yy+Inches(0.16),c0,Inches(0.4),[[(lab,{'size':14 if last else 13.5,'color':INK if last else SUB,'bold':last})]])
        textbox(s,MX+c0,yy+Inches(0.12),cval,Inches(0.4),[[(v,{'size':16 if last else 14,'color':BLUE_D if last else SUB,'bold':last,'latin':'Arial'})]],align=PP_ALIGN.RIGHT)
        yy+=rh
        if not last: hline(s,MX,yy,CW,color=LINE2,weight=1.0)
    textbox(s,MX,Inches(5.9),CW,Inches(0.7),[[('※ 経費助成は訓練時間10〜100時間で上限30万円/人。動画教材を用いた研修は賃金助成の対象外。金額・助成率は企業区分・年度・申請内容により変動し、労働局の審査・支給決定が必要です（受給を保証するものではありません）。',{'size':10,'color':FAINT})]],line=1.45)
    footer(s,i,n,'付録｜料金')

@reg
def faq(prs, i, n):
    s=slide(prs); kicker(s,'付録 ｜ よくあるご質問')
    title(s,[[('よくあるご質問',{'size':28,'color':INK,'bold':True})]])
    qa=[('オンラインですか、対面ですか？','最低5名以上で基本オンライン。10名以上なら対面も可能です（交通費別途）。アーカイブ視聴も可。'),
        ('研修期間はどのくらい？','全12時間（2h×6回が中心）。1ヶ月集中も2〜3ヶ月も、御社の状況に合わせて調整します。'),
        ('社員のITリテラシーが不安です。','20〜60代の全世代で好評をいただいています。実業務を題材にするため「自分の仕事でどう使うか」がつかめます。'),
        ('個人情報は使って大丈夫？','実データはマスキングしたサンプルを使用。実業務に近い形で安全に演習できます。'),
        ('すでに他社研修を受けています。','内容が異なれば助成金は複数回の活用が可能な場合があります。一度内容をご確認ください。'),
        ('申請が難しそうです。','提携社労士が代行。対象判定から書類準備まで支援します（弊社の紹介料なし）。')]
    gap=Inches(0.6); cw=(CW-gap)/2; y=Inches(2.0); rh=Inches(1.15)
    for k,(q,a) in enumerate(qa):
        c=k%2; r=k//2; x=MX+c*(cw+gap); yy=y+r*rh
        textbox(s,x,yy,cw,Inches(0.4),[[('Q. ',{'size':13.5,'color':BLUE,'bold':True}),(q,{'size':13.5,'color':INK,'bold':True})]],line=1.25)
        textbox(s,x,yy+Inches(0.38),cw,Inches(0.7),[[(a,{'size':12,'color':SUB})]],line=1.5)
    footer(s,i,n,'付録｜FAQ')

if __name__=='__main__':
    out=os.path.join(os.path.dirname(os.path.abspath(__file__)),'ai-training-proposal-sme.pptx')
    render(new_prs(), S, out)
