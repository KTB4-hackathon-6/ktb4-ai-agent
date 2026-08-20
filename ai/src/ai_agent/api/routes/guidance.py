from fastapi import APIRouter
from fastapi.responses import JSONResponse

from ai_agent.schemas.analyze import AnalyzeError, AnalyzeStatus
from ai_agent.schemas.document_authoring import LaborComplaintFormData
from ai_agent.schemas.guidance import (
    AgencyCode,
    GuidanceRequest,
    GuidanceResponse,
    GuidanceResult,
    SubmissionChannel,
    SubmissionOption,
)
from ai_agent.services.agent import get_document_form

router = APIRouter(prefix="/guide", tags=["guide"])

ANSWERS = {
    "vi": "Bạn có thể nộp đơn tại cơ quan lao động địa phương có thẩm quyền.",
    "en": "You can submit the complaint to the competent local labor office.",
    "th": "คุณสามารถยื่นคำร้องต่อสำนักงานแรงงานท้องถิ่นที่มีอำนาจได้",
    "id": "Anda dapat mengajukan pengaduan ke kantor ketenagakerjaan setempat.",
    "mn": "Та өргөдлөө харьяа орон нутгийн хөдөлмөрийн байгууллагад өгч болно.",
    "km": "អ្នកអាចដាក់ពាក្យបណ្ដឹងនៅការិយាល័យការងារមូលដ្ឋានដែលមានសមត្ថកិច្ច។",
    "ko": "관할 지방고용노동관서에 진정서를 제출할 수 있습니다.",
}


def document_not_ready(request: GuidanceRequest) -> JSONResponse:
    response = GuidanceResponse(
        requestId=request.requestId,
        sessionId=request.sessionId,
        status=AnalyzeStatus.FAILED,
        result=None,
        error=AnalyzeError(
            code="DOCUMENT_NOT_READY",
            message="먼저 /docs에서 진정서 필수 정보를 입력해야 합니다.",
        ),
    )
    return JSONResponse(status_code=400, content=response.model_dump(mode="json"))


@router.post(
    "",
    response_model=GuidanceResponse,
    responses={400: {"model": GuidanceResponse}},
)
async def guide(request: GuidanceRequest) -> GuidanceResponse | JSONResponse:
    if not request.input.text:
        response = GuidanceResponse(
            requestId=request.requestId,
            sessionId=request.sessionId,
            status=AnalyzeStatus.FAILED,
            result=None,
            error=AnalyzeError(code="TEXT_INPUT_REQUIRED", message="input.text를 입력해야 합니다."),
        )
        return JSONResponse(status_code=400, content=response.model_dump(mode="json"))
    try:
        raw_form = await get_document_form(request.sessionId)
    except LookupError:
        return document_not_ready(request)

    data = LaborComplaintFormData(**(raw_form or {}))
    if data.required_missing_field_ids():
        return document_not_ready(request)

    office = data.submission.recipientLaborOfficeName
    attachments = data.complaint.attachmentFileNames or ["근로계약서", "임금 지급 내역 등 증빙자료"]
    return GuidanceResponse(
        requestId=request.requestId,
        sessionId=request.sessionId,
        status=AnalyzeStatus.COMPLETED,
        result=GuidanceResult(
            answer=ANSWERS[request.preferredLanguage],
            agencyCode=AgencyCode.MOEL,
            agencyName="고용노동부",
            jurisdictionOfficeName=f"{office} 고용노동관서",
            submissionOptions=[
                SubmissionOption(
                    channel=SubmissionChannel.VISIT,
                    label="방문 제출",
                    url=None,
                    address=f"{office} 고용노동관서 민원실",
                    instructions="진정서와 증빙자료를 준비해 민원실에 제출합니다.",
                )
            ],
            requiredAttachments=attachments,
            steps=["작성 내용을 확인합니다.", "증빙자료를 준비합니다.", "민원실에 제출합니다."],
            notes="제출 전에 관할 기관과 접수 조건을 다시 확인하세요.",
        ),
        error=None,
    )
