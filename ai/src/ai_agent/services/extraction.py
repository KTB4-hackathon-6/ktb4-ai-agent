"""OCR raw_text -> ContractFacts 구조화 (경량 LLM).

법 위반 여부는 판단하지 않는다 — 계약서에 적힌 값을 그대로 읽어내는 역할만
하고, 위반 판정은 services.rules.check_contract가 전담한다.

LLM이 숫자를 잘못 읽거나(hallucination) 계산을 일관되지 않게 하면 룰
엔진이 그대로 틀린 값을 위반 기준으로 쓰게 된다. 그래서:
  - 시급은 LLM에게 계산시키지 않는다. LLM은 계약서에 literal하게 적힌
    월급(monthly_wage)만 읽고, 시급은 이 모듈이 고정된 공식으로 직접 계산한다.
  - 추출된 핵심 수치가 OCR 원문에 실제로 등장하는지 재검증한다.

원문에서 근거를 확인 못한 필드는 예외를 던져서 요청 전체를 실패시키지 않는다.
대신 unverified_fields로 표시해서 반환하고, 그 필드에 의존하는 위반 판정은
services.rules.suppress_unverified가 결과에서 제외한다 — "확신 없는 값으로 위법
판정을 내리는 것"보다 "이 부분은 못 봤다고 솔직히 말하는 것"이 이 서비스의
원칙에 맞기 때문이다.
"""

import re
from functools import lru_cache

from langchain_deepseek import ChatDeepSeek
from pydantic import BaseModel

from ai_agent.config import get_settings
from ai_agent.schemas.extraction import ExtractionResult
from ai_agent.schemas.rules import ContractFacts, IndustryCategory

_SYSTEM_PROMPT = """너는 대한민국 표준근로계약서(외국인근로자의 고용 등에 관한 법률 시행규칙
별지 제6호서식 및 제6호의2서식)의 OCR 인식 결과에서 정해진 필드를 그대로 읽어
구조화하는 도구다.

법 위반 여부는 절대 판단하지 않는다 — 계약서에 적힌 값을 왜곡 없이 그대로 추출한다.
계약서에 명시되지 않은 항목은 관련 *_specified 값을 false로 하고 관련 수치는 0으로 채운다.
monthly_wage는 계산하지 말고 계약서에 적힌 월급 숫자를 그대로 읽는다(시간급으로 환산하지 않음).
휴게시간이 "1시간 30분"처럼 시/분으로 나뉘어 있으면 합산해서 분 단위로 채운다.
payment_method_in_person은 임금 지급방법이 "통장 입금"이 아니라 "직접 지급"에 체크된
경우에만 true다."""

_GROUNDED_FIELDS = (
    # 표준근로계약서 양식은 근로시간을 시작~종료 시각으로만 적고 daily/weekly
    # working_hours, hourly_wage는 거기서 계산해내는 값이라 literal하게
    # 원문에 안 나온다. 계약서에 숫자 그대로 찍혀있는 필드만 검증한다.
    "rest_minutes_per_workday",
    "weekly_paid_holidays",
    "monthly_wage",
    "contract_period_months",
    "accommodation_deduction_krw",
)

# 최저임금 판정은 연장근로를 제외한 "소정근로시간"만 기준으로 한다 — 연장근로는
# 최저임금 계산에 섞지 않고 별도로 50% 가산 지급하는 게 원칙이라, 계약서의 실제
# (연장근로 포함) 주당 근로시간으로 나누면 오히려 부정확해진다. 고용노동부가 매년
# 최저임금 발표 시 쓰는 것과 동일한 고정값(주 40시간 기준 월 209시간)을 쓴다.
# LLM에 맡기지 않고 여기서 고정 계산하는 이유는, 같은 계산이 문서마다 다른 값
# (209시간 vs 176시간)으로 나오는 걸 실제로 확인했기 때문이다.
MONTHLY_STANDARD_HOURS_FOR_MINIMUM_WAGE = 209


def _monthly_wage_to_hourly(monthly_wage: int) -> int:
    if monthly_wage <= 0:
        return 0
    return round(monthly_wage / MONTHLY_STANDARD_HOURS_FOR_MINIMUM_WAGE)


class _LLMExtraction(BaseModel):
    industry: IndustryCategory
    weekly_working_hours: float
    daily_working_hours: float
    rest_minutes_per_workday: int
    weekly_paid_holidays: int
    monthly_wage: int
    wage_specified: bool
    working_hours_specified: bool
    holiday_specified: bool
    contract_period_months: int
    payment_date_specified: bool
    payment_method_in_person: bool
    accommodation_deduction_krw: int


@lru_cache
def _get_model():
    settings = get_settings()
    return ChatDeepSeek(
        model=settings.chat_model,
        api_key=settings.deepseek_api_key or None,
        extra_body={"thinking": {"type": "disabled"}},
    ).with_structured_output(_LLMExtraction)


def extract_contract_facts(raw_text: str) -> ExtractionResult:
    extracted = _get_model().invoke(
        [
            ("system", _SYSTEM_PROMPT),
            ("human", raw_text),
        ]
    )
    hourly_wage = _monthly_wage_to_hourly(extracted.monthly_wage)
    facts = ContractFacts(**extracted.model_dump(), hourly_wage=hourly_wage)

    unverified = (
        _grounding_warnings(facts, raw_text)
        + _weekly_hours_warnings(facts)
        + _specified_but_zero_warnings(facts)
    )
    # 같은 필드가 여러 체크에 동시에 걸릴 수 있어 중복 제거하되 순서는 유지한다.
    unverified = list(dict.fromkeys(unverified))
    return ExtractionResult(facts=facts, unverified_fields=unverified)


def _grounding_warnings(facts: ContractFacts, raw_text: str) -> list[str]:
    numbers_in_text = set(re.findall(r"\d+", raw_text.replace(",", "")))
    return [
        field
        for field in _GROUNDED_FIELDS
        if getattr(facts, field) and not _is_grounded(int(getattr(facts, field)), numbers_in_text)
    ]


# "명시됨(True)"이라고 해놓고 정작 수치는 0인 모순 케이스. 실제로 같은 응답 안에서
# weekly_working_hours=0과 weekly_paid_holidays=0이 함께 나오는 걸 확인했다 —
# 개별 필드 문제가 아니라 그 응답 자체가 통째로 흔들린 것으로 보여, "*_specified만
# True고 값은 0"인 모든 경우를 한 번에 잡는다. grounding은 0을 "명시 안 됨"으로
# 보고 검사를 건너뛰기 때문에 이 케이스를 못 잡는다.
#
# daily_working_hours/weekly_paid_holidays는 농업/축산/수산업에서는
# rules.check_contract가 아예 안 쓰는 값이라(근로기준법 제63조 예외) 그 업종은
# 검사하지 않는다.
_SPECIFIED_VALUE_PAIRS = (
    ("working_hours_specified", "daily_working_hours", True),
    ("holiday_specified", "weekly_paid_holidays", True),
    ("wage_specified", "monthly_wage", False),
)


def _specified_but_zero_warnings(facts: ContractFacts) -> list[str]:
    is_exempt_industry = facts.industry is IndustryCategory.AGRICULTURE_LIVESTOCK_FISHERY
    return [
        value_field
        for specified_field, value_field, skip_if_exempt in _SPECIFIED_VALUE_PAIRS
        if getattr(facts, specified_field)
        and getattr(facts, value_field) <= 0
        and not (skip_if_exempt and is_exempt_industry)
    ]


def _weekly_hours_warnings(facts: ContractFacts) -> list[str]:
    """weekly_working_hours는 원문에 literal하게 없어 grounding으로 못 잡는다.

    실제로 같은 문서를 여러 번 돌려봤을 때 daily_working_hours와 앞뒤가 안 맞는
    값(0 포함)이 나오는 걸 확인했다. "하루 근로시간 × 7일"을 넘거나 하루
    근로시간보다 작으면 물리적으로 불가능한 값이므로 의심한다. daily_working_hours
    자체가 0인 경우는 _specified_but_zero_warnings가 이미 잡으므로 여기서는
    건드리지 않는다(0으로 나누기 방지 겸 중복 방지).

    농업/축산/수산업은 근로기준법 제63조로 근로시간·휴게·휴일 규정 자체가
    적용 안 돼 rules.check_contract가 이 값들을 아예 안 쓴다. 게다가 이 업종
    서식은 "월 234시간"처럼 월 단위로만 적어 LLM이 주 단위로 환산하는 걸
    거의 매번 틀린다(재현 확인됨) — 어차피 안 쓰는 값이라 경고 대상에서 뺀다.
    """
    if not facts.working_hours_specified:
        return []
    if facts.industry is IndustryCategory.AGRICULTURE_LIVESTOCK_FISHERY:
        return []
    if facts.daily_working_hours <= 0:
        return []
    lower = facts.daily_working_hours
    upper = facts.daily_working_hours * 7
    if not (lower <= facts.weekly_working_hours <= upper):
        return ["weekly_working_hours"]
    return []


def _is_grounded(value: int, numbers_in_text: set[str]) -> bool:
    if str(value) in numbers_in_text:
        return True
    # 농업/축산업/어업 서식은 휴게시간을 "1시간 30분"처럼 시/분으로 나눠 적는다.
    # 합산해서 나온 값도, 그 구성요소가 원문에 그대로 있으면 근거로 인정한다.
    for hours in range(1, 13):
        minutes = value - hours * 60
        if 0 <= minutes < 60 and str(hours) in numbers_in_text and str(minutes) in numbers_in_text:
            return True
    return False
