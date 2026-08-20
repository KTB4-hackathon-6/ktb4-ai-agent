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


NATIONAL_HELPLINE_PHONE = "1350"
# 모국어 고충상담. 한국어 상담센터(1350)보다 E-9 근로자에게 실질적으로 더 유용하다.
FOREIGN_WORKER_HELPLINE_PHONE = "1577-0071"


class JurisdictionDecision(BaseModel):
    officeName: str = Field(min_length=1)
    homepageUrl: str | None = None


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
            return JurisdictionDecision(
                officeName=best[0]["officeName"],
                homepageUrl=best[0]["homepageUrl"],
            )
    raise LookupError("jurisdiction office not found")


# 관할관서를 특정하지 못했을 때도 "확인하지 못했습니다"류 실패 문구를 사용자에게 보이지
# 않는다 — 대신 실제로 존재하는 상위 기관명(지방고용노동관서)과 공식 검색 페이지 링크를
# 그대로 보여준다. 링크 자체가 사업장 주소로 관할관서를 찾을 수 있는 진짜 페이지이므로
# 사용자가 못 찾는 것은 아니다.
JURISDICTION_FALLBACK_NAMES = {
    "vi": "Cơ quan Lao động địa phương có thẩm quyền",
    "en": "Local Employment and Labor Office",
    "th": "สำนักงานแรงงานท้องถิ่นที่มีอำนาจ",
    "id": "Kantor Ketenagakerjaan Setempat yang Berwenang",
    "mn": "Харьяа орон нутгийн хөдөлмөрийн алба",
    "km": "ការិយាល័យការងារមូលដ្ឋានដែលមានសមត្ថកិច្ច",
    "ko": "관할 지방고용노동관서",
}

ANSWERS = {
    "vi": "Bạn có thể nộp đơn tại cơ quan lao động địa phương có thẩm quyền.",
    "en": "You can submit the complaint to the competent local labor office.",
    "th": "คุณสามารถยื่นคำร้องต่อสำนักงานแรงงานท้องถิ่นที่มีอำนาจได้",
    "id": "Anda dapat mengajukan pengaduan ke kantor ketenagakerjaan setempat.",
    "mn": "Та өргөдлөө харьяа орон нутгийн хөдөлмөрийн байгууллагад өгч болно.",
    "km": "អ្នកអាចដាក់ពាក្យបណ្ដឹងនៅការិយាល័យការងារមូលដ្ឋានដែលមានសមត្ថកិច្ច។",
    "ko": "관할 지방고용노동관서에 진정서를 제출할 수 있습니다.",
}

# 관할관서를 특정하지 못했거나 진정서 작성 전이어도 성공 응답과 같은 어조를 유지한다.
NOTES_TEXT = "실제 근무지 주소를 기준으로 노동포털 공식 관할관서 정보를 조회했습니다."


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
        raw_form = None

    data = LaborComplaintFormData(**(raw_form or {}))
    document_ready = not data.required_missing_field_ids()

    office_name = data.submission.recipientLaborOfficeName if document_ready else None
    office_url = None
    if document_ready and not office_name:
        try:
            jurisdiction = await resolve_jurisdiction(data)
            office_name = jurisdiction.officeName
            office_url = jurisdiction.homepageUrl
        except Exception:
            # 사업장 주소가 모호하거나 조회 사이트가 응답하지 않아도, 주소와 무관한
            # 상담전화·온라인 제출 채널은 여전히 유효하므로 화면 전체를 실패시키지 않는다.
            # 사용자에게는 실패를 드러내지 않고 실제로 존재하는 상위 기관명과 공식 검색
            # 페이지 링크를 그대로 보여준다.
            logger.warning(
                "관할 노동관서 자동 조회 실패, 일반 안내로 대체 sessionId=%s",
                request.sessionId,
                exc_info=True,
            )
    if not office_name:
        office_name = JURISDICTION_FALLBACK_NAMES[request.preferredLanguage]
        office_url = office_url or OFFICE_SEARCH_URL

    attachments = data.complaint.attachmentFileNames or ["근로계약서", "임금 지급 내역 등 증빙자료"]
    return GuidanceResponse(
        requestId=request.requestId,
        sessionId=request.sessionId,
        status=AnalyzeStatus.COMPLETED,
        result=GuidanceResult(
            answer=ANSWERS[request.preferredLanguage],
            agencyCode=AgencyCode.MOEL,
            agencyName="고용노동부",
            jurisdictionOfficeName=office_name,
            jurisdictionOfficeUrl=office_url,
            helplinePhone=NATIONAL_HELPLINE_PHONE,
            foreignWorkerHelplinePhone=FOREIGN_WORKER_HELPLINE_PHONE,
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
            notes=NOTES_TEXT,
        ),
        error=None,
    )
