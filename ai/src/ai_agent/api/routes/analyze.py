import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from ai_agent.schemas.analyze import (
    Analysis,
    AnalyzeError,
    AnalyzeRequest,
    AnalyzeResponse,
    AnalyzeResult,
    AnalyzeStatus,
    Finding,
)
from ai_agent.services.agent import answer_question
from ai_agent.services.reviewer import review_documents

router = APIRouter(tags=["analyze"])

logger = logging.getLogger(__name__)


def error_response(
    request: AnalyzeRequest, status_code: int, code: str, message: str
) -> JSONResponse:
    response = AnalyzeResponse(
        requestId=request.requestId,
        sessionId=request.sessionId,
        status=AnalyzeStatus.FAILED,
        result=None,
        error=AnalyzeError(code=code, message=message),
    )
    return JSONResponse(status_code=status_code, content=response.model_dump(mode="json"))


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    responses={400: {"model": AnalyzeResponse}, 502: {"model": AnalyzeResponse}},
)
async def analyze(request: AnalyzeRequest) -> AnalyzeResponse | JSONResponse:
    if not request.input.text or not request.input.text.strip():
        return error_response(
            request,
            status_code=400,
            code="TEXT_INPUT_REQUIRED",
            message="현재는 input.text가 필요합니다.",
        )

    try:
        review = None
        if request.documents or request.legalChecks:
            review = await review_documents(
                request.input.text,
                request.documents,
                request.legalChecks,
                request_id=request.requestId,
                session_id=request.sessionId,
            )
        answer = (
            review.answer
            if review
            else await answer_question(request.input.text, request.sessionId)
        )
    except Exception:
        # 로그가 없으면 502만 남고 원인(모델 오류·타임아웃·검색 실패)이 사라진다.
        logger.exception(
            "분석 실패 requestId=%s sessionId=%s", request.requestId, request.sessionId
        )
        return error_response(
            request,
            status_code=502,
            code="MODEL_REQUEST_FAILED",
            message="AI 모델 요청에 실패했습니다.",
        )
    return AnalyzeResponse(
        requestId=request.requestId,
        sessionId=request.sessionId,
        status=AnalyzeStatus.COMPLETED,
        result=AnalyzeResult(
            answer=answer,
            analysis=(
                Analysis(
                    summary=review.summary,
                    findings=[
                        Finding(
                            title=issue.issue_type.value,
                            description=issue.summary,
                            severity=issue.severity,
                            relatedCheckIds=issue.related_check_ids,
                            relatedDocumentIds=issue.related_document_ids,
                        )
                        for issue in review.issues
                    ],
                    nextActions=review.next_actions,
                )
                if review
                else None
            ),
        ),
        error=None,
    )
