import logging
import time
from urllib.parse import urlparse

from ..config import load_config, get_category_config
from ..search.google_cse import get_search_client

logger = logging.getLogger(__name__)


def normalize_url(url: str) -> str:
    """ルートドメインに正規化する（重複除去用）"""
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}/"


def collect_urls(
    category: str,
    limit: int = 100,
    config_path: str | None = None,
) -> list[dict]:
    """
    カテゴリのキーワードで検索し、候補URL一覧を返す。
    戻り値: [{"url": str, "keyword": str, "title": str}]
    """
    config = load_config(config_path)
    cat_cfg = get_category_config(config, category)
    search_cfg = config.get("search", {})
    excluded_domains = set(config.get("excluded_domains", []))
    results_per_keyword = search_cfg.get("results_per_keyword", 10)

    client = get_search_client(config)
    keywords = cat_cfg.get("keywords", [])

    seen_roots: set[str] = set()
    collected: list[dict] = []

    for keyword in keywords:
        if len(collected) >= limit:
            break

        logger.info(f"検索中: {keyword}")
        results = client.search(keyword, num_results=results_per_keyword)

        for r in results:
            if len(collected) >= limit:
                break
            if not r.url:
                continue

            parsed = urlparse(r.url)
            domain = parsed.netloc.lower()

            # 除外ドメインチェック
            if any(ex in domain for ex in excluded_domains):
                logger.debug(f"除外ドメイン: {domain}")
                continue

            # 重複除去
            root = normalize_url(r.url)
            if root in seen_roots:
                logger.debug(f"重複URL: {r.url}")
                continue

            seen_roots.add(root)
            collected.append({
                "url": r.url,
                "keyword": keyword,
                "title": r.title,
                "category": category,
                "category_name": cat_cfg.get("name", category),
            })
            logger.info(f"  収集: {r.url}")

        # キーワード間で少し待つ
        time.sleep(1)

    logger.info(f"収集完了: {len(collected)}件 (カテゴリ: {category})")
    return collected
