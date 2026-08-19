"""OCR service: contract image/PDF -> raw text.

Provider TBD (Naver Clova OCR vs Google Vision) — pick based on accuracy
on mixed-language, low-quality contract photos.
"""


def extract_text(file_bytes: bytes, content_type: str) -> str:
    raise NotImplementedError
