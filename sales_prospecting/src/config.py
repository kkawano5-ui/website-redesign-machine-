import os
import yaml
from pathlib import Path
from typing import Any


_config_cache: dict | None = None


def load_config(config_path: str | None = None) -> dict:
    global _config_cache
    if _config_cache is not None:
        return _config_cache

    if config_path is None:
        config_path = Path(__file__).parent.parent / "config.yaml"

    with open(config_path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    _config_cache = config
    return config


def get_env(key_env_name: str) -> str:
    """環境変数名から値を取得する"""
    value = os.environ.get(key_env_name, "")
    if not value:
        raise ValueError(f"環境変数 {key_env_name} が設定されていません")
    return value


def get_category_config(config: dict, category: str) -> dict:
    categories = config.get("categories", {})
    if category not in categories:
        available = ", ".join(categories.keys())
        raise ValueError(f"カテゴリ '{category}' が存在しません。利用可能: {available}")
    return categories[category]
