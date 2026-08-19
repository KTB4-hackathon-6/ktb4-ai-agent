"""OCR raw_text -> ContractFacts 구조화 (경량 LLM).

법 위반 여부는 판단하지 않는다 — 계약서에 적힌 값을 그대로 읽어내는 역할만
하고, 위반 판정은 services.rules.check_contract가 전담한다.

LLM이 숫자를 잘못 읽어도(hallucination) 룰 엔진이 그대로 틀린 값을 위반
기준으로 쓰게 되므로, 추출된 핵심 수치가 OCR 원문에 실제로 등장하는지
재검증한 뒤 통과 못하면 ExtractionGroundingError를 던진다.
"""

import re
from functools import lru_cache

from langchain_deepseek import ChatDeepSeek

from ai_agent.config import get_settings
from ai_agent.schemas.rules import ContractFacts

_SYSTEM_PROMPT = """너는 대한민국 표준근로계약서(외국인근로자의 고용 등에 관한 법률 시행규칙
별지 제6호서식 및 제6호의2서식)의 OCR 인식 결과에서 정해진 필드를 그대로 읽어
구조화하는 도구다.

법 위반 여부는 절대 판단하지 않는다 — 계약서에 적힌 값을 왜곡 없이 그대로 추출한다.
계약서에 명시되지 않은 항목은 관련 *_specified 값을 false로 하고 관련 수치는 0으로 채운다.
시급이 직접 명시되지 않고 월급만 있다면, 월급을 명시된 월 소정근로시간(보통 209시간)으로
나눠 원 단위 정수로 추정한다."""

_GROUNDED_FIELDS = (
    # 표준근로계약서 양식은 근로시간을 시작~종료 시각으로만 적고 daily/weekly
    # working_hours, hourly_wage는 거기서 계산해내는 값이라 literal하게
    # 원문에 안 나온다. 계약서에 숫자 그대로 찍혀있는 필드만 검증한다.
    "rest_minutes_per_workday",
    "weekly_paid_holidays",
)


class ExtractionGroundingError(Exception):
    """LLM이 뽑은 숫자가 OCR 원문 어디에도 등장하지 않아 신뢰할 수 없을 때."""


@lru_cache
def _get_model():
    settings = get_settings()
    return ChatDeepSeek(
        model=settings.chat_model,
        api_key=settings.deepseek_api_key or None,
        extra_body={"thinking": {"type": "disabled"}},
    ).with_structured_output(ContractFacts)


def extract_contract_facts(raw_text: str) -> ContractFacts:
    facts = _get_model().invoke(
        [
            ("system", _SYSTEM_PROMPT),
            ("human", raw_text),
        ]
    )
    _verify_grounded(facts, raw_text)
    return facts


def _verify_grounded(facts: ContractFacts, raw_text: str) -> None:
    numbers_in_text = set(re.findall(r"\d+", raw_text.replace(",", "")))
    for field in _GROUNDED_FIELDS:
        value = getattr(facts, field)
        if value and str(int(value)) not in numbers_in_text:
            raise ExtractionGroundingError(
                f"{field}={value}가 OCR 원문에서 확인되지 않습니다. 수동 확인이 필요합니다."
            )
