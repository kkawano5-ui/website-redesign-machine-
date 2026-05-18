from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class GeneratedCopy:
    corp_reason: str = ""
    budget_reason: str = ""
    praise_point: str = ""
    proposal_hypothesis: str = ""
    subject: str = ""
    email_body: str = ""
    form_body: str = ""


class BaseAIClient(ABC):
    @abstractmethod
    def generate_copy(self, company_info: dict) -> GeneratedCopy:
        """企業情報をもとに文面を生成する"""
        ...
