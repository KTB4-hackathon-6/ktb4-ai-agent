"""법령 조문 스냅샷(data/laws.json)을 검색용 Document로 읽는다.

원문은 scripts/build_law_corpus.py가 국가법령정보센터에서 받아 고정한 것이고,
런타임은 이 파일만 읽는다 — 검색 때마다 외부 법령 API를 타지 않는다.
"""

import json
from functools import lru_cache
from pathlib import Path

from langchain_core.documents import Document

CORPUS_PATH = Path(__file__).resolve().parents[2] / "data" / "laws.json"

_METADATA_FIELDS = ("law_name", "article_number", "article_title", "effective_date")


def document_id(article: dict) -> str:
    """조문 하나에 고정 id를 준다. 재색인해도 중복되지 않고 upsert된다."""
    return f"{article['law_name']}:{article['article_number']}:{article.get('chunk') or ''}"


@lru_cache
def _payload() -> dict:
    return json.loads(CORPUS_PATH.read_text(encoding="utf-8"))


def snapshot_version() -> str:
    """코퍼스 판본 식별자. 이 값이 바뀌면 인덱스를 다시 만들어야 한다."""
    payload = _payload()
    return f"{payload['snapshot_date']}:{len(payload['articles'])}"


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
                "chunk": article.get("chunk") or "",
            },
        )
        for article in payload["articles"]
    )
