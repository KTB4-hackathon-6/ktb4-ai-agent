from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from ai_agent.schemas.ocr import OcrResult
from ai_agent.services.ocr import OcrError, extract_text

router = APIRouter(prefix="/ocr", tags=["ocr"])


@router.post("/extract", response_model=OcrResult)
async def extract(file: UploadFile) -> OcrResult:
    file_bytes = await file.read()
    try:
        raw_text = await run_in_threadpool(extract_text, file_bytes, file.content_type or "")
    except OcrError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return OcrResult(raw_text=raw_text)
