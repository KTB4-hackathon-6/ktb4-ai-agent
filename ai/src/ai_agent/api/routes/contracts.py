from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from ai_agent.schemas.diagnosis import ContractDiagnosis
from ai_agent.services.extraction import extract_contract_facts
from ai_agent.services.ocr import OcrError, extract_text
from ai_agent.services.rules import check_contract, suppress_unverified

router = APIRouter(prefix="/contracts", tags=["contracts"])


@router.post("/diagnose", response_model=ContractDiagnosis)
async def diagnose(files: list[UploadFile] = File(...)) -> ContractDiagnosis:
    """근로계약서 페이지 이미지들(예: 앞쪽/뒤쪽)을 받아 OCR 결과를 합쳐서 진단한다.

    추출한 필드 중 OCR 원문에서 근거를 확인 못한 게 있어도 요청을 실패시키지
    않는다. 대신 그 필드에 의존하는 위반 판정만 결과에서 빼고, 어떤 필드를
    확인 못했는지 unverified_fields로 그대로 알려준다.
    """
    raw_texts = []
    for file in files:
        file_bytes = await file.read()
        try:
            raw_text = await run_in_threadpool(extract_text, file_bytes, file.content_type or "")
        except OcrError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
        raw_texts.append(raw_text)

    combined_raw_text = "\n\n".join(raw_texts)

    extraction = await run_in_threadpool(extract_contract_facts, combined_raw_text)
    violations = check_contract(extraction.facts)
    violations = suppress_unverified(violations, extraction.unverified_fields)

    return ContractDiagnosis(
        facts=extraction.facts,
        violations=violations,
        unverified_fields=extraction.unverified_fields,
    )
