"""Quantifiable 근로조건 위반 판정. LLM 개입 없이 법정 기준값과 직접 비교한다.

농림·축산·수산업 종사자는 근로기준법 제63조에 따라 근로시간·휴게·휴일 규정이
적용되지 않으므로 해당 업종은 그 세 가지 체크를 건너뛴다.
"""

from ai_agent.schemas.rules import ContractFacts, IndustryCategory, RuleViolation, Severity

MINIMUM_HOURLY_WAGE = 10_320  # 2026년 최저임금법 기준, 매년 갱신 필요
MAX_WEEKLY_WORKING_HOURS = 52  # 근로기준법 제50조·제53조 (기본 40 + 연장 12)
MAX_DAILY_WORKING_HOURS = 8  # 근로기준법 제50조
MIN_WEEKLY_PAID_HOLIDAYS = 1  # 근로기준법 제55조


def check_contract(facts: ContractFacts) -> list[RuleViolation]:
    violations = [
        *_check_required_disclosures(facts),
        *_check_minimum_wage(facts),
    ]
    if facts.industry is not IndustryCategory.AGRICULTURE_LIVESTOCK_FISHERY:
        violations += _check_working_hours(facts)
        violations += _check_rest_time(facts)
        violations += _check_weekly_holiday(facts)
    return violations


def _check_required_disclosures(facts: ContractFacts) -> list[RuleViolation]:
    missing = {
        "임금": facts.wage_specified,
        "근로시간": facts.working_hours_specified,
        "휴일": facts.holiday_specified,
        "연차 유급휴가": facts.annual_leave_specified,
    }
    return [
        RuleViolation(
            rule_id="required_disclosure_missing",
            law_name="근로기준법",
            article="제17조",
            message=f"{label} 항목이 계약서에 명시되어 있지 않습니다.",
            severity=Severity.WARNING,
        )
        for label, specified in missing.items()
        if not specified
    ]


def _check_minimum_wage(facts: ContractFacts) -> list[RuleViolation]:
    if facts.hourly_wage >= MINIMUM_HOURLY_WAGE:
        return []
    return [
        RuleViolation(
            rule_id="below_minimum_wage",
            law_name="최저임금법",
            article="제6조",
            message=(
                f"시급 {facts.hourly_wage:,}원은 2026년 최저임금 "
                f"{MINIMUM_HOURLY_WAGE:,}원에 미달합니다."
            ),
            severity=Severity.WARNING,
        )
    ]


def _check_working_hours(facts: ContractFacts) -> list[RuleViolation]:
    if facts.weekly_working_hours <= MAX_WEEKLY_WORKING_HOURS:
        return []
    return [
        RuleViolation(
            rule_id="weekly_hours_exceeded",
            law_name="근로기준법",
            article="제53조",
            message=(
                f"주당 근로시간 {facts.weekly_working_hours}시간은 "
                f"법정 상한 {MAX_WEEKLY_WORKING_HOURS}시간을 초과합니다."
            ),
            severity=Severity.WARNING,
        )
    ]


def _check_rest_time(facts: ContractFacts) -> list[RuleViolation]:
    if facts.daily_working_hours >= 8:
        required_minutes = 60
    elif facts.daily_working_hours >= 4:
        required_minutes = 30
    else:
        required_minutes = 0

    if facts.rest_minutes_per_workday >= required_minutes:
        return []
    return [
        RuleViolation(
            rule_id="rest_time_insufficient",
            law_name="근로기준법",
            article="제54조",
            message=(
                f"1일 근로시간 {facts.daily_working_hours}시간 기준 "
                f"휴게시간은 최소 {required_minutes}분이 필요하지만 "
                f"{facts.rest_minutes_per_workday}분으로 명시되어 있습니다."
            ),
            severity=Severity.WARNING,
        )
    ]


def _check_weekly_holiday(facts: ContractFacts) -> list[RuleViolation]:
    if facts.weekly_paid_holidays >= MIN_WEEKLY_PAID_HOLIDAYS:
        return []
    return [
        RuleViolation(
            rule_id="weekly_holiday_missing",
            law_name="근로기준법",
            article="제55조",
            message="주 1회 이상의 유급휴일이 명시되어 있지 않습니다.",
            severity=Severity.WARNING,
        )
    ]
