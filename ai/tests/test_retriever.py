from ai_agent.services.rag.retriever import search_labor_law


def test_search_labor_law_returns_articles() -> None:
    result = search_labor_law.invoke(
        {"query": "기숙사 관리비 공제", "effective_date": "2026-08-19"}
    )

    assert result["query"] == "기숙사 관리비 공제"
    assert result["effectiveDate"] == "2026-08-19"
    assert result["articles"]
