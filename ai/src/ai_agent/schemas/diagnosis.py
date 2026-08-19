from pydantic import BaseModel

from ai_agent.schemas.rules import ContractFacts, RuleViolation


class ContractDiagnosis(BaseModel):
    facts: ContractFacts
    violations: list[RuleViolation]
