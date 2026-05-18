import logging
from datetime import datetime

from ..config import load_config
from ..sheets.client import SheetsClient
from ..gmail.draft import GmailDraftClient

logger = logging.getLogger(__name__)

TARGET_STATUS = "文面生成済み"
DRAFT_STATUS  = "Gmail下書き作成済み"


def create_gmail_drafts(config_path: str | None = None) -> dict:
    """
    Google Sheetsの「文面生成済み」かつメールアドレスあり、
    推奨連絡手段がEmailの行にGmail下書きを作成する。
    戻り値: {"created": int, "skipped": int, "errors": int}
    """
    config = load_config(config_path)
    sheets_cfg = config.get("google_sheets", {})
    gmail_cfg   = config.get("gmail", {})
    sales_sheet = sheets_cfg.get("sales_sheet_name", "営業リスト")

    if not gmail_cfg.get("enabled", True):
        logger.info("Gmail下書き作成が無効化されています（config.yaml: gmail.enabled=false）")
        return {"created": 0, "skipped": 0, "errors": 0}

    sheets = SheetsClient(
        spreadsheet_id=sheets_cfg["spreadsheet_id"],
        credentials_dir="credentials",
    )
    gmail = GmailDraftClient(
        credentials_dir="credentials",
        from_name=gmail_cfg.get("from_name", ""),
    )

    rows = sheets.get_all_rows(sales_sheet)
    if not rows:
        logger.warning("営業リストシートが空です")
        return {"created": 0, "skipped": 0, "errors": 0}

    header = rows[0]
    col_map = {h: i for i, h in enumerate(header)}

    def cell(row, col):
        i = col_map.get(col, -1)
        return row[i].strip() if i >= 0 and i < len(row) else ""

    stats = {"created": 0, "skipped": 0, "errors": 0}

    for row_num, row in enumerate(rows[1:], start=2):
        status  = cell(row, "ステータス")
        email   = cell(row, "公開メールアドレス")
        contact = cell(row, "推奨連絡手段")

        if status != TARGET_STATUS:
            continue
        if not email or email == "不明":
            stats["skipped"] += 1
            continue
        if contact != "Email":
            stats["skipped"] += 1
            continue

        subject = cell(row, "件名")
        body    = cell(row, "メール本文")
        company = cell(row, "会社名")

        if not subject or not body:
            logger.warning(f"件名またはメール本文が空 [{company}] 行{row_num}")
            stats["skipped"] += 1
            continue

        logger.info(f"Gmail下書き作成中: {company} -> {email}")
        draft_id = gmail.create_draft(to_email=email, subject=subject, body=body)

        if draft_id is None:
            stats["errors"] += 1
            continue

        # ステータスとメモを更新
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
        memo = f"Gmail下書き作成: {now_str} (ID: {draft_id})"

        status_idx = col_map.get("ステータス", -1)
        memo_idx   = col_map.get("メモ", -1)

        if status_idx >= 0:
            sheets.update_cell(sales_sheet, row_num, chr(ord("A") + status_idx), DRAFT_STATUS)
        if memo_idx >= 0:
            sheets.update_cell(sales_sheet, row_num, chr(ord("A") + memo_idx), memo)

        stats["created"] += 1
        logger.info(f"  完了: {company}")

    logger.info(f"Gmail下書き作成完了: 作成={stats['created']}, スキップ={stats['skipped']}, エラー={stats['errors']}")
    return stats
