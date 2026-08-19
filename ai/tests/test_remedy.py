from types import SimpleNamespace

import pytest
from langchain_core.messages import AIMessage
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from ai_agent.services import agent as agent_service
from ai_agent.services.remedy import workflow
from ai_agent.services.remedy.guides import REMEDY_GUIDES
from ai_agent.services.remedy.models import DetectedIssue, IssueType
from ai_agent.services.remedy.workflow import RemedyTurn


def housing_issue() -> DetectedIssue:
    return DetectedIssue(
        issue_id="housing-1",
        issue_type=IssueType.HOUSING_DEDUCTION,
        summary="급여에서 계약과 다른 숙식비가 공제됐다.",
        facts={"worker_name": "응우옌 반 남", "deduction_amount": "월 20만원"},
    )


@pytest.fixture
def run_turn(monkeypatch, tmp_path):
    path = tmp_path / "checkpoints.sqlite3"
    monkeypatch.setattr(
        agent_service, "get_settings", lambda: SimpleNamespace(checkpoint_db_path=path)
    )

    async def turn(text: str, session_id: str = "session-1", injected: dict | None = None) -> str:
        return await agent_service.answer_question(text, session_id, injected)

    async def read(session_id: str = "session-1"):
        async with AsyncSqliteSaver.from_conn_string(str(path)) as checkpointer:
            snapshot = await workflow.build_workflow(checkpointer).aget_state(
                {"configurable": {"thread_id": session_id}}
            )
        return snapshot.values

    turn.read = read
    return turn


@pytest.mark.asyncio
async def test_without_detected_issue_uses_review_agent(run_turn, monkeypatch) -> None:
    async def review(state):
        return {"messages": [AIMessage("법률 설명 답변")]}

    monkeypatch.setattr(workflow, "review", review)

    assert await run_turn("퇴직금이 뭐예요?") == "법률 설명 답변"


@pytest.mark.asyncio
async def test_agent_can_plan_multiple_remedies_and_forms(run_turn, monkeypatch) -> None:
    async def decide(state):
        return RemedyTurn(
            answer="공제액 반환과 사업장 변경을 함께 진행할 수 있습니다.",
            remedy_plan=["임금체불 진정", "사업장 변경 신청"],
            selected_forms=["SN001", "A522A"],
            field_updates={
                "SN001": {"worker_name": "응우옌 반 남", "deduction_amount": "월 20만원"},
                "A522A": {"worker_name": "응우옌 반 남"},
            },
        )

    monkeypatch.setattr(workflow, "run_remedy_agent", decide)

    answer = await run_turn(
        "돈도 돌려받고 사업장도 바꾸고 싶어요", injected={"issues": [housing_issue()]}
    )
    state = await run_turn.read()

    assert answer == "공제액 반환과 사업장 변경을 함께 진행할 수 있습니다."
    assert state["remedy_plan"] == ["임금체불 진정", "사업장 변경 신청"]
    assert state["selected_forms"] == ["SN001", "A522A"]
    assert state["form_drafts"]["SN001"]["deduction_amount"] == "월 20만원"


@pytest.mark.asyncio
async def test_free_talk_updates_multiple_fields_without_losing_state(
    run_turn, monkeypatch
) -> None:
    turns = iter(
        [
            RemedyTurn(
                answer="사업장 정보를 알려주세요.",
                remedy_plan=["임금체불 진정"],
                selected_forms=["SN001"],
                field_updates={"SN001": {"worker_name": "응우옌 반 남"}},
            ),
            RemedyTurn(
                answer="두 항목을 반영했습니다.",
                selected_forms=["SN001"],
                field_updates={
                    "SN001": {"workplace_name": "대한농장", "phone_number": "010-1234-5678"}
                },
            ),
        ]
    )

    async def decide(state):
        return next(turns)

    monkeypatch.setattr(workflow, "run_remedy_agent", decide)
    await run_turn("숙식비 반환 진정을 작성해줘", injected={"issues": [housing_issue()]})
    await run_turn("대한농장에서 일했고 번호는 010-1234-5678이에요")
    state = await run_turn.read()

    assert state["remedy_plan"] == ["임금체불 진정"]
    assert state["form_drafts"]["SN001"] == {
        "worker_name": "응우옌 반 남",
        "workplace_name": "대한농장",
        "phone_number": "010-1234-5678",
    }


def test_housing_guide_covers_refund_and_workplace_change() -> None:
    assert "SN001" in REMEDY_GUIDES
    assert "A522A" in REMEDY_GUIDES
    assert "함께 진행" in REMEDY_GUIDES
