"""개발용 노동법령 검색."""

from langchain.tools import tool

from ai_agent.schemas.rag import LawArticle

DUMMY_ARTICLES = (
    LawArticle(
        law_name="근로기준법",
        article_number="제17조",
        text="근로계약 체결 시 임금, 소정근로시간, 휴일, 연차유급휴가 등을 명시해야 한다.",
    ),
    LawArticle(
        law_name="근로기준법",
        article_number="제43조",
        text="임금은 원칙적으로 통화로 근로자에게 직접 전액을 지급해야 한다.",
    ),
    LawArticle(
        law_name="근로기준법",
        article_number="제36조",
        text="근로자가 퇴직하면 특별한 사정이 없는 한 14일 이내에 금품을 지급해야 한다.",
    ),
    LawArticle(
        law_name="최저임금법",
        article_number="제6조",
        text="사용자는 적용되는 최저임금액 이상의 임금을 지급해야 한다.",
    ),
    LawArticle(
        law_name="외국인근로자의 고용 등에 관한 법률",
        article_number="제22조",
        text="사용자는 외국인근로자라는 이유로 부당하게 차별하여 처우해서는 안 된다.",
    ),
)


def search(query: str, top_k: int = 3) -> list[LawArticle]:
    # ponytail: 임시 고정 결과, KB가 준비되면 이 함수 본문만 실제 검색으로 교체한다.
    return list(DUMMY_ARTICLES[: max(0, top_k)])


@tool
def search_labor_law(query: str, effective_date: str | None = None) -> dict[str, object]:
    """사용자 질문과 관련된 대한민국 노동법령 근거를 검색한다.

    Args:
        query: 찾으려는 노동 문제나 법률 쟁점.
        effective_date: 법령 적용 기준일. 개발용 더미 검색에서는 사용하지 않는다.
    """
    return {
        "query": query,
        "effectiveDate": effective_date,
        "articles": [article.model_dump() for article in search(query)],
    }
