# -*- coding: utf-8 -*-
"""現状診断エンジン：店舗データ（Places API等）→ 診断8行。
Places APIで取れる項目はデータで判定し、取れない項目（口コミ返信率・投稿）は
見込み客の実態に即した既定値にする。改善ポイントは業種テーマを織り込む。"""

from industries import get_profile


def diagnose(store, industry_key):
    """store: dict(name, rating, review_count, photo_count, has_website,
                    has_hours, has_phone) → 8行の (項目, 現状, 評価, 改善ポイント)"""
    prof = get_profile(industry_key)
    themes = "・".join(prof["themes"])
    rc = store.get("review_count", 0) or 0
    pc = store.get("photo_count", 0) or 0

    rows = []

    # 1) 基本情報
    if store.get("has_hours") and store.get("has_phone"):
        rows.append(("基本情報", "登録済み", "整理余地あり",
                     "強みが伝わる形に整理。営業時間・定休日・属性を正確に設定"))
    else:
        rows.append(("基本情報", "情報が不足", "要整備",
                     "営業時間・電話・属性など基本情報を整備し、判断材料をそろえる"))

    # 2) サービス内容
    rows.append(("サービス内容", "認識できる", "要強化",
                 f"{themes}など対応領域を明確化し、来店動機に一致させる"))

    # 3) 写真
    if pc >= 15:
        rows.append(("写真", f"掲載あり（{pc}枚）", "質を維持",
                     "カテゴリ配分を整え、スタッフ・事例・雰囲気で信頼感を継続"))
    elif pc >= 5:
        rows.append(("写真", f"掲載あり（{pc}枚）", "内容を強化",
                     "外観・内観・スタッフ・事例をカテゴリ別に追加し受け皿を厚く"))
    else:
        rows.append(("写真", f"少ない（{pc}枚）", "要追加",
                     "比較で外れる要因。外観・内観・スタッフ・事例を計画的に追加"))

    # 4) 口コミ
    rating = store.get("rating")
    rtxt = f"★{rating}／{rc}件" if rating else f"{rc}件"
    if rc == 0:
        rows.append(("口コミ", "なし", "要獲得",
                     "正当な口コミ獲得導線（QR・声かけ）を設計し、資産を積み上げる"))
    elif rc <= 10:
        rows.append(("口コミ", f"少ない（{rtxt}）", "要獲得強化",
                     "全客均一の依頼導線で件数を増やし、比較時の安心材料にする"))
    else:
        rows.append(("口コミ", f"一定数あり（{rtxt}）", "内容を強化",
                     "テーマが伝わる口コミを増やし、返信で接客として機能させる"))

    # 5) 口コミ返信（Places APIでは取りにくい→既定値）
    rows.append(("口コミ返信", "未整備の可能性", "要整備",
                 "全口コミに丁寧に返信。未来の見込み客への接客として整える"))

    # 6) 投稿（Places API外→既定値）
    rows.append(("投稿", "改善余地あり", "要運用",
                 "月4回投稿で「活動している会社」と専門性を継続発信"))

    # 7) 競合比較
    rows.append(("競合比較", "比較対象になっている", "差別化余地あり",
                 "写真・口コミ・投稿・説明を整備し、並んだとき選ばれる状態へ"))

    # 8) 問い合わせ導線
    if store.get("has_phone") and store.get("has_website"):
        rows.append(("問い合わせ導線", "設定済み", "基本OK",
                     "電話・ルート検索・サイト導線を確認しハードルを下げる"))
    else:
        rows.append(("問い合わせ導線", "一部のみ", "要整備",
                     "電話・ルート検索・問い合わせ導線を整え、行動につなげる"))

    return rows
