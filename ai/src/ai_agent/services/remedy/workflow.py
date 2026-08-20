"""Agent가 구제계획과 서식 작성을 자율적으로 진행하는 workflow."""

import json
from enum import StrEnum
from functools import lru_cache
from typing import Annotated, Self, TypedDict

from langchain.agents import create_agent
from langchain.agents.structured_output import ToolStrategy
from langchain_core.messages import AnyMessage, HumanMessage
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field, model_validator

from ai_agent.schemas.document_authoring import LaborComplaintFormData
from ai_agent.services.remedy.guides import DOCUMENT_AUTHORING_SYSTEM_PROMPT


class AuthoringIntent(StrEnum):
    FORM_INPUT = "FORM_INPUT"
    QUESTION = "QUESTION"
    MIXED = "MIXED"


class RemedyTurn(BaseModel):
    """Agent의 한 턴 결과. 값은 SQLite state에 그대로 누적한다."""

    intent: AuthoringIntent
    remedy_plan: list[str] = Field(default_factory=list)
    form_data: LaborComplaintFormData = Field(default_factory=LaborComplaintFormData)
    question_answer: str | None = None
    field_questions: dict[str, str] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_question_answer(self) -> Self:
        if self.intent in {AuthoringIntent.QUESTION, AuthoringIntent.MIXED} and not (
            self.question_answer or ""
        ).strip():
            raise ValueError("QUESTION and MIXED require question_answer")
        return self


class RemedyState(TypedDict, total=False):
    messages: Annotated[list[AnyMessage], add_messages]
    issues: list[dict]
    remedy_plan: list[str]
    form_drafts: dict[str, dict]
    documents: list[dict]
    legal_checks: list[dict]
    review_result: dict
    authoring_started: bool
    preferred_language: str
    authoring_intent: str
    question_answer: str | None
    field_questions: dict[str, str]


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
        "formData": (state.get("form_drafts") or {}).get("LABOR_COMPLAINT_001", {}),
        "documents": state.get("documents") or [],
        "legalChecks": state.get("legal_checks") or [],
        "reviewResult": state.get("review_result") or {},
        "userMessage": last_user_text(state),
        "preferredLanguage": state.get("preferred_language") or "ko",
    }
    result = await get_remedy_agent().ainvoke(
        {"messages": [HumanMessage(json.dumps(context, ensure_ascii=False))]}
    )
    return result["structured_response"]


async def remedy(state: RemedyState) -> dict:
    turn = await run_remedy_agent(state)
    return {
        "remedy_plan": turn.remedy_plan or state.get("remedy_plan") or [],
        "form_drafts": {
            "LABOR_COMPLAINT_001": turn.form_data.model_dump(mode="json")
        },
        "authoring_intent": turn.intent.value,
        "question_answer": turn.question_answer,
        "field_questions": turn.field_questions,
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
