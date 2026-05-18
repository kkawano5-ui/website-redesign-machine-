import logging
import requests

from .base import BaseSearchClient, SearchResult
from ..config import get_env

logger = logging.getLogger(__name__)


class GoogleCSEClient(BaseSearchClient):
    BASE_URL = "https://www.googleapis.com/customsearch/v1"

    def __init__(self, api_key_env: str = "GOOGLE_CSE_KEY", cse_id_env: str = "GOOGLE_CSE_ID"):
        self.api_key = get_env(api_key_env)
        self.cse_id = get_env(cse_id_env)

    def search(self, keyword: str, num_results: int = 10) -> list[SearchResult]:
        results = []
        # Google CSEは1リクエスト最大10件なのでページング
        for start in range(1, num_results + 1, 10):
            batch = min(10, num_results - len(results))
            if batch <= 0:
                break
            params = {
                "key": self.api_key,
                "cx": self.cse_id,
                "q": keyword,
                "lr": "lang_ja",
                "gl": "jp",
                "num": batch,
                "start": start,
            }
            try:
                resp = requests.get(self.BASE_URL, params=params, timeout=15)
                resp.raise_for_status()
                data = resp.json()
            except Exception as e:
                logger.error(f"Google CSE検索エラー [{keyword}]: {e}")
                break

            items = data.get("items", [])
            if not items:
                break
            for item in items:
                results.append(SearchResult(
                    url=item.get("link", ""),
                    title=item.get("title", ""),
                    snippet=item.get("snippet", ""),
                    keyword=keyword,
                ))
        return results


def get_search_client(config: dict) -> BaseSearchClient:
    """設定に基づいて検索クライアントを返すファクトリ"""
    from .serpapi import SerpAPIClient

    provider = config.get("search", {}).get("provider", "serpapi")
    search_cfg = config.get("search", {})

    if provider == "serpapi":
        return SerpAPIClient(api_key_env=search_cfg.get("serpapi_key_env", "SERPAPI_KEY"))
    elif provider == "google_cse":
        return GoogleCSEClient(
            api_key_env=search_cfg.get("google_cse_key_env", "GOOGLE_CSE_KEY"),
            cse_id_env=search_cfg.get("google_cse_id_env", "GOOGLE_CSE_ID"),
        )
    else:
        raise ValueError(f"未知の検索プロバイダ: {provider}")
