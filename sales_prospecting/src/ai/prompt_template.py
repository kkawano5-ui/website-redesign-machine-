SYSTEM_PROMPT = """あなたはSNSマーケティング支援会社の営業担当者として、
各企業に合わせた高品質な営業文面を生成するアシスタントです。

【自社情報】
- 社名: RAHA KENYA / 合同会社Asante Sana
- 担当者: 河野
- サービス: SNSマーケティング支援、SNS運用改善、集客導線改善
- 価格: 月額50万円～、最低契約期間6か月
- 実績:
  - TikTok / Instagram / YouTubeを中心にSNS運営
  - 合計18万人以上のフォロワー
  - 公式LINE登録者1.2万人以上
  - ケニアを拠点に、日本人向けのSNS発信・宿泊・物販・現地体験などを展開
  - 海外に関心のある日本人に対してSNSで信頼形成し、問い合わせ・来訪・購買につなげた実績
  - 女性向け商材や世界観のあるブランドのSNS発信にも強み

文面は自然な日本語で、押しつけがましくなく、相手のビジネスへの敬意を示しながら、
具体的な価値提案を盛り込んでください。"""


def build_user_prompt(info: dict) -> str:
    return f"""以下の企業情報をもとに、営業文面を生成してください。

【企業情報】
- 会社名: {info.get('company_name', '不明')}
- 公式サイト: {info.get('official_url', '不明')}
- 業種: {info.get('industry', '不明')}
- 対象カテゴリ: {info.get('category_name', '不明')}
- 所在地: {info.get('location', '不明')}
- Instagram: {info.get('instagram_url', '不明')}
- TikTok: {info.get('tiktok_url', '不明')}
- YouTube: {info.get('youtube_url', '不明')}
- メールアドレス: {info.get('email', '不明')}
- 問い合わせフォーム: {info.get('contact_url', '不明')}
- 検索キーワード: {info.get('keyword', '不明')}

以下の項目をJSON形式で出力してください。
キーは英語、値は日本語でお願いします。

{{
  "corp_reason": "法人と判断した根拠（1〜2文）",
  "budget_reason": "月50万円以上を払える可能性がある理由（2〜3文）",
  "praise_point": "具体的に褒めるべきポイント（相手のビジネスや発信の良い点を1〜2文）",
  "proposal_hypothesis": "提案仮説（弊社サービスでどう貢献できるか、2〜3文）",
  "subject": "営業メールの件名（30文字以内）",
  "email_body": "営業メール本文（以下の構成で）:\\n1. 突然の連絡のお詫び\\n2. 河野と名乗る\\n3. 褒めポイントを自然に\\n4. RAHA KENYAの実績を簡潔に\\n5. 提案仮説を自然に\\n6. 30分オンラインで情報交換したいと伝える\\n7. 丁寧に締める",
  "form_body": "問い合わせフォーム送信用文面（メール本文より簡潔に、500文字以内）"
}}

JSONのみを出力してください。マークダウンのコードブロックは不要です。"""
