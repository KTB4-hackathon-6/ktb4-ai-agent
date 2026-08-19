"""Retrieves relevant 근로기준법 / 외국인고용법 articles for a given clause.

Backed by a vector DB of embedded law articles (store/embedding provider TBD).
"""

from ai_agent.schemas.rag import LawArticle


def search(query: str, top_k: int = 3) -> list[LawArticle]:
    raise NotImplementedError
