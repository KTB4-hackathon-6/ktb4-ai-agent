from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from ai_agent.schemas.diagnosis import ContractDiagnosis
from ai_agent.services.extraction import ExtractionGroundingError, extract_contract_facts
from ai_agent.services.ocr import OcrError, extract_text
from ai_agent.services.rules import check_contract

router = APIRouter(prefix="/contracts", tags=["contracts"])


@router.post("/diagnose", response_model=ContractDiagnosis)
async def diagnose(file: UploadFile) -> ContractDiagnosis:
    file_bytes = await file.read()
    try:
        raw_text = await run_in_threadpool(extract_text, file_bytes, file.content_type or "")
    except OcrError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    try:
        facts = await run_in_threadpool(extract_contract_facts, raw_text)
    except ExtractionGroundingError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    violations = check_contract(facts)
    return ContractDiagnosis(facts=facts, violations=violations)
