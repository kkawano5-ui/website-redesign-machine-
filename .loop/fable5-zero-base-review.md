# Fable5 ゼロベース総点検ループ 手順書

リポジトリ全体を先入観なし（ゼロベース）で総点検する自走ループの手順。
state は `.loop/fable5-zero-base-review-state.md` に記録する。

## 目的

- コード・LP HTML・設定・ドキュメント・データの不整合やバグを洗い出す
- 明確なバグはその場で修正し、判断が必要なものは findings として記録する
- 全領域の点検が完了したら総括レポートを作って終了する

## 点検対象領域（1イテレーション = 原則1領域）

1. `scripts/` + `package.json`（Nodeパイプライン）
2. `lp/index.html`（LPの構造・リンク・表記）
3. `concierge/index.html`
4. `wedding/`（index.html, ads/index.html）
5. `mirai-edit/index.html`
6. `vercel.json` 群（ルート + 各ディレクトリ）とデプロイ整合性
7. `data/` inputs/outputs の整合性 + `prompts/`
8. `docs/` + `validation/` + `README.md` の記載整合性
9. 総括（findings の整理・最終レポート・残課題の一覧化）

## 各イテレーションの手順

1. state ファイルを読み、`in_progress` または次の `pending` 領域を選ぶ
2. 対象領域をゼロベースで点検する
   - コード: バグ・エッジケース・仕様（README等）との齟齬
   - HTML: リンク切れ・アセット参照・表記ゆれ・明らかな構造問題
   - 設定: デプロイ設定と実ファイル構成の整合
   - ドキュメント: 実装と記載の食い違い
3. 修正方針:
   - 明確なバグ（挙動が壊れている・出力が明らかに誤り）→ その場で修正しスモークテストで確認
   - 判断が必要なもの（仕様・文言・戦略に関わる）→ 修正せず findings に「要判断」で記録
4. state を更新（領域ステータス・findings 追記・イテレーション番号）
5. `claude/fable5-zero-base-review-2ll6a5` ブランチにコミットして push
6. 次のイテレーションを ScheduleWakeup で予約（全領域完了なら予約せず終了報告）

## 完了条件

- 全領域が `done` になり、総括レポートが state に記録されたらループ終了
