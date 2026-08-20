from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi.testclient import TestClient
from langchain_core.messages import ToolMessage

from ai_agent.api.routes import analyze
from ai_agent.main import app
from ai_agent.schemas.analyze import AnalyzeRequest
from ai_agent.services import agent as agent_service
from ai_agent.services import reviewer as reviewer_service
from ai_agent.services.rag.retriever import search_labor_law
from ai_agent.services.remedy.models import DetectedIssue
from ai_agent.services.reviewer import DocumentReview, deduplicate_issues

REQUEST = {
    "requestId": "req-1",
    "sessionId": "session-1",
    "preferredLanguage": "vi",
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
            "checkId": "ACCOMMODATION_DEDUCTION_HIGH",
            "result": "REVIEW_REQUIRED",
            "lawName": "외국인근로자의 고용 등에 관한 법률",
            "article": "숙식비 공제지침",
            "message": "숙박비 공제가 월급 대비 과다하지 않은지 확인이 필요합니다.",
        }
    ],
}


def test_analyze_contract_accepts_rest_time_review_check() -> None:
    request = AnalyzeRequest.model_validate(
        {
            **REQUEST,
            "legalChecks": [
                {
                    "checkId": "REST_TIME_NEEDS_REVIEW",
                    "result": "REVIEW_REQUIRED",
                    "lawName": "근로기준법",
                    "article": "제54조",
                    "message": "휴게시간이 계약서에 명시되어 있는지 확인되지 않았습니다.",
                }
            ],
        }
    )

    assert request.legalChecks[0].checkId.value == "REST_TIME_NEEDS_REVIEW"


def test_analyze_uses_only_input_text(monkeypatch) -> None:
    answer_question = AsyncMock(return_value="확인이 필요합니다.")
    monkeypatch.setattr(analyze, "answer_question", answer_question)
    request = {
        **REQUEST,
        "input": {"text": "관리비를 회사가 빼도 돼?", "documentIds": []},
        "documents": [],
        "legalChecks": [],
    }

    response = TestClient(app).post("/review", json=request)

    assert response.status_code == 200
    assert response.json() == {
        "requestId": "req-1",
        "sessionId": "session-1",
        "status": "COMPLETED",
        "result": {"answer": "확인이 필요합니다.", "analysis": None},
        "error": None,
    }
    answer_question.assert_awaited_once_with("관리비를 회사가 빼도 돼?", "session-1", "vi")


def test_analyze_returns_document_review_without_starting_remedy(monkeypatch) -> None:
    issue = DetectedIssue(
        issue_id="housing-1",
        title="계약보다 많은 숙식비 공제",
        summary="계약과 다른 숙식비가 공제됐습니다.",
        facts={"contract_fee": "80000", "deducted_fee": "200000"},
        severity="HIGH",
        related_check_ids=["check-1"],
        related_document_ids=["doc-1"],
    )
    review_documents = AsyncMock(
        return_value=DocumentReview(
            answer="계약과 다른 숙식비 공제 가능성이 있습니다.",
            summary="숙식비 공제 문제를 확인했습니다.",
            issues=[issue],
            next_actions=["공제액 반환 또는 사업장 변경 의사를 확인합니다."],
        )
    )
    answer_question = AsyncMock()
    save_review_context = AsyncMock()
    monkeypatch.setattr(analyze, "review_documents", review_documents)
    monkeypatch.setattr(analyze, "answer_question", answer_question)
    monkeypatch.setattr(analyze, "save_review_context", save_review_context)

    response = TestClient(app).post("/review", json=REQUEST)

    assert response.status_code == 200
    assert response.json()["result"] == {
        "answer": "계약과 다른 숙식비 공제 가능성이 있습니다.",
        "analysis": {
            "summary": "숙식비 공제 문제를 확인했습니다.",
            "findings": [
                {
                    "title": "계약보다 많은 숙식비 공제",
                    "description": "계약과 다른 숙식비가 공제됐습니다.",
                    "severity": "HIGH",
                    "relatedDocumentIds": ["doc-1"],
                }
            ],
            "nextActions": ["공제액 반환 또는 사업장 변경 의사를 확인합니다."],
        },
    }
    review_documents.assert_awaited_once()
    assert review_documents.await_args.kwargs["preferred_language"] == "vi"
    answer_question.assert_not_awaited()
    save_review_context.assert_awaited_once()
    assert save_review_context.await_args.kwargs["user_message"] == (
        "관리비를 회사가 빼도 돼?"
    )
    assert save_review_context.await_args.kwargs["assistant_message"] == (
        "계약과 다른 숙식비 공제 가능성이 있습니다."
    )


def test_document_review_deduplicates_same_legal_check() -> None:
    first = DetectedIssue(
        issue_id="housing-1",
        title="계약보다 많은 숙식비 공제",
        summary="숙식비가 계약보다 많이 공제됐습니다.",
        related_check_ids=["check-1"],
    )
    duplicate = DetectedIssue(
        issue_id="wage-1",
        title="같은 숙식비 초과 공제",
        summary="같은 공제액이 임금 미지급일 수 있습니다.",
        related_check_ids=["check-1"],
    )

    assert deduplicate_issues([first, duplicate]) == [first]


def test_document_reviewer_limits_law_search_and_model_calls(monkeypatch) -> None:
    model = object()
    agent = object()
    agent_factory = Mock(return_value=agent)
    monkeypatch.setattr(agent_service, "get_model", lambda: model)
    monkeypatch.setattr(reviewer_service, "create_agent", agent_factory)
    reviewer_service.get_reviewer_agent.cache_clear()

    assert reviewer_service.get_reviewer_agent() is agent
    tool_limiter, model_limiter = agent_factory.call_args.kwargs["middleware"]
    assert tool_limiter.tool_name == "search_labor_law"
    assert tool_limiter.run_limit == 5
    assert tool_limiter.exit_behavior == "end"
    assert model_limiter.run_limit == 7
    assert model_limiter.exit_behavior == "error"

    reviewer_service.get_reviewer_agent.cache_clear()


def test_document_reviewer_prompt_uses_preferred_language() -> None:
    assert "입력의 preferredLanguage" in reviewer_service.SYSTEM_PROMPT
    assert "사용자에게 보이는 모든 자연어" in reviewer_service.SYSTEM_PROMPT


@pytest.mark.asyncio
async def test_document_review_passes_trace_metadata(monkeypatch) -> None:
    review = DocumentReview(answer="답변", summary="요약")
    agent = SimpleNamespace(ainvoke=AsyncMock(return_value={"structured_response": review}))
    tracer = object()
    monkeypatch.setattr(reviewer_service, "get_reviewer_agent", lambda: agent)
    monkeypatch.setattr(reviewer_service, "get_langsmith_tracer", lambda: tracer)

    result = await reviewer_service.review_documents(
        "확인해줘",
        [],
        [],
        request_id="req-1",
        session_id="session-1",
        preferred_language="vi",
    )

    assert result == review
    agent.ainvoke.assert_awaited_once()
    assert agent.ainvoke.await_args.args[1] == {
        "callbacks": [tracer],
        "run_name": "problem-review-agent",
        "metadata": {
            "request_id": "req-1",
            "session_id": "session-1",
        },
    }


@pytest.mark.asyncio
async def test_document_review_finalizes_after_search_limit(monkeypatch) -> None:
    review = DocumentReview(answer="현재 근거로 답변", summary="검토 완료")
    agent = SimpleNamespace(
        ainvoke=AsyncMock(
            return_value={
                "messages": [
                    ToolMessage(
                        content="근로기준법 제43조 검색 결과",
                        tool_call_id="call-1",
                        status="success",
                    )
                ]
            }
        )
    )
    finalizer = SimpleNamespace(ainvoke=AsyncMock(return_value={"structured_response": review}))
    monkeypatch.setattr(reviewer_service, "get_reviewer_agent", lambda: agent)
    monkeypatch.setattr(reviewer_service, "get_reviewer_finalizer", lambda: finalizer)
    monkeypatch.setattr(reviewer_service, "get_langsmith_tracer", lambda: None)

    result = await reviewer_service.review_documents(
        "확인해줘",
        [],
        [],
        request_id="req-1",
        session_id="session-1",
        preferred_language="vi",
    )

    assert result == review
    finalizer.ainvoke.assert_awaited_once()
    messages = finalizer.ainvoke.await_args.args[0]["messages"]
    assert messages[0].content
    assert messages[1].content == "확보한 법령 검색 결과:\n근로기준법 제43조 검색 결과"


def test_analyze_rejects_null_text_with_documents() -> None:
    request = {**REQUEST, "input": {"text": None, "documentIds": ["doc-1"]}}

    response = TestClient(app).post("/review", json=request)

    assert response.status_code == 422


def test_analyze_rejects_empty_request() -> None:
    request = {
        **REQUEST,
        "input": {"text": "  ", "documentIds": []},
        "documents": [],
        "legalChecks": [],
    }

    response = TestClient(app).post("/review", json=request)

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "TEXT_INPUT_REQUIRED"


def test_analyze_rejects_mismatched_document_ids() -> None:
    request = {**REQUEST, "input": {"text": "검토해줘", "documentIds": []}}

    response = TestClient(app).post("/review", json=request)

    assert response.status_code == 422


def test_analyze_returns_structured_model_error(monkeypatch) -> None:
    monkeypatch.setattr(
        analyze,
        "answer_question",
        AsyncMock(side_effect=RuntimeError("provider error")),
    )

    request = {
        **REQUEST,
        "input": {"text": "관리비를 회사가 빼도 돼?", "documentIds": []},
        "documents": [],
        "legalChecks": [],
    }
    response = TestClient(app).post("/review", json=request)

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
        temperature=0,
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

    answer = await agent_service.answer_question("앞선 질문 기억해?", "session-1", "vi")

    assert answer == "확인이 필요합니다."
    from_conn_string.assert_called_once_with(str(tmp_path / "checkpoints.sqlite3"))
    agent.ainvoke.assert_awaited_once_with(
        {
            "messages": [
                {"role": "user", "content": "preferredLanguage=vi\n앞선 질문 기억해?"}
            ],
            "preferred_language": "vi",
        },
        {"configurable": {"thread_id": "session-1"}},
    )


def test_every_language_has_localized_messages():
    """언어 추가 시 응답 문구 dict 누락을 막는다."""
    from ai_agent.api.routes.document_authoring import READY_MESSAGES
    from ai_agent.api.routes.guidance import ANSWERS
    from ai_agent.schemas.analyze import PreferredLanguage

    codes = {language.value for language in PreferredLanguage}
    assert codes <= ANSWERS.keys()
    assert codes <= READY_MESSAGES.keys()
