from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from ai_agent.schemas.payslip import PayslipDiagnosis
from ai_agent.services.ocr import OcrError, extract_text
from ai_agent.services.payslip_extraction import extract_payslip_facts
from ai_agent.services.payslip_rules import check_payslip

router = APIRouter(prefix="/payslips", tags=["payslips"])


@router.post("/diagnose", response_model=PayslipDiagnosis)
async def diagnose(files: list[UploadFile] = File(...)) -> PayslipDiagnosis:
    """급여명세서 이미지들을 받아 OCR 결과를 합쳐서 필수 기재사항 누락 여부를 진단한다."""
    raw_texts = []
    for file in files:
        file_bytes = await file.read()
        try:
            raw_text = await run_in_threadpool(extract_text, file_bytes, file.content_type or "")
        except OcrError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
        raw_texts.append(raw_text)

    combined_raw_text = "\n\n".join(raw_texts)

    extraction = await run_in_threadpool(extract_payslip_facts, combined_raw_text)
    violations = check_payslip(extraction.facts, extraction.unverified_fields)

    return PayslipDiagnosis(
        facts=extraction.facts,
        violations=violations,
        unverified_fields=extraction.unverified_fields,
    )
