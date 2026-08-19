"""백엔드가 보낸 문서와 확정된 검증 결과에서 구제 대상 문제를 찾는다."""

import asyncio
import json
from functools import lru_cache

from langchain.agents import create_agent
from langchain.agents.middleware import (
    ModelCallLimitMiddleware,
    ToolCallLimitMiddleware,
    wrap_model_call,
)
from langchain.agents.structured_output import ToolStrategy
from langchain_core.messages import HumanMessage
from langchain_core.tracers import LangChainTracer
from langsmith import Client
from pydantic import BaseModel, Field

from ai_agent.config import get_settings
from ai_agent.schemas.analyze import Document, LegalCheck
from ai_agent.services.rag.retriever import search_labor_law
from ai_agent.services.remedy.models import DetectedIssue

SYSTEM_PROMPT = """대한민국에서 일하는 외국인 근로자의 문서를 검토한다.
사용자 질문을 우선 해결하면서 문서 전체의 중요한 문제도 찾는다.

legalChecks는 deterministic validator가 이미 확인한 사실이다. 재계산하거나 반박하지 말고,
VIOLATION과 POSSIBLE_VIOLATION을 관련 문제에 반영한다. 같은 내용을 중복 문제로 만들지 않는다.
PASS는 문제가 아니며 UNKNOWN은 확정하지 않는다.

하나의 사실을 여러 법적 표현으로 중복 issue화하지 말고 가장 직접적인 issue_type 하나만 고른다.
아직 퇴직하지 않은 사람의 퇴직금처럼 미래에 발생할 수 있는 상황은 issue로 만들지 말고 필요한
경우 next_actions의 주의사항으로만 안내한다. POSSIBLE_VIOLATION은 확정 위반으로 표현하지 않는다.

문서에서 추가 문제를 발견하면 필요한 경우 search_labor_law로 근거를 확인한다. 검색 근거 없이
법 위반이라고 확정하지 않는다. 각 issue의 facts에는 구제 Agent가 사용할 문서상 핵심 사실과
증거 문장을 짧은 문자열 key-value로 담는다. 관련 checkId와 documentId를 반드시 연결한다.
법령 검색 제한 메시지를 받으면 추가 검색을 시도하지 말고, 현재까지 확보한 근거로 즉시
DocumentReview를 반환한다. 근거가 부족한 내용은 위반으로 확정하지 않는다.

issue_type은 MINIMUM_WAGE, OVERTIME_PREMIUM, UNPAID_WAGE, SEVERANCE_PAY,
HOUSING_DEDUCTION, WORKING_CONDITION_VIOLATION, DEPARTURE_INSURANCE 중 가장 가까운 값을 쓴다.
"""


class DocumentReview(BaseModel):
    answer: str
    summary: str
    issues: list[DetectedIssue] = Field(default_factory=list)
    next_actions: list[str] = Field(default_factory=list)


@wrap_model_call
async def stop_search_after_limit(request, handler):
    search_count = request.state.get("run_tool_call_count", {}).get("search_labor_law", 0)
    if search_count >= 5:
        request = request.override(
            tools=[tool for tool in request.tools if tool.name != "search_labor_law"]
        )
    return await handler(request)


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
            ToolCallLimitMiddleware(
                tool_name="search_labor_law", run_limit=5, exit_behavior="continue"
            ),
            stop_search_after_limit,
            ModelCallLimitMiddleware(run_limit=7, exit_behavior="error"),
        ],
        system_prompt=SYSTEM_PROMPT,
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
) -> DocumentReview:
    context = {
        "userQuestion": question,
        "documents": [document.model_dump(mode="json") for document in documents],
        "legalChecks": [check.model_dump(mode="json") for check in legal_checks],
    }
    tracer = get_langsmith_tracer()
    async with asyncio.timeout(45):
        result = await get_reviewer_agent().ainvoke(
            {"messages": [HumanMessage(json.dumps(context, ensure_ascii=False))]},
            {
                "callbacks": [tracer] if tracer else [],
                "run_name": "problem-review-agent",
                "metadata": {
                    "request_id": request_id,
                    "session_id": session_id,
                },
            },
        )
    review = result["structured_response"]
    review.issues = deduplicate_issues(review.issues)
    return review
