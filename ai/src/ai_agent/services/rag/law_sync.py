"""국가법령정보 Open API의 현행 조문을 로컬 RAG 코퍼스에 동기화한다."""

import json
import os
import tempfile
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date
from pathlib import Path

import httpx

from ai_agent.config import Settings
from ai_agent.services.rag.corpus import get_corpus_path

API_URL = "https://www.law.go.kr/DRF/lawService.do"
LAW_NAMES = (
    "근로기준법",
    "최저임금법",
    "외국인근로자의 고용 등에 관한 법률",
    "근로자퇴직급여 보장법",
    "임금채권보장법",
)


class LawSyncError(Exception):
    """정부 법령 응답을 신뢰할 수 없어서 동기화를 중단할 때 발생한다."""


@dataclass(frozen=True)
class SyncResult:
    updated: bool
    updated_laws: tuple[str, ...] = ()
    error: str | None = None


class GovernmentLawClient:
    def __init__(self, *, oc: str, transport: httpx.BaseTransport | None = None) -> None:
        self._oc = oc
        self._transport = transport

    def fetch_articles(self, law_name: str) -> list[dict]:
        try:
            with httpx.Client(transport=self._transport, timeout=30) as client:
                response = client.get(
                    API_URL,
                    params={"OC": self._oc, "target": "law", "type": "JSON", "LM": law_name},
                )
                response.raise_for_status()
                law = response.json()["법령"]
            effective_date = str(law["기본정보"]["시행일자"]).strip()
            units = law["조문"]["조문단위"]
        except (httpx.HTTPError, KeyError, TypeError, ValueError) as error:
            raise LawSyncError(f"{law_name} 정부 법령 응답이 유효하지 않습니다") from error

        if isinstance(units, dict):
            units = [units]
        if not isinstance(units, list):
            raise LawSyncError(f"{law_name} 조문 목록이 없습니다")

        articles = [
            self._to_article(law_name, effective_date, unit)
            for unit in units
            if unit.get("조문여부") == "조문"
        ]
        articles = [article for article in articles if article is not None]
        if not articles:
            raise LawSyncError(f"{law_name} 유효 조문이 없습니다")
        return articles

    @staticmethod
    def _to_article(law_name: str, effective_date: str, unit: dict) -> dict | None:
        body = str(unit.get("조문내용") or "").strip()
        paragraphs = GovernmentLawClient._paragraph_texts(unit)
        if (not body and not paragraphs) or "삭제" in body[:30]:
            return None
        number = str(unit.get("조문번호") or "").strip()
        branch = str(unit.get("조문가지번호") or "").strip()
        if not number:
            return None
        article_number = f"제{number}조" + (f"의{branch}" if branch and branch != "0" else "")
        return {
            "law_name": law_name,
            "article_number": article_number,
            "article_title": str(unit.get("조문제목") or "").strip(),
            "effective_date": effective_date,
            "chunk": None,
            "source_type": "government_open_api",
            "text": "\n".join([f"{law_name} {body}", *paragraphs]),
        }

    @staticmethod
    def _paragraph_texts(unit: dict) -> list[str]:
        paragraphs = unit.get("항") or []
        if isinstance(paragraphs, dict):
            paragraphs = [paragraphs]
        texts = []
        for paragraph in paragraphs:
            lines = [str(paragraph.get("항내용") or "").strip()]
            items = paragraph.get("호") or []
            if isinstance(items, dict):
                items = [items]
            for item in items:
                lines.append(str(item.get("호내용") or "").strip())
                subitems = item.get("목") or []
                if isinstance(subitems, dict):
                    subitems = [subitems]
                lines.extend(str(subitem.get("목내용") or "").strip() for subitem in subitems)
            text = "\n".join(line for line in lines if line)
            if text:
                texts.append(text)
        return texts


class LawSynchronizer:
    def __init__(
        self,
        *,
        client: GovernmentLawClient,
        law_names: tuple[str, ...],
        snapshot_path: Path,
        rebuild_index: Callable[[], None],
    ) -> None:
        self._client = client
        self._law_names = law_names
        self._snapshot_path = snapshot_path
        self._rebuild_index = rebuild_index

    def sync(self) -> SyncResult:
        try:
            current = json.loads(self._snapshot_path.read_text(encoding="utf-8"))
            current_articles = current["articles"]
            fetched = {
                law_name: self._client.fetch_articles(law_name) for law_name in self._law_names
            }
        except (OSError, json.JSONDecodeError, KeyError, LawSyncError) as error:
            return SyncResult(updated=False, error=str(error))

        updated_laws = tuple(
            law_name
            for law_name, articles in fetched.items()
            if self._canonical(self._articles_for(current_articles, law_name))
            != self._canonical(articles)
        )
        if not updated_laws:
            return SyncResult(updated=False)

        remaining = [
            article
            for article in current_articles
            if article.get("law_name") not in self._law_names
        ]
        next_corpus = {
            "snapshot_date": date.today().isoformat(),
            "articles": [
                *remaining,
                *(article for articles in fetched.values() for article in articles),
            ],
        }
        try:
            self._write_atomically(next_corpus)
            self._rebuild_index()
        except OSError as error:
            return SyncResult(updated=False, error=str(error))
        return SyncResult(updated=True, updated_laws=updated_laws)

    @staticmethod
    def _articles_for(articles: list[dict], law_name: str) -> list[dict]:
        return [article for article in articles if article.get("law_name") == law_name]

    @staticmethod
    def _canonical(articles: list[dict]) -> str:
        return json.dumps(articles, ensure_ascii=False, sort_keys=True, separators=(",", ":"))

    def _write_atomically(self, corpus: dict) -> None:
        self._snapshot_path.parent.mkdir(parents=True, exist_ok=True)
        descriptor, temporary_name = tempfile.mkstemp(
            dir=self._snapshot_path.parent, prefix=f".{self._snapshot_path.name}.", suffix=".tmp"
        )
        try:
            with os.fdopen(descriptor, "w", encoding="utf-8") as file:
                json.dump(corpus, file, ensure_ascii=False, indent=1)
                file.write("\n")
            os.replace(temporary_name, self._snapshot_path)
        except Exception:
            Path(temporary_name).unlink(missing_ok=True)
            raise


def sync_configured_laws(settings: Settings) -> SyncResult:
    """환경 설정으로 1회 동기화한다. 키가 없으면 기존 인덱스를 보존한다."""
    if not settings.law_sync_enabled:
        return SyncResult(updated=False, error="법령 자동 동기화가 비활성화되었습니다")
    if not settings.law_open_api_oc:
        return SyncResult(updated=False, error="LAW_OPEN_API_OC가 설정되지 않았습니다")

    # 순환 import를 피하고, 동기화 모듈 자체는 네트워크·파일 로직만 테스트할 수 있게 둔다.
    from ai_agent.services.rag.store import rebuild_vector_store

    return LawSynchronizer(
        client=GovernmentLawClient(oc=settings.law_open_api_oc),
        law_names=LAW_NAMES,
        snapshot_path=get_corpus_path(),
        rebuild_index=rebuild_vector_store,
    ).sync()
