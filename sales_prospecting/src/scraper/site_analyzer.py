import logging
import re
import time
from dataclasses import dataclass, field
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# 会社概要ページを特定するヒント
ABOUT_HINTS = [
    "会社概要", "企業情報", "運営会社", "運営会社情報", "会社情報",
    "about", "company", "profile", "corporate", "about-us", "aboutus",
]

# 問い合わせページを特定するヒント
CONTACT_HINTS = [
    "お問い合わせ", "問合せ", "お問合せ", "ご連絡",
    "contact", "inquiry", "inquiries", "form", "contact-us", "contactus",
]

# 法人格のパターン
CORP_PATTERNS = [
    "株式会社", "有限会社", "合同会社", "合名会社", "合資会社",
    "一般社団法人", "公益社団法人", "一般財団法人", "公益財団法人",
    "特定非営利活動法人", "NPO法人", "社会福祉法人",
]

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")

# SNS URLパターン
INSTAGRAM_RE = re.compile(r"https?://(?:www\.)?instagram\.com/[^/\s\"'>?#]+", re.I)
TIKTOK_RE    = re.compile(r"https?://(?:www\.)?tiktok\.com/@?[^/\s\"'>?#]+", re.I)
YOUTUBE_RE   = re.compile(r"https?://(?:www\.)?youtube\.com/(?:channel|user|c|@)[^/\s\"'>?#]+", re.I)

# 営業禁止表記のキーワード（config.yamlからも受け取るが、デフォルトをここに定義）
DEFAULT_EXCLUDE_KEYWORDS = [
    "営業メールはお断り", "営業目的のお問い合わせはお断り",
    "営業お断り", "セールス目的はお断り", "営業・勧誘はお断り",
    "営業活動を目的とした", "営業メールお断り",
]


@dataclass
class CompanyData:
    company_name: str = "不明"
    corp_type: str = "不明"
    official_url: str = ""
    about_url: str = "不明"
    contact_url: str = "不明"
    email: str = "不明"
    instagram_url: str = "不明"
    tiktok_url: str = "不明"
    youtube_url: str = "不明"
    location: str = "不明"
    industry: str = "不明"
    has_sales_ban: bool = False
    keyword: str = ""
    category: str = ""
    error: str = ""


def _get_page(url: str, timeout: int = 15, user_agent: str = "") -> BeautifulSoup | None:
    headers = {"User-Agent": user_agent or "Mozilla/5.0 (compatible; SalesProspecting/1.0)"}
    try:
        resp = requests.get(url, headers=headers, timeout=timeout, allow_redirects=True)
        resp.raise_for_status()
        resp.encoding = resp.apparent_encoding or "utf-8"
        return BeautifulSoup(resp.text, "lxml")
    except Exception as e:
        logger.debug(f"ページ取得失敗 [{url}]: {e}")
        return None


def _find_link_by_hints(soup: BeautifulSoup, base_url: str, hints: list[str]) -> str:
    """ヒントテキスト/URL断片に一致するリンクを探す"""
    hint_lower = [h.lower() for h in hints]
    for a in soup.find_all("a", href=True):
        href = a.get("href", "")
        text = a.get_text(strip=True).lower()
        full = urljoin(base_url, href).lower()
        if any(h in text for h in hint_lower) or any(h in full for h in hint_lower):
            return urljoin(base_url, a["href"])
    return "不明"


def _extract_emails(text: str, base_domain: str) -> str:
    emails = EMAIL_RE.findall(text)
    filtered = [e for e in emails if not e.endswith((".png", ".jpg", ".gif", ".svg"))]
    # 自ドメイン優先
    own = [e for e in filtered if base_domain in e]
    return own[0] if own else (filtered[0] if filtered else "不明")


def _extract_company_name(soup: BeautifulSoup) -> str:
    # OGP title -> title -> h1 の順で取得
    og = soup.find("meta", property="og:site_name")
    if og and og.get("content"):
        return og["content"].strip()
    title = soup.title.string.strip() if soup.title and soup.title.string else ""
    if title:
        # 「|」「-」「｜」で区切られていれば最初の部分
        for sep in ["|", "｜", " - ", "　"]:
            if sep in title:
                return title.split(sep)[0].strip()
        return title[:50]
    h1 = soup.find("h1")
    if h1:
        return h1.get_text(strip=True)[:50]
    return "不明"


def _detect_corp_type(text: str) -> str:
    for corp in CORP_PATTERNS:
        if corp in text:
            return corp
    return "不明"


def _extract_location(soup: BeautifulSoup) -> str:
    text = soup.get_text(" ", strip=True)
    patterns = [
        r"(?:所在地|住所|本社)[：: ]+([^\n。]{5,50})",
        r"((?:東京|大阪|名古屋|福岡|横浜|神奈川|愛知|北海道|京都|兵庫).{0,30}(?:丁目|番地|号|ビル|階))",
    ]
    for p in patterns:
        m = re.search(p, text)
        if m:
            return m.group(1).strip()[:80]
    return "不明"


def _check_sales_ban(text: str, exclude_keywords: list[str]) -> bool:
    for kw in exclude_keywords:
        if kw in text:
            return True
    return False


def _extract_sns(html_text: str) -> tuple[str, str, str]:
    ig = INSTAGRAM_RE.search(html_text)
    tt = TIKTOK_RE.search(html_text)
    yt = YOUTUBE_RE.search(html_text)
    return (
        ig.group(0) if ig else "不明",
        tt.group(0) if tt else "不明",
        yt.group(0) if yt else "不明",
    )


def analyze_site(
    url: str,
    keyword: str,
    category: str,
    exclude_keywords: list[str] | None = None,
    delay: float = 2.0,
    timeout: int = 15,
    user_agent: str = "",
) -> CompanyData:
    if exclude_keywords is None:
        exclude_keywords = DEFAULT_EXCLUDE_KEYWORDS

    data = CompanyData(official_url=url, keyword=keyword, category=category)
    domain = urlparse(url).netloc

    soup = _get_page(url, timeout=timeout, user_agent=user_agent)
    if soup is None:
        data.error = "トップページ取得失敗"
        return data

    html_text = str(soup)
    page_text = soup.get_text(" ", strip=True)

    # 基本情報抽出
    data.company_name = _extract_company_name(soup)
    data.corp_type = _detect_corp_type(page_text)
    data.location = _extract_location(soup)
    data.email = _extract_emails(page_text, domain)
    data.instagram_url, data.tiktok_url, data.youtube_url = _extract_sns(html_text)
    data.has_sales_ban = _check_sales_ban(page_text, exclude_keywords)

    # 会社概要URL
    data.about_url = _find_link_by_hints(soup, url, ABOUT_HINTS)

    # 問い合わせURL
    data.contact_url = _find_link_by_hints(soup, url, CONTACT_HINTS)

    # 会社概要ページから追加情報取得
    if data.about_url != "不明" and data.about_url != url:
        time.sleep(delay)
        about_soup = _get_page(data.about_url, timeout=timeout, user_agent=user_agent)
        if about_soup:
            about_text = about_soup.get_text(" ", strip=True)
            about_html = str(about_soup)
            if data.corp_type == "不明":
                data.corp_type = _detect_corp_type(about_text)
            if data.company_name == "不明":
                data.company_name = _extract_company_name(about_soup)
            if data.location == "不明":
                data.location = _extract_location(about_soup)
            if data.email == "不明":
                data.email = _extract_emails(about_text, domain)
            if not data.has_sales_ban:
                data.has_sales_ban = _check_sales_ban(about_text, exclude_keywords)
            if data.instagram_url == "不明":
                ig, tt, yt = _extract_sns(about_html)
                if ig != "不明": data.instagram_url = ig
                if tt != "不明": data.tiktok_url = tt
                if yt != "不明": data.youtube_url = yt

    return data
