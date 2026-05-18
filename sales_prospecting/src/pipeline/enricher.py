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
    送信不可・除外対象は「対象外ログ」シートに記録し、最終リストには含めない。
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
    sales_sheet    = sheets_cfg.get("sales_sheet_name", "営業リスト")
    excluded_sheet = sheets_cfg.get("excluded_sheet_name", "対象外ログ")

    existing = sheets.get_existing_data(sales_sheet)
    ex_urls   = existing["urls"]
    ex_names  = existing["names"]
    ex_emails = existing["emails"]
    ex_forms  = existing["forms"]

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

        contact_method, can_send, ng_reason = decide_contact_method(data)
        ok, reason = is_eligible(data, ex_urls, ex_names, ex_emails, ex_forms)
        today = date.today().isoformat()

        if not ok:
            logger.info(f"  対象外: {reason} [{data.company_name}]")
            stats["excluded"] += 1
            sheets.append_excluded_entry({
                "取得日":            today,
                "対象カテゴリ":      item.get("category_name", data.category),
                "検索キーワード":    data.keyword,
                "会社名":            data.company_name,
                "法人格":            data.corp_type,
                "公式サイトURL":    data.official_url,
                "会社概要URL":      data.about_url,
                "公開メールアドレス": data.email,
                "問い合わせフォームURL": data.contact_url,
                "フォーム種別":      data.form_type,
                "推奨連絡手段":      contact_method,
                "除外理由":          reason,
                "エラー詳細":        data.error,
            }, excluded_sheet)
            continue

        # 既存セットに追加（バッチ内重複防止）
        ex_urls.add(data.official_url)
        norm = data.company_name.replace(" ", "").replace("　", "")
        if norm and norm != "不明": ex_names.add(norm)
        if data.email not in ("不明", "") and "@" in data.email:
            ex_emails.add(data.email.split("@")[-1])
        if data.contact_url not in ("不明", ""): ex_forms.add(data.contact_url)

        logger.info(f"  追加: {data.company_name} / {contact_method}")
        stats["added"] += 1

        sheets.append_sales_entry({
            "取得日":            today,
            "対象カテゴリ":      item.get("category_name", data.category),
            "検索キーワード":    data.keyword,
            "会社名":            data.company_name,
            "現在の正式社名":    data.official_name,
            "法人格":            data.corp_type,
            "公式サイトURL":    data.official_url,
            "会社概要URL":      data.about_url,
            "業種":              data.industry,
            "所在地":            data.location,
            "公開メールアドレス": data.email,
            "問い合わせフォームURL": data.contact_url,
            "フォーム種別":      data.form_type,
            "Instagram URL":    data.instagram_url,
            "TikTok URL":       data.tiktok_url,
            "YouTube URL":      data.youtube_url,
            "最新投稿日":        data.latest_sns_date,
            "推奨連絡手段":      contact_method,
            "送信可否":          can_send,
            "NG理由":            ng_reason,
            "送信ステータス":    "収集済み",
        }, sales_sheet)

        time.sleep(scraper_cfg.get("request_delay_seconds", 2))

    logger.info(
        f"enrich完了: 追加={stats['added']}, 対象外={stats['excluded']}, エラー={stats['errors']}"
    )
    return stats
