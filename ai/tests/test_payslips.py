from fastapi.testclient import TestClient

from ai_agent.api.routes import payslips as payslips_route
from ai_agent.main import app
from ai_agent.schemas.payslip import PayslipExtractionResult, PayslipFacts, PayslipItem


def _complete_facts(**overrides) -> PayslipFacts:
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


def _result(**overrides) -> PayslipExtractionResult:
    return PayslipExtractionResult(facts=_complete_facts(**overrides), unverified_fields=[])


def test_diagnose_runs_ocr_extraction_and_rules_end_to_end(monkeypatch) -> None:
    monkeypatch.setattr(payslips_route, "extract_text", lambda data, content_type: "raw text")
    monkeypatch.setattr(
        payslips_route,
        "extract_payslip_facts",
        lambda raw_text: _result(payment_date_specified=False),
    )

    client = TestClient(app)
    response = client.post(
        "/payslips/diagnose",
        files=[("files", ("payslip.jpg", b"fake-bytes", "image/jpeg"))],
    )

    assert response.status_code == 200
    body = response.json()
    assert body["facts"]["payment_date_specified"] is False
    rule_ids = {v["rule_id"] for v in body["violations"]}
    assert rule_ids == {"payslip_required_item_missing"}


def test_diagnose_merges_multiple_pages_before_extraction(monkeypatch) -> None:
    monkeypatch.setattr(
        payslips_route, "extract_text", lambda data, content_type: data.decode()
    )

    captured_raw_text = {}

    def fake_extract_payslip_facts(raw_text: str) -> PayslipExtractionResult:
        captured_raw_text["value"] = raw_text
        return _result()

    monkeypatch.setattr(payslips_route, "extract_payslip_facts", fake_extract_payslip_facts)

    client = TestClient(app)
    response = client.post(
        "/payslips/diagnose",
        files=[
            ("files", ("front.jpg", b"front page text", "image/jpeg")),
            ("files", ("back.jpg", b"back page text", "image/jpeg")),
        ],
    )

    assert response.status_code == 200
    assert captured_raw_text["value"] == "front page text\n\nback page text"


def test_diagnose_returns_no_violations_for_complete_payslip(monkeypatch) -> None:
    monkeypatch.setattr(payslips_route, "extract_text", lambda data, content_type: "raw text")
    monkeypatch.setattr(
        payslips_route, "extract_payslip_facts", lambda raw_text: _result()
    )

    client = TestClient(app)
    response = client.post(
        "/payslips/diagnose",
        files=[("files", ("payslip.jpg", b"fake-bytes", "image/jpeg"))],
    )

    assert response.status_code == 200
    assert response.json()["violations"] == []
