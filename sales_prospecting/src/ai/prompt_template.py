SYSTEM_PROMPT = """あなたはSNSマーケティング支援会社の優秀な営業担当者として、
各企業に合わせた高品質な営業文面を生成するアシスタントです。

【自社情報】
社名: RAHA KENYA / 合同会社Asante Sana
担当者: 河野
サービス: SNSマーケティング支援、SNS運用改善、集客導線改善
価格: 月額50万円〜、最低契約期間6か月

実績:
- TikTok / Instagram / YouTubeを中心にSNS運営
- 合計18万人以上のフォロワー
- 公式LINE登録者1.2万人以上
- ケニアを拠点に、日本人向けのSNS発信・宿泊・物販・現地体験などを展開
- 海外に関心のある日本人に対してSNSで信頼形成し、問い合わせ・来訪・購買につなげた実績
- 女性向け商材や世界観のあるブランドのSNS発信にも強み

【文面作成方針】
- 相手企業の業種・現状のSNS発信・ビジネス課題に合わせた具体的な内容にする
- 押しつけがましくなく、相手のビジネスへの深い理解と敬意を示す
- 実績は誇張せず、正確に伝える
- 「いきなり長文の営業メール」ではなく、「共感→実績→提案→打診」の流れにする
- メールの件名は30文字以内、本文は400〜600文字程度に収める"""


def build_user_prompt(info: dict) -> str:
    sns_info = []
    if info.get("instagram_url") not in ("不明", "", None):
        sns_info.append(f"Instagram: {info['instagram_url']}")
    if info.get("tiktok_url") not in ("不明", "", None):
        sns_info.append(f"TikTok: {info['tiktok_url']}")
    if info.get("youtube_url") not in ("不明", "", None):
        sns_info.append(f"YouTube: {info['youtube_url']}")
    sns_text = "\n".join(sns_info) if sns_info else "SNS情報なし"

    return f"""以下の企業情報をもとに、営業文面一式を生成してください。

【企業情報】
会社名: {info.get('official_name') or info.get('company_name', '不明')}
公式サイト: {info.get('official_url', '不明')}
業種: {info.get('industry', '不明')}
対象カテゴリ: {info.get('category_name', '不明')}
所在地: {info.get('location', '不明')}
{sns_text}
最新SNS投稿日: {info.get('latest_sns_date', '要確認')}
フォーム種別: {info.get('form_type', '不明')}
推奨連絡手段: {info.get('contact_method', '不明')}
検索キーワード: {info.get('keyword', '不明')}

以下の全項目をJSON形式で出力してください。キーは英語のまま、値は日本語で。

{{
  "corp_reason": "法人と判断した根拠（1〜2文。法人格の種類、設立年、複数拠点、従業員数など確認できた事実を含める）",
  "budget_reason": "月50万円以上を払える可能性がある理由（2〜3文。売上規模・事業規模・顧客単価・成長性など具体的な根拠を示す）",
  "praise_point": "具体的に褒めるべきポイント（1〜2文。サービスの独自性・実績・SNS発信の良い点など、相手が嬉しいと思う本質的な褒め方をする）",
  "proposal_hypothesis": "提案仮説（2〜3文。この企業が抱えていそうなSNS課題と、弊社サービスで解決できる仮説を具体的に）",
  "sns_improvement": "SNS上の改善余地（2〜3文。現状のSNS発信の弱点・改善できそうなポイントを客観的に分析。SNS情報がない場合は業種からの推測で可）",
  "subject": "営業メールの件名（30文字以内。具体的で開封したくなる件名）",
  "email_body": "営業メール本文（400〜600文字。以下の構成で書く:\\n1. 突然の連絡のお詫び（1文）\\n2. 河野と名乗る（1文）\\n3. 褒めポイントを自然に入れる（2〜3文）\\n4. RAHA KENYAの実績を簡潔に（2〜3文）\\n5. 提案仮説を自然に（2〜3文）\\n6. 30分オンラインで情報交換したいと伝える（1〜2文）\\n7. 丁寧に締める（1〜2文））",
  "form_body": "問い合わせフォーム送信用文面（300〜400文字。メール本文より簡潔に。フォームに入力しやすい形式）"
}}

JSONのみを出力してください。マークダウンのコードブロックや説明文は不要です。"""
