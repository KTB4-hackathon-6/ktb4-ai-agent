from ai_agent.schemas.rules import ContractFacts, IndustryCategory
from ai_agent.services.rules import check_contract

VALID_MANUFACTURING = ContractFacts(
    industry=IndustryCategory.MANUFACTURING,
    weekly_working_hours=45,
    daily_working_hours=8,
    rest_minutes_per_workday=60,
    weekly_paid_holidays=1,
    hourly_wage=11_000,
    wage_specified=True,
    working_hours_specified=True,
    holiday_specified=True,
    annual_leave_specified=True,
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
        update={"wage_specified": False, "annual_leave_specified": False}
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
