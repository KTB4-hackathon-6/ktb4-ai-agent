from functools import lru_cache

from langchain.agents import create_agent
from langchain_deepseek import ChatDeepSeek

from ai_agent.config import get_settings

SYSTEM_PROMPT = """대한민국에서 일하는 외국인 근로자를 돕는 어시스턴트다.
사용자의 언어로 간결하고 이해하기 쉽게 답한다.
현재 법률 검색 도구와 문서 증거는 제공되지 않았으므로 법 위반 여부를 확정하지 않는다.
법적 판단이 필요한 질문에는 추가로 필요한 정보와 공식 법적 근거 확인이 필요함을 안내한다."""


@lru_cache
def get_agent():
    settings = get_settings()
    model = ChatDeepSeek(
        model=settings.chat_model,
        api_key=settings.deepseek_api_key or None,
        extra_body={"thinking": {"type": "disabled"}},
    )
    return create_agent(model, tools=[], system_prompt=SYSTEM_PROMPT)


async def answer_question(question: str) -> str:
    result = await get_agent().ainvoke({"messages": [{"role": "user", "content": question}]})
    return result["messages"][-1].text
