"""Agent가 구제계획과 서식 작성을 자율적으로 진행하는 workflow."""

import json
from enum import StrEnum
from functools import lru_cache
from typing import Annotated, Self, TypedDict

from langchain.agents import create_agent
from langchain.agents.structured_output import ToolStrategy
from langchain_core.messages import AIMessage, AnyMessage, HumanMessage
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field, model_validator

from ai_agent.schemas.document_authoring import LaborComplaintFormData
from ai_agent.services.remedy.guides import (
    DOCUMENT_AUTHORING_SYSTEM_PROMPT,
    DOCUMENT_FORM_EXTRACTION_PROMPT,
)


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
        if (
            self.intent in {AuthoringIntent.QUESTION, AuthoringIntent.MIXED}
            and not (self.question_answer or "").strip()
        ):
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
    form_initialized: bool


@lru_cache
def get_remedy_agent():
    from ai_agent.services.agent import get_model

    return create_agent(
        get_model(),
        tools=[],
        system_prompt=DOCUMENT_AUTHORING_SYSTEM_PROMPT,
        response_format=ToolStrategy(RemedyTurn),
    )


@lru_cache
def get_document_extraction_agent():
    from ai_agent.services.agent import get_model

    return create_agent(
        get_model(),
        tools=[],
        system_prompt=DOCUMENT_FORM_EXTRACTION_PROMPT,
        response_format=ToolStrategy(LaborComplaintFormData),
    )


async def extract_document_form(documents: list[dict]) -> LaborComplaintFormData:
    result = await get_document_extraction_agent().ainvoke(
        {"messages": [HumanMessage(json.dumps({"documents": documents}, ensure_ascii=False))]}
    )
    return result["structured_response"]


def merge_form_data(base: dict, overlay: dict) -> dict:
    """overlay의 값만 덮어쓰고 빈 값은 기존 값을 유지한다."""
    merged = dict(base)
    for key, value in overlay.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = merge_form_data(merged[key], value)
        elif value not in (None, "", []):
            merged[key] = value
    return merged


def last_user_text(state: RemedyState) -> str:
    for message in reversed(state.get("messages") or []):
        if isinstance(message, HumanMessage):
            return message.text
    return ""


def recent_conversation(state: RemedyState) -> list[dict[str, str]]:
    """현재 발화를 제외한 최근 대화를 모델 입력용으로 줄인다."""
    history = []
    for message in (state.get("messages") or [])[:-1][-10:]:
        if isinstance(message, HumanMessage):
            history.append({"role": "user", "content": message.text})
        elif isinstance(message, AIMessage):
            history.append({"role": "assistant", "content": message.text})
    return history


async def run_remedy_agent(state: RemedyState) -> RemedyTurn:
    form_data = (state.get("form_drafts") or {}).get("LABOR_COMPLAINT_001", {})
    missing_ids = LaborComplaintFormData(**form_data).required_missing_field_ids()
    pending_field_id = missing_ids[0] if missing_ids else None
    context = {
        "detectedIssues": state.get("issues") or [],
        "currentPlan": state.get("remedy_plan") or [],
        "formData": form_data,
        "documents": state.get("documents") or [],
        "legalChecks": state.get("legal_checks") or [],
        "reviewResult": state.get("review_result") or {},
        "conversationHistory": recent_conversation(state),
        "pendingFieldId": pending_field_id,
        "pendingQuestion": (state.get("field_questions") or {}).get(pending_field_id),
        "userMessage": last_user_text(state),
        "preferredLanguage": state.get("preferred_language") or "ko",
    }
    result = await get_remedy_agent().ainvoke(
        {"messages": [HumanMessage(json.dumps(context, ensure_ascii=False))]}
    )
    return result["structured_response"]


async def remedy(state: RemedyState) -> dict:
    existing_form = (state.get("form_drafts") or {}).get("LABOR_COMPLAINT_001", {})
    if not state.get("form_initialized"):
        documents = state.get("documents") or []
        seed = (await extract_document_form(documents)).model_dump(mode="json") if documents else {}
        existing_form = merge_form_data(seed, existing_form)
        state = {
            **state,
            "form_drafts": {"LABOR_COMPLAINT_001": existing_form},
        }

    turn = await run_remedy_agent(state)
    form_data = merge_form_data(
        existing_form,
        turn.form_data.model_dump(mode="json"),
    )
    return {
        "remedy_plan": turn.remedy_plan or state.get("remedy_plan") or [],
        "form_drafts": {"LABOR_COMPLAINT_001": form_data},
        "authoring_intent": turn.intent.value,
        "question_answer": turn.question_answer,
        "field_questions": turn.field_questions,
        "form_initialized": True,
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
