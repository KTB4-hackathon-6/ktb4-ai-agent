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
    monthly_wage: int  # 원, 계약서에 literal하게 적힌 월급
    hourly_wage: int  # 원, monthly_wage에서 계산 (LLM이 직접 채우지 않음)
    wage_specified: bool
    working_hours_specified: bool
    holiday_specified: bool
    contract_period_months: int  # 근로계약기간(개월)
    payment_date_specified: bool  # 임금 지급일이 명시(공란 아님)됐는지
    payment_method_in_person: bool  # 통장입금이 아닌 현금 직접 지급인지
    accommodation_deduction_krw: int  # 숙박비 공제액(원), 없으면 0


class RuleViolation(BaseModel):
    rule_id: str
    law_name: str
    article: str
    message: str
    severity: Severity
