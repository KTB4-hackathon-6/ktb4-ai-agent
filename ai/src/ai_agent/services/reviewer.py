"""백엔드가 보낸 문서와 확정된 검증 결과에서 구제 대상 문제를 찾는다."""

import asyncio
import json
from functools import lru_cache

from langchain.agents import create_agent
from langchain.agents.middleware import (
    ModelCallLimitMiddleware,
    ToolCallLimitMiddleware,
)
from langchain.agents.structured_output import ToolStrategy
from langchain_core.messages import HumanMessage, ToolMessage
from langchain_core.tracers import LangChainTracer
from langsmith import Client
from pydantic import BaseModel, Field

from ai_agent.config import get_settings
from ai_agent.schemas.analyze import Document, LegalCheck
from ai_agent.services.rag.retriever import search_labor_law
from ai_agent.services.remedy.models import DetectedIssue

SYSTEM_PROMPT = """대한민국에서 일하는 외국인 근로자의 문서를 검토한다.
사용자 질문을 우선하되 질문이 없으면 문서 전체를 검토한다. 아래 플레이북은 검토 방법이며
문제 종류를 제한하는 목록이 아니다.

[사실 먼저 확인하기]
- legalChecks는 validator 결과다. DETECTED는 확인된 문제로 반영하고 REVIEW_REQUIRED는
  문서와 사용자 설명을 함께 확인해 판단한다.
- 계약서, 급여명세서, 사용자 설명에서 같은 항목의 값을 먼저 모은다.
- 숫자는 기본급, 지급총액, 공제액, 실지급액을 구분하고 출처와 함께 기록한다.

[임금 비교]
- 계약 기본급과 명세서 기본급을 비교한다.
- 계약의 고정수당이 명세서에서 줄거나 빠졌는지 확인한다.
- 이미 지급된 수당은 계산을 더 확인할 수 있다는 이유만으로 문제로 만들지 않는다.

[근무시간 비교]
- 계약시간과 사용자 설명을 비교한다.
- 급여명세서가 있으면 연장·야간·휴일수당 항목을 함께 확인한다.
- 급여명세서가 없으면 수당 미지급을 추정하지 않고 next_actions에서 확인을 안내한다.
- 시간 차이와 수당 누락이 같은 근무 사실에서 나왔다면 하나의 문제 상황으로 묶는다.
- 실제 휴게시간이 입력에 없으면 하루 총 근로시간이나 초과시간을 계산하지 않는다. 계약보다
  몇 시 일찍 시작하고 몇 시 늦게 끝나는지만 설명한다.

[공제 비교]
- 계약의 숙식비와 명세서의 실제 숙식비를 비교한다.
- 소득세·지방소득세·국민연금·건강보험·고용보험은 계약서에 없다는 이유만으로 문제로
  만들지 않는다.
- 계약에 없는 비법정 공제는 사용자의 설명과 legalChecks를 함께 확인한다.

[업무와 장소 비교]
- 계약 업무·근무장소와 사용자의 실제 업무·근무장소 설명을 비교한다.
- 문서에 없는 정보나 사용자가 말하지 않은 위험을 추정하지 않는다.

[문제 묶기]
- finding 하나는 피해자가 겪은 하나의 문제 상황이다. 법률 위반 종류별 목록이 아니다.
- 같은 금액, 공제, 근무시간, 업무 또는 장소를 근거로 finding을 여러 개 만들지 않는다.
- 한 사실에 여러 법률이 적용될 수 있으면 하나의 finding 안에서 함께 설명한다.
- title은 "계약보다 적은 기본급", "계약보다 많은 숙식비 공제"처럼 짧고 쉬운 한국어로 쓴다.
- 확인하면 좋은 사항과 제출되지 않은 문서로 확인해야 하는 사항은 issue가 아니라 next_actions다.

문서에 없다는 이유로 퇴직금·보험·동의서 미가입이나 미작성을 추정하지 않는다. 계약과 같은
숙식비, 정상 세금·사회보험, 지급총액과 실지급액의 차이, 정상 합계도 문제가 아니다.
농축산어업에는 일반 업종의 근로시간·휴일 규정을 기계적으로 확정 적용하지 않는다.

[법적 근거]
문제 상황을 먼저 찾은 뒤 필요한 경우에만 search_labor_law로 근거를 확인한다. 검색으로 새 문제를
만들지 않는다. 검색어는 상황에 맞게 정하며 같은 문제를 표현만 바꿔 반복 검색하지 않는다.
검색 근거 없이 법 위반이라고 확정하지 않는다. 검색 제한 메시지를 받으면 현재 근거로 즉시
DocumentReview를 반환한다. facts에는 문서상 핵심 사실과 증거를 짧게 담고 관련 ID를 연결한다.

[사용자 답변]
- 사용자는 한국어가 익숙하지 않은 외국인 근로자다. 쉬운 단어와 짧은 문장을 쓴다.
- 문제 개수를 직접 쓰지 않고 "검토 결과입니다."로 시작한다.
- 문제마다 계약서·급여명세서·사용자 설명의 값을 나란히 보여준다.
- 관련 legalChecks가 DETECTED인 경우만 확인된 문제라고 한다. 나머지는 문제 가능성 또는
  추가 확인 필요라고 한다.
- next_actions는 최대 3개이며 기록 보관을 먼저 안내한다. 긴 법률 문구와 장문 보고서를 피한다.
"""


class DocumentReview(BaseModel):
    answer: str
    summary: str
    issues: list[DetectedIssue] = Field(default_factory=list)
    next_actions: list[str] = Field(default_factory=list)


def deduplicate_issues(issues: list[DetectedIssue]) -> list[DetectedIssue]:
    """같은 validator 결과를 근거로 만든 중복 문제는 첫 문제만 남긴다."""
    seen_check_ids: set[str] = set()
    unique = []
    for issue in issues:
        check_ids = set(issue.related_check_ids)
        if check_ids and check_ids & seen_check_ids:
            continue
        unique.append(issue)
        seen_check_ids.update(check_ids)
    return unique


@lru_cache
def get_reviewer_agent():
    from ai_agent.services.agent import get_model

    return create_agent(
        get_model(),
        tools=[search_labor_law],
        middleware=[
            ToolCallLimitMiddleware(tool_name="search_labor_law", run_limit=5, exit_behavior="end"),
            ModelCallLimitMiddleware(run_limit=7, exit_behavior="error"),
        ],
        system_prompt=SYSTEM_PROMPT,
        response_format=ToolStrategy(DocumentReview),
    )


@lru_cache
def get_reviewer_finalizer():
    from ai_agent.services.agent import get_model

    return create_agent(
        get_model(),
        tools=[],
        middleware=[ModelCallLimitMiddleware(run_limit=3, exit_behavior="error")],
        system_prompt=SYSTEM_PROMPT
        + "\n추가 검색 없이 현재 근거로 즉시 DocumentReview를 반환한다.",
        response_format=ToolStrategy(DocumentReview),
    )


@lru_cache
def get_langsmith_client() -> Client | None:
    settings = get_settings()
    if not settings.langsmith_tracing or not settings.langsmith_api_key:
        return None
    return Client(
        api_key=settings.langsmith_api_key,
        api_url=settings.langsmith_endpoint,
        workspace_id=settings.langsmith_workspace_id or None,
    )


def get_langsmith_tracer() -> LangChainTracer | None:
    client = get_langsmith_client()
    if client is None:
        return None
    return LangChainTracer(project_name=get_settings().langsmith_project, client=client)


async def review_documents(
    question: str,
    documents: list[Document],
    legal_checks: list[LegalCheck],
    *,
    request_id: str,
    session_id: str,
    preferred_language: str,
) -> DocumentReview:
    context = {
        "userQuestion": question,
        "preferredLanguage": preferred_language,
        "documents": [document.model_dump(mode="json") for document in documents],
        "legalChecks": [check.model_dump(mode="json") for check in legal_checks],
    }
    tracer = get_langsmith_tracer()
    async with asyncio.timeout(45):
        input_message = HumanMessage(json.dumps(context, ensure_ascii=False))
        result = await get_reviewer_agent().ainvoke(
            {"messages": [input_message]},
            {
                "callbacks": [tracer] if tracer else [],
                "run_name": "problem-review-agent",
                "metadata": {
                    "request_id": request_id,
                    "session_id": session_id,
                },
            },
        )
        review = result.get("structured_response")
        if review is None:
            evidence = "\n\n".join(
                str(message.content)
                for message in result["messages"]
                if isinstance(message, ToolMessage) and message.status == "success"
            )
            result = await get_reviewer_finalizer().ainvoke(
                {
                    "messages": [
                        input_message,
                        HumanMessage(f"확보한 법령 검색 결과:\n{evidence}"),
                    ]
                },
                {
                    "callbacks": [tracer] if tracer else [],
                    "run_name": "problem-review-finalizer",
                    "metadata": {
                        "request_id": request_id,
                        "session_id": session_id,
                    },
                },
            )
            review = result["structured_response"]
    review.issues = deduplicate_issues(review.issues)
    return review
