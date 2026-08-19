from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # AWS / S3
    aws_region: str = "ap-northeast-2"
    s3_bucket_name: str = ""
    s3_originals_prefix: str = "originals/"
    s3_results_prefix: str = "results/"
    s3_models_prefix: str = "models/"
    s3_presigned_expires_seconds: int = 600

    # OCR (Naver Clova OCR)
    naver_ocr_invoke_url: str = ""
    naver_ocr_secret_key: str = ""

    # RAG (embedding provider TBD)
    embedding_provider_api_key: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
