# -*- coding: utf-8 -*-
"""業種プロファイル：Googleのカテゴリ → テーマ語・検索KW・薬機法フラグ。
新しい業種はここに1ブロック足すだけで対応できる（コード改修不要の思想）。"""

# Googleビジネスプロフィール(Places API)の primaryType / types → 内部業種キー
GOOGLE_TYPE_MAP = {
    "real_estate_agency": "real_estate",
    "beauty_salon": "beauty",
    "hair_salon": "beauty",
    "hair_care": "beauty",
    "nail_salon": "nail",
    "spa": "esthetic",
    "skin_care_clinic": "esthetic",
    "massage": "seikotsu",
    "physiotherapist": "seikotsu",
    "chiropractor": "seikotsu",
    "dental_clinic": "clinic",
    "dentist": "clinic",
    "doctor": "clinic",
    "lawyer": "legal",
    "accounting": "legal",
    "restaurant": "restaurant",
    "cafe": "restaurant",
}

# 業種プロファイル
#  label       : 診断・KWで使う業種名
#  themes      : 提案テーマ語（スライド8/9・診断に反映）
#  yakkihou    : 薬機法・医療広告の注意が要る業種か（表現を保守的に）
#  keywords()  : 検索KW6個＋タイトル横の例文line2 を組み立てる
PROFILES = {
    "real_estate": {
        "label": "不動産会社",
        "themes": ["売却", "買取", "相続", "リノベ", "借地権"],
        "yakkihou": False,
        "chips": lambda a1, a2: [
            f"近くの不動産会社", f"{a1} 不動産売却", f"{a1} マンション売却",
            "相続不動産 相談", f"{a2} 不動産買取", f"借地権 相談 {a2}",
        ],
        "line2": lambda a1, a2: f"{a2} 相続不動産",
    },
    "beauty": {
        "label": "美容室",
        "themes": ["カット", "カラー", "縮毛矯正", "トリートメント", "ヘッドスパ"],
        "yakkihou": False,
        "chips": lambda a1, a2: [
            "近くの美容室", f"{a1} 美容室", f"{a1} カット",
            f"{a1} 縮毛矯正", f"{a1} 白髪染め", f"{a1} ヘッドスパ",
        ],
        "line2": lambda a1, a2: f"{a1} カラー 上手い",
    },
    "nail": {
        "label": "ネイルサロン",
        "themes": ["ジェルネイル", "フット", "ケア", "アート", "付け替え"],
        "yakkihou": False,
        "chips": lambda a1, a2: [
            "近くのネイルサロン", f"{a1} ネイル", f"{a1} ジェルネイル",
            f"{a1} フットネイル", f"{a1} ネイル 安い", f"{a1} ネイルサロン 人気",
        ],
        "line2": lambda a1, a2: f"{a1} ネイル デザイン",
    },
    "esthetic": {
        "label": "エステサロン",
        "themes": ["フェイシャル", "ボディケア", "毛穴ケア", "リラクゼーション", "ブライダル"],
        "yakkihou": True,
        "chips": lambda a1, a2: [
            "近くのエステサロン", f"{a1} エステ", f"{a1} フェイシャル",
            f"{a1} 毛穴ケア", f"{a1} エステ 体験", f"{a1} リラクゼーション",
        ],
        "line2": lambda a1, a2: f"{a1} エステ 人気",
    },
    "seikotsu": {
        "label": "整骨院・接骨院",
        "themes": ["骨盤ケア", "産後ケア", "スポーツケア", "姿勢", "交通事故対応"],
        "yakkihou": True,  # あはき法・柔整法：効能標榜NG。テーマは"来店動機"に留める
        "chips": lambda a1, a2: [
            "近くの整骨院", f"{a1} 整骨院", f"{a1} 接骨院",
            f"{a1} 骨盤矯正", f"{a1} 産後骨盤", f"{a1} 交通事故",
        ],
        "line2": lambda a1, a2: f"{a1} 整体",
    },
    "clinic": {
        "label": "クリニック",
        "themes": ["予防", "検診", "ホワイトニング", "小児対応", "土日診療"],
        "yakkihou": True,  # 医療広告ガイドライン：体験談・ビフォーアフター・誇大NG
        "chips": lambda a1, a2: [
            "近くのクリニック", f"{a1} 歯医者", f"{a1} 歯科",
            f"{a1} ホワイトニング", f"{a1} 小児歯科", f"{a1} 土日診療",
        ],
        "line2": lambda a1, a2: f"{a1} 歯科 口コミ",
    },
    "legal": {
        "label": "士業事務所",
        "themes": ["相続", "遺言", "登記", "会社設立", "確定申告"],
        "yakkihou": False,  # 品位保持・成果保証NG
        "chips": lambda a1, a2: [
            "近くの司法書士", f"{a1} 相続 相談", f"{a1} 遺言",
            f"{a1} 会社設立", f"{a1} 登記", f"{a1} 税理士",
        ],
        "line2": lambda a1, a2: f"{a2} 相続 相談",
    },
    "restaurant": {
        "label": "飲食店",
        "themes": ["ランチ", "ディナー", "個室", "宴会", "テイクアウト"],
        "yakkihou": False,
        "chips": lambda a1, a2: [
            "近くのレストラン", f"{a1} ランチ", f"{a1} ディナー",
            f"{a1} 個室", f"{a1} 居酒屋", f"{a1} テイクアウト",
        ],
        "line2": lambda a1, a2: f"{a1} 食事 おすすめ",
    },
    # フォールバック（未知の業種）
    "general": {
        "label": "店舗",
        "themes": ["サービス紹介", "お客様の声", "季節のご案内", "アクセス", "ご予約"],
        "yakkihou": False,
        "chips": lambda a1, a2: [
            f"近くの{a1}", f"{a1} おすすめ", f"{a1} 人気",
            f"{a1} 口コミ", f"{a1} 予約", f"{a1} 営業時間",
        ],
        "line2": lambda a1, a2: f"{a1} 評判",
    },
}


def resolve_industry(google_types):
    """Places APIのtypes配列 → 内部業種キー。最初にマッチしたものを採用。"""
    for t in google_types or []:
        if t in GOOGLE_TYPE_MAP:
            return GOOGLE_TYPE_MAP[t]
    return "general"


def get_profile(industry_key):
    return PROFILES.get(industry_key, PROFILES["general"])
