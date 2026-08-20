"""Agent가 구제계획과 서식 작성을 자율적으로 진행하는 workflow."""

import json
import logging
import re
from datetime import date
from enum import StrEnum
from functools import lru_cache
from typing import Annotated, Literal, TypedDict

from langchain_core.messages import AIMessage, AnyMessage, HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field

from ai_agent.schemas.document_authoring import LaborComplaintFormData
from ai_agent.services.remedy.guides import (
    COMPLAINT_DETAILS_COMPOSER_PROMPT,
    DOCUMENT_AUTHORING_SYSTEM_PROMPT,
    DOCUMENT_FORM_EXTRACTION_PROMPT,
    DOCUMENT_QUESTION_ANSWER_PROMPT,
)

logger = logging.getLogger(__name__)

FormFieldId = Literal[
    "complainant.fullName",
    "complainant.residentRegistrationNumber",
    "complainant.address",
    "complainant.telephone",
    "complainant.mobilePhone",
    "complainant.email",
    "complainant.receiveStatusUpdates",
    "complainant.notifyViaLaborPortal",
    "respondent.fullName",
    "respondent.contact",
    "respondent.address",
    "respondent.workplaceType",
    "respondent.workplaceName",
    "respondent.actualWorkplaceAddress",
    "respondent.workplaceTelephone",
    "respondent.employeeCount",
    "complaint.employmentStartDate",
    "complaint.employmentEndDate",
    "complaint.unpaidWagesTotal",
    "complaint.employmentStatus",
    "complaint.unpaidSeverancePay",
    "complaint.otherUnpaidAmount",
    "complaint.jobDescription",
    "complaint.payday",
    "complaint.contractMethod",
    "complaint.details",
    "complaint.attachmentFileNames",
    "submission.recipientLaborOfficeName",
]

START_REQUESTS = {
    "진정서 작성을 시작해줘",
    "start writing a complaint",
    "bắt đầu viết đơn khiếu nại",
    "เริ่มเขียนเรื่องร้องเรียน",
    "mulailah menulis keluhan",
    "гомдол бичиж эхлээрэй",
    "ចាប់ផ្តើមសរសេរពាក្យបណ្តឹង",
}

DIRECT_FIELDS = {
    "complainant.fullName",
    "complainant.address",
    "complainant.mobilePhone",
    "respondent.fullName",
    "respondent.workplaceType",
    "respondent.workplaceName",
    "respondent.actualWorkplaceAddress",
    "complaint.employmentStartDate",
    "complaint.employmentStatus",
    "complaint.contractMethod",
}

QUESTION_HINTS = (
    "?",
    "왜",
    "무엇",
    "뭐",
    "어떻게",
    "필요",
    "작성",
    "시작",
    "계속",
    "why ",
    "what ",
    "how ",
    "tại sao",
    "vì sao",
    "gì",
    "có cần",
    "như thế nào",
    "mengapa",
    "kenapa",
    "apa ",
    "bagaimana",
    "яагаад",
    "юу",
    "хэрхэн",
    "ทำไม",
    "อะไร",
    "ไหม",
    "อย่างไร",
    "ហេតុអ្វី",
    "អ្វី",
    "ដូចម្តេច",
)


class AuthoringIntent(StrEnum):
    FORM_INPUT = "FORM_INPUT"
    QUESTION = "QUESTION"
    MIXED = "MIXED"


class FormFieldUpdate(BaseModel):
    """모델이 새로 확인한 값 하나. 전체 폼을 되돌려 보내지 않는다."""

    field_id: FormFieldId
    value: str | int | bool | list[str]


class RemedyTurn(BaseModel):
    """Agent의 한 턴 결과. 확인된 변경분만 반환한다."""

    intent: AuthoringIntent
    remedy_plan: list[str] = Field(default_factory=list)
    form_updates: list[FormFieldUpdate] = Field(default_factory=list)


class ComplaintDetailsDraft(BaseModel):
    """진정 내용(complaint.details) 한 항목만 담는 전용 구조화 출력."""

    details: str


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
    input_error: str | None
    form_initialized: bool


@lru_cache
def get_remedy_model():
    from ai_agent.services.agent import get_model

    return get_model().with_structured_output(RemedyTurn)


@lru_cache
def get_document_extraction_model():
    from ai_agent.services.agent import get_model

    return get_model().with_structured_output(LaborComplaintFormData)


@lru_cache
def get_details_composer_model():
    from ai_agent.services.agent import get_model

    return get_model().with_structured_output(ComplaintDetailsDraft)


async def invoke_structured(model, messages: list[AnyMessage]):
    """동일한 메시지로 구조화 출력을 최대 세 번 다시 요청한다."""
    for attempt in range(4):
        try:
            return await model.ainvoke(messages)
        except ValueError:
            if attempt == 3:
                raise
            logger.warning(
                "구조화 모델 응답이 잘못되어 깨끗한 요청으로 재시도합니다. (%d/3)",
                attempt + 1,
            )


async def extract_document_form(documents: list[dict]) -> LaborComplaintFormData:
    return await invoke_structured(
        get_document_extraction_model(),
        [
            SystemMessage(DOCUMENT_FORM_EXTRACTION_PROMPT),
            HumanMessage(json.dumps({"documents": documents}, ensure_ascii=False)),
        ],
    )


def merge_form_data(base: dict, overlay: dict) -> dict:
    """overlay의 값만 덮어쓰고 빈 값은 기존 값을 유지한다."""
    merged = dict(base)
    for key, value in overlay.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = merge_form_data(merged[key], value)
        elif value not in (None, "", []):
            merged[key] = value
    return merged


def validate_korean_narratives(form: LaborComplaintFormData) -> None:
    for value in filter(None, (form.complaint.jobDescription, form.complaint.details)):
        letters = [char for char in value if char.isalpha()]
        hangul_count = sum("가" <= char <= "힣" for char in letters)
        # ponytail: 문자 비율 검사로 충분하다. 혼합 언어를 허용할 때 언어 감지기로 교체한다.
        if not hangul_count or hangul_count * 3 < len(letters):
            raise ValueError("form data narratives must be written in Korean")


def apply_form_updates(base: dict, updates: list[FormFieldUpdate]) -> LaborComplaintFormData:
    data = LaborComplaintFormData(**base).model_dump(mode="json")
    for update in updates:
        section, field = update.field_id.split(".", 1)
        data[section][field] = update.value
    form = LaborComplaintFormData(**data)
    validate_korean_narratives(form)
    return form


def is_question(text: str) -> bool:
    lowered = text.casefold()
    return any(hint in lowered for hint in QUESTION_HINTS)


def parse_pending_value(field_id: str, text: str) -> tuple[str, str | None]:
    """명확한 단일 필드 답변만 모델 없이 처리한다."""
    value = text.strip()
    if field_id not in DIRECT_FIELDS or is_question(value):
        return "unhandled", None
    if field_id in {"complainant.fullName", "respondent.fullName"}:
        letters = sum(char.isalpha() for char in value)
        valid = 2 <= letters and all(char.isalpha() or char in " .'-·" for char in value)
    elif field_id == "complainant.mobilePhone":
        valid = bool(re.fullmatch(r"\+?[0-9][0-9 -]{7,28}[0-9]", value))
    elif field_id == "respondent.workplaceType":
        valid = value in {"WORKPLACE", "CONSTRUCTION_SITE"}
    elif field_id == "complaint.employmentStatus":
        valid = value in {"RESIGNED", "EMPLOYED"}
    elif field_id == "complaint.contractMethod":
        valid = value in {"WRITTEN", "ORAL"}
    elif field_id == "complaint.employmentStartDate":
        try:
            date.fromisoformat(value)
            valid = True
        except ValueError:
            valid = False
    elif field_id in {"complainant.address", "respondent.actualWorkplaceAddress"}:
        if not any(char.isdigit() for char in value) or re.search(
            r"\d{2,4}[- ]\d{3,4}[- ]\d{4}", value
        ):
            return "unhandled", None
        valid = 2 <= len(value) <= 300
    else:
        valid = 2 <= len(value) <= 300
    return ("accepted", value) if valid else ("invalid", None)


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
        "conversationLanguage": state.get("preferred_language") or "ko",
        "documentLanguage": "ko",
    }
    return await invoke_structured(
        get_remedy_model(),
        [
            SystemMessage(DOCUMENT_AUTHORING_SYSTEM_PROMPT),
            HumanMessage(json.dumps(context, ensure_ascii=False)),
        ],
    )


async def answer_authoring_question(state: RemedyState) -> str:
    from ai_agent.services.agent import get_model

    missing_ids = LaborComplaintFormData(
        **((state.get("form_drafts") or {}).get("LABOR_COMPLAINT_001", {}))
    ).required_missing_field_ids()
    context = {
        "reviewResult": state.get("review_result") or {},
        "pendingFieldId": missing_ids[0] if missing_ids else None,
        "userMessage": last_user_text(state),
        "conversationLanguage": state.get("preferred_language") or "ko",
    }
    result = await get_model().ainvoke(
        [
            SystemMessage(DOCUMENT_QUESTION_ANSWER_PROMPT),
            HumanMessage(json.dumps(context, ensure_ascii=False)),
        ]
    )
    return result.text.strip()


async def compose_complaint_details(state: RemedyState) -> str | None:
    """detectedIssues/reviewResult에 사실이 있으면 사용자에게 묻지 않고 바로 진정 내용을 작성한다.

    확인된 사실이 전혀 없으면 None을 반환해 호출자가 대화로 사실을 되묻게 한다.
    """
    review_result = state.get("review_result") or {}
    issues = state.get("issues") or []
    # review_result.answer는 issues/summary가 비어 있어도 리뷰어가 실제로 답한 자연어
    # 내용을 담고 있을 수 있어, 이것까지 없을 때만 쓸 근거가 전혀 없다고 본다.
    if not issues and not review_result.get("summary") and not review_result.get("answer"):
        return None

    context = {
        "detectedIssues": issues,
        "reviewResult": review_result,
        "legalChecks": state.get("legal_checks") or [],
        "formData": (state.get("form_drafts") or {}).get("LABOR_COMPLAINT_001", {}),
        # 서버가 사실을 되물었을 때 사용자가 대화로 답한 날짜·금액·경위는 여기에만 있다.
        # recent_conversation은 현재 발화를 빼므로 userMessage를 따로 넘긴다.
        "conversationHistory": recent_conversation(state),
        "userMessage": last_user_text(state),
    }
    try:
        result = await invoke_structured(
            get_details_composer_model(),
            [
                SystemMessage(COMPLAINT_DETAILS_COMPOSER_PROMPT),
                HumanMessage(json.dumps(context, ensure_ascii=False)),
            ],
        )
    except ValueError:
        logger.exception("진정 내용 자동 작성에 실패해 사실 확인 질문으로 넘어갑니다.")
        return None
    details = (result.details if result else "").strip()
    return details or None


async def compose_details_into_form(state: RemedyState, form: dict) -> dict | None:
    """남은 필수 항목이 진정 내용뿐이면 사용자에게 묻지 않고 그 자리에서 작성해 반영한다.

    작성하지 못했으면 None을 반환해 호출자가 기존 흐름을 그대로 이어가게 한다. 사용자 답변을
    반영한 폼으로 판단해야 하므로 값이 채워지는 지점마다 호출한다.
    """
    # ponytail: 작성에 실패한 턴은 이 함수가 두 번(진입 시점·모델 경로) 돌아 한 턴에 모델을
    # 최대 세 번 부른다. 그 실패가 잦아지면 턴당 한 번으로 결과를 캐시한다.
    if LaborComplaintFormData(**form).required_missing_field_ids() != ["complaint.details"]:
        return None
    details = await compose_complaint_details(
        {**state, "form_drafts": {"LABOR_COMPLAINT_001": form}}
    )
    if not details:
        return None
    try:
        return apply_form_updates(
            form, [FormFieldUpdate(field_id="complaint.details", value=details)]
        ).model_dump(mode="json")
    except ValueError:
        # 한국어가 아니거나 4000자를 넘으면 폼을 그대로 두고 사실 확인 질문으로 넘어간다.
        logger.exception("작성한 진정 내용을 폼에 반영하지 못했습니다.")
        return None


async def remedy(state: RemedyState) -> dict:
    existing_form = (state.get("form_drafts") or {}).get("LABOR_COMPLAINT_001", {})
    initialized_now = False
    if not state.get("form_initialized"):
        documents = state.get("documents") or []
        try:
            seed = (
                (await extract_document_form(documents)).model_dump(mode="json")
                if documents
                else {}
            )
        except ValueError:
            logger.exception("문서 필드 추출 구조화 응답이 두 번 실패해 빈 폼으로 계속합니다.")
            seed = {}
        existing_form = merge_form_data(seed, existing_form)
        state = {
            **state,
            "form_drafts": {"LABOR_COMPLAINT_001": existing_form},
        }
        initialized_now = True

    missing_ids = LaborComplaintFormData(**existing_form).required_missing_field_ids()

    # 문서만으로 다른 필수값이 다 찬 경우. 작성하지 못했으면(문서 진단을 거치지 않은 경우 등)
    # 아래 기존 대화 흐름으로 내려가 사용자에게 사실을 되묻는다.
    composed = await compose_details_into_form(state, existing_form)
    if composed is not None:
        return {
            "form_drafts": {"LABOR_COMPLAINT_001": composed},
            "authoring_intent": AuthoringIntent.FORM_INPUT.value,
            "question_answer": None,
            "field_questions": {},
            "input_error": None,
            "form_initialized": True,
        }

    if initialized_now and last_user_text(state).strip().casefold() in START_REQUESTS:
        return {
            "form_drafts": {"LABOR_COMPLAINT_001": existing_form},
            "authoring_intent": AuthoringIntent.FORM_INPUT.value,
            "question_answer": None,
            "field_questions": {},
            "input_error": None,
            "form_initialized": True,
        }

    if missing_ids and not initialized_now:
        status, value = parse_pending_value(missing_ids[0], last_user_text(state))
        if status == "accepted" and value is not None:
            form = apply_form_updates(
                existing_form,
                [FormFieldUpdate(field_id=missing_ids[0], value=value)],
            ).model_dump(mode="json")
            # 이 답변으로 진정 내용만 남았을 수 있어, 묻기 전에 같은 턴에서 작성한다.
            form = await compose_details_into_form(state, form) or form
            return {
                "form_drafts": {"LABOR_COMPLAINT_001": form},
                "authoring_intent": AuthoringIntent.FORM_INPUT.value,
                "question_answer": None,
                "field_questions": {},
                "input_error": None,
                "form_initialized": True,
            }
        if status == "invalid":
            return {
                "form_drafts": {"LABOR_COMPLAINT_001": existing_form},
                "authoring_intent": AuthoringIntent.FORM_INPUT.value,
                "question_answer": None,
                "field_questions": {},
                "input_error": "INVALID_FIELD_VALUE",
                "form_initialized": True,
            }

    try:
        turn = await run_remedy_agent(state)
        form = apply_form_updates(existing_form, turn.form_updates)
    except ValueError:
        logger.exception("문서작성 구조화 응답을 적용하지 못해 기존 폼을 유지합니다.")
        return {
            "form_drafts": {"LABOR_COMPLAINT_001": existing_form},
            "authoring_intent": AuthoringIntent.FORM_INPUT.value,
            "question_answer": None,
            "field_questions": {},
            "input_error": "MODEL_RESPONSE_INVALID",
            "form_initialized": True,
        }

    # 자유 대화로 여러 필드를 한 번에 채우면 여기서 진정 내용만 남을 수 있다.
    form_data = form.model_dump(mode="json")
    form_data = await compose_details_into_form(state, form_data) or form_data

    question_answer = None
    if turn.intent in {AuthoringIntent.QUESTION, AuthoringIntent.MIXED}:
        try:
            question_answer = await answer_authoring_question(
                {**state, "form_drafts": {"LABOR_COMPLAINT_001": form_data}}
            )
        except Exception:
            logger.exception("문서작성 질문 답변 생성에 실패했습니다.")
    return {
        "remedy_plan": turn.remedy_plan or state.get("remedy_plan") or [],
        "form_drafts": {"LABOR_COMPLAINT_001": form_data},
        "authoring_intent": turn.intent.value,
        "question_answer": question_answer,
        "field_questions": {},
        "input_error": "MODEL_RESPONSE_INVALID"
        if turn.intent in {AuthoringIntent.QUESTION, AuthoringIntent.MIXED} and not question_answer
        else None,
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
