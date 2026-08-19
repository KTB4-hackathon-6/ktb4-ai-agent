from fastapi.testclient import TestClient

from ai_agent.api.routes import contracts as contracts_route
from ai_agent.main import app
from ai_agent.schemas.extraction import ExtractionResult
from ai_agent.schemas.rules import ContractFacts, IndustryCategory


def _violating_facts() -> ContractFacts:
    return ContractFacts(
        industry=IndustryCategory.MANUFACTURING,
        weekly_working_hours=60,  # 위반
        daily_working_hours=8,
        rest_minutes_per_workday=30,  # 위반
        weekly_paid_holidays=1,
        monthly_wage=1_600_000,
        hourly_wage=9_000,  # 위반
        wage_specified=True,
        working_hours_specified=True,
        holiday_specified=True,
        contract_period_months=36,
        payment_date_specified=True,
        payment_method_in_person=False,
        accommodation_deduction_krw=80_000,
    )


def test_diagnose_runs_ocr_extraction_and_rules_end_to_end(monkeypatch) -> None:
    monkeypatch.setattr(contracts_route, "extract_text", lambda data, content_type: "raw text")
    monkeypatch.setattr(
        contracts_route,
        "extract_contract_facts",
        lambda raw_text: ExtractionResult(facts=_violating_facts(), unverified_fields=[]),
    )

    client = TestClient(app)
    response = client.post(
        "/contracts/diagnose",
        files=[("files", ("contract.jpg", b"fake-bytes", "image/jpeg"))],
    )

    assert response.status_code == 200
    body = response.json()
    assert body["facts"]["weekly_working_hours"] == 60
    rule_ids = {v["rule_id"] for v in body["violations"]}
    assert rule_ids == {"below_minimum_wage", "rest_time_insufficient"}
    assert body["unverified_fields"] == []


def test_diagnose_merges_multiple_pages_before_extraction(monkeypatch) -> None:
    monkeypatch.setattr(contracts_route, "extract_text", lambda data, content_type: data.decode())

    captured_raw_text = {}

    def fake_extract_contract_facts(raw_text: str) -> ExtractionResult:
        captured_raw_text["value"] = raw_text
        return ExtractionResult(facts=_violating_facts(), unverified_fields=[])

    monkeypatch.setattr(contracts_route, "extract_contract_facts", fake_extract_contract_facts)

    client = TestClient(app)
    response = client.post(
        "/contracts/diagnose",
        files=[
            ("files", ("front.jpg", b"front page text", "image/jpeg")),
            ("files", ("back.jpg", b"back page text", "image/jpeg")),
        ],
    )

    assert response.status_code == 200
    assert captured_raw_text["value"] == "front page text\n\nback page text"


def test_diagnose_does_not_fail_on_unverified_fields_and_suppresses_dependent_violation(
    monkeypatch,
) -> None:
    monkeypatch.setattr(contracts_route, "extract_text", lambda data, content_type: "raw text")
    monkeypatch.setattr(
        contracts_route,
        "extract_contract_facts",
        lambda raw_text: ExtractionResult(
            facts=_violating_facts(), unverified_fields=["monthly_wage"]
        ),
    )

    client = TestClient(app)
    response = client.post(
        "/contracts/diagnose",
        files=[("files", ("contract.jpg", b"fake-bytes", "image/jpeg"))],
    )

    assert response.status_code == 200
    body = response.json()
    assert body["unverified_fields"] == ["monthly_wage"]
    # monthly_wage를 못 믿으면 그걸로 계산한 최저임금 위반은 빠지지만,
    # 별개 필드(근로시간/휴게시간) 위반은 그대로 남아야 한다.
    rule_ids = {v["rule_id"] for v in body["violations"]}
    assert rule_ids == {"rest_time_insufficient"}
