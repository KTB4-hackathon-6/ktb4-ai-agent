"""임금명세서 판정. LLM 개입 없이 PayslipFacts를 그대로 검사한다.

두 가지를 본다:
  1. 근로기준법 제48조 제2항 및 시행령 제27조의2 필수 기재사항 누락
  2. 문서 내부 금액 산술 정합성 (항목 합계 == 총액, 지급-공제 == 실지급)

2번은 근로계약서 대조의 전제 조건이기도 하다. 명세서 안에서 숫자가 서로 안
맞으면 OCR이 자릿수를 잘못 읽었을 가능성이 높고, 그 상태로 계약서와 비교하면
엉뚱한 불일치를 보고하게 된다. 합계가 맞아떨어진다는 건 그 숫자들이 서로를
검증했다는 뜻이라, 대조에 쓸 수 있는 신뢰 근거가 된다.

산술 비교는 정수 완전 일치만 인정한다 — 오차 허용 범위를 두면 "얼마까지
봐줄 것인가"라는 판단이 끼어들어 결과가 더 이상 자명하지 않게 된다.
"""

from ai_agent.schemas.payslip import PayslipFacts
from ai_agent.schemas.rules import RuleViolation, Severity

_LAW_NAME = "근로기준법 시행령"
_ARTICLE = "제27조의2"


def check_payslip(
    facts: PayslipFacts, unverified_fields: list[str] | None = None
) -> list[RuleViolation]:
    missing = {
        "근로자를 특정할 수 있는 정보(성명·생년월일·사원번호 등)": (
            facts.worker_identifier_specified
        ),
        "임금 지급일": facts.payment_date_specified,
        "임금총액": facts.total_pay_specified,
        "임금의 구성항목별 금액(기본급·수당 등)": facts.pay_items_specified,
    }
    violations = [
        RuleViolation(
            rule_id="payslip_required_item_missing",
            law_name=_LAW_NAME,
            article=_ARTICLE,
            message=f"{label} 항목이 급여명세서에 명시되어 있지 않습니다.",
            severity=Severity.WARNING,
        )
        for label, specified in missing.items()
        if not specified
    ]

    if facts.has_variable_pay_item and not facts.calculation_method_specified:
        violations.append(
            RuleViolation(
                rule_id="payslip_calculation_method_missing",
                law_name=_LAW_NAME,
                article=_ARTICLE,
                message=(
                    "연장·야간·휴일근로수당 등 근무 실적에 따라 달라지는 항목이 있으나, "
                    "그 계산방법(해당 근로시간수 등)이 명시되어 있지 않습니다."
                ),
                severity=Severity.WARNING,
            )
        )

    violations += _check_arithmetic(facts, unverified_fields or [])

    if facts.has_deduction and not facts.deduction_breakdown_specified:
        violations.append(
            RuleViolation(
                rule_id="payslip_deduction_breakdown_missing",
                law_name=_LAW_NAME,
                article=_ARTICLE,
                message="공제 항목이 있으나, 공제 항목별 금액이 각각 명시되어 있지 않습니다.",
                severity=Severity.WARNING,
            )
        )

    return violations


# 각 산술 검사가 어떤 금액 필드에 의존하는지. 그 중 하나라도 grounding에
# 실패했다면 검사를 건너뛴다 — 못 믿을 숫자로 "합계가 안 맞는다"고 보고하면
# 문서 잘못이 아니라 판독 잘못을 문서 탓으로 돌리는 셈이 된다.
_ARITHMETIC_CHECKS = (
    ("pay_items_sum_mismatch", ("pay_items", "total_pay"), "지급"),
    ("deduction_items_sum_mismatch", ("deduction_items", "total_deduction"), "공제"),
)


def _check_arithmetic(facts: PayslipFacts, unverified_fields: list[str]) -> list[RuleViolation]:
    unverified = set(unverified_fields)
    violations: list[RuleViolation] = []

    sums = {
        "pay_items_sum_mismatch": (
            sum(item.amount for item in facts.pay_items),
            facts.total_pay,
            facts.pay_items,
        ),
        "deduction_items_sum_mismatch": (
            sum(item.amount for item in facts.deduction_items),
            facts.total_deduction,
            facts.deduction_items,
        ),
    }
    for rule_id, deps, label in _ARITHMETIC_CHECKS:
        if unverified & set(deps):
            continue
        items_sum, total, items = sums[rule_id]
        # 항목이 아예 없거나 총액이 없으면 비교 자체가 성립하지 않는다.
        if not items or not total or items_sum == total:
            continue
        violations.append(
            RuleViolation(
                rule_id=rule_id,
                law_name="산술 검증",
                article="문서 내부 정합성",
                message=(
                    f"{label} 항목별 금액의 합 {items_sum:,}원이 "
                    f"{label}총액 {total:,}원과 일치하지 않습니다."
                ),
                severity=Severity.WARNING,
            )
        )

    net_deps = {"total_pay", "total_deduction", "net_pay"}
    if not (unverified & net_deps) and facts.total_pay and facts.net_pay:
        expected = facts.total_pay - facts.total_deduction
        if expected != facts.net_pay:
            violations.append(
                RuleViolation(
                    rule_id="net_pay_mismatch",
                    law_name="산술 검증",
                    article="문서 내부 정합성",
                    message=(
                        f"지급총액 {facts.total_pay:,}원에서 공제총액 "
                        f"{facts.total_deduction:,}원을 뺀 {expected:,}원이 "
                        f"실지급액 {facts.net_pay:,}원과 일치하지 않습니다."
                    ),
                    severity=Severity.WARNING,
                )
            )
    return violations
