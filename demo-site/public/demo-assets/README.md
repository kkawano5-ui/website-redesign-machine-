# 承認済み素材パック（demo-assets）

営業デモで使う画像・動画は **この配下のキュレーション素材だけ** を使います。
ランダム取得（loremflickr / Unsplash random / クエリ自動取得）は使いません。

## 置き場所
public/demo-assets/{業態}/{用途}/{用途}-01.jpg …

- 業態: yakiniku / kissaten / cafe / izakaya / ramen / bar / chinese / washoku
- 用途(role): hero / menu / interior / atmosphere / detail / video / ogp
  - video は .mp4、それ以外は .jpg を想定

## 使うための手順
1. 基準（業態別の良い/避ける）に合う写真をこのフォルダに配置
2. `src/data/demoAssets.ts` の該当エントリ（id が `{業態}-{用途}-NN`）を `approved: true` に変更
3. approved になった素材だけがサイトに表示される
   （未承認の用途は、ランダム画像ではなく「デザインされた差し替え枠」を表示）

## 注意
- 店名・ロゴ・看板が写る写真／人物の顔が主役の写真／別店舗外観に見える写真は使わない
- メニュー写真は料理名と矛盾しないものだけ
- 本番納品時は必ず店舗提供写真へ差し替える
