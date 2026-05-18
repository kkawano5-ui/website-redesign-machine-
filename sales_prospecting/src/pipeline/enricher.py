import json
import logging
import time
from datetime import date
from pathlib import Path

from ..config import load_config
from ..scraper.site_analyzer import analyze_site
from ..scraper.eligibility import is_eligible, decide_contact_method
from ..sheets.client import SheetsClient

logger = logging.getLogger(__name__)

PENDING_FILE = Path("logs/pending_urls.json")


def load_pending() -> list[dict]:
    if PENDING_FILE.exists():
        with open(PENDING_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_pending(items: list[dict]) -> None:
    PENDING_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(PENDING_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)


def enrich(
    url_items: list[dict] | None = None,
    config_path: str | None = None,
) -> dict:
    """
    URL一覧をサイト解析してGoogle Sheetsに保存する。
    url_items が None の場合は logs/pending_urls.json を読み込む。
    戻り値: {"added": int, "excluded": int, "errors": int}
    """
    config = load_config(config_path)
    sheets_cfg = config.get("google_sheets", {})
    scraper_cfg = config.get("scraper", {})
    exclude_keywords = config.get("excluded_keywords", [])

    if url_items is None:
        url_items = load_pending()
        if not url_items:
            logger.warning("pending_urls.json が空です。先に collect を実行してください。")
            return {"added": 0, "excluded": 0, "errors": 0}

    sheets = SheetsClient(
        spreadsheet_id=sheets_cfg["spreadsheet_id"],
        credentials_dir="credentials",
    )
    sales_sheet = sheets_cfg.get("sales_sheet_name", "営業リスト")
    excluded_sheet = sheets_cfg.get("excluded_sheet_name", "対象外ログ")

    # 既存データ取得
    existing = sheets.get_existing_data(sales_sheet)
    ex_urls = existing["urls"]
    ex_names = existing["names"]
    ex_emails = existing["emails"]
    ex_forms = existing["forms"]

    stats = {"added": 0, "excluded": 0, "errors": 0}

    for item in url_items:
        url = item.get("url", "")
        if not url:
            continue

        logger.info(f"解析中: {url}")
        try:
            data = analyze_site(
                url=url,
                keyword=item.get("keyword", ""),
                category=item.get("category", ""),
                exclude_keywords=exclude_keywords,
                delay=scraper_cfg.get("request_delay_seconds", 2),
                timeout=scraper_cfg.get("timeout_seconds", 15),
                user_agent=scraper_cfg.get("user_agent", ""),
            )
        except Exception as e:
            logger.error(f"解析エラー [{url}]: {e}")
            stats["errors"] += 1
            continue

        ok, reason = is_eligible(data, ex_urls, ex_names, ex_emails, ex_forms)
        today = date.today().isoformat()

        if not ok:
            logger.info(f"  対象外: {reason} [{data.company_name}]")
            stats["excluded"] += 1
            sheets.append_excluded_entry({
                "取得日": today,
                "対象カテゴリ": item.get("category_name", data.category),
                "検索キーワード": data.keyword,
                "会社名": data.company_name,
                "法人格": data.corp_type,
                "公式サイトURL": data.official_url,
                "会社概要URL": data.about_url,
                "公開メールアドレス": data.email,
                "問い合わせフォームURL": data.contact_url,
                "除外理由": reason,
                "エラー詳細": data.error,
            }, excluded_sheet)
            continue

        # 既存セットに追加（同一バッチ内での重複防止）
        ex_urls.add(data.official_url)
        name_key = data.company_name.replace(" ", "").replace("　", "")
        if name_key:
            ex_names.add(name_key)
        if data.email != "不明" and "@" in data.email:
            ex_emails.add(data.email.split("@")[-1])
        if data.contact_url != "不明":
            ex_forms.add(data.contact_url)

        contact_method = decide_contact_method(data)
        logger.info(f"  追加: {data.company_name} ({contact_method})")
        stats["added"] += 1

        sheets.append_sales_entry({
            "取得日": today,
            "対象カテゴリ": item.get("category_name", data.category),
            "検索キーワード": data.keyword,
            "会社名": data.company_name,
            "法人格": data.corp_type,
            "公式サイトURL": data.official_url,
            "会社概要URL": data.about_url,
            "業種": data.industry,
            "所在地": data.location,
            "公開メールアドレス": data.email,
            "問い合わせフォームURL": data.contact_url,
            "Instagram URL": data.instagram_url,
            "TikTok URL": data.tiktok_url,
            "YouTube URL": data.youtube_url,
            "推奨連絡手段": contact_method,
            "ステータス": "収集済み",
        }, sales_sheet)

        time.sleep(scraper_cfg.get("request_delay_seconds", 2))

    logger.info(f"enrich完了: 追加={stats['added']}, 対象外={stats['excluded']}, エラー={stats['errors']}")
    return stats
