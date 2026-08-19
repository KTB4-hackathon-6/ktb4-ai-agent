from pydantic import BaseModel


class OcrResult(BaseModel):
    raw_text: str
