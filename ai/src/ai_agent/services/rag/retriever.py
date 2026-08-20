"""노동법령 조문 검색."""

import logging

from langchain.tools import tool

from ai_agent.schemas.rag import LawArticle
from ai_agent.services.rag.store import get_vector_store

logger = logging.getLogger(__name__)


def search(query: str, top_k: int = 3) -> list[LawArticle]:
    """질의와 의미가 가까운 조문을 찾는다.

    임베딩 API 장애나 키 누락으로 검색이 안 되면 예외를 올리지 않고 빈 결과를 준다.
    agent들은 "검색 근거가 부족하면 법 위반을 확정하지 않는다"는 지시를 받으므로,
    근거 없이 판단을 멈추는 쪽이 요청 전체를 502로 실패시키는 것보다 낫다.
    """
    try:
        documents = get_vector_store().similarity_search(query, k=top_k)
    except Exception:
        logger.exception("법령 검색 실패 query=%r", query)
        return []

    return [
        LawArticle(
            law_name=document.metadata["law_name"],
            article_number=document.metadata["article_number"],
            effective_date=document.metadata.get("effective_date", ""),
            text=document.page_content,
        )
        for document in documents
    ]


@tool
def search_labor_law(query: str) -> dict[str, object]:
    """사용자 질문과 관련된 대한민국 노동법령 근거를 검색한다.

    근로기준법, 최저임금법, 외국인근로자의 고용 등에 관한 법률,
    근로자퇴직급여 보장법, 임금채권보장법의 조문을 검색한다.

    Args:
        query: 찾으려는 노동 문제나 법률 쟁점.
    """
    return {
        "query": query,
        "articles": [article.model_dump() for article in search(query)],
    }
