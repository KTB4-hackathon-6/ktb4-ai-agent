from enum import StrEnum

from pydantic import BaseModel


class IndustryCategory(StrEnum):
    MANUFACTURING = "manufacturing"
    AGRICULTURE_LIVESTOCK_FISHERY = "agriculture_livestock_fishery"  # 근로기준법 제63조 적용제외
    OTHER = "other"


class Severity(StrEnum):
    WARNING = "warning"  # 명확한 위반
    REVIEW = "review"  # 확인 필요


class ContractFacts(BaseModel):
    industry: IndustryCategory
    weekly_working_hours: float  # 연장근로 포함 실제 주당 근로시간
    daily_working_hours: float
    rest_minutes_per_workday: int
    weekly_paid_holidays: int
    hourly_wage: int  # 원
    wage_specified: bool
    working_hours_specified: bool
    holiday_specified: bool
    annual_leave_specified: bool


class RuleViolation(BaseModel):
    rule_id: str
    law_name: str
    article: str
    message: str
    severity: Severity
