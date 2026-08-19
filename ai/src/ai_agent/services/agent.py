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


async def answer_question(
    question: str, session_id: str, injected_state: dict | None = None
) -> str:
    """한 턴을 실행하고 자연어 답변만 돌려준다.

    `injected_state`는 문제 판단 Agent가 아직 없는 동안 DetectedIssue를 직접 넣어
    구제 workflow를 테스트하기 위한 경계다. /analyze는 넘기지 않는다.
    """
    checkpoint_path = get_settings().checkpoint_db_path
    checkpoint_path.parent.mkdir(parents=True, exist_ok=True)
    async with AsyncSqliteSaver.from_conn_string(str(checkpoint_path)) as checkpointer:
        result = await get_agent(checkpointer).ainvoke(
            {"messages": [{"role": "user", "content": question}], **(injected_state or {})},
            {"configurable": {"thread_id": session_id}},
        )
    return result["messages"][-1].text
