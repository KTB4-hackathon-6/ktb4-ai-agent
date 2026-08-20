"""법령 검색 테스트.

실제 임베딩 API를 호출하지 않는다. CI는 키 없이 pytest를 돌리므로 네트워크를 타면 안 된다.
실제 임베딩으로 검색 품질을 재는 건 tests/test_retrieval_e2e.py가 따로 한다.
"""

import hashlib
import math

import pytest
from langchain_chroma import Chroma
from langchain_core.embeddings import Embeddings

import ai_agent.services.rag.retriever as retriever
from ai_agent.services.rag.corpus import load_documents


class HashingEmbeddings(Embeddings):
    """문자 3-gram 해시 임베딩.

    같은 표현을 많이 공유하는 문서일수록 가까워진다. 의미까지는 못 잡지만 결정론적이고
    네트워크가 필요 없어서, 파이프라인이 제대로 연결됐는지 확인하기에는 충분하다.
    """

    dimensions = 256

    def _embed(self, text: str) -> list[float]:
        vector = [0.0] * self.dimensions
        for index in range(len(text) - 2):
            digest = hashlib.md5(text[index : index + 3].encode()).hexdigest()
            vector[int(digest, 16) % self.dimensions] += 1.0
        norm = math.sqrt(sum(value * value for value in vector)) or 1.0
        return [value / norm for value in vector]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self._embed(text) for text in texts]

    def embed_query(self, text: str) -> list[float]:
        return self._embed(text)


@pytest.fixture(scope="module")
def indexed_store() -> Chroma:
    """실제 코퍼스 전체를 가짜 임베딩으로 색인한다. 조문끼리 경쟁하는 상황을 그대로 둔다."""
    documents = list(load_documents())
    store = Chroma(collection_name="test_labor_law", embedding_function=HashingEmbeddings())
    store.add_documents(documents, ids=[document.id for document in documents])
    return store


@pytest.fixture
def store(monkeypatch: pytest.MonkeyPatch, indexed_store: Chroma) -> Chroma:
    monkeypatch.setattr(retriever, "get_vector_store", lambda: indexed_store)
    return indexed_store


def test_search_finds_article_matching_the_query(store: Chroma) -> None:
    articles = retriever.search("출국만기보험ㆍ신탁 가입", top_k=3)

    found = {(article.law_name, article.article_number) for article in articles}
    assert ("외국인근로자의 고용 등에 관한 법률", "제13조") in found


def test_search_fills_every_citation_field(store: Chroma) -> None:
    # agent가 법령명과 조항을 답변에 명시해야 하므로 인용에 필요한 값이 다 차 있어야 한다.
    for article in retriever.search("임금 전액 직접 지급", top_k=3):
        assert article.law_name
        assert article.article_number.startswith("제")
        assert article.effective_date
        assert article.text.startswith(article.law_name)


def test_search_respects_top_k(store: Chroma) -> None:
    assert len(retriever.search("휴게시간", top_k=1)) == 1
    assert len(retriever.search("휴게시간", top_k=5)) == 5


def test_search_returns_empty_when_the_index_is_unavailable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """임베딩 API 장애나 키 누락으로 검색이 죽어도 요청 전체를 실패시키지 않는다."""

    def broken() -> Chroma:
        raise RuntimeError("임베딩 API 장애")

    monkeypatch.setattr(retriever, "get_vector_store", broken)

    assert retriever.search("임금 체불") == []


def test_search_labor_law_tool_returns_articles(store: Chroma) -> None:
    result = retriever.search_labor_law.invoke({"query": "최저임금 미달 지급"})

    assert result["query"] == "최저임금 미달 지급"
    assert result["articles"]
    assert {"law_name", "article_number", "text", "effective_date"} == set(result["articles"][0])
