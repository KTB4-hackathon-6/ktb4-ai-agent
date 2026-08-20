"""Agent가 구제계획과 서식 작성을 자율적으로 진행하는 workflow."""

import json
from functools import lru_cache
from typing import Annotated, TypedDict

from langchain.agents import create_agent
from langchain.agents.structured_output import ToolStrategy
from langchain_core.messages import AIMessage, AnyMessage, HumanMessage
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field

from ai_agent.services.remedy.guides import DOCUMENT_AUTHORING_SYSTEM_PROMPT


class RemedyTurn(BaseModel):
    """Agent의 한 턴 결과. 값은 SQLite state에 그대로 누적한다."""

    answer: str
    remedy_plan: list[str] = Field(default_factory=list)
    selected_forms: list[str] = Field(
        default_factory=list, description="실제로 작성할 민원서식 이름 또는 공식 식별자"
    )
    field_updates: dict[str, dict[str, str]] = Field(
        default_factory=dict, description="selected_forms의 서식별 작성 필드"
    )


class RemedyState(TypedDict, total=False):
    messages: Annotated[list[AnyMessage], add_messages]
    issues: list[dict]
    remedy_plan: list[str]
    selected_forms: list[str]
    form_drafts: dict[str, dict[str, str]]
    documents: list[dict]
    legal_checks: list[dict]
    review_result: dict
    authoring_started: bool


@lru_cache
def get_remedy_agent():
    from ai_agent.services.agent import get_model

    return create_agent(
        get_model(),
        tools=[],
        system_prompt=DOCUMENT_AUTHORING_SYSTEM_PROMPT,
        response_format=ToolStrategy(RemedyTurn),
    )


def last_user_text(state: RemedyState) -> str:
    for message in reversed(state.get("messages") or []):
        if isinstance(message, HumanMessage):
            return message.text
    return ""


async def run_remedy_agent(state: RemedyState) -> RemedyTurn:
    context = {
        "detectedIssues": state.get("issues") or [],
        "currentPlan": state.get("remedy_plan") or [],
        "selectedForms": state.get("selected_forms") or [],
        "formDrafts": state.get("form_drafts") or {},
        "documents": state.get("documents") or [],
        "legalChecks": state.get("legal_checks") or [],
        "reviewResult": state.get("review_result") or {},
        "userMessage": last_user_text(state),
    }
    result = await get_remedy_agent().ainvoke(
        {"messages": [HumanMessage(json.dumps(context, ensure_ascii=False))]}
    )
    return result["structured_response"]


async def remedy(state: RemedyState) -> dict:
    turn = await run_remedy_agent(state)
    forms = ["SN001"]
    drafts = {form_id: dict(values) for form_id, values in (state.get("form_drafts") or {}).items()}
    drafts.setdefault("SN001", {}).update(turn.field_updates.get("SN001", {}))
    return {
        "messages": [AIMessage(turn.answer)],
        "remedy_plan": turn.remedy_plan or state.get("remedy_plan") or [],
        "selected_forms": forms,
        "form_drafts": drafts,
    }


async def review(state: RemedyState) -> dict:
    from ai_agent.services.agent import get_review_agent

    messages = state.get("messages") or []
    result = await get_review_agent().ainvoke({"messages": messages})
    return {"messages": result["messages"][len(messages) :]}


def route(state: RemedyState) -> str:
    if (
        state.get("authoring_started")
        or state.get("issues")
        or state.get("remedy_plan")
        or state.get("form_drafts")
    ):
        return "remedy"
    return "review"


def build_workflow(checkpointer):
    builder = StateGraph(RemedyState)
    builder.add_node("remedy", remedy)
    builder.add_node("review", review)
    builder.add_conditional_edges(START, route, ["remedy", "review"])
    builder.add_edge("remedy", END)
    builder.add_edge("review", END)
    return builder.compile(checkpointer=checkpointer)
