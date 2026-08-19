from pydantic import BaseModel

from ai_agent.schemas.rules import RuleViolation


class PayslipItem(BaseModel):
    """급여명세서의 지급/공제 항목 한 줄. 항목별 금액 합계 검산에 쓴다."""

    label: str
    amount: int


class PayslipFacts(BaseModel):
    """임금명세서에서 읽어낸 필수 기재사항 존재 여부와 금액.

    금액은 계산하지 않고 문서에 적힌 값을 그대로 읽는다 — 합계 검산과
    근로계약서 대조는 LLM이 아니라 룰 엔진이 전담한다.
    """

    # 근로기준법 시행령 제27조의2 필수 기재사항의 존재 여부
    worker_identifier_specified: bool  # 성명·생년월일·사원번호 등 근로자를 특정할 수 있는 정보
    payment_date_specified: bool  # 임금 지급일
    total_pay_specified: bool  # 임금총액
    pay_items_specified: bool  # 임금의 구성항목별 금액(기본급, 각종 수당 등)
    has_variable_pay_item: bool  # 연장·야간·휴일근로수당 등 근무 실적에 따라 달라지는 항목
    calculation_method_specified: bool  # 위 항목의 계산방법(연장·야간·휴일 근로시간수 등)
    has_deduction: bool  # 공제 항목 존재 여부
    deduction_breakdown_specified: bool  # 공제 항목이 있다면 항목별 금액이 명시됐는지

    # 금액. 문서에 없으면 0.
    base_pay: int  # 기본급
    total_pay: int  # 지급총액
    total_deduction: int  # 공제총액
    net_pay: int  # 실지급액
    accommodation_deduction: int  # 숙소비·식비 등 숙식 관련 공제액
    pay_items: list[PayslipItem]  # 지급 항목별 내역
    deduction_items: list[PayslipItem]  # 공제 항목별 내역


class PayslipExtractionResult(BaseModel):
    facts: PayslipFacts
    unverified_fields: list[str]  # OCR 원문에서 근거를 확인 못한 금액 필드 이름들


class PayslipDiagnosis(BaseModel):
    facts: PayslipFacts
    violations: list[RuleViolation]
    unverified_fields: list[str]
