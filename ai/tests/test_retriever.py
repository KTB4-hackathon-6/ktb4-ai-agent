from ai_agent.services.rag.retriever import search_labor_law


def test_search_labor_law_returns_articles() -> None:
    result = search_labor_law.invoke(
        {"query": "기숙사 관리비 공제", "effective_date": "2026-08-19"}
    )

    assert result["query"] == "기숙사 관리비 공제"
    assert result["effectiveDate"] == "2026-08-19"
    assert [article["article_number"] for article in result["articles"]] == [
        "제43조 제1항",
        "숙식정보 제공 및 비용징수 관련 업무지침",
        "제48조 제2항",
    ]
