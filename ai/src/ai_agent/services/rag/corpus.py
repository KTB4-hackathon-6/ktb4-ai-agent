"""법령 조문 스냅샷(data/laws.json)을 검색용 Document로 읽는다.

원문은 scripts/build_law_corpus.py가 국가법령정보센터에서 받아 고정한 것이고,
런타임은 이 파일만 읽는다 — 검색 때마다 외부 법령 API를 타지 않는다.
"""

import hashlib
import json
import shutil
from functools import lru_cache
from pathlib import Path

from langchain_core.documents import Document

from ai_agent.config import get_settings

CORPUS_PATH = Path(__file__).resolve().parents[2] / "data" / "laws.json"

_METADATA_FIELDS = ("law_name", "article_number", "article_title", "effective_date")


def document_id(article: dict) -> str:
    """조문 하나에 고정 id를 준다. 재색인해도 중복되지 않고 upsert된다."""
    return (
        f"{article.get('source_type', 'official')}:{article['law_name']}:"
        f"{article['article_number']}:{article.get('chunk') or ''}"
    )


def ensure_corpus_exists(*, source_path: Path, runtime_path: Path) -> None:
    """빈 영속 저장소는 이미지에 포함된 초기 스냅샷으로 한 번만 채운다."""
    if runtime_path.exists():
        return
    runtime_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source_path, runtime_path)


def get_corpus_path() -> Path:
    """실행용 법령 스냅샷 경로를 반환하고, 최초 기동 때만 초기 파일을 복사한다."""
    runtime_path = get_settings().law_corpus_path
    ensure_corpus_exists(source_path=CORPUS_PATH, runtime_path=runtime_path)
    return runtime_path


@lru_cache
def _payload() -> dict:
    return json.loads(get_corpus_path().read_text(encoding="utf-8"))


def snapshot_version() -> str:
    """코퍼스 판본 식별자. 이 값이 바뀌면 인덱스를 다시 만들어야 한다."""
    payload = _payload()
    canonical = json.dumps(
        payload["articles"], ensure_ascii=False, sort_keys=True, separators=(",", ":")
    )
    content_hash = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    return f"{payload['snapshot_date']}:{len(payload['articles'])}:{content_hash}"


@lru_cache
def load_documents() -> tuple[Document, ...]:
    payload = _payload()
    return tuple(
        Document(
            id=document_id(article),
            page_content=article["text"],
            # Chroma 메타데이터는 None을 못 받아서 chunk 없는 조문은 빈 문자열로 둔다.
            metadata={
                **{field: article[field] for field in _METADATA_FIELDS},
                "source_type": article.get("source_type", "official"),
                "chunk": article.get("chunk") or "",
            },
        )
        for article in payload["articles"]
    )


def invalidate_corpus_cache() -> None:
    """동기화로 laws.json을 교체한 직후 다음 색인이 새 파일을 읽도록 한다."""
    _payload.cache_clear()
    load_documents.cache_clear()
