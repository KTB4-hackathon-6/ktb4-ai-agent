from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi.testclient import TestClient

from ai_agent.api.routes import analyze
from ai_agent.main import app
from ai_agent.services import agent as agent_service
from ai_agent.services.rag.retriever import search_labor_law

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
    answer_question.assert_awaited_once_with("관리비를 회사가 빼도 돼?", "session-1")


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


def test_review_agent_uses_deepseek(monkeypatch) -> None:
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
    agent_service.get_model.cache_clear()
    agent_service.get_review_agent.cache_clear()

    assert agent_service.get_review_agent() is agent
    model_factory.assert_called_once_with(
        model="deepseek-v4-flash",
        api_key="key",
        extra_body={"thinking": {"type": "disabled"}},
    )
    # 체크포인트는 상위 workflow가 갖는다. review agent는 subgraph처럼 호출된다.
    agent_factory.assert_called_once_with(
        model,
        tools=[search_labor_law],
        system_prompt=agent_service.SYSTEM_PROMPT,
    )
    agent_service.get_model.cache_clear()
    agent_service.get_review_agent.cache_clear()


@pytest.mark.asyncio
async def test_answer_question_uses_session_as_thread_id(monkeypatch, tmp_path) -> None:
    saver = object()
    agent = SimpleNamespace(
        ainvoke=AsyncMock(return_value={"messages": [SimpleNamespace(text="확인이 필요합니다.")]})
    )

    class SaverContext:
        async def __aenter__(self):
            return saver

        async def __aexit__(self, *args):
            return None

    from_conn_string = Mock(return_value=SaverContext())
    monkeypatch.setattr(
        agent_service,
        "get_settings",
        lambda: SimpleNamespace(checkpoint_db_path=tmp_path / "checkpoints.sqlite3"),
    )
    monkeypatch.setattr(agent_service.AsyncSqliteSaver, "from_conn_string", from_conn_string)
    monkeypatch.setattr(agent_service, "get_agent", Mock(return_value=agent))

    answer = await agent_service.answer_question("앞선 질문 기억해?", "session-1")

    assert answer == "확인이 필요합니다."
    from_conn_string.assert_called_once_with(str(tmp_path / "checkpoints.sqlite3"))
    agent.ainvoke.assert_awaited_once_with(
        {"messages": [{"role": "user", "content": "앞선 질문 기억해?"}]},
        {"configurable": {"thread_id": "session-1"}},
    )
