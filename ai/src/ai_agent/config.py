from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_ENV = Path(__file__).resolve().parents[3] / ".env"
AI_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ROOT_ENV,
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

    # RAG (Upstage solar embeddings + Chroma)
    upstage_api_key: str = ""
    embedding_model: str = "solar-embedding-1-large"
    chroma_dir: Path = ROOT_ENV.parent / "ai" / ".chroma"
    law_corpus_path: Path = ROOT_ENV.parent / "ai" / "src" / "ai_agent" / "data" / "laws.json"

    # 국가법령정보 공동활용 Open API
    law_open_api_oc: str = ""
    law_sync_enabled: bool = True
    law_sync_interval_hours: int = 24

    # Chat
    deepseek_api_key: str = ""
    chat_model: str = "deepseek-v4-flash"
    checkpoint_db_path: Path = ROOT_ENV.parent / "ai" / "checkpoints.sqlite3"

    # Observability
    langsmith_tracing: bool = False
    langsmith_api_key: str = ""
    langsmith_endpoint: str = "https://api.smith.langchain.com"
    langsmith_project: str = "ktb4-ai-agent"
    langsmith_workspace_id: str = ""

    # 로컬 디버깅용: OCR raw_text + LLM 추출 결과 스냅샷 저장 위치
    diagnosis_storage_dir: str = str(AI_ROOT / "data" / "diagnoses")


@lru_cache
def get_settings() -> Settings:
    return Settings()
