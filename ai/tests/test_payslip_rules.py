from ai_agent.schemas.payslip import PayslipFacts, PayslipItem
from ai_agent.services.payslip_rules import check_payslip


def _complete_facts(**overrides) -> PayslipFacts:
    """T01 급여명세서 실물과 같은 구조의 정합성이 맞는 명세서."""
    base = dict(
        worker_identifier_specified=True,
        payment_date_specified=True,
        total_pay_specified=True,
        pay_items_specified=True,
        has_variable_pay_item=False,
        calculation_method_specified=False,
        has_deduction=True,
        deduction_breakdown_specified=True,
        base_pay=2_100_000,
        total_pay=2_350_000,
        total_deduction=172_000,
        net_pay=2_178_000,
        accommodation_deduction=150_000,
        pay_items=[
            PayslipItem(label="기본급", amount=2_100_000),
            PayslipItem(label="연장근로수당", amount=250_000),
        ],
        deduction_items=[
            PayslipItem(label="숙소비", amount=150_000),
            PayslipItem(label="소득세", amount=20_000),
            PayslipItem(label="지방소득세", amount=2_000),
        ],
    )
    base.update(overrides)
    return PayslipFacts(**base)


def test_no_violations_when_complete_and_arithmetic_consistent() -> None:
    assert check_payslip(_complete_facts()) == []


def test_missing_required_items_each_produce_a_violation() -> None:
    facts = _complete_facts(
        worker_identifier_specified=False,
        payment_date_specified=False,
        total_pay_specified=False,
        pay_items_specified=False,
    )
    violations = check_payslip(facts)
    assert [v.rule_id for v in violations].count("payslip_required_item_missing") == 4


def test_variable_pay_item_without_calculation_method_is_flagged() -> None:
    facts = _complete_facts(has_variable_pay_item=True, calculation_method_specified=False)
    assert "payslip_calculation_method_missing" in {v.rule_id for v in check_payslip(facts)}


def test_variable_pay_item_with_calculation_method_is_not_flagged() -> None:
    facts = _complete_facts(has_variable_pay_item=True, calculation_method_specified=True)
    assert check_payslip(facts) == []


def test_deduction_without_breakdown_is_flagged() -> None:
    facts = _complete_facts(deduction_breakdown_specified=False)
    assert "payslip_deduction_breakdown_missing" in {v.rule_id for v in check_payslip(facts)}


def test_no_deduction_does_not_require_breakdown() -> None:
    facts = _complete_facts(
        has_deduction=False,
        deduction_breakdown_specified=False,
        total_deduction=0,
        net_pay=2_350_000,
        deduction_items=[],
    )
    assert check_payslip(facts) == []


# --- 산술 정합성 (게이트 2) ---


def test_pay_items_sum_mismatch_is_flagged() -> None:
    # 기본급을 100,000원 낮추면 항목 합(2,250,000)이 지급총액(2,350,000)과 어긋난다.
    facts = _complete_facts(
        pay_items=[
            PayslipItem(label="기본급", amount=2_000_000),
            PayslipItem(label="연장근로수당", amount=250_000),
        ]
    )
    violations = check_payslip(facts)
    assert {v.rule_id for v in violations} == {"pay_items_sum_mismatch"}
    assert "2,250,000" in violations[0].message


def test_deduction_items_sum_mismatch_is_flagged() -> None:
    facts = _complete_facts(
        deduction_items=[
            PayslipItem(label="숙소비", amount=150_000),
            PayslipItem(label="소득세", amount=20_000),
        ]
    )
    assert {v.rule_id for v in check_payslip(facts)} == {"deduction_items_sum_mismatch"}


def test_net_pay_mismatch_is_flagged() -> None:
    facts = _complete_facts(net_pay=2_200_000)
    violations = check_payslip(facts)
    assert {v.rule_id for v in violations} == {"net_pay_mismatch"}


def test_arithmetic_uses_exact_equality_no_tolerance() -> None:
    # 1원만 어긋나도 잡아야 한다 — 오차 허용은 "얼마까지 봐줄지"라는 판단을 끌어들인다.
    facts = _complete_facts(net_pay=2_178_001)
    assert {v.rule_id for v in check_payslip(facts)} == {"net_pay_mismatch"}


def test_arithmetic_is_skipped_when_amount_is_unverified() -> None:
    # 값을 못 믿으면 "합계가 안 맞는다"고 말할 수 없다 — 문서 잘못인지 판독
    # 잘못인지 구분할 근거가 없기 때문이다.
    facts = _complete_facts(net_pay=2_200_000)
    assert check_payslip(facts, unverified_fields=["net_pay"]) == []


def test_unverified_one_field_does_not_suppress_unrelated_arithmetic_check() -> None:
    facts = _complete_facts(
        net_pay=2_200_000,
        deduction_items=[PayslipItem(label="숙소비", amount=150_000)],
    )
    # net_pay를 못 믿어도 공제 항목 합계 검산은 그대로 살아 있어야 한다.
    violations = check_payslip(facts, unverified_fields=["net_pay"])
    assert {v.rule_id for v in violations} == {"deduction_items_sum_mismatch"}


def test_arithmetic_is_skipped_when_totals_absent() -> None:
    # 총액이 아예 안 적힌 명세서는 비교 자체가 성립하지 않는다.
    facts = _complete_facts(total_pay=0, net_pay=0, total_deduction=0)
    assert not any("mismatch" in v.rule_id for v in check_payslip(facts))
