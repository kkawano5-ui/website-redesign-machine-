# 承認済み素材パック（demo-assets）

- このフォルダには、営業用デモサイトの **承認済み素材だけ** を配置します。
- **ランダム画像URLは禁止**（外部からの自動取得・クエリ取得・ランダム取得は使いません）。
- 店舗写真をもらったら、この素材と差し替えます。
- 外観写真は原則、**実店舗提供素材のみ** 使用します（無い場合はサイト側で差し替え案内枠を表示）。
- ロゴ・看板・人物の顔が大きく写る素材は避けます。

## 置き場所

```
public/demo-assets/{業態}/{用途}/{用途}-01.jpg
```

- 業態: yakiniku / cafe / kissaten / izakaya / ramen / bar / chinese（ほか washoku）
- 用途(role): hero / menu / interior / atmosphere / detail / ogp / video
  - video は .mp4、それ以外は .jpg を想定

## 使うための手順

1. 基準に合う写真をこのフォルダへ配置する
2. `src/data/demoAssets.ts` の該当エントリ（id 例: `yakiniku-hero-01`）を `approved: true` にする
3. approved の素材だけがサイトに表示される
   （未承認の用途は、画像を出さず「デザインされた差し替え枠」を表示）

## 汎用OGP

承認済みの OGP / hero 素材が無いときは、ローカルの汎用OGP `og-default.png` を使います（外部URLは使いません）。
