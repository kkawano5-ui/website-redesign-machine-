あなたはWeb制作会社のリサーチ担当です。

以下の企業Webサイトを調査し、Webサイトリニューアル提案用の情報を整理してください。

対象URL：
{{url}}

目的：
営業時に見せる「新しいWebサイトのデモ」を作るために、既存サイトの内容、強み、課題、新サイトで訴求すべきポイントを整理します。

出力はJSONでお願いします。このJSONはそのまま `data/inputs/*.json` に保存し、
`npm run run:one` の入力として使います（項目名・型はREADMEの「ManusリサーチJSON仕様」と同一）。

{
  "companySlug": "",
  "companyName": "",
  "industry": "",
  "website": "",
  "companyOverview": [],
  "currentSiteIssues": [],
  "targetCustomers": [],
  "siteConcept": [],
  "recommendedPages": [],
  "firstViewIdeas": [],
  "ctaIdeas": [],
  "designTone": [],
  "avoidExpressions": [],
  "buildInstruction": []
}

項目の説明：
- companySlug（任意）: 出力ファイル名に使う英数字slug（例: "yamada-komuten"）
- companyName（必須）: 会社名
- industry（任意）: 業種（例: 墓石・霊園 / 病院 / 士業 / 製造業 / 介護 / 工務店）
- website（必須）: 既存サイトURL
- companyOverview（必須）: 会社概要（事実ベース）
- currentSiteIssues（必須）: 既存サイトの課題（デザイン・UX・CTA含む）
- targetCustomers（必須）: 想定ターゲット
- siteConcept（必須）: 新サイトのコンセプト・ポジショニング提案
- recommendedPages（必須）: 推奨ページ構成（業種に合わせた具体名で）
- firstViewIdeas（必須）: ファーストビュー訴求案
- ctaIdeas（必須）: CTA案（見学予約・資料請求など具体的に）
- designTone（必須）: デザイントーン・配色方針
- avoidExpressions（任意）: 避ける表現・法務/業界特有のNG表現
- buildInstruction（必須）: 生成AI向けの制作指示・特記事項

注意：
- 既存サイトの文章をそのままコピーしない
- 事実と推測を分ける（推測に基づく内容は「〜と想定」と明記する）
- 不明なことは不明と書き、断定しない（不確かな訴求は avoidExpressions に注意として残す）
- 地方中小企業向けに、信頼感のある現実的な提案にする
