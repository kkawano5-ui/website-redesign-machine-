import base64
import logging
from datetime import datetime
from email.mime.text import MIMEText
from pathlib import Path

from google.oauth2.credentials import Credentials
from google.oauth2 import service_account
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

logger = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/spreadsheets",
]


def _get_credentials(credentials_dir: str = "credentials") -> Credentials:
    cred_path = Path(credentials_dir)
    token_file = cred_path / "token.json"
    client_file = cred_path / "credentials.json"

    # サービスアカウントはGmail下書き作成に使えないためOAuth2のみ対応
    creds = None
    if token_file.exists():
        creds = Credentials.from_authorized_user_file(str(token_file), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not client_file.exists():
                raise FileNotFoundError(
                    f"credentials.json が {cred_path} に見つかりません。"
                    "Google Cloud ConsoleからOAuth2クライアントIDをダウンロードしてください。"
                )
            flow = InstalledAppFlow.from_client_secrets_file(str(client_file), SCOPES)
            creds = flow.run_local_server(port=0)
        with open(token_file, "w") as f:
            f.write(creds.to_json())
    return creds


class GmailDraftClient:
    def __init__(self, credentials_dir: str = "credentials", from_name: str = ""):
        creds = _get_credentials(credentials_dir)
        self.service = build("gmail", "v1", credentials=creds)
        self.from_name = from_name

    def create_draft(self, to_email: str, subject: str, body: str) -> str | None:
        """Gmail下書きを作成し、下書きIDを返す"""
        try:
            message = MIMEText(body, "plain", "utf-8")
            message["to"] = to_email
            message["subject"] = subject
            if self.from_name:
                message["from"] = self.from_name

            raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
            draft_body = {"message": {"raw": raw}}
            draft = self.service.users().drafts().create(
                userId="me", body=draft_body
            ).execute()
            draft_id = draft.get("id", "")
            logger.info(f"Gmail下書き作成: {to_email} (ID: {draft_id})")
            return draft_id
        except Exception as e:
            logger.error(f"Gmail下書き作成エラー [{to_email}]: {e}")
            return None
