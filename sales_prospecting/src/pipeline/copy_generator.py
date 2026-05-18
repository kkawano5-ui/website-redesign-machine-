import logging
import time

from ..config import load_config
from ..sheets.client import SheetsClient
from ..ai.openai_client import get_ai_client

logger = logging.getLogger(__name__)

TARGET_STATUS = "収集済み"


def generate_copy(config_path: str | None = None) -> dict:
    """
    Google Sheetsの「収集済み」行に文面を生成して書き込む。
    戻り値: {"processed": int, "errors": int}
    """
    config = load_config(config_path)
    sheets_cfg = config.get("google_sheets", {})
    sales_sheet = sheets_cfg.get("sales_sheet_name", "営業リスト")

    sheets = SheetsClient(
        spreadsheet_id=sheets_cfg["spreadsheet_id"],
        credentials_dir="credentials",
    )
    ai_client = get_ai_client(config)

    rows = sheets.get_all_rows(sales_sheet)
    if not rows:
        logger.warning("営業リストシートが空です")
        return {"processed": 0, "errors": 0}

    header = rows[0]
    col_map = {h: i for i, h in enumerate(header)}

    def cell(row, col):
        i = col_map.get(col, -1)
        return row[i].strip() if i >= 0 and i < len(row) else ""

    stats = {"processed": 0, "errors": 0}

    for row_num, row in enumerate(rows[1:], start=2):
        if cell(row, "ステータス") != TARGET_STATUS:
            continue

        company_info = {
            "company_name": cell(row, "会社名"),
            "official_url":  cell(row, "公式サイトURL"),
            "industry":      cell(row, "業種"),
            "category_name": cell(row, "対象カテゴリ"),
            "location":      cell(row, "所在地"),
            "instagram_url": cell(row, "Instagram URL"),
            "tiktok_url":    cell(row, "TikTok URL"),
            "youtube_url":   cell(row, "YouTube URL"),
            "email":         cell(row, "公開メールアドレス"),
            "contact_url":   cell(row, "問い合わせフォームURL"),
            "keyword":       cell(row, "検索キーワード"),
        }

        logger.info(f"文面生成中: {company_info['company_name']} (行 {row_num})")
        try:
            copy = ai_client.generate_copy(company_info)
        except Exception as e:
            logger.error(f"文面生成エラー [{company_info['company_name']}]: {e}")
            stats["errors"] += 1
            continue

        # 各列に書き込む
        write_map = {
            "法人と判断した根拠":              copy.corp_reason,
            "月50万円以上を払える可能性がある理由": copy.budget_reason,
            "具体的に褒めるべきポイント":        copy.praise_point,
            "提案仮説":                       copy.proposal_hypothesis,
            "件名":                           copy.subject,
            "メール本文":                     copy.email_body,
            "フォーム送信用文面":              copy.form_body,
            "ステータス":                     "文面生成済み",
        }

        for col_name, value in write_map.items():
            col_idx = col_map.get(col_name, -1)
            if col_idx < 0:
                continue
            col_letter = chr(ord("A") + col_idx)
            sheets.update_cell(sales_sheet, row_num, col_letter, value)

        # フォームのみの企業はステータスを「フォーム送信待ち」に
        contact = cell(row, "推奨連絡手段")
        if contact == "Form":
            status_idx = col_map.get("ステータス", -1)
            if status_idx >= 0:
                col_letter = chr(ord("A") + status_idx)
                sheets.update_cell(sales_sheet, row_num, col_letter, "フォーム送信待ち")

        stats["processed"] += 1
        logger.info(f"  完了: {company_info['company_name']}")
        time.sleep(1)

    logger.info(f"文面生成完了: 処理={stats['processed']}, エラー={stats['errors']}")
    return stats
