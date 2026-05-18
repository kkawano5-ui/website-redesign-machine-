import logging
from datetime import datetime
from pathlib import Path

from google.oauth2.credentials import Credentials
from google.oauth2 import service_account
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

logger = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/gmail.compose",
]

# 営業リストのカラム順（A列から）
SALES_COLUMNS = [
    "取得日",           # A
    "対象カテゴリ",      # B
    "検索キーワード",    # C
    "会社名",           # D
    "法人格",           # E
    "公式サイトURL",    # F
    "会社概要URL",      # G
    "業種",             # H
    "所在地",           # I
    "公開メールアドレス", # J
    "問い合わせフォームURL", # K
    "Instagram URL",   # L
    "TikTok URL",      # M
    "YouTube URL",     # N
    "法人と判断した根拠", # O
    "月50万円以上を払える可能性がある理由", # P
    "具体的に褒めるべきポイント",          # Q
    "提案仮説",         # R
    "推奨連絡手段",     # S
    "件名",             # T
    "メール本文",       # U
    "フォーム送信用文面", # V
    "ステータス",       # W
    "送信日",           # X
    "返信有無",         # Y
    "メモ",             # Z
]

EXCLUDED_COLUMNS = [
    "取得日", "対象カテゴリ", "検索キーワード", "会社名", "法人格",
    "公式サイトURL", "会社概要URL", "公開メールアドレス", "問い合わせフォームURL",
    "除外理由", "エラー詳細",
]


def _get_credentials(credentials_dir: str = "credentials") -> Credentials:
    cred_path = Path(credentials_dir)
    token_file = cred_path / "token.json"
    client_file = cred_path / "credentials.json"
    service_account_file = cred_path / "service_account.json"

    # サービスアカウント認証を優先
    if service_account_file.exists():
        return service_account.Credentials.from_service_account_file(
            str(service_account_file), scopes=SCOPES
        )

    # OAuth2認証（ユーザー認証）
    creds = None
    if token_file.exists():
        creds = Credentials.from_authorized_user_file(str(token_file), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(client_file), SCOPES)
            creds = flow.run_local_server(port=0)
        with open(token_file, "w") as f:
            f.write(creds.to_json())
    return creds


class SheetsClient:
    def __init__(self, spreadsheet_id: str, credentials_dir: str = "credentials"):
        creds = _get_credentials(credentials_dir)
        self.service = build("sheets", "v4", credentials=creds)
        self.spreadsheet_id = spreadsheet_id

    def _ensure_sheet(self, sheet_name: str, headers: list[str]) -> None:
        """シートが存在しなければ作成し、ヘッダを書き込む"""
        try:
            meta = self.service.spreadsheets().get(
                spreadsheetId=self.spreadsheet_id
            ).execute()
            existing = [s["properties"]["title"] for s in meta.get("sheets", [])]

            if sheet_name not in existing:
                body = {"requests": [{"addSheet": {"properties": {"title": sheet_name}}}]}
                self.service.spreadsheets().batchUpdate(
                    spreadsheetId=self.spreadsheet_id, body=body
                ).execute()
                self._write_row(sheet_name, 1, headers)
        except Exception as e:
            logger.error(f"シート確認/作成エラー [{sheet_name}]: {e}")
            raise

    def _write_row(self, sheet_name: str, row_num: int, values: list) -> None:
        range_notation = f"'{sheet_name}'!A{row_num}"
        body = {"values": [values]}
        self.service.spreadsheets().values().update(
            spreadsheetId=self.spreadsheet_id,
            range=range_notation,
            valueInputOption="USER_ENTERED",
            body=body,
        ).execute()

    def _append_row(self, sheet_name: str, values: list) -> None:
        range_notation = f"'{sheet_name}'!A1"
        body = {"values": [values]}
        self.service.spreadsheets().values().append(
            spreadsheetId=self.spreadsheet_id,
            range=range_notation,
            valueInputOption="USER_ENTERED",
            insertDataOption="INSERT_ROWS",
            body=body,
        ).execute()

    def get_all_rows(self, sheet_name: str) -> list[list]:
        """シートの全行を取得（ヘッダ含む）"""
        try:
            result = self.service.spreadsheets().values().get(
                spreadsheetId=self.spreadsheet_id,
                range=f"'{sheet_name}'!A:Z",
            ).execute()
            return result.get("values", [])
        except Exception as e:
            logger.warning(f"行取得エラー [{sheet_name}]: {e}")
            return []

    def get_existing_data(self, sheet_name: str) -> dict:
        """既存データから重複チェック用セットを返す"""
        rows = self.get_all_rows(sheet_name)
        if not rows:
            return {"urls": set(), "names": set(), "emails": set(), "forms": set()}

        header = rows[0]
        col_map = {h: i for i, h in enumerate(header)}

        urls, names, emails, forms = set(), set(), set(), set()
        for row in rows[1:]:
            def cell(col):
                i = col_map.get(col, -1)
                return row[i].strip() if i >= 0 and i < len(row) else ""

            url = cell("公式サイトURL")
            if url and url != "不明": urls.add(url)

            name = cell("会社名").replace(" ", "").replace("　", "")
            if name and name != "不明": names.add(name)

            email = cell("公開メールアドレス")
            if email and email != "不明" and "@" in email:
                emails.add(email.split("@")[-1])

            form = cell("問い合わせフォームURL")
            if form and form != "不明": forms.add(form)

        return {"urls": urls, "names": names, "emails": emails, "forms": forms}

    def append_sales_entry(self, entry: dict, sheet_name: str) -> None:
        """営業リストシートに1行追加する"""
        self._ensure_sheet(sheet_name, SALES_COLUMNS)
        row = [entry.get(col, "") for col in SALES_COLUMNS]
        self._append_row(sheet_name, row)

    def append_excluded_entry(self, entry: dict, sheet_name: str) -> None:
        """対象外ログシートに1行追加する"""
        self._ensure_sheet(sheet_name, EXCLUDED_COLUMNS)
        row = [entry.get(col, "") for col in EXCLUDED_COLUMNS]
        self._append_row(sheet_name, row)

    def update_cell(self, sheet_name: str, row_num: int, col_letter: str, value: str) -> None:
        """特定セルを更新する（1-indexed行番号、A-Z列名）"""
        range_notation = f"'{sheet_name}'!{col_letter}{row_num}"
        body = {"values": [[value]]}
        self.service.spreadsheets().values().update(
            spreadsheetId=self.spreadsheet_id,
            range=range_notation,
            valueInputOption="USER_ENTERED",
            body=body,
        ).execute()

    def find_row_by_url(self, sheet_name: str, url: str) -> int | None:
        """URLで行番号を検索（1-indexed、ヘッダ含む）"""
        rows = self.get_all_rows(sheet_name)
        if not rows:
            return None
        header = rows[0]
        url_col = header.index("公式サイトURL") if "公式サイトURL" in header else -1
        if url_col < 0:
            return None
        for i, row in enumerate(rows[1:], start=2):
            if url_col < len(row) and row[url_col] == url:
                return i
        return None

    def update_status(self, sheet_name: str, url: str, status: str, memo: str = "") -> bool:
        """URLで行を特定してステータスとメモを更新する"""
        rows = self.get_all_rows(sheet_name)
        if not rows:
            return False
        header = rows[0]
        col_map = {h: i for i, h in enumerate(header)}

        url_col = col_map.get("公式サイトURL", -1)
        status_col = col_map.get("ステータス", -1)
        memo_col = col_map.get("メモ", -1)

        for i, row in enumerate(rows[1:], start=2):
            if url_col >= 0 and url_col < len(row) and row[url_col] == url:
                if status_col >= 0:
                    col_letter = chr(ord("A") + status_col)
                    self.update_cell(sheet_name, i, col_letter, status)
                if memo_col >= 0 and memo:
                    col_letter = chr(ord("A") + memo_col)
                    self.update_cell(sheet_name, i, col_letter, memo)
                return True
        return False
