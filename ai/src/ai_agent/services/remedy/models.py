"""문제 판단 Agent와 민원 구제 Agent가 공유하는 최소 모델."""

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field


class IssueType(StrEnum):
    MINIMUM_WAGE = "MINIMUM_WAGE"
    OVERTIME_PREMIUM = "OVERTIME_PREMIUM"
    UNPAID_WAGE = "UNPAID_WAGE"
    SEVERANCE_PAY = "SEVERANCE_PAY"
    HOUSING_DEDUCTION = "HOUSING_DEDUCTION"
    WORKING_CONDITION_VIOLATION = "WORKING_CONDITION_VIOLATION"
    DEPARTURE_INSURANCE = "DEPARTURE_INSURANCE"


class DetectedIssue(BaseModel):
    issue_id: str
    issue_type: IssueType
    summary: str
    facts: dict[str, str] = Field(default_factory=dict)
    severity: Literal["INFO", "LOW", "MEDIUM", "HIGH"] = "MEDIUM"
    related_check_ids: list[str] = Field(default_factory=list)
    related_document_ids: list[str] = Field(default_factory=list)
