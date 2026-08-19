from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

from fastapi.testclient import TestClient

from ai_agent.api.routes import analyze
from ai_agent.main import app
from ai_agent.services import agent as agent_service

REQUEST = {
    "requestId": "req-1",
    "sessionId": "session-1",
    "input": {"text": "관리비를 회사가 빼도 돼?", "documentIds": ["doc-1"]},
    "documents": [
        {
            "documentId": "doc-1",
            "fileName": "contract.pdf",
            "pages": [{"pageNumber": 1, "text": "계약 내용"}],
        }
    ],
    "legalChecks": [
        {
            "checkId": "check-1",
            "legalReference": {
                "lawName": "근로기준법",
                "article": "제43조",
                "paragraph": None,
                "item": None,
            },
            "result": "UNKNOWN",
            "reason": None,
            "relatedDocumentIds": ["doc-1"],
            "values": {},
        }
    ],
}


def test_analyze_uses_only_input_text(monkeypatch) -> None:
    answer_question = AsyncMock(return_value="확인이 필요합니다.")
    monkeypatch.setattr(analyze, "answer_question", answer_question)

    response = TestClient(app).post("/analyze", json=REQUEST)

    assert response.status_code == 200
    assert response.json() == {
        "requestId": "req-1",
        "sessionId": "session-1",
        "status": "COMPLETED",
        "result": {"answer": "확인이 필요합니다.", "analysis": None},
        "error": None,
    }
    answer_question.assert_awaited_once_with("관리비를 회사가 빼도 돼?")


def test_analyze_accepts_null_text() -> None:
    request = {**REQUEST, "input": {"text": None, "documentIds": ["doc-1"]}}

    response = TestClient(app).post("/analyze", json=request)

    assert response.status_code == 400
    assert response.json() == {
        "requestId": "req-1",
        "sessionId": "session-1",
        "status": "FAILED",
        "result": None,
        "error": {
            "code": "TEXT_INPUT_REQUIRED",
            "message": "현재는 input.text가 필요합니다.",
        },
    }


def test_analyze_returns_structured_model_error(monkeypatch) -> None:
    monkeypatch.setattr(
        analyze,
        "answer_question",
        AsyncMock(side_effect=RuntimeError("provider error")),
    )

    response = TestClient(app).post("/analyze", json=REQUEST)

    assert response.status_code == 502
    assert response.json() == {
        "requestId": "req-1",
        "sessionId": "session-1",
        "status": "FAILED",
        "result": None,
        "error": {
            "code": "MODEL_REQUEST_FAILED",
            "message": "AI 모델 요청에 실패했습니다.",
        },
    }


def test_agent_uses_deepseek(monkeypatch) -> None:
    model = object()
    agent = object()
    model_factory = Mock(return_value=model)
    agent_factory = Mock(return_value=agent)
    monkeypatch.setattr(
        agent_service,
        "get_settings",
        lambda: SimpleNamespace(chat_model="deepseek-v4-flash", deepseek_api_key="key"),
    )
    monkeypatch.setattr(agent_service, "ChatDeepSeek", model_factory)
    monkeypatch.setattr(agent_service, "create_agent", agent_factory)
    agent_service.get_agent.cache_clear()

    assert agent_service.get_agent() is agent
    model_factory.assert_called_once_with(
        model="deepseek-v4-flash",
        api_key="key",
        extra_body={"thinking": {"type": "disabled"}},
    )
    agent_factory.assert_called_once_with(
        model, tools=[], system_prompt=agent_service.SYSTEM_PROMPT
    )
    agent_service.get_agent.cache_clear()
