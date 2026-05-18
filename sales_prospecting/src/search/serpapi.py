import logging
import requests

from .base import BaseSearchClient, SearchResult
from ..config import get_env

logger = logging.getLogger(__name__)


class SerpAPIClient(BaseSearchClient):
    BASE_URL = "https://serpapi.com/search"

    def __init__(self, api_key_env: str = "SERPAPI_KEY"):
        self.api_key = get_env(api_key_env)

    def search(self, keyword: str, num_results: int = 10) -> list[SearchResult]:
        params = {
            "engine": "google",
            "q": keyword,
            "hl": "ja",
            "gl": "jp",
            "num": min(num_results, 100),
            "api_key": self.api_key,
        }
        try:
            resp = requests.get(self.BASE_URL, params=params, timeout=15)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.error(f"SerpAPI検索エラー [{keyword}]: {e}")
            return []

        results = []
        for item in data.get("organic_results", []):
            results.append(SearchResult(
                url=item.get("link", ""),
                title=item.get("title", ""),
                snippet=item.get("snippet", ""),
                keyword=keyword,
            ))
        return results
