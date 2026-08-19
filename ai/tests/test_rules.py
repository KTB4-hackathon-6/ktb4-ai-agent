from ai_agent.schemas.rules import ContractFacts, IndustryCategory
from ai_agent.services.rules import check_contract, suppress_unverified

VALID_MANUFACTURING = ContractFacts(
    industry=IndustryCategory.MANUFACTURING,
    weekly_working_hours=45,
    daily_working_hours=8,
    rest_minutes_per_workday=60,
    weekly_paid_holidays=1,
    monthly_wage=2_300_000,
    hourly_wage=11_000,
    wage_specified=True,
    working_hours_specified=True,
    holiday_specified=True,
    contract_period_months=36,
    payment_date_specified=True,
    payment_method_in_person=False,
    accommodation_deduction_krw=80_000,
)


def test_valid_contract_has_no_violations() -> None:
    assert check_contract(VALID_MANUFACTURING) == []


def test_flags_excess_hours_underpay_and_missing_rest() -> None:
    facts = VALID_MANUFACTURING.model_copy(
        update={
            "weekly_working_hours": 60,
            "hourly_wage": 9_000,
            "rest_minutes_per_workday": 30,
        }
    )

    violations = check_contract(facts)

    rule_ids = {v.rule_id for v in violations}
    assert rule_ids == {"weekly_hours_exceeded", "below_minimum_wage", "rest_time_insufficient"}


def test_flags_missing_required_disclosures() -> None:
    facts = VALID_MANUFACTURING.model_copy(
        update={"wage_specified": False, "payment_date_specified": False}
    )

    violations = check_contract(facts)

    rule_ids = [v.rule_id for v in violations]
    assert rule_ids.count("required_disclosure_missing") == 2


def test_agriculture_industry_is_exempt_from_hours_rest_and_holiday_rules() -> None:
    facts = VALID_MANUFACTURING.model_copy(
        update={
            "industry": IndustryCategory.AGRICULTURE_LIVESTOCK_FISHERY,
            "weekly_working_hours": 70,
            "rest_minutes_per_workday": 0,
            "weekly_paid_holidays": 0,
        }
    )

    violations = check_contract(facts)

    assert violations == []


def test_flags_contract_period_over_three_years() -> None:
    facts = VALID_MANUFACTURING.model_copy(update={"contract_period_months": 48})

    violations = check_contract(facts)

    assert any(v.rule_id == "contract_period_exceeded" for v in violations)


def test_flags_missing_payment_date_as_required_disclosure() -> None:
    facts = VALID_MANUFACTURING.model_copy(update={"payment_date_specified": False})

    violations = check_contract(facts)

    assert any(
        v.rule_id == "required_disclosure_missing" and "임금 지급일" in v.message
        for v in violations
    )


def test_flags_in_person_payment_as_review_not_warning() -> None:
    facts = VALID_MANUFACTURING.model_copy(update={"payment_method_in_person": True})

    violations = check_contract(facts)

    match = [v for v in violations if v.rule_id == "in_person_payment_risk"]
    assert len(match) == 1
    assert match[0].severity == "review"


def test_flags_high_accommodation_deduction_as_review() -> None:
    facts = VALID_MANUFACTURING.model_copy(
        update={"accommodation_deduction_krw": 350_000}  # 월급의 약 15%
    )

    violations = check_contract(facts)

    match = [v for v in violations if v.rule_id == "accommodation_deduction_high"]
    assert len(match) == 1
    assert match[0].severity == "review"


def test_low_accommodation_deduction_is_not_flagged() -> None:
    assert VALID_MANUFACTURING.accommodation_deduction_krw == 80_000  # 월급의 약 3.5%
    violations = check_contract(VALID_MANUFACTURING)

    assert not any(v.rule_id == "accommodation_deduction_high" for v in violations)


def test_suppress_unverified_removes_only_the_dependent_violation() -> None:
    facts = VALID_MANUFACTURING.model_copy(
        update={"hourly_wage": 9_000, "rest_minutes_per_workday": 30}
    )
    violations = check_contract(facts)
    assert {v.rule_id for v in violations} == {"below_minimum_wage", "rest_time_insufficient"}

    kept = suppress_unverified(violations, unverified_fields=["monthly_wage"])

    # monthly_wage를 못 믿으면 그걸로 계산한 최저임금 위반만 빠지고,
    # 별개 필드(휴게시간)로 판정한 위반은 그대로 남는다.
    assert {v.rule_id for v in kept} == {"rest_time_insufficient"}


def test_suppress_unverified_is_noop_when_nothing_unverified() -> None:
    facts = VALID_MANUFACTURING.model_copy(update={"hourly_wage": 9_000})
    violations = check_contract(facts)

    assert suppress_unverified(violations, unverified_fields=[]) == violations
