import logging
from urllib.parse import urlparse

from .site_analyzer import CompanyData

logger = logging.getLogger(__name__)

PERSONAL_INDICATORS = [
    "個人事業", "フリーランス", "セラピスト", "ライフコーチ", "ヨガ講師",
    "パーソナルトレーナー", "個人コーチ", "個人講師", "個人サロン",
]

SMALL_EC_INDICATORS = [
    "base.shop", "stores.jp", "minne.com", "creema.com",
]


def is_eligible(
    data: CompanyData,
    existing_urls: set,
    existing_names: set,
    existing_emails: set,
    existing_forms: set,
) -> tuple:
    """
    対象企業かどうか判定し、(is_ok, reason) を返す。
    reason は対象外の場合にその理由を示す。
    """
    # 営業禁止
    if data.has_sales_ban:
        return False, "営業禁止表記あり"

    # 会社概要URLなし
    if data.about_url == "不明":
        return False, "会社概要URLなし"

    # 連絡手段なし
    if data.email == "不明" and data.contact_url == "不明":
        return False, "メールもフォームもなし"

    # 法人格不明かつ個人っぽいキーワード
    if data.corp_type == "不明":
        combined = data.company_name.lower() + data.official_url.lower()
        if any(ind in combined for ind in PERSONAL_INDICATORS):
            return False, "個人事業主の可能性"

    # 小規模EC（BASE/STORESのみ）
    domain = urlparse(data.official_url).netloc.lower()
    if any(ec in domain for ec in SMALL_EC_INDICATORS):
        return False, "BASE/STORESのみの小規模EC"

    # 重複チェック
    if data.official_url in existing_urls:
        return False, "URL重複"
    normalized_name = data.company_name.replace(" ", "").replace("　", "")
    if normalized_name and normalized_name in existing_names:
        return False, "会社名重複"
    if data.email != "不明":
        email_domain = data.email.split("@")[-1] if "@" in data.email else ""
        if email_domain and email_domain in existing_emails:
            return False, "メールドメイン重複"
    if data.contact_url != "不明" and data.contact_url in existing_forms:
        return False, "フォームURL重複"

    return True, ""


def decide_contact_method(data: CompanyData) -> str:
    """推奨連絡手段を決定する"""
    if data.email != "不明":
        return "Email"
    if data.contact_url != "不明":
        return "Form"
    return "不明"
