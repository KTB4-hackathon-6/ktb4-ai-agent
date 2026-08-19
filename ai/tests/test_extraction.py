import pytest

from ai_agent.schemas.rules import IndustryCategory
from ai_agent.services import extraction
from ai_agent.services.extraction import (
    _LLMExtraction,
    _monthly_wage_to_hourly,
    extract_contract_facts,
)

RAW_TEXT = (
    "1. 근로계약기간 - 신규 또는 재입국자: ( 36 ) 개월\n"
    "4. 소정근로시간 : 09시 00분부터 18시 00분까지\n"
    "(휴게시간 : 12시 00분 ~ 13시 00분)\n"
    "5. 근무일/휴일 : 매주 5일 근무, 주휴일 매주 일요일\n"
    "- 월급 : 2,300,000원\n"
    "- 숙소 제공, 근로자 부담액: 월 80,000원"
)


class _FakeModel:
    def __init__(self, extracted: _LLMExtraction) -> None:
        self._extracted = extracted

    def invoke(self, _messages: list) -> _LLMExtraction:
        return self._extracted


def _extraction(**overrides: object) -> _LLMExtraction:
    defaults = dict(
        industry=IndustryCategory.MANUFACTURING,
        weekly_working_hours=40,
        # 아래 4개 값은 근거 문장에서 코드가 재계산하므로 LLM 값은 버려진다.
        daily_working_hours=0,
        rest_minutes_per_workday=0,
        weekly_paid_holidays=0,
        contract_period_months=0,
        work_hours_evidence="09시 00분부터 18시 00분까지",
        rest_evidence="휴게시간 : 12시 00분 ~ 13시 00분",
        holiday_evidence="주휴일 매주 일요일",
        period_evidence="( 36 ) 개월",
        monthly_wage=2_300_000,
        wage_specified=True,
        working_hours_specified=True,
        holiday_specified=True,
        payment_date_specified=True,
        payment_method_in_person=False,
        accommodation_deduction_krw=80_000,
    )
    defaults.update(overrides)
    return _LLMExtraction(**defaults)


def _run(monkeypatch, raw_text=RAW_TEXT, **overrides):
    monkeypatch.setattr(extraction, "_get_model", lambda: _FakeModel(_extraction(**overrides)))
    return extract_contract_facts(raw_text)


def test_values_are_recomputed_from_evidence(monkeypatch: pytest.MonkeyPatch) -> None:
    result = _run(monkeypatch)

    # 소정근로시간 = 시업~종업(9h) - 휴게(1h)
    assert result.facts.daily_working_hours == 8.0
    assert result.facts.rest_minutes_per_workday == 60
    assert result.facts.weekly_paid_holidays == 1
    assert result.facts.contract_period_months == 36
    assert result.unverified_fields == []


def test_llm_value_is_discarded_in_favour_of_the_evidence(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # 실측에서 같은 근거 "09시~18시(휴게 12~13)"를 두고 LLM이 8시간과 9시간으로
    # 갈렸다. 근거가 같으면 답도 같아야 하므로 LLM 값은 쓰지 않는다.
    result = _run(monkeypatch, daily_working_hours=9, rest_minutes_per_workday=999)

    assert result.facts.daily_working_hours == 8.0
    assert result.facts.rest_minutes_per_workday == 60


def test_evidence_absent_from_raw_text_is_unverified(monkeypatch: pytest.MonkeyPatch) -> None:
    # LLM이 지어냈거나 표 조각을 재조합한 근거는 신뢰할 수 없다.
    result = _run(monkeypatch, rest_evidence="휴게시간 : 09시 00분 ~ 12시 00분")

    assert "rest_minutes_per_workday" in result.unverified_fields
    assert result.facts.rest_minutes_per_workday == 0


def test_unparseable_evidence_is_unverified(monkeypatch: pytest.MonkeyPatch) -> None:
    # 원문에 있는 문장이지만 값을 뽑아낼 수 없는 경우(표 헤더 등).
    result = _run(monkeypatch, holiday_evidence="5. 근무일/휴일")

    assert "weekly_paid_holidays" in result.unverified_fields


def test_whitespace_differences_do_not_break_evidence_matching(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # OCR은 같은 줄을 "09 시 00 분"처럼 띄어 읽기도 한다.
    raw = "소정근로시간 : 09 시 00 분 ~ 18 시 00 분\n휴게 1일 60 분\n주휴일 매주 일요일\n( 36 ) 개월\n월급 2,300,000원\n숙박비 80,000원"
    result = _run(
        monkeypatch,
        raw_text=raw,
        work_hours_evidence="09시 00분 ~ 18시 00분",
        rest_evidence="휴게 1일 60 분",
    )

    assert result.facts.daily_working_hours == 8.0
    assert result.unverified_fields == []


def test_hours_and_minutes_split_rest_time_is_summed(monkeypatch: pytest.MonkeyPatch) -> None:
    # 농업/축산업/어업 서식: "(1) 시간 (30) 분" -> 90분
    raw = "휴게시간 1일 (2)회, (1) 시간 (30) 분\n근무시간 08시 00분 ~ 18시 00분\n휴일 주1회\n계약기간 ( 24 ) 개월"
    result = _run(
        monkeypatch,
        raw_text=raw,
        work_hours_evidence="근무시간 08시 00분 ~ 18시 00분",
        rest_evidence="휴게시간 1일 (2)회, (1) 시간 (30) 분",
        holiday_evidence="휴일 주1회",
        period_evidence="계약기간 ( 24 ) 개월",
        monthly_wage=0,
        wage_specified=False,
        accommodation_deduction_krw=0,
    )

    assert result.facts.rest_minutes_per_workday == 90
    assert result.facts.daily_working_hours == 8.5  # 10시간 - 90분
    assert result.facts.contract_period_months == 24


def test_date_range_evidence_is_converted_to_months(monkeypatch: pytest.MonkeyPatch) -> None:
    raw = RAW_TEXT + "\n근로계약기간 : 2025. 06. 01.부터 2026. 05. 31.까지"
    result = _run(
        monkeypatch,
        raw_text=raw,
        period_evidence="근로계약기간 : 2025. 06. 01.부터 2026. 05. 31.까지",
    )

    assert result.facts.contract_period_months == 12


def test_checkbox_evidence_is_read_as_a_paid_holiday(monkeypatch: pytest.MonkeyPatch) -> None:
    # 표준서식은 주휴일을 체크박스로 적어 숫자가 없다. LLM은 여기서 0을 내는 일이
    # 잦았지만 원문에는 ☑가 찍혀 있다.
    raw = RAW_TEXT + "\n6. 휴일\n☑일요일 ☑공휴일(☑유급 □무급)"
    result = _run(monkeypatch, raw_text=raw, holiday_evidence="☑일요일 ☑공휴일(☑유급 □무급)")

    assert result.facts.weekly_paid_holidays == 1


def test_ungrounded_amount_is_flagged_instead_of_failing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    result = _run(monkeypatch, monthly_wage=9_999_999)

    assert result.facts.monthly_wage == 9_999_999
    assert result.unverified_fields == ["monthly_wage"]


def test_flags_implausible_weekly_hours(monkeypatch: pytest.MonkeyPatch) -> None:
    result = _run(monkeypatch, weekly_working_hours=0)
    assert result.unverified_fields == ["weekly_working_hours"]


def test_flags_weekly_hours_exceeding_seven_days(monkeypatch: pytest.MonkeyPatch) -> None:
    result = _run(monkeypatch, weekly_working_hours=200)
    assert result.unverified_fields == ["weekly_working_hours"]


def test_flags_zero_wage_when_specified(monkeypatch: pytest.MonkeyPatch) -> None:
    result = _run(monkeypatch, monthly_wage=0, wage_specified=True)
    assert result.unverified_fields == ["monthly_wage"]


def test_deduplicates_unverified_fields(monkeypatch: pytest.MonkeyPatch) -> None:
    # 근거 실패로 daily_working_hours=0이 되면 _specified_but_zero_warnings도
    # 같은 필드를 집는다. 중복 없이 한 번만 나와야 한다.
    result = _run(monkeypatch, work_hours_evidence="")

    assert result.unverified_fields.count("daily_working_hours") == 1


def test_skips_hours_check_for_agriculture(monkeypatch: pytest.MonkeyPatch) -> None:
    result = _run(
        monkeypatch,
        industry=IndustryCategory.AGRICULTURE_LIVESTOCK_FISHERY,
        weekly_working_hours=0,
    )

    assert "weekly_working_hours" not in result.unverified_fields


def test_monthly_wage_to_hourly_uses_fixed_standard_hours() -> None:
    assert _monthly_wage_to_hourly(2_090_000) == 10_000
    assert _monthly_wage_to_hourly(1_750_000) == round(1_750_000 / 209)
