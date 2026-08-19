from fastapi import APIRouter, HTTPException

from ai_agent.schemas.chat import ChatRequest, ChatResponse
from ai_agent.services.chat import answer_question

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    try:
        answer = await answer_question(request.question)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Chat model request failed") from exc
    return ChatResponse(answer=answer)
