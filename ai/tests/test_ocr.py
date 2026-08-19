import httpx
import pytest

from ai_agent.config import get_settings
from ai_agent.services.ocr import OcrError, extract_text


def test_extract_text_rejects_unsupported_content_type() -> None:
    with pytest.raises(OcrError):
        extract_text(b"data", "text/plain")


def test_extract_text_joins_fields_from_clova_response(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("NAVER_OCR_INVOKE_URL", "https://example.com/ocr")
    monkeypatch.setenv("NAVER_OCR_SECRET_KEY", "test-secret")
    get_settings.cache_clear()

    def fake_post(url: str, *, json: dict, headers: dict, timeout: float) -> httpx.Response:
        assert headers["X-OCR-SECRET"] == "test-secret"
        return httpx.Response(
            200,
            json={
                "images": [
                    {
                        "fields": [
                            {"inferText": "임금", "lineBreak": False},
                            {"inferText": "2,000,000원", "lineBreak": True},
                            {"inferText": "근무지", "lineBreak": False},
                        ]
                    }
                ]
            },
            request=httpx.Request("POST", url),
        )

    monkeypatch.setattr(httpx, "post", fake_post)

    result = extract_text(b"fake-image-bytes", "image/jpeg")

    assert result == "임금 2,000,000원\n근무지"
    get_settings.cache_clear()
