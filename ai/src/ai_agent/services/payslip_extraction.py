"""OCR raw_text -> PayslipFacts 구조화 (경량 LLM).

LLM은 문서에 적힌 값을 그대로 읽기만 한다 — 합계를 계산하거나 빠진 값을
추정하지 않는다. 합계 검산(services.payslip_rules)과 근로계약서 대조는
룰 엔진이 전담해야 "OCR/LLM이 정확하다면 결과는 무조건 정답"이 성립한다.

금액은 7자리 단위라 원문에 우연히 나타날 수 없어, 추출값이 OCR 원문에
literal하게 존재하는지 검증하면 신뢰도가 매우 높다. 근거를 확인 못한 금액은
unverified_fields로 표시하고, 그 금액에 의존하는 판정은 결과에서 제외한다.
"""

import re
from functools import lru_cache

from langchain_deepseek import ChatDeepSeek

from ai_agent.config import get_settings
from ai_agent.schemas.payslip import PayslipExtractionResult, PayslipFacts

_SYSTEM_PROMPT = """너는 대한민국 임금명세서(급여명세서) OCR 인식 결과에서 근로기준법
시행령 제27조의2가 요구하는 필수 기재사항의 존재 여부와 금액을 읽어내는 도구다.

금액은 절대 계산하지 않는다 — 문서에 적힌 숫자를 그대로 읽는다. 합계가 맞는지
검산하지 말고, 빠진 값을 다른 값에서 유추하지도 않는다. 문서에 없으면 0으로 둔다.

존재 여부 판정:
- worker_identifier_specified: 성명, 생년월일, 사원번호 중 근로자를 특정할 수
  있는 정보가 하나라도 적혀 있으면 true.
- payment_date_specified: 임금 지급일(지급연월일)이 적혀 있으면 true.
- total_pay_specified: 임금총액(지급총액)이 적혀 있으면 true.
- pay_items_specified: 기본급, 각종 수당 등 임금 구성항목별 금액이 하나라도
  항목명과 함께 적혀 있으면 true.
- has_variable_pay_item: 연장근로수당, 야간근로수당, 휴일근로수당처럼 근무
  실적(시간)에 따라 금액이 달라지는 항목이 하나라도 있으면 true.
- calculation_method_specified: has_variable_pay_item이 true인 경우, 그 항목의
  계산 근거가 되는 연장·야간·휴일 근로시간수가 문서에 적혀 있으면 true.
  has_variable_pay_item이 false이면 이 값도 false로 둔다.
- has_deduction: 소득세, 4대보험, 숙식비 등 공제 항목이 하나라도 있으면 true.
- deduction_breakdown_specified: has_deduction이 true인 경우, 공제 항목별
  금액이 각각 적혀 있으면 true. has_deduction이 false이면 이 값도 false로 둔다.

금액 판독:
- base_pay: 기본급으로 적힌 금액.
- total_pay: 지급총액으로 적힌 금액.
- total_deduction: 공제총액으로 적힌 금액.
- net_pay: 실지급액(차인지급액)으로 적힌 금액.
- accommodation_deduction: 숙소비·식비·기숙사비 등 숙식 관련 공제액의 합.
  여러 항목으로 나뉘어 있으면 각각을 deduction_items에도 그대로 넣는다.
- pay_items: 지급 항목을 (항목명, 금액)으로 빠짐없이 나열한다. 총액 줄은 제외한다.
- deduction_items: 공제 항목을 (항목명, 금액)으로 빠짐없이 나열한다. 총액 줄은 제외한다."""

# 금액 필드만 검증한다. 7자리 금액은 우연히 원문에 나타날 수 없어 grounding이
# 신뢰할 수 있다. boolean 존재 여부는 대조할 숫자가 없어 검증 대상이 아니다.
_GROUNDED_AMOUNT_FIELDS = (
    "base_pay",
    "total_pay",
    "total_deduction",
    "net_pay",
    "accommodation_deduction",
)


@lru_cache
def _get_model():
    settings = get_settings()
    return ChatDeepSeek(
        model=settings.chat_model,
        api_key=settings.deepseek_api_key or None,
        extra_body={"thinking": {"type": "disabled"}},
    ).with_structured_output(PayslipFacts)


def extract_payslip_facts(raw_text: str) -> PayslipExtractionResult:
    facts = _get_model().invoke(
        [
            ("system", _SYSTEM_PROMPT),
            ("human", raw_text),
        ]
    )
    return PayslipExtractionResult(
        facts=facts, unverified_fields=_grounding_warnings(facts, raw_text)
    )


def _grounding_warnings(facts: PayslipFacts, raw_text: str) -> list[str]:
    """추출한 금액이 OCR 원문에 그대로 등장하는지 확인한다.

    0은 "문서에 없음"을 뜻하므로 검사 대상이 아니다 — 검사하면 어떤 문서에서든
    "0"이라는 문자열을 찾게 돼 무의미하다.
    """
    numbers_in_text = set(re.findall(r"\d+", raw_text.replace(",", "")))

    def grounded(amount: int) -> bool:
        return not amount or str(amount) in numbers_in_text

    unverified = [
        field for field in _GROUNDED_AMOUNT_FIELDS if not grounded(getattr(facts, field))
    ]
    for field in ("pay_items", "deduction_items"):
        if any(not grounded(item.amount) for item in getattr(facts, field)):
            unverified.append(field)
    return unverified
