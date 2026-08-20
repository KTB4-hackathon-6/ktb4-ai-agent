import json
from types import SimpleNamespace

import pytest
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from ai_agent.schemas.document_authoring import (
    ComplainantData,
    LaborComplaintFormData,
    RespondentData,
)
from ai_agent.services import agent as agent_service
from ai_agent.services.remedy import workflow
from ai_agent.services.remedy.guides import DOCUMENT_AUTHORING_SYSTEM_PROMPT
from ai_agent.services.remedy.models import DetectedIssue
from ai_agent.services.remedy.workflow import AuthoringIntent, RemedyTurn


def housing_issue() -> DetectedIssue:
    return DetectedIssue(
        issue_id="housing-1",
        title="계약보다 많은 숙식비 공제",
        summary="급여에서 계약과 다른 숙식비가 공제됐다.",
        facts={"worker_name": "응우옌 반 남", "deduction_amount": "월 20만원"},
    )


@pytest.fixture
def run_turn(monkeypatch, tmp_path):
    path = tmp_path / "checkpoints.sqlite3"
    monkeypatch.setattr(
        agent_service, "get_settings", lambda: SimpleNamespace(checkpoint_db_path=path)
    )

    async def empty_document_form(_documents):
        return LaborComplaintFormData()

    monkeypatch.setattr(workflow, "extract_document_form", empty_document_form)

    async def turn(text: str, session_id: str = "session-1", injected: dict | None = None) -> str:
        return await agent_service.answer_question(text, session_id, "ko", injected)

    async def read(session_id: str = "session-1"):
        async with AsyncSqliteSaver.from_conn_string(str(path)) as checkpointer:
            snapshot = await workflow.build_workflow(checkpointer).aget_state(
                {"configurable": {"thread_id": session_id}}
            )
        return snapshot.values

    async def save(session_id: str = "session-1"):
        await agent_service.save_review_context(
            session_id,
            documents=[{"documentId": "doc-1", "text": "사업주 대한농장"}],
            legal_checks=[],
            review_result={"answer": "임금체불 가능성", "issues": ["housing-1"]},
            issues=[housing_issue().model_dump(mode="json")],
            preferred_language="ko",
            user_message="계약서를 검토해줘",
            assistant_message="임금체불 가능성",
        )

    async def docs(text: str, session_id: str = "session-1"):
        return await agent_service.run_document_authoring(text, session_id, "ko")

    turn.read = read
    turn.save = save
    turn.docs = docs
    return turn


@pytest.mark.asyncio
async def test_without_detected_issue_uses_review_agent(run_turn, monkeypatch) -> None:
    async def review(state):
        return {"messages": [AIMessage("법률 설명 답변")]}

    monkeypatch.setattr(workflow, "review", review)

    assert await run_turn("퇴직금이 뭐예요?") == "법률 설명 답변"


@pytest.mark.asyncio
async def test_document_authoring_uses_review_state_and_fixed_sn001(run_turn, monkeypatch) -> None:
    async def decide(state):
        assert state["review_result"]["answer"] == "임금체불 가능성"
        assert state["documents"][0]["documentId"] == "doc-1"
        return RemedyTurn(
            intent=AuthoringIntent.FORM_INPUT,
            remedy_plan=["SN001 작성"],
            form_data=LaborComplaintFormData(
                complainant=ComplainantData(fullName="응우옌 반 남"),
            ),
        )

    monkeypatch.setattr(workflow, "run_remedy_agent", decide)

    await run_turn.save()
    await run_turn.docs("")
    state = await run_turn.read()

    assert state["authoring_intent"] == "FORM_INPUT"
    assert state["form_drafts"]["LABOR_COMPLAINT_001"]["complainant"]["fullName"] == (
        "응우옌 반 남"
    )


@pytest.mark.asyncio
async def test_first_authoring_turn_extracts_document_fields_once(run_turn, monkeypatch) -> None:
    extracted = 0

    async def extract(documents):
        nonlocal extracted
        extracted += 1
        assert documents[0]["documentId"] == "doc-1"
        return LaborComplaintFormData(
            complainant=ComplainantData(fullName="응우옌 반 남"),
            respondent=RespondentData(
                workplaceName="대한농장",
                actualWorkplaceAddress="충남 논산시",
            ),
        )

    async def decide(state):
        form = state["form_drafts"]["LABOR_COMPLAINT_001"]
        assert form["complainant"]["fullName"] == "응우옌 반 남"
        assert form["respondent"]["workplaceName"] == "대한농장"
        return RemedyTurn(
            intent=AuthoringIntent.FORM_INPUT,
            form_data=LaborComplaintFormData(**form),
        )

    monkeypatch.setattr(workflow, "extract_document_form", extract)
    monkeypatch.setattr(workflow, "run_remedy_agent", decide)
    await run_turn.save()
    await run_turn.docs("진정서를 작성해줘")
    await run_turn.docs("계속 작성해줘")

    assert extracted == 1


@pytest.mark.asyncio
async def test_free_talk_updates_multiple_fields_without_losing_state(
    run_turn, monkeypatch
) -> None:
    turns = iter(
        [
            RemedyTurn(
                intent=AuthoringIntent.FORM_INPUT,
                remedy_plan=["임금체불 진정"],
                form_data=LaborComplaintFormData(
                    complainant=ComplainantData(fullName="응우옌 반 남")
                ),
            ),
            RemedyTurn(
                intent=AuthoringIntent.FORM_INPUT,
                form_data=LaborComplaintFormData(
                    complainant=ComplainantData(
                        fullName="응우옌 반 남", mobilePhone="010-1234-5678"
                    ),
                    respondent=RespondentData(workplaceName="대한농장"),
                ),
            ),
        ]
    )

    async def decide(state):
        return next(turns)

    monkeypatch.setattr(workflow, "run_remedy_agent", decide)
    await run_turn.save()
    await run_turn.docs("숙식비 반환 진정을 작성해줘")
    await run_turn.docs("대한농장에서 일했고 번호는 010-1234-5678이에요")
    state = await run_turn.read()

    assert state["remedy_plan"] == ["임금체불 진정"]
    form = state["form_drafts"]["LABOR_COMPLAINT_001"]
    assert form["complainant"]["mobilePhone"] == "010-1234-5678"
    assert form["respondent"]["workplaceName"] == "대한농장"


@pytest.mark.asyncio
async def test_review_refresh_preserves_existing_form_draft(run_turn, monkeypatch) -> None:
    async def decide(state):
        return RemedyTurn(
            intent=AuthoringIntent.FORM_INPUT,
            form_data=LaborComplaintFormData(complainant=ComplainantData(fullName="응우옌 반 남")),
        )

    monkeypatch.setattr(workflow, "run_remedy_agent", decide)
    await run_turn.save()
    await run_turn.docs("진정서를 작성해줘")
    await run_turn.save()

    state = await run_turn.read()
    assert state["form_drafts"]["LABOR_COMPLAINT_001"]["complainant"]["fullName"] == "응우옌 반 남"


def test_recent_conversation_excludes_current_user_message() -> None:
    state = {
        "messages": [
            HumanMessage("제 이름은 응우옌 반 남입니다."),
            AIMessage("확인했습니다."),
            HumanMessage("진정서를 작성해줘"),
        ]
    }

    assert workflow.recent_conversation(state) == [
        {"role": "user", "content": "제 이름은 응우옌 반 남입니다."},
        {"role": "assistant", "content": "확인했습니다."},
    ]


@pytest.mark.asyncio
async def test_remedy_agent_includes_pending_field_context(monkeypatch) -> None:
    captured = {}

    class Agent:
        async def ainvoke(self, request):
            captured.update(json.loads(request["messages"][0].text))
            return {
                "structured_response": RemedyTurn(
                    intent=AuthoringIntent.FORM_INPUT,
                    form_data=LaborComplaintFormData(
                        complainant=ComplainantData(
                            fullName="응우옌 반 남", address="배곧 1로 27-16"
                        )
                    ),
                )
            }

    monkeypatch.setattr(workflow, "get_remedy_agent", lambda: Agent())
    await workflow.run_remedy_agent(
        {
            "messages": [HumanMessage("배곧 1로 27-16")],
            "form_drafts": {"LABOR_COMPLAINT_001": {"complainant": {"fullName": "응우옌 반 남"}}},
            "field_questions": {"complainant.address": "거주지를 알려주세요."},
        }
    )

    assert captured["pendingFieldId"] == "complainant.address"
    assert captured["pendingQuestion"] == "거주지를 알려주세요."


@pytest.mark.asyncio
async def test_document_authoring_requires_same_session_review(run_turn) -> None:
    with pytest.raises(LookupError):
        await run_turn.docs("작성해줘", session_id="other-session")


def test_document_authoring_prompt_uses_integrated_form_contract() -> None:
    assert "complainant" in DOCUMENT_AUTHORING_SYSTEM_PROMPT
    assert "LABOR_COMPLAINT_001" not in DOCUMENT_AUTHORING_SYSTEM_PROMPT
    assert "이미 채워진 필드는 다시 묻지 않는다" in DOCUMENT_AUTHORING_SYSTEM_PROMPT
    assert "사용자에게 관할 관서를" in DOCUMENT_AUTHORING_SYSTEM_PROMPT


def test_labor_office_is_not_user_required_form_input() -> None:
    form = LaborComplaintFormData(
        complainant=ComplainantData(
            fullName="응우옌 반 남",
            address="경기도 안산시",
            mobilePhone="010-1234-5678",
        ),
        respondent=RespondentData(
            fullName="김사업",
            workplaceType="WORKPLACE",
            workplaceName="테스트산업",
            actualWorkplaceAddress="경기도 안산시 단원구 공단로 1",
        ),
        complaint={
            "employmentStartDate": "2025-01-01",
            "employmentStatus": "EMPLOYED",
            "jobDescription": "생산직",
            "contractMethod": "WRITTEN",
            "details": "임금 일부가 지급되지 않았다.",
        },
    )

    assert form.submission.recipientLaborOfficeName is None
    assert form.required_missing_field_ids() == []
