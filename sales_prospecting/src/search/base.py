from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class SearchResult:
    url: str
    title: str
    snippet: str
    keyword: str


class BaseSearchClient(ABC):
    @abstractmethod
    def search(self, keyword: str, num_results: int = 10) -> list[SearchResult]:
        """キーワードで検索し、SearchResult のリストを返す"""
        ...
