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

READY_MESSAGES = {
    "vi": "Đơn khiếu nại đã sẵn sàng. Vui lòng kiểm tra nội dung trước khi nộp.",
    "en": "The complaint form is ready. Please review it before submission.",
    "th": "แบบคำร้องพร้อมแล้ว โปรดตรวจสอบเนื้อหาก่อนยื่น",
    "id": "Formulir pengaduan sudah siap. Periksa isinya sebelum diajukan.",
    "mn": "Өргөдлийн маягт бэлэн боллоо. Илгээхийн өмнө агуулгыг шалгана уу.",
    "km": "ពាក្យបណ្ដឹងបានរួចរាល់។ សូមពិនិត្យមាតិកាមុនពេលដាក់ស្នើ។",
    "ko": "진정서가 준비되었습니다. 제출 전에 내용을 확인해 주세요.",
}

FIELD_REQUEST_MESSAGES = {
    "vi": "Vui lòng cung cấp: {field}.",
    "en": "Please provide: {field}.",
    "th": "กรุณาระบุ: {field}",
    "id": "Harap berikan: {field}.",
    "mn": "Дараах мэдээллийг оруулна уу: {field}.",
    "km": "សូមផ្តល់ព័ត៌មាន៖ {field}",
    "ko": "다음 정보를 알려주세요: {field}.",
}

# complaint.details는 사용자가 완성된 문장을 직접 써서 낼 항목이 아니라 모델이 작성해야 하는
# 항목이다. FIELD_REQUEST_MESSAGES의 "~을(를) 알려주세요" 문구를 그대로 쓰면 사용자에게 진정
# 내용을 대신 써 달라는 요청으로 읽혀, 사실(날짜·금액·경위)만 묻는 전용 문구를 따로 둔다.
DETAILS_FACT_REQUEST_MESSAGES = {
    "vi": (
        "Tôi sẽ soạn nội dung đơn khiếu nại giúp bạn. Vấn đề là gì, từ khi nào đến khi nào, "
        "và số tiền là bao nhiêu?"
    ),
    "en": (
        "I'll write the complaint content for you. What happened, over what period, "
        "and for how much?"
    ),
    "th": (
        "ฉันจะเขียนเนื้อหาคำร้องให้คุณเอง มีปัญหาอะไร "
        "ตั้งแต่เมื่อไหร่ถึงเมื่อไหร่ และจำนวนเงินเท่าไหร่"
    ),
    "id": (
        "Saya akan menuliskan isi pengaduan untuk Anda. Apa masalahnya, periode kejadiannya, "
        "dan berapa jumlahnya?"
    ),
    "mn": (
        "Би өргөдлийн агуулгыг таны өмнөөс бичиж өгье. Ямар асуудал байсан, "
        "хэзээнээс хэзээ хүртэл, хэдэн төгрөг вэ?"
    ),
    "km": (
        "ខ្ញុំនឹងសរសេរខ្លឹមសារពាក្យបណ្ដឹងជូនអ្នក។ "
        "តើមានបញ្ហាអ្វី តាំងពីពេលណាដល់ពេលណា និងចំនួនប៉ុន្មាន?"
    ),
    "ko": (
        "제가 진정 내용을 작성해드릴게요. 어떤 문제가, 언제부터 언제까지, "
        "얼마 규모로 있었는지 알려주시겠어요?"
    ),
}

INVALID_FIELD_MESSAGES = {
    "vi": "Không thể xác nhận định dạng của {field}. Vui lòng nhập lại.",
    "en": "The {field} format was not recognized. Please enter it again.",
    "th": "ไม่สามารถตรวจสอบรูปแบบของ {field} ได้ โปรดป้อนอีกครั้ง",
    "id": "Format {field} tidak dapat dikenali. Silakan masukkan kembali.",
    "mn": "{field}-ийн хэлбэрийг таньсангүй. Дахин оруулна уу.",
    "km": "មិនអាចស្គាល់ទម្រង់ {field} បានទេ។ សូមបញ្ចូលម្ដងទៀត។",
    "ko": "입력한 {field} 형식을 확인하지 못했습니다. 다시 입력해 주세요.",
}

MODEL_FAILURE_MESSAGES = {
    "vi": "Không thể xử lý câu trả lời. Nội dung trước đó vẫn được giữ nguyên.",
    "en": "The answer could not be processed. Your previous entries are unchanged.",
    "th": "ไม่สามารถประมวลผลคำตอบได้ ข้อมูลที่กรอกไว้ก่อนหน้ายังคงเดิม",
    "id": "Jawaban tidak dapat diproses. Isian sebelumnya tetap tersimpan.",
    "mn": "Хариултыг боловсруулж чадсангүй. Өмнөх мэдээлэл хэвээр хадгалагдсан.",
    "km": "មិនអាចដំណើរការចម្លើយបានទេ។ ទិន្នន័យមុននៅដដែល។",
    "ko": "답변을 처리하지 못했습니다. 이전에 입력한 내용은 그대로 유지됩니다.",
}

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
            minLength=1
            if input_type
            in {
                MissingFieldInputType.TEXT,
                MissingFieldInputType.PHONE,
                MissingFieldInputType.TEXTAREA,
            }
            else None,
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
        return error_response(request, 400, "TEXT_INPUT_REQUIRED", "input.text를 입력해야 합니다.")
    try:
        state = await run_document_authoring(
            request.input.text,
            request.sessionId,
            request.preferredLanguage.value,
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

    data = LaborComplaintFormData(**(state.get("form_drafts") or {}).get("LABOR_COMPLAINT_001", {}))
    missing_ids = data.required_missing_field_ids()
    if missing_ids:
        field_id = missing_ids[0]
        display_name = FIELD_SPECS[field_id][0]
        default_question = (
            DETAILS_FACT_REQUEST_MESSAGES[request.preferredLanguage]
            if field_id == "complaint.details"
            else FIELD_REQUEST_MESSAGES[request.preferredLanguage].format(field=display_name)
        )
        progress_answer = (state.get("field_questions") or {}).get(field_id, default_question)
        missing_fields = [build_missing_field(field_id, progress_answer)]
    else:
        progress_answer = READY_MESSAGES[request.preferredLanguage]
        missing_fields = []

    question_answer = (state.get("question_answer") or "").strip()
    answer = (
        f"{question_answer}\n\n{progress_answer}"
        if state.get("authoring_intent") in {"QUESTION", "MIXED"} and question_answer
        else progress_answer
    )
    input_error = state.get("input_error")
    if input_error == "INVALID_FIELD_VALUE" and missing_ids:
        answer = INVALID_FIELD_MESSAGES[request.preferredLanguage].format(field=display_name)
    elif input_error == "MODEL_RESPONSE_INVALID":
        answer = MODEL_FAILURE_MESSAGES[request.preferredLanguage]
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
