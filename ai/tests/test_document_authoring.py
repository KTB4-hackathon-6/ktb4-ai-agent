from types import SimpleNamespace
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage

from ai_agent.api.routes import analyze as review_route
from ai_agent.api.routes import document_authoring
from ai_agent.main import app
from ai_agent.services import agent as agent_service
from ai_agent.services.remedy import workflow
from ai_agent.services.remedy.models import DetectedIssue
from ai_agent.services.remedy.workflow import RemedyTurn
from ai_agent.services.reviewer import DocumentReview


def test_docs_returns_full_sn001_snapshot(monkeypatch) -> None:
    run = AsyncMock(
        return_value={
            "messages": [AIMessage("사업장 주소를 알려주세요.")],
            "form_drafts": {"SN001": {"workerName": "응우옌 반 남"}},
        }
    )
    monkeypatch.setattr(document_authoring, "run_document_authoring", run)

    response = TestClient(app).post(
        "/docs",
        json={
            "requestId": "req-1",
            "sessionId": "session-1",
            "input": {"text": None},
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["requestId"] == "req-1"
    assert body["sessionId"] == "session-1"
    assert body["status"] == "COMPLETED"
    assert body["result"]["answer"] == "사업장 주소를 알려주세요."
    assert body["result"]["form"]["formId"] == "SN001"
    assert body["result"]["form"]["fields"]["workerName"] == "응우옌 반 남"
    assert body["result"]["form"]["fields"]["workerPhone"] is None
    assert body["error"] is None
    run.assert_awaited_once_with("", "session-1")


def test_docs_requires_review_state(monkeypatch) -> None:
    monkeypatch.setattr(
        document_authoring,
        "run_document_authoring",
        AsyncMock(side_effect=LookupError),
    )

    response = TestClient(app).post(
        "/docs",
        json={
            "requestId": "req-1",
            "sessionId": "new-session",
            "input": {"text": "작성해줘"},
        },
    )

    assert response.status_code == 409
    assert response.json()["error"] == {
        "code": "REVIEW_REQUIRED",
        "message": "먼저 같은 sessionId로 /review를 실행해야 합니다.",
    }


def test_review_and_docs_share_state_by_session_id(monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(
        agent_service,
        "get_settings",
        lambda: SimpleNamespace(checkpoint_db_path=tmp_path / "checkpoints.sqlite3"),
    )
    issue = DetectedIssue(
        issue_id="wage-1",
        title="계약보다 적은 기본급",
        summary="기본급 20만원이 미지급됐다.",
        facts={"workerName": "응우옌 반 남", "claimAmount": "200,000원"},
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

    async def write_form(state):
        assert state["issues"][0]["issue_id"] == "wage-1"
        return RemedyTurn(
            answer="근로자 전화번호를 알려주세요.",
            selected_forms=["SN001"],
            field_updates={
                "SN001": {
                    "workerName": state["issues"][0]["facts"]["workerName"],
                    "claimAmount": state["issues"][0]["facts"]["claimAmount"],
                }
            },
        )

    monkeypatch.setattr(workflow, "run_remedy_agent", write_form)
    client = TestClient(app)
    review_response = client.post(
        "/review",
        json={
            "requestId": "review-1",
            "sessionId": "shared-session",
            "input": {"text": None, "documentIds": ["doc-1"]},
            "documents": [
                {
                    "documentId": "doc-1",
                    "fileName": "contract.pdf",
                    "pages": [{"pageNumber": 1, "text": "근로자 응우옌 반 남"}],
                }
            ],
            "legalChecks": [],
        },
    )
    docs_response = client.post(
        "/docs",
        json={
            "requestId": "docs-1",
            "sessionId": "shared-session",
            "input": {"text": None},
        },
    )

    assert review_response.status_code == 200
    assert docs_response.status_code == 200
    fields = docs_response.json()["result"]["form"]["fields"]
    assert fields["workerName"] == "응우옌 반 남"
    assert fields["claimAmount"] == "200,000원"
