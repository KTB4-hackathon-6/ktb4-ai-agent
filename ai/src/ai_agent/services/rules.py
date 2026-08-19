"""Quantifiable 근로조건 위반 판정. LLM 개입 없이 법정 기준값과 직접 비교한다.

농림·축산·수산업 종사자는 근로기준법 제63조에 따라 근로시간·휴게·휴일 규정이
적용되지 않으므로 해당 업종은 그 세 가지 체크를 건너뛴다.
"""

from ai_agent.schemas.rules import ContractFacts, IndustryCategory, RuleViolation, Severity

MINIMUM_HOURLY_WAGE = 10_320  # 2026년 최저임금법 기준, 매년 갱신 필요
MAX_WEEKLY_WORKING_HOURS = 52  # 근로기준법 제50조·제53조 (기본 40 + 연장 12)
MAX_DAILY_WORKING_HOURS = 8  # 근로기준법 제50조
MIN_WEEKLY_PAID_HOLIDAYS = 1  # 근로기준법 제55조
MAX_CONTRACT_PERIOD_MONTHS = 36  # 외국인근로자의 고용 등에 관한 법률 제18조 (취업활동기간 3년)

# 고용노동부 숙식비 공제지침 원문(HWP 첨부)을 직접 확인 못 해 정확한 %를 특정하지
# 못했다. 보수적으로 15%를 "확인 필요" 기준선으로만 쓰고, WARNING이 아닌 REVIEW로
# 표시한다 — 이 숫자는 공식 지침 확인 후 반드시 검증해야 한다.
ACCOMMODATION_DEDUCTION_REVIEW_RATIO = 0.15


def check_contract(facts: ContractFacts) -> list[RuleViolation]:
    violations = [
        *_check_required_disclosures(facts),
        *_check_minimum_wage(facts),
        *_check_contract_period(facts),
        *_check_payment_method(facts),
        *_check_accommodation_deduction(facts),
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
        "임금 지급일": facts.payment_date_specified,
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


def _check_contract_period(facts: ContractFacts) -> list[RuleViolation]:
    if facts.contract_period_months <= MAX_CONTRACT_PERIOD_MONTHS:
        return []
    return [
        RuleViolation(
            rule_id="contract_period_exceeded",
            law_name="외국인근로자의 고용 등에 관한 법률",
            article="제18조",
            message=(
                f"근로계약기간 {facts.contract_period_months}개월은 취업활동 기간 상한 "
                f"{MAX_CONTRACT_PERIOD_MONTHS}개월(3년)을 초과합니다."
            ),
            severity=Severity.WARNING,
        )
    ]


def _check_payment_method(facts: ContractFacts) -> list[RuleViolation]:
    if not facts.payment_method_in_person:
        return []
    return [
        RuleViolation(
            rule_id="in_person_payment_risk",
            law_name="근로기준법",
            article="제43조",
            message=(
                "임금 지급 방법이 통장 입금이 아닌 현금 직접 지급으로 명시되어 있습니다. "
                "통장·도장을 사용자가 관리하는 등 임금 관리 리스크가 없는지 확인이 필요합니다."
            ),
            severity=Severity.REVIEW,
        )
    ]


def _check_accommodation_deduction(facts: ContractFacts) -> list[RuleViolation]:
    if facts.accommodation_deduction_krw <= 0 or facts.monthly_wage <= 0:
        return []
    ratio = facts.accommodation_deduction_krw / facts.monthly_wage
    if ratio < ACCOMMODATION_DEDUCTION_REVIEW_RATIO:
        return []
    return [
        RuleViolation(
            rule_id="accommodation_deduction_high",
            law_name="외국인근로자의 고용 등에 관한 법률",
            article="숙식비 공제지침",
            message=(
                f"숙박비 공제 {facts.accommodation_deduction_krw:,}원은 월급의 {ratio:.0%}로, "
                "고용노동부 숙식비 공제 한도 대비 과다하지 않은지 확인이 필요합니다."
            ),
            severity=Severity.REVIEW,
        )
    ]


# 어떤 필드값을 못 믿을 때(unverified) 그 값에 근거한 위반 판정을 결과에서
# 빼기 위한 매핑. "확신 없는 값으로 위법 판정을 내리는 것"보다 "이 항목은
# 확인 못 했다"고 솔직히 비우는 쪽을 택한다.
_FIELD_TO_DEPENDENT_RULE_IDS: dict[str, tuple[str, ...]] = {
    "monthly_wage": ("below_minimum_wage",),
    "rest_minutes_per_workday": ("rest_time_insufficient",),
    "weekly_paid_holidays": ("weekly_holiday_missing",),
    "contract_period_months": ("contract_period_exceeded",),
    "accommodation_deduction_krw": ("accommodation_deduction_high",),
    "weekly_working_hours": ("weekly_hours_exceeded",),
    "daily_working_hours": ("weekly_hours_exceeded", "rest_time_insufficient"),
}


def suppress_unverified(
    violations: list[RuleViolation], unverified_fields: list[str]
) -> list[RuleViolation]:
    suppressed_rule_ids = {
        rule_id
        for field in unverified_fields
        for rule_id in _FIELD_TO_DEPENDENT_RULE_IDS.get(field, ())
    }
    return [v for v in violations if v.rule_id not in suppressed_rule_ids]
