import html
import logging
import re

import httpx
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

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
logger = logging.getLogger(__name__)

OFFICE_SEARCH_URL = "https://labor.moel.go.kr/portalGuide/competence_find.do"
ONLINE_COMPLAINT_URL = (
    "https://labor.moel.go.kr/minwonApply/minwonFormat.do?"
    "searchGubun=1&searchVal=SN001&urlAddr=%2FminwonRqst%2FSN001.do"
)
REGION_PATTERN = re.compile(r"[가-힣]+(?:특별자치시|특별자치도|특별시|광역시|도|시|군|구)")


class JurisdictionDecision(BaseModel):
    officeName: str = Field(min_length=1)


def parse_offices(page: str) -> list[dict[str, str]]:
    matches = re.findall(
        r'<th class="tit"><a href="([^"]+)"[^>]*>\s*([^<]+?)\s*</a></th>\s*'
        r"<td>([^<]+)</td>",
        page,
    )
    return [
        {
            "officeName": html.unescape(name.strip()),
            "jurisdiction": html.unescape(jurisdiction.strip()),
            "homepageUrl": url.replace("http://", "https://"),
        }
        for url, name, jurisdiction in matches
    ]


async def search_labor_office(query: str) -> list[dict[str, str]]:
    """고용노동부 노동포털에서 시·군·구의 관할 관서를 조회한다."""
    async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
        response = await client.get(OFFICE_SEARCH_URL, params={"searchCmmn": query})
        response.raise_for_status()
    return parse_offices(response.text)


async def resolve_jurisdiction(data: LaborComplaintFormData) -> JurisdictionDecision:
    address = data.respondent.actualWorkplaceAddress or ""
    regions = REGION_PATTERN.findall(address)
    queries = [region for region in reversed(regions) if region.endswith(("시", "군", "구"))]
    for query in queries:
        offices = await search_labor_office(query)
        if not offices:
            continue
        scores = [sum(region in office["jurisdiction"] for region in regions) for office in offices]
        best_score = max(scores)
        best = [
            office for office, score in zip(offices, scores, strict=True) if score == best_score
        ]
        if len(best) == 1:
            return JurisdictionDecision(officeName=best[0]["officeName"])
    raise LookupError("jurisdiction office not found")


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


def guidance_error(request: GuidanceRequest) -> JSONResponse:
    response = GuidanceResponse(
        requestId=request.requestId,
        sessionId=request.sessionId,
        status=AnalyzeStatus.FAILED,
        result=None,
        error=AnalyzeError(
            code="JURISDICTION_LOOKUP_FAILED",
            message="관할 노동관서를 확인하지 못했습니다.",
        ),
    )
    return JSONResponse(status_code=502, content=response.model_dump(mode="json"))


@router.post(
    "",
    response_model=GuidanceResponse,
    responses={400: {"model": GuidanceResponse}, 502: {"model": GuidanceResponse}},
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

    try:
        jurisdiction = await resolve_jurisdiction(data)
    except Exception:
        logger.exception("관할 노동관서 조회 실패 sessionId=%s", request.sessionId)
        return guidance_error(request)

    attachments = data.complaint.attachmentFileNames or ["근로계약서", "임금 지급 내역 등 증빙자료"]
    return GuidanceResponse(
        requestId=request.requestId,
        sessionId=request.sessionId,
        status=AnalyzeStatus.COMPLETED,
        result=GuidanceResult(
            answer=ANSWERS[request.preferredLanguage],
            agencyCode=AgencyCode.MOEL,
            agencyName="고용노동부",
            jurisdictionOfficeName=jurisdiction.officeName,
            submissionOptions=[
                SubmissionOption(
                    channel=SubmissionChannel.ONLINE,
                    label="노동포털 온라인 제출",
                    url=ONLINE_COMPLAINT_URL,
                    address=None,
                    instructions="노동포털에 로그인한 뒤 진정서와 증빙자료를 제출합니다.",
                )
            ],
            requiredAttachments=attachments,
            steps=["작성 내용을 확인합니다.", "증빙자료를 준비합니다.", "민원실에 제출합니다."],
            notes="실제 근무지 주소를 기준으로 노동포털 공식 관할관서 정보를 조회했습니다.",
        ),
        error=None,
    )
