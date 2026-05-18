import logging
import re
import time
from dataclasses import dataclass, field
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# ============================================================
# ヒントワード定義
# ============================================================
ABOUT_HINTS = [
    "会社概要", "企業情報", "運営会社", "運営会社情報", "会社情報", "企業概要",
    "about", "company", "profile", "corporate", "about-us", "aboutus",
]

CONTACT_HINTS = [
    "お問い合わせ", "問合せ", "お問合せ", "ご連絡", "ご相談",
    "contact", "inquiry", "inquiries", "form", "contact-us", "contactus",
]

# フォーム種別判定キーワード（優先度順）
FORM_TYPE_RULES = [
    # 採用フォームを最優先で除外
    ("採用", [
        "採用", "求人", "採用エントリー", "採用担当", "新卒", "中途採用",
        "recruit", "career", "careers", "job", "jobs", "apply", "entry",
    ]),
    # 無料相談フォーム
    ("無料相談", [
        "無料相談", "無料カウンセリング", "無料体験", "無料セミナー",
        "無料診断", "お試し", "free consultation", "free trial",
    ]),
    # 法人向け問い合わせ
    ("法人問い合わせ", [
        "法人", "企業向け", "ビジネス向け", "法人のお客様", "法人のお問い合わせ",
        "business", "corporate", "b2b", "企業担当", "法人契約",
    ]),
    # 一般問い合わせ（最後）
    ("一般問い合わせ", [
        "お問い合わせ", "問合せ", "お問合せ",
        "contact", "inquiry", "inquiries",
    ]),
]

CORP_PATTERNS = [
    "株式会社", "有限会社", "合同会社", "合名会社", "合資会社",
    "一般社団法人", "公益社団法人", "一般財団法人", "公益財団法人",
    "特定非営利活動法人", "NPO法人", "社会福祉法人",
]

EMAIL_RE      = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
INSTAGRAM_RE  = re.compile(r"https?://(?:www\.)?instagram\.com/(?!p/|reel/|explore/|accounts/)[^/\s\"'>?#]{2,}", re.I)
TIKTOK_RE     = re.compile(r"https?://(?:www\.)?tiktok\.com/@[^/\s\"'>?#]+", re.I)
YOUTUBE_RE    = re.compile(r"https?://(?:www\.)?youtube\.com/(?:channel|user|c|@)[^/\s\"'>?#]+", re.I)

DEFAULT_EXCLUDE_KEYWORDS = [
    "営業メールはお断り", "営業目的のお問い合わせはお断り",
    "営業お断り", "セールス目的はお断り", "営業・勧誘はお断り",
    "営業活動を目的とした", "営業メールお断り", "営業はお断り",
    "当フォームからの営業", "セールス・営業目的のお問合せ",
]

# メールアドレス推測を防ぐため、一般的なキャッチオールを除外
GENERIC_EMAIL_PREFIXES_ALLOWED = {
    "info", "contact", "hello", "mail", "support", "inquiry", "office",
    "admin", "sales", "pr", "marketing", "press", "cs", "service",
}

SMALL_EC_DOMAINS = [
    "base.shop", "base.ec", "stores.jp", "minne.com", "creema.com",
    "suzuri.jp", "booth.pm",
]

PERSONAL_KEYWORDS = [
    "個人事業", "フリーランス", "セラピスト", "ライフコーチ", "ヨガ講師",
    "パーソナルトレーナー", "個人コーチ", "個人講師",
]


# ============================================================
# データクラス
# ============================================================
@dataclass
class CompanyData:
    company_name: str = "不明"         # 取得した会社名
    official_name: str = "不明"        # 正式社名（会社概要ページから確認）
    corp_type: str = "不明"
    official_url: str = ""
    about_url: str = "不明"
    contact_url: str = "不明"
    form_type: str = "不明"            # 法人問い合わせ/一般問い合わせ/無料相談/採用/不適切
    email: str = "不明"
    instagram_url: str = "不明"
    tiktok_url: str = "不明"
    youtube_url: str = "不明"
    latest_sns_date: str = "要確認"    # 最新投稿日
    location: str = "不明"
    industry: str = "不明"
    has_sales_ban: bool = False
    keyword: str = ""
    category: str = ""
    error: str = ""


# ============================================================
# ユーティリティ
# ============================================================
def _get_page(url: str, timeout: int = 15, user_agent: str = "") -> BeautifulSoup | None:
    headers = {
        "User-Agent": user_agent or "Mozilla/5.0 (compatible; SalesProspecting/1.0)",
        "Accept-Language": "ja,en;q=0.9",
    }
    try:
        resp = requests.get(url, headers=headers, timeout=timeout,
                            allow_redirects=True, stream=False)
        resp.raise_for_status()
        resp.encoding = resp.apparent_encoding or "utf-8"
        return BeautifulSoup(resp.text, "lxml")
    except Exception as e:
        logger.debug(f"ページ取得失敗 [{url}]: {e}")
        return None


def _find_link_by_hints(soup: BeautifulSoup, base_url: str, hints: list[str]) -> str:
    hint_lower = [h.lower() for h in hints]
    for a in soup.find_all("a", href=True):
        href = a.get("href", "").strip()
        if not href or href.startswith("javascript") or href.startswith("mailto"):
            continue
        text = a.get_text(strip=True).lower()
        full = urljoin(base_url, href).lower()
        if any(h in text for h in hint_lower) or any(h in full for h in hint_lower):
            return urljoin(base_url, a["href"])
    return "不明"


def _extract_emails(text: str, base_domain: str) -> str:
    """
    公式サイト本文から公開メールアドレスを抽出する。
    推測は禁止 — ページ上に明示されているものだけ返す。
    """
    raw = EMAIL_RE.findall(text)
    # 画像拡張子などのフォールス陽性を除外
    filtered = [
        e for e in raw
        if not any(e.lower().endswith(ext) for ext in (".png", ".jpg", ".gif", ".svg", ".webp"))
        and "sentry" not in e
        and "example" not in e
        and "your" not in e
    ]
    # 自ドメインのアドレスを優先
    own = [e for e in filtered if base_domain in e.split("@")[-1]]
    return own[0] if own else (filtered[0] if filtered else "不明")


def _classify_form_type(url: str, soup: BeautifulSoup | None) -> str:
    """フォームページの内容からフォーム種別を判定する"""
    if not soup:
        return "不明"

    url_lower = url.lower()
    text_lower = soup.get_text(" ", strip=True).lower()
    page_title = soup.title.string.lower() if soup.title and soup.title.string else ""

    combined = url_lower + " " + page_title + " " + text_lower[:3000]

    for form_type, keywords in FORM_TYPE_RULES:
        if any(kw.lower() in combined for kw in keywords):
            return form_type

    # フォームタグがそもそもなければ不適切
    if not soup.find("form"):
        return "不適切"

    return "不明"


def _extract_company_name(soup: BeautifulSoup) -> str:
    og = soup.find("meta", property="og:site_name")
    if og and og.get("content"):
        return og["content"].strip()
    title = soup.title.string.strip() if soup.title and soup.title.string else ""
    if title:
        for sep in ["|", "｜", " - ", "　-　", "　|　"]:
            if sep in title:
                return title.split(sep)[0].strip()
        return title[:60]
    h1 = soup.find("h1")
    return h1.get_text(strip=True)[:60] if h1 else "不明"


def _extract_official_name(soup: BeautifulSoup, page_text: str) -> str:
    """会社概要ページから正式社名を抽出する（法人格を含む）"""
    # 構造化データ（表形式）から「商号」「会社名」を探す
    patterns = [
        r"(?:商号|正式名称|法人名|会社名|社名)[：:\s]+([^\n\r]{3,60}(?:会社|社団|財団|法人|組合))",
        r"((?:株式会社|有限会社|合同会社|合名会社|合資会社|一般社団法人|公益社団法人|"
        r"一般財団法人|特定非営利活動法人|NPO法人)[^\s　\n\r]{1,40})",
    ]
    for p in patterns:
        m = re.search(p, page_text)
        if m:
            return m.group(1).strip()
    return "不明"


def _detect_corp_type(text: str) -> str:
    for corp in CORP_PATTERNS:
        if corp in text:
            return corp
    return "不明"


def _extract_location(soup: BeautifulSoup) -> str:
    text = soup.get_text(" ", strip=True)
    patterns = [
        r"(?:所在地|住所|本社所在地|本社)[：:\s]+([^\n。]{5,80})",
        r"((?:東京|大阪|名古屋|福岡|横浜|神奈川|愛知|北海道|京都|兵庫|"
        r"埼玉|千葉|宮城|広島|静岡|新潟).{0,40}(?:丁目|番地|号|ビル|階|棟))",
    ]
    for p in patterns:
        m = re.search(p, text)
        if m:
            return m.group(1).strip()[:100]
    return "不明"


def _extract_industry(soup: BeautifulSoup, page_text: str) -> str:
    patterns = [
        r"(?:事業内容|業種|業態|主な事業)[：:\s]+([^\n]{5,80})",
    ]
    for p in patterns:
        m = re.search(p, page_text)
        if m:
            return m.group(1).strip()[:100]
    return "不明"


def _extract_sns(html_text: str) -> tuple[str, str, str]:
    ig = INSTAGRAM_RE.search(html_text)
    tt = TIKTOK_RE.search(html_text)
    yt = YOUTUBE_RE.search(html_text)
    ig_url = ig.group(0).rstrip("/") if ig else "不明"
    tt_url = tt.group(0).rstrip("/") if tt else "不明"
    yt_url = yt.group(0).rstrip("/") if yt else "不明"
    return ig_url, tt_url, yt_url


def _try_get_latest_sns_date(soup: BeautifulSoup, html_text: str) -> str:
    """
    最新SNS投稿日を試みる。公式サイトの埋め込みウィジェットやOGPから取得を試みるが、
    取得できない場合は「要確認」を返す。
    """
    # OGP updated_time
    og_time = soup.find("meta", property="og:updated_time") or \
              soup.find("meta", property="article:modified_time")
    if og_time and og_time.get("content"):
        return og_time["content"][:10]  # YYYY-MM-DD

    # schema.org dateModified
    m = re.search(r'"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})', html_text)
    if m:
        return m.group(1)

    return "要確認"


def _check_sales_ban(text: str, exclude_keywords: list[str]) -> bool:
    for kw in exclude_keywords:
        if kw in text:
            return True
    return False


# ============================================================
# メイン解析関数
# ============================================================
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
    domain = urlparse(url).netloc.lower().replace("www.", "")

    # ---- トップページ取得 ----
    soup = _get_page(url, timeout=timeout, user_agent=user_agent)
    if soup is None:
        data.error = "トップページ取得失敗"
        return data

    html_text = str(soup)
    page_text = soup.get_text(" ", strip=True)

    data.company_name = _extract_company_name(soup)
    data.corp_type    = _detect_corp_type(page_text)
    data.location     = _extract_location(soup)
    data.email        = _extract_emails(page_text, domain)
    data.instagram_url, data.tiktok_url, data.youtube_url = _extract_sns(html_text)
    data.latest_sns_date = _try_get_latest_sns_date(soup, html_text)
    data.has_sales_ban = _check_sales_ban(page_text, exclude_keywords)
    data.about_url    = _find_link_by_hints(soup, url, ABOUT_HINTS)
    data.contact_url  = _find_link_by_hints(soup, url, CONTACT_HINTS)

    # ---- 会社概要ページから正式社名・追加情報取得 ----
    if data.about_url not in ("不明", url):
        time.sleep(delay)
        about_soup = _get_page(data.about_url, timeout=timeout, user_agent=user_agent)
        if about_soup:
            about_text = about_soup.get_text(" ", strip=True)
            about_html = str(about_soup)
            data.official_name = _extract_official_name(about_soup, about_text)
            if data.corp_type == "不明":
                data.corp_type = _detect_corp_type(about_text)
            if data.company_name == "不明":
                data.company_name = _extract_company_name(about_soup)
            if data.location == "不明":
                data.location = _extract_location(about_soup)
            if data.industry == "不明":
                data.industry = _extract_industry(about_soup, about_text)
            if data.email == "不明":
                data.email = _extract_emails(about_text, domain)
            if not data.has_sales_ban:
                data.has_sales_ban = _check_sales_ban(about_text, exclude_keywords)
            # SNS URLが未取得なら補完
            ig, tt, yt = _extract_sns(about_html)
            if data.instagram_url == "不明" and ig != "不明": data.instagram_url = ig
            if data.tiktok_url    == "不明" and tt != "不明": data.tiktok_url    = tt
            if data.youtube_url   == "不明" and yt != "不明": data.youtube_url   = yt

    # official_name が取得できなければ company_name で代替
    if data.official_name == "不明" and data.company_name != "不明":
        data.official_name = data.company_name

    # ---- 問い合わせページのフォーム種別判定 ----
    if data.contact_url not in ("不明", url):
        time.sleep(delay)
        contact_soup = _get_page(data.contact_url, timeout=timeout, user_agent=user_agent)
        data.form_type = _classify_form_type(data.contact_url, contact_soup)
        if contact_soup:
            contact_text = contact_soup.get_text(" ", strip=True)
            if not data.has_sales_ban:
                data.has_sales_ban = _check_sales_ban(contact_text, exclude_keywords)
            if data.email == "不明":
                data.email = _extract_emails(contact_text, domain)
    elif data.contact_url == url:
        # トップページがそのまま問い合わせページの場合
        data.form_type = _classify_form_type(url, soup)

    return data
