import pytest

from ai_agent.schemas.rules import ContractFacts, IndustryCategory
from ai_agent.services import extraction
from ai_agent.services.extraction import ExtractionGroundingError, extract_contract_facts

RAW_TEXT = (
    "근로시간 09시00분~18시00분(1일 8시간), 휴게 1일 60 분, "
    "근로계약기간 (36)개월, 주 45시간, 휴일 1일"
)


class _FakeModel:
    def __init__(self, facts: ContractFacts) -> None:
        self._facts = facts

    def invoke(self, _messages: list) -> ContractFacts:
        return self._facts


def _facts(**overrides: object) -> ContractFacts:
    defaults = dict(
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
    defaults.update(overrides)
    return ContractFacts(**defaults)


def test_extract_contract_facts_returns_grounded_result(monkeypatch: pytest.MonkeyPatch) -> None:
    facts = _facts()
    monkeypatch.setattr(extraction, "_get_model", lambda: _FakeModel(facts))

    assert extract_contract_facts(RAW_TEXT) == facts


def test_extract_contract_facts_rejects_ungrounded_numbers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    facts = _facts(weekly_working_hours=99)  # raw_text에 없는 숫자
    monkeypatch.setattr(extraction, "_get_model", lambda: _FakeModel(facts))

    with pytest.raises(ExtractionGroundingError):
        extract_contract_facts(RAW_TEXT)
