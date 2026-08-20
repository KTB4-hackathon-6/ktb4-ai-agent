"""OCR raw_text + LLM 추출 결과를 로컬 JSON 파일로 저장.

파이프라인 중간 산출물(OCR이 뭘 읽었는지, LLM이 뭘로 구조화했는지)을 눈으로
바로 확인하기 위한 디버깅용 스냅샷이다. 정식 영구 저장소(DB/S3)가 아니다.
"""

import json
import uuid
from datetime import UTC, datetime
from pathlib import Path

from ai_agent.config import get_settings
from ai_agent.schemas.diagnosis import ContractDiagnosis
from ai_agent.schemas.extraction import ExtractionResult


def save_diagnosis_snapshot(
    raw_text: str, extraction: ExtractionResult, diagnosis: ContractDiagnosis
) -> Path:
    storage_dir = Path(get_settings().diagnosis_storage_dir)
    storage_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%S%f")
    snapshot_path = storage_dir / f"{timestamp}-{uuid.uuid4().hex[:8]}.json"

    snapshot = {
        "raw_text": raw_text,
        "unverified_fields": extraction.unverified_fields,
        "facts": extraction.facts.model_dump(mode="json"),
        "violations": [v.model_dump(mode="json") for v in diagnosis.violations],
    }
    snapshot_path.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8")
    return snapshot_path
