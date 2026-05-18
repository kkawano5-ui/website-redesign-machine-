import logging
from urllib.parse import urlparse

from .site_analyzer import CompanyData, SMALL_EC_DOMAINS, PERSONAL_KEYWORDS

logger = logging.getLogger(__name__)

# 送信可能なフォーム種別
SENDABLE_FORM_TYPES = {"法人問い合わせ", "一般問い合わせ"}

# 連絡手段
CONTACT_EMAIL = "Email"
CONTACT_FORM  = "Form"
CONTACT_NG    = "NG"


def decide_contact_method(data: CompanyData) -> tuple[str, str, str]:
    """
    推奨連絡手段・送信可否・NG理由を返す (method, can_send, ng_reason)
    """
    has_email = data.email not in ("不明", "", None)
    has_usable_form = data.form_type in SENDABLE_FORM_TYPES and data.contact_url not in ("不明", "")

    if has_email:
        return CONTACT_EMAIL, "可", ""

    if has_usable_form:
        return CONTACT_FORM, "可", ""

    # NG理由を詳細に
    if data.contact_url == "不明":
        ng = "問い合わせフォームなし・メールなし"
    elif data.form_type == "採用":
        ng = "採用フォームのみ"
    elif data.form_type == "無料相談":
        ng = "無料相談フォームのみ"
    elif data.form_type == "不適切":
        ng = "フォームが不適切（利用不可）"
    elif data.form_type == "不明":
        ng = "フォーム種別が不明"
    else:
        ng = "連絡手段なし"

    return CONTACT_NG, "不可", ng


def is_eligible(
    data: CompanyData,
    existing_urls: set,
    existing_names: set,
    existing_emails: set,
    existing_forms: set,
) -> tuple:
    """
    最終リストに追加すべき企業かを判定し (is_ok, reason) を返す。
    """
    # 営業禁止
    if data.has_sales_ban:
        return False, "営業禁止表記あり"

    # 会社概要URLなし
    if data.about_url == "不明":
        return False, "会社概要URLなし"

    # 公式サイト取得失敗
    if data.error:
        return False, f"サイト取得エラー: {data.error}"

    # 小規模EC
    domain = urlparse(data.official_url).netloc.lower()
    if any(ec in domain for ec in SMALL_EC_DOMAINS):
        return False, "BASE/STORESのみの小規模EC"

    # 個人っぽいキーワード
    if data.corp_type == "不明":
        combined = (data.company_name + " " + data.official_url).lower()
        if any(kw in combined for kw in PERSONAL_KEYWORDS):
            return False, "個人事業主の可能性（法人格未確認）"

    # 送信可否判定
    _, can_send, ng_reason = decide_contact_method(data)
    if can_send == "不可":
        return False, f"送信不可: {ng_reason}"

    # 重複チェック
    if data.official_url and data.official_url in existing_urls:
        return False, "URL重複（既存リスト）"

    norm_name = data.company_name.replace(" ", "").replace("　", "")
    if norm_name and norm_name != "不明" and norm_name in existing_names:
        return False, "会社名重複（既存リスト）"

    if data.email not in ("不明", ""):
        email_domain = data.email.split("@")[-1]
        if email_domain in existing_emails:
            return False, "メールドメイン重複（既存リスト）"

    if data.contact_url not in ("不明", "") and data.contact_url in existing_forms:
        return False, "フォームURL重複（既存リスト）"

    return True, ""
