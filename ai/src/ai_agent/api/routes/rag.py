from fastapi import APIRouter, HTTPException

from ai_agent.schemas.rag import LawArticle

router = APIRouter(prefix="/rag", tags=["rag"])


@router.get("/search", response_model=list[LawArticle])
async def search(query: str, top_k: int = 3) -> list[LawArticle]:
    raise HTTPException(status_code=501, detail="Not implemented yet")
