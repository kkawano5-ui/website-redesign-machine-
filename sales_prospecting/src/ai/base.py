from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class GeneratedCopy:
    corp_reason: str = ""          # 法人と判断した根拠
    budget_reason: str = ""        # 月50万円以上を払える可能性がある理由
    praise_point: str = ""         # 具体的に褒めるべきポイント
    proposal_hypothesis: str = ""  # 提案仮説
    sns_improvement: str = ""      # SNS上の改善余地
    subject: str = ""              # 件名
    email_body: str = ""           # メール本文
    form_body: str = ""            # フォーム送信用文面


class BaseAIClient(ABC):
    @abstractmethod
    def generate_copy(self, company_info: dict) -> GeneratedCopy:
        ...
