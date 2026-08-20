import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage

from ai_agent.api.routes import analyze as review_route
from ai_agent.api.routes import document_authoring, guidance
from ai_agent.api.routes.guidance import JurisdictionDecision, parse_offices
from ai_agent.main import app
from ai_agent.schemas.document_authoring import (
    ComplainantData,
    DocumentAuthoringResponse,
    LaborComplaintFormData,
    RespondentData,
)
from ai_agent.services import agent as agent_service
from ai_agent.services.remedy import workflow
from ai_agent.services.remedy.models import DetectedIssue
from ai_agent.services.remedy.workflow import AuthoringIntent, FormFieldUpdate, RemedyTurn
from ai_agent.services.reviewer import DocumentReview


def docs_request(text: str = "진정서 작성을 시작해줘") -> dict:
    return {
        "requestId": "docs-1",
        "sessionId": "session-1",
        "preferredLanguage": "vi",
        "input": {"text": text},
    }


def test_docs_returns_one_missing_field(monkeypatch) -> None:
    run = AsyncMock(
        return_value={
            "messages": [AIMessage("주소를 알려주세요.")],
            "form_drafts": {
                "LABOR_COMPLAINT_001": {"complainant": {"fullName": "NGUYEN VAN TEST"}}
            },
            "authoring_intent": "FORM_INPUT",
            "question_answer": None,
            "field_questions": {"complainant.address": "주소를 알려주세요."},
        }
    )
    monkeypatch.setattr(document_authoring, "run_document_authoring", run)

    response = TestClient(app).post("/docs", json=docs_request())

    assert response.status_code == 200
    body = response.json()
    draft = body["result"]["documentDrafts"][0]
    assert draft["status"] == "NEEDS_INPUT"
    assert draft["data"]["complainant"]["fullName"] == "NGUYEN VAN TEST"
    assert draft["missingFields"][0]["fieldId"] == "complainant.address"
    assert draft["missingFields"][0]["question"] == "주소를 알려주세요."
    run.assert_awaited_once_with("진정서 작성을 시작해줘", "session-1", "vi")


def test_docs_answers_question_then_repeats_current_missing_field(monkeypatch) -> None:
    monkeypatch.setattr(
        document_authoring,
        "run_document_authoring",
        AsyncMock(
            return_value={
                "form_drafts": {
                    "LABOR_COMPLAINT_001": {"complainant": {"fullName": "NGUYEN VAN TEST"}}
                },
                "authoring_intent": "QUESTION",
                "question_answer": "주소는 진정인 확인을 위해 필요합니다.",
                "field_questions": {"complainant.address": "현재 주소를 알려주세요."},
            }
        ),
    )

    response = TestClient(app).post("/docs", json=docs_request("주소는 왜 필요한가요?"))

    assert response.status_code == 200
    result = response.json()["result"]
    assert result["answer"] == ("주소는 진정인 확인을 위해 필요합니다.\n\n현재 주소를 알려주세요.")
    draft = result["documentDrafts"][0]
    assert draft["missingFields"][0]["fieldId"] == "complainant.address"
    assert draft["missingFields"][0]["question"] == "현재 주소를 알려주세요."


def test_docs_localizes_fallback_field_question(monkeypatch) -> None:
    monkeypatch.setattr(
        document_authoring,
        "run_document_authoring",
        AsyncMock(
            return_value={
                "form_drafts": {"LABOR_COMPLAINT_001": {}},
                "authoring_intent": "FORM_INPUT",
                "field_questions": {},
            }
        ),
    )
    request = docs_request()
    request["preferredLanguage"] = "ko"

    response = TestClient(app).post("/docs", json=request)

    assert response.status_code == 200
    result = response.json()["result"]
    assert result["answer"] == "다음 정보를 알려주세요: 성명."
    assert result["documentDrafts"][0]["missingFields"][0]["question"] == (
        "다음 정보를 알려주세요: 성명."
    )


def test_docs_explains_invalid_input_before_repeating_field(monkeypatch) -> None:
    monkeypatch.setattr(
        document_authoring,
        "run_document_authoring",
        AsyncMock(
            return_value={
                "form_drafts": {"LABOR_COMPLAINT_001": {}},
                "authoring_intent": "FORM_INPUT",
                "input_error": "INVALID_FIELD_VALUE",
                "field_questions": {},
            }
        ),
    )
    request = docs_request("1234")
    request["preferredLanguage"] = "ko"

    response = TestClient(app).post("/docs", json=request)

    assert response.status_code == 200
    assert response.json()["result"]["answer"] == (
        "입력한 성명 형식을 확인하지 못했습니다. 다시 입력해 주세요."
    )
    assert response.json()["result"]["documentDrafts"][0]["missingFields"][0][
        "question"
    ] == "다음 정보를 알려주세요: 성명."


def test_docs_requires_review_context(monkeypatch) -> None:
    monkeypatch.setattr(
        document_authoring,
        "run_document_authoring",
        AsyncMock(side_effect=LookupError),
    )

    response = TestClient(app).post("/docs", json=docs_request())

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "REVIEW_CONTEXT_REQUIRED"


def test_docs_rejects_blank_text() -> None:
    response = TestClient(app).post("/docs", json=docs_request(" "))

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "TEXT_INPUT_REQUIRED"


def test_docs_rejects_unknown_fields() -> None:
    request = docs_request()
    request["unknown"] = True

    response = TestClient(app).post("/docs", json=request)

    assert response.status_code == 422


def test_ready_fixture_matches_python_contract() -> None:
    fixture = Path(__file__).parents[2] / "test-fixtures/analysis/labor-complaint-ready.json"

    response = DocumentAuthoringResponse.model_validate_json(fixture.read_text())

    assert response.result is not None
    assert response.result.documentDrafts[0].status == "READY"


def test_review_and_docs_share_state_by_session_id(monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(
        agent_service,
        "get_settings",
        lambda: SimpleNamespace(checkpoint_db_path=tmp_path / "checkpoints.sqlite3"),
    )
    issue = DetectedIssue(
        issue_id="wage-1",
        title="계약보다 적은 기본급",
        summary="기본급 일부가 지급되지 않았다.",
        facts={"workerName": "NGUYEN VAN TEST"},
    )
    monkeypatch.setattr(
        review_route,
        "review_documents",
        AsyncMock(
            return_value=DocumentReview(
                answer="기본급 차이가 있습니다.",
                summary="임금 일부 미지급 가능성",
                issues=[issue],
            )
        ),
    )

    monkeypatch.setattr(
        workflow,
        "extract_document_form",
        AsyncMock(
            return_value=LaborComplaintFormData(
                complainant=ComplainantData(fullName="NGUYEN VAN TEST")
            )
        ),
    )

    async def write_form(state):
        assert state["issues"][0]["issue_id"] == "wage-1"
        assert (
            state["form_drafts"]["LABOR_COMPLAINT_001"]["complainant"]["fullName"]
            == "NGUYEN VAN TEST"
        )
        assert workflow.recent_conversation(state) == [
            {"role": "user", "content": "계약서를 검토해줘"},
            {"role": "assistant", "content": "기본급 차이가 있습니다."},
        ]
        return RemedyTurn(
            intent=AuthoringIntent.FORM_INPUT,
            form_updates=[
                FormFieldUpdate(field_id="complainant.fullName", value="NGUYEN VAN TEST")
            ],
        )

    monkeypatch.setattr(workflow, "run_remedy_agent", write_form)
    client = TestClient(app)
    review_response = client.post(
        "/review",
        json={
            "requestId": "review-1",
            "sessionId": "shared-session",
            "preferredLanguage": "vi",
            "input": {"text": "계약서를 검토해줘", "documentIds": ["doc-1"]},
            "documents": [
                {
                    "documentId": "doc-1",
                    "fileName": "contract.pdf",
                    "pages": [{"pageNumber": 1, "text": "근로자 NGUYEN VAN TEST"}],
                }
            ],
            "legalChecks": [],
        },
    )
    docs = docs_request()
    docs["sessionId"] = "shared-session"
    docs_response = client.post("/docs", json=docs)

    assert review_response.status_code == 200
    assert docs_response.status_code == 200
    data = docs_response.json()["result"]["documentDrafts"][0]["data"]
    assert data["complainant"]["fullName"] == "NGUYEN VAN TEST"


def test_guide_returns_generic_guidance_when_document_was_skipped(monkeypatch) -> None:
    monkeypatch.setattr(
        guidance,
        "get_document_form",
        AsyncMock(side_effect=LookupError("document form not found")),
    )
    resolve = AsyncMock()
    monkeypatch.setattr(guidance, "resolve_jurisdiction", resolve)

    response = TestClient(app).post(
        "/guide",
        json={
            "requestId": "guide-1",
            "sessionId": "session-1",
            "preferredLanguage": "en",
            "input": {"text": "Where should I submit it?"},
        },
    )

    assert response.status_code == 200
    result = response.json()["result"]
    assert result["jurisdictionOfficeName"] == "관할 지방고용노동관서"
    assert result["submissionOptions"][0]["url"].startswith("https://labor.moel.go.kr/")
    assert "진정서 작성 전" in result["notes"]
    resolve.assert_not_awaited()


def test_guide_returns_contract_response_for_ready_document(monkeypatch) -> None:
    fixture = Path(__file__).parents[2] / "test-fixtures/analysis/labor-complaint-ready.json"
    data = json.loads(fixture.read_text())["result"]["documentDrafts"][0]["data"]
    data["submission"]["recipientLaborOfficeName"] = None
    monkeypatch.setattr(guidance, "get_document_form", AsyncMock(return_value=data))
    resolve = AsyncMock(
        return_value=JurisdictionDecision(
            officeName="고용노동부 안산지청",
        )
    )
    monkeypatch.setattr(guidance, "resolve_jurisdiction", resolve)

    response = TestClient(app).post(
        "/guide",
        json={
            "requestId": "guide-1",
            "sessionId": "session-1",
            "preferredLanguage": "en",
            "input": {"text": "Where should I submit it?"},
        },
    )

    assert response.status_code == 200
    result = response.json()["result"]
    assert result["agencyCode"] == "MOEL"
    assert result["jurisdictionOfficeName"] == "고용노동부 안산지청"
    assert result["submissionOptions"][0]["channel"] == "ONLINE"
    assert result["submissionOptions"][0]["url"].startswith("https://labor.moel.go.kr/")
    assert result["answer"].startswith("You can submit")
    resolved_form = resolve.await_args.args[0]
    assert resolved_form.respondent.actualWorkplaceAddress == (
        "경기도 안산시 단원구 공단테스트로 30"
    )


def test_guide_falls_back_when_jurisdiction_lookup_fails(monkeypatch) -> None:
    fixture = Path(__file__).parents[2] / "test-fixtures/analysis/labor-complaint-ready.json"
    data = json.loads(fixture.read_text())["result"]["documentDrafts"][0]["data"]
    data["submission"]["recipientLaborOfficeName"] = None
    monkeypatch.setattr(guidance, "get_document_form", AsyncMock(return_value=data))
    monkeypatch.setattr(
        guidance,
        "resolve_jurisdiction",
        AsyncMock(side_effect=TimeoutError("labor office search timed out")),
    )

    response = TestClient(app).post(
        "/guide",
        json={
            "requestId": "guide-1",
            "sessionId": "session-1",
            "preferredLanguage": "ko",
            "input": {"text": "어디에 제출해야 해?"},
        },
    )

    assert response.status_code == 200
    result = response.json()["result"]
    assert result["jurisdictionOfficeName"] == "관할 지방고용노동관서"
    assert result["submissionOptions"][0]["url"].startswith("https://labor.moel.go.kr/")
    assert "관할관서 찾기" in result["notes"]


def test_parse_official_labor_office_results() -> None:
    page = """
    <th class="tit"><a href="http://www.moel.go.kr/ansan/" target="_blank">
    경기지방고용노동청안산지청</a></th>
    <td>경기도 안산시, 시흥시</td>
    """

    assert parse_offices(page) == [
        {
            "officeName": "경기지방고용노동청안산지청",
            "jurisdiction": "경기도 안산시, 시흥시",
            "homepageUrl": "https://www.moel.go.kr/ansan/",
        }
    ]


@pytest.mark.asyncio
async def test_resolve_jurisdiction_uses_official_search(monkeypatch) -> None:
    search = AsyncMock(
        side_effect=[
            [],
            [
                {
                    "officeName": "경기지방고용노동청안산지청",
                    "jurisdiction": "경기도 안산시, 시흥시",
                    "homepageUrl": "https://www.moel.go.kr/ansan/",
                }
            ],
        ]
    )
    monkeypatch.setattr(guidance, "search_labor_office", search)
    form = LaborComplaintFormData(
        respondent=RespondentData(actualWorkplaceAddress="경기도 안산시 단원구 공단로 1")
    )

    decision = await guidance.resolve_jurisdiction(form)

    assert decision.officeName == "경기지방고용노동청안산지청"
    assert [call.args[0] for call in search.await_args_list] == ["단원구", "안산시"]
