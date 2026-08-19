from fastapi import APIRouter, Query

from ai_agent.schemas.rag import LawArticle
from ai_agent.services.rag.retriever import search as search_articles

router = APIRouter(prefix="/rag", tags=["rag"])


@router.get("/search", response_model=list[LawArticle])
async def search(query: str, top_k: int = Query(default=3, ge=1, le=20)) -> list[LawArticle]:
    """질의와 관련된 노동법령 조문을 검색한다."""
    return search_articles(query, top_k)
