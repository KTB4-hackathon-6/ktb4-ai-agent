import pytest

from ai_agent.schemas.rules import IndustryCategory
from ai_agent.services import extraction
from ai_agent.services.extraction import (
    _LLMExtraction,
    _monthly_wage_to_hourly,
    extract_contract_facts,
)

RAW_TEXT = (
    "근로시간 09시00분~18시00분(1일 8시간), 휴게 1일 60 분, "
    "근로계약기간 (36)개월, 주 45시간, 휴일 1일, 월급 2,300,000원, "
    "숙박비 80,000원"
)


class _FakeModel:
    def __init__(self, extracted: _LLMExtraction) -> None:
        self._extracted = extracted

    def invoke(self, _messages: list) -> _LLMExtraction:
        return self._extracted


def _extraction(**overrides: object) -> _LLMExtraction:
    defaults = dict(
        industry=IndustryCategory.MANUFACTURING,
        weekly_working_hours=45,
        daily_working_hours=8,
        rest_minutes_per_workday=60,
        weekly_paid_holidays=1,
        monthly_wage=2_300_000,
        wage_specified=True,
        working_hours_specified=True,
        holiday_specified=True,
        contract_period_months=36,
        payment_date_specified=True,
        payment_method_in_person=False,
        accommodation_deduction_krw=80_000,
    )
    defaults.update(overrides)
    return _LLMExtraction(**defaults)


def test_extract_contract_facts_computes_hourly_wage_from_monthly(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    extracted = _extraction()
    monkeypatch.setattr(extraction, "_get_model", lambda: _FakeModel(extracted))

    result = extract_contract_facts(RAW_TEXT)

    expected_hourly_wage = _monthly_wage_to_hourly(extracted.monthly_wage)
    assert result.facts.hourly_wage == expected_hourly_wage
    assert result.facts.monthly_wage == 2_300_000
    assert result.facts.contract_period_months == 36
    assert result.unverified_fields == []


def test_extract_contract_facts_flags_ungrounded_numbers_instead_of_failing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    extracted = _extraction(rest_minutes_per_workday=99)  # raw_text에 없는 숫자
    monkeypatch.setattr(extraction, "_get_model", lambda: _FakeModel(extracted))

    result = extract_contract_facts(RAW_TEXT)

    # 요청 자체는 실패하지 않는다 — 대신 어떤 필드를 못 믿는지 알려준다.
    assert result.facts.rest_minutes_per_workday == 99
    assert result.unverified_fields == ["rest_minutes_per_workday"]


def test_extract_contract_facts_accepts_hours_and_minutes_split_across_text(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # 농업/축산업/어업 서식: "1일 (2)회, (1)시간 (30)분" -> 90분으로 합산돼야 함
    raw_text = "휴게시간 1일 (2)회, (1) 시간 (30) 분, 휴일 주1회, 계약기간 (24)개월"
    extracted = _extraction(
        rest_minutes_per_workday=90,
        contract_period_months=24,
        monthly_wage=0,  # 이 테스트 원문엔 없는 값 -> grounding 대상에서 제외
        wage_specified=False,
        accommodation_deduction_krw=0,
    )
    monkeypatch.setattr(extraction, "_get_model", lambda: _FakeModel(extracted))

    result = extract_contract_facts(raw_text)
    assert result.facts.rest_minutes_per_workday == 90
    assert result.unverified_fields == []


def test_extract_contract_facts_flags_implausible_weekly_hours(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # 실제로 겪은 버그: daily_working_hours=8인데 weekly_working_hours=0이 나온 적이 있다.
    extracted = _extraction(weekly_working_hours=0)
    monkeypatch.setattr(extraction, "_get_model", lambda: _FakeModel(extracted))

    result = extract_contract_facts(RAW_TEXT)
    assert result.unverified_fields == ["weekly_working_hours"]


def test_extract_contract_facts_flags_weekly_hours_exceeding_seven_days(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    extracted = _extraction(weekly_working_hours=200)  # daily 8시간 x 7일(56)보다 큼
    monkeypatch.setattr(extraction, "_get_model", lambda: _FakeModel(extracted))

    result = extract_contract_facts(RAW_TEXT)
    assert result.unverified_fields == ["weekly_working_hours"]


def test_extract_contract_facts_flags_zero_daily_hours_when_specified(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # 실제로 겪은 버그: daily_working_hours=0이면 이전 코드는 아예 검증을 건너뛰고
    # weekly_working_hours=0도 통과시켰다. working_hours_specified=True인데
    # daily가 0인 것 자체가 이미 모순이므로 여기서 잡아야 한다.
    extracted = _extraction(daily_working_hours=0, weekly_working_hours=0)
    monkeypatch.setattr(extraction, "_get_model", lambda: _FakeModel(extracted))

    result = extract_contract_facts(RAW_TEXT)
    assert result.unverified_fields == ["daily_working_hours"]


def test_extract_contract_facts_flags_zero_holidays_when_specified(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # 실제로 겪은 버그: weekly_working_hours=0이 나온 응답에서 weekly_paid_holidays도
    # 같이 0으로 나왔다. grounding은 0을 "명시 안 됨"으로 보고 건너뛰기 때문에
    # holiday_specified=True와의 모순을 별도로 잡아야 한다.
    extracted = _extraction(weekly_paid_holidays=0, holiday_specified=True)
    monkeypatch.setattr(extraction, "_get_model", lambda: _FakeModel(extracted))

    result = extract_contract_facts(RAW_TEXT)
    assert result.unverified_fields == ["weekly_paid_holidays"]


def test_extract_contract_facts_flags_zero_wage_when_specified(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    extracted = _extraction(monthly_wage=0, wage_specified=True)
    monkeypatch.setattr(extraction, "_get_model", lambda: _FakeModel(extracted))

    result = extract_contract_facts(RAW_TEXT)
    assert result.unverified_fields == ["monthly_wage"]


def test_extract_contract_facts_deduplicates_unverified_fields(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # daily_working_hours=0은 _weekly_hours_warnings와 _specified_but_zero_warnings
    # 양쪽 다 건드릴 수 있는 지점이라, 중복 없이 한 번만 나와야 한다.
    extracted = _extraction(daily_working_hours=0, weekly_working_hours=0)
    monkeypatch.setattr(extraction, "_get_model", lambda: _FakeModel(extracted))

    result = extract_contract_facts(RAW_TEXT)
    assert result.unverified_fields.count("daily_working_hours") == 1


def test_extract_contract_facts_skips_hours_check_for_agriculture(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # 농업/축산/수산업 서식은 "월 234시간"처럼 월 단위로만 적혀있어 LLM이
    # weekly_working_hours를 0으로 잘못 뽑는 게 실제로 재현됐다. 이 업종은
    # 근로기준법 제63조로 근로시간 체크 자체를 안 쓰니 검증에서 제외해야 한다.
    extracted = _extraction(
        industry=IndustryCategory.AGRICULTURE_LIVESTOCK_FISHERY,
        daily_working_hours=0,
        weekly_working_hours=0,
    )
    monkeypatch.setattr(extraction, "_get_model", lambda: _FakeModel(extracted))

    result = extract_contract_facts(RAW_TEXT)
    assert result.facts.weekly_working_hours == 0
    assert "weekly_working_hours" not in result.unverified_fields
    assert "daily_working_hours" not in result.unverified_fields


def test_monthly_wage_to_hourly_uses_fixed_standard_hours() -> None:
    # 실제로 겪은 버그: 같은 계산이 문서마다 다른 나누는 기준(209시간 vs 176시간)으로
    # 됐었다. 계약서의 실제 근로시간과 무관하게 항상 고정된 209시간으로 나눠야 한다
    # (연장근로는 최저임금 계산에서 제외하고 별도 가산임금으로 다루는 게 원칙이라).
    assert _monthly_wage_to_hourly(2_090_000) == 10_000
    assert _monthly_wage_to_hourly(1_750_000) == round(1_750_000 / 209)
