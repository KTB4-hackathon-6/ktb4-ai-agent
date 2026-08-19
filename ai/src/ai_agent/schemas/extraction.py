from pydantic import BaseModel

from ai_agent.schemas.rules import ContractFacts


class ExtractionResult(BaseModel):
    facts: ContractFacts
    unverified_fields: list[str]  # OCR 원문에서 근거를 확인 못한 필드 이름들
