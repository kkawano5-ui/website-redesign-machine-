import json
import logging

import anthropic

from .base import BaseAIClient, GeneratedCopy
from .prompt_template import SYSTEM_PROMPT, build_user_prompt
from ..config import get_env

logger = logging.getLogger(__name__)

_FIELDS = list(GeneratedCopy.__dataclass_fields__.keys())


class AnthropicClient(BaseAIClient):
    def __init__(self, api_key_env: str = "ANTHROPIC_API_KEY", model: str = "claude-opus-4-7"):
        self.client = anthropic.Anthropic(api_key=get_env(api_key_env))
        self.model = model

    def generate_copy(self, company_info: dict) -> GeneratedCopy:
        prompt = build_user_prompt(company_info)
        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = message.content[0].text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            data = json.loads(raw)
            return GeneratedCopy(**{k: data.get(k, "") for k in _FIELDS})
        except json.JSONDecodeError as e:
            logger.error(f"JSON解析エラー [{company_info.get('company_name')}]: {e}")
            return GeneratedCopy()
        except Exception as e:
            logger.error(f"Anthropic API エラー [{company_info.get('company_name')}]: {e}")
            return GeneratedCopy()
