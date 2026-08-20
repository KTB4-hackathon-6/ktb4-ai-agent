import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from ai_agent.schemas.analyze import AnalyzeError, AnalyzeStatus
from ai_agent.schemas.document_authoring import (
    DocumentAuthoringRequest,
    DocumentAuthoringResponse,
    DocumentAuthoringResult,
    DocumentDraft,
    DocumentDraftStatus,
    LaborComplaintFormData,
    MissingField,
    MissingFieldInputType,
    MissingFieldStatus,
    MissingFieldValidationRules,
)
from ai_agent.services.agent import run_document_authoring

router = APIRouter(prefix="/docs", tags=["docs"])
logger = logging.getLogger(__name__)

FIELD_SPECS = {
    "complainant.fullName": ("성명", MissingFieldInputType.TEXT, True, 100, []),
    "complainant.address": ("주소", MissingFieldInputType.TEXT, True, 300, []),
    "complainant.mobilePhone": ("휴대전화번호", MissingFieldInputType.PHONE, True, 30, []),
    "respondent.fullName": ("피진정인 성명", MissingFieldInputType.TEXT, True, 100, []),
    "respondent.workplaceType": (
        "사업체 구분",
        MissingFieldInputType.SELECT,
        False,
        None,
        ["WORKPLACE", "CONSTRUCTION_SITE"],
    ),
    "respondent.workplaceName": ("사업장명", MissingFieldInputType.TEXT, False, 200, []),
    "respondent.actualWorkplaceAddress": (
        "실제 근무지 주소",
        MissingFieldInputType.TEXT,
        False,
        300,
        [],
    ),
    "complaint.employmentStartDate": (
        "입사일",
        MissingFieldInputType.DATE,
        False,
        10,
        [],
    ),
    "complaint.employmentStatus": (
        "퇴직 여부",
        MissingFieldInputType.SELECT,
        False,
        None,
        ["RESIGNED", "EMPLOYED"],
    ),
    "complaint.jobDescription": ("업무 내용", MissingFieldInputType.TEXT, False, 300, []),
    "complaint.contractMethod": (
        "근로계약방법",
        MissingFieldInputType.SELECT,
        False,
        None,
        ["WRITTEN", "ORAL"],
    ),
    "complaint.details": ("진정 내용", MissingFieldInputType.TEXTAREA, False, 4000, []),
    "submission.recipientLaborOfficeName": (
        "관할 고용노동관서",
        MissingFieldInputType.TEXT,
        False,
        100,
        [],
    ),
}


def error_response(
    request: DocumentAuthoringRequest, status_code: int, code: str, message: str
) -> JSONResponse:
    response = DocumentAuthoringResponse(
        requestId=request.requestId,
        sessionId=request.sessionId,
        status=AnalyzeStatus.FAILED,
        result=None,
        error=AnalyzeError(code=code, message=message),
    )
    return JSONResponse(status_code=status_code, content=response.model_dump(mode="json"))


def build_missing_field(field_id: str, question: str) -> MissingField:
    display_name, input_type, sensitive, max_length, allowed_values = FIELD_SPECS[field_id]
    return MissingField(
        fieldId=field_id,
        displayName=display_name,
        required=True,
        inputType=input_type,
        question=question,
        reason="진정서 필수 항목입니다.",
        sensitive=sensitive,
        validationRules=MissingFieldValidationRules(
            pattern=None,
            minLength=1 if input_type in {MissingFieldInputType.TEXT, MissingFieldInputType.PHONE,
                                          MissingFieldInputType.TEXTAREA} else None,
            maxLength=max_length,
            minValue=None,
            maxValue=None,
            allowedValues=allowed_values,
        ),
        status=MissingFieldStatus.MISSING,
    )


@router.post(
    "",
    response_model=DocumentAuthoringResponse,
    responses={
        400: {"model": DocumentAuthoringResponse},
        502: {"model": DocumentAuthoringResponse},
    },
)
async def document_authoring(
    request: DocumentAuthoringRequest,
) -> DocumentAuthoringResponse | JSONResponse:
    if not request.input.text:
        return error_response(
            request, 400, "TEXT_INPUT_REQUIRED", "input.text를 입력해야 합니다."
        )
    try:
        state = await run_document_authoring(
            request.input.text,
            request.sessionId,
            request.preferredLanguage,
        )
    except LookupError:
        return error_response(
            request,
            status_code=400,
            code="REVIEW_CONTEXT_REQUIRED",
            message="먼저 같은 sessionId로 /review를 실행해야 합니다.",
        )
    except Exception:
        logger.exception(
            "문서작성 실패 requestId=%s sessionId=%s",
            request.requestId,
            request.sessionId,
        )
        return error_response(
            request,
            status_code=502,
            code="MODEL_REQUEST_FAILED",
            message="AI 모델 요청에 실패했습니다.",
        )

    answer = state["messages"][-1].text
    data = LaborComplaintFormData(
        **(state.get("form_drafts") or {}).get("LABOR_COMPLAINT_001", {})
    )
    missing_ids = data.required_missing_field_ids()
    missing_fields = [build_missing_field(missing_ids[0], answer)] if missing_ids else []
    draft = DocumentDraft(
        status=DocumentDraftStatus.NEEDS_INPUT if missing_ids else DocumentDraftStatus.READY,
        data=data,
        missingFields=missing_fields,
    )
    return DocumentAuthoringResponse(
        requestId=request.requestId,
        sessionId=request.sessionId,
        status=AnalyzeStatus.COMPLETED,
        result=DocumentAuthoringResult(answer=answer, documentDrafts=[draft]),
        error=None,
    )
