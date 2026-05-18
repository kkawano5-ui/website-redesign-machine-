import json
import logging

from openai import OpenAI

from .base import BaseAIClient, GeneratedCopy
from .prompt_template import SYSTEM_PROMPT, build_user_prompt
from ..config import get_env

logger = logging.getLogger(__name__)

_FIELDS = list(GeneratedCopy.__dataclass_fields__.keys())


class OpenAIClient(BaseAIClient):
    def __init__(self, api_key_env: str = "OPENAI_API_KEY", model: str = "gpt-4o"):
        self.client = OpenAI(api_key=get_env(api_key_env))
        self.model = model

    def generate_copy(self, company_info: dict) -> GeneratedCopy:
        prompt = build_user_prompt(company_info)
        try:
            resp = self.client.chat.completions.create(
                model=self.model,
                max_tokens=2000,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
            )
            raw = resp.choices[0].message.content.strip()
            data = json.loads(raw)
            return GeneratedCopy(**{k: data.get(k, "") for k in _FIELDS})
        except json.JSONDecodeError as e:
            logger.error(f"JSON解析エラー [{company_info.get('company_name')}]: {e}")
            return GeneratedCopy()
        except Exception as e:
            logger.error(f"OpenAI API エラー [{company_info.get('company_name')}]: {e}")
            return GeneratedCopy()


def get_ai_client(config: dict):
    """設定に基づいてAIクライアントを返すファクトリ"""
    from .anthropic_client import AnthropicClient

    ai_cfg = config.get("ai", {})
    provider = ai_cfg.get("provider", "anthropic")

    if provider == "anthropic":
        return AnthropicClient(
            api_key_env=ai_cfg.get("anthropic_api_key_env", "ANTHROPIC_API_KEY"),
            model=ai_cfg.get("model_anthropic", "claude-opus-4-7"),
        )
    elif provider == "openai":
        return OpenAIClient(
            api_key_env=ai_cfg.get("openai_api_key_env", "OPENAI_API_KEY"),
            model=ai_cfg.get("model_openai", "gpt-4o"),
        )
    else:
        raise ValueError(f"未知のAIプロバイダ: {provider}")
