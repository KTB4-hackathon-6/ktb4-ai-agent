from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from ai_agent.schemas.diagnosis import ContractDiagnosis
from ai_agent.services.extraction import ExtractionGroundingError, extract_contract_facts
from ai_agent.services.ocr import OcrError, extract_text
from ai_agent.services.rules import check_contract

router = APIRouter(prefix="/contracts", tags=["contracts"])


@router.post("/diagnose", response_model=ContractDiagnosis)
async def diagnose(files: list[UploadFile] = File(...)) -> ContractDiagnosis:
    """근로계약서 페이지 이미지들(예: 앞쪽/뒤쪽)을 받아 OCR 결과를 합쳐서 진단한다."""
    raw_texts = []
    for file in files:
        file_bytes = await file.read()
        try:
            raw_text = await run_in_threadpool(extract_text, file_bytes, file.content_type or "")
        except OcrError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
        raw_texts.append(raw_text)

    combined_raw_text = "\n\n".join(raw_texts)

    try:
        facts = await run_in_threadpool(extract_contract_facts, combined_raw_text)
    except ExtractionGroundingError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    violations = check_contract(facts)
    return ContractDiagnosis(facts=facts, violations=violations)
