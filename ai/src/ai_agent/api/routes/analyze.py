from fastapi import APIRouter
from fastapi.responses import JSONResponse

from ai_agent.schemas.analyze import (
    AnalyzeError,
    AnalyzeRequest,
    AnalyzeResponse,
    AnalyzeResult,
    AnalyzeStatus,
)
from ai_agent.services.agent import answer_question

router = APIRouter(tags=["analyze"])


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
        answer = await answer_question(request.input.text)
    except Exception:
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
        result=AnalyzeResult(answer=answer, analysis=None),
        error=None,
    )
