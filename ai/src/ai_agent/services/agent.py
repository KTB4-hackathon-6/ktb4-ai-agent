from functools import lru_cache

from langchain.agents import create_agent
from langchain_deepseek import ChatDeepSeek
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from ai_agent.config import get_settings
from ai_agent.services.rag.retriever import search_labor_law

SYSTEM_PROMPT = """대한민국에서 일하는 외국인 근로자를 돕는 어시스턴트다.
사용자의 언어로 간결하고 이해하기 쉽게 답한다.
법률 근거가 필요한 질문에는 search_labor_law 도구를 먼저 호출한다.
법률 판단은 검색 결과에 포함된 근거에 기반하고 법령명과 조항을 답변에 명시한다.
검색 근거가 부족하면 법 위반 여부를 확정하지 않고 추가 확인이 필요함을 안내한다."""


@lru_cache
def get_model():
    settings = get_settings()
    return ChatDeepSeek(
        model=settings.chat_model,
        api_key=settings.deepseek_api_key or None,
        temperature=0,
        extra_body={"thinking": {"type": "disabled"}},
    )


@lru_cache
def get_review_agent():
    """법령 근거로 답하는 기존 agent. 체크포인트는 상위 workflow가 관리한다."""
    return create_agent(
        get_model(),
        tools=[search_labor_law],
        system_prompt=SYSTEM_PROMPT,
    )


def get_agent(checkpointer):
    # 순환 import 회피: workflow는 이 모듈의 모델·review agent를 쓴다.
    from ai_agent.services.remedy.workflow import build_workflow

    return build_workflow(checkpointer)


async def _run_conversation(question: str, session_id: str, injected_state: dict | None = None):
    checkpoint_path = get_settings().checkpoint_db_path
    checkpoint_path.parent.mkdir(parents=True, exist_ok=True)
    async with AsyncSqliteSaver.from_conn_string(str(checkpoint_path)) as checkpointer:
        return await get_agent(checkpointer).ainvoke(
            {"messages": [{"role": "user", "content": question}], **(injected_state or {})},
            {"configurable": {"thread_id": session_id}},
        )


async def answer_question(
    question: str,
    session_id: str,
    preferred_language: str,
    injected_state: dict | None = None,
) -> str:
    """한 턴을 실행하고 자연어 답변만 돌려준다."""
    result = await _run_conversation(
        f"preferredLanguage={preferred_language}\n{question}",
        session_id,
        {"preferred_language": preferred_language, **(injected_state or {})},
    )
    return result["messages"][-1].text


async def run_document_authoring(
    text: str,
    session_id: str,
    preferred_language: str,
) -> dict:
    """문서작성 대화를 실행하고 현재 서식 초안을 포함한 state를 돌려준다."""
    checkpoint_path = get_settings().checkpoint_db_path
    checkpoint_path.parent.mkdir(parents=True, exist_ok=True)
    config = {"configurable": {"thread_id": session_id}}
    async with AsyncSqliteSaver.from_conn_string(str(checkpoint_path)) as checkpointer:
        agent = get_agent(checkpointer)
        if not (await agent.aget_state(config)).values.get("review_result"):
            raise LookupError("review state not found")
        return await agent.ainvoke(
            {
                "messages": [{"role": "user", "content": text}],
                "authoring_started": True,
                "preferred_language": preferred_language,
            },
            config,
        )


async def save_review_context(
    session_id: str,
    *,
    documents: list[dict],
    legal_checks: list[dict],
    review_result: dict,
    issues: list[dict],
    preferred_language: str,
) -> None:
    """검토 결과를 같은 sessionId의 문서작성 state에 저장한다."""
    checkpoint_path = get_settings().checkpoint_db_path
    checkpoint_path.parent.mkdir(parents=True, exist_ok=True)
    config = {"configurable": {"thread_id": session_id}}
    async with AsyncSqliteSaver.from_conn_string(str(checkpoint_path)) as checkpointer:
        await get_agent(checkpointer).aupdate_state(
            config,
            {
                "documents": documents,
                "legal_checks": legal_checks,
                "review_result": review_result,
                "issues": issues,
                "preferred_language": preferred_language,
                "authoring_started": False,
                "form_drafts": {},
            },
        )


async def get_document_form(session_id: str) -> dict | None:
    """같은 세션의 진정서 초안을 읽는다."""
    checkpoint_path = get_settings().checkpoint_db_path
    checkpoint_path.parent.mkdir(parents=True, exist_ok=True)
    config = {"configurable": {"thread_id": session_id}}
    async with AsyncSqliteSaver.from_conn_string(str(checkpoint_path)) as checkpointer:
        state = (await get_agent(checkpointer).aget_state(config)).values
        if not state.get("review_result"):
            raise LookupError("review state not found")
        return (state.get("form_drafts") or {}).get("LABOR_COMPLAINT_001")
