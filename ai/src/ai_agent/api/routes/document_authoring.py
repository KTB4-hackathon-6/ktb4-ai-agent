import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from ai_agent.schemas.analyze import AnalyzeError, AnalyzeStatus
from ai_agent.schemas.document_authoring import (
    DocumentAuthoringRequest,
    DocumentAuthoringResponse,
    DocumentAuthoringResult,
    SN001Fields,
    SN001Form,
)
from ai_agent.services.agent import run_document_authoring

router = APIRouter(prefix="/docs", tags=["docs"])
logger = logging.getLogger(__name__)


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


@router.post(
    "",
    response_model=DocumentAuthoringResponse,
    responses={
        409: {"model": DocumentAuthoringResponse},
        502: {"model": DocumentAuthoringResponse},
    },
)
async def document_authoring(
    request: DocumentAuthoringRequest,
) -> DocumentAuthoringResponse | JSONResponse:
    try:
        state = await run_document_authoring((request.input.text or "").strip(), request.sessionId)
    except LookupError:
        return error_response(
            request,
            status_code=409,
            code="REVIEW_REQUIRED",
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

    return DocumentAuthoringResponse(
        requestId=request.requestId,
        sessionId=request.sessionId,
        status=AnalyzeStatus.COMPLETED,
        result=DocumentAuthoringResult(
            answer=state["messages"][-1].text,
            form=SN001Form(fields=SN001Fields(**(state.get("form_drafts") or {}).get("SN001", {}))),
        ),
        error=None,
    )
