"""OCR service backed by Naver Clova OCR (General document OCR domain)."""

import base64
import time
import uuid

import httpx

from ai_agent.config import get_settings

_CONTENT_TYPE_TO_FORMAT = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/tiff": "tiff",
    "application/pdf": "pdf",
}


class OcrError(Exception):
    """Unsupported file type, or the Clova OCR request failed."""


def extract_text(file_bytes: bytes, content_type: str) -> str:
    image_format = _CONTENT_TYPE_TO_FORMAT.get(content_type)
    if image_format is None:
        raise OcrError(f"unsupported content type: {content_type}")

    settings = get_settings()
    payload = {
        "version": "V2",
        "requestId": str(uuid.uuid4()),
        "timestamp": int(time.time() * 1000),
        "images": [
            {
                "format": image_format,
                "name": "document",
                "data": base64.b64encode(file_bytes).decode("utf-8"),
            }
        ],
    }
    headers = {"X-OCR-SECRET": settings.naver_ocr_secret_key}

    try:
        response = httpx.post(
            settings.naver_ocr_invoke_url,
            json=payload,
            headers=headers,
            timeout=30.0,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise OcrError(f"Naver Clova OCR request failed: {exc}") from exc

    return "\n\n".join(_join_fields(image["fields"]) for image in response.json()["images"])


def _join_fields(fields: list[dict]) -> str:
    parts: list[str] = []
    for field in fields:
        parts.append(field["inferText"])
        parts.append("\n" if field.get("lineBreak") else " ")
    return "".join(parts).strip()
