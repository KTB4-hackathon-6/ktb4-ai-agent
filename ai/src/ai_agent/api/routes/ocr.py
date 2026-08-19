from fastapi import APIRouter, HTTPException, UploadFile

from ai_agent.schemas.ocr import OcrResult

router = APIRouter(prefix="/ocr", tags=["ocr"])


@router.post("/extract", response_model=OcrResult)
async def extract(file: UploadFile) -> OcrResult:
    raise HTTPException(status_code=501, detail="Not implemented yet")
