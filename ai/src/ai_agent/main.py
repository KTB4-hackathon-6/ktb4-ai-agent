import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from ai_agent.api.routes import analyze, document_authoring, guidance, health, ocr, rag
from ai_agent.config import get_settings
from ai_agent.services.rag.law_sync import sync_configured_laws

logger = logging.getLogger(__name__)


async def _law_sync_loop(stop_event: asyncio.Event) -> None:
    settings = get_settings()
    while not stop_event.is_set():
        result = await asyncio.to_thread(sync_configured_laws, settings)
        if result.error:
            logger.warning("법령 자동 동기화를 건너뜁니다: %s", result.error)
        elif result.updated:
            logger.info("법령 자동 동기화 완료: %s", ", ".join(result.updated_laws))
        try:
            await asyncio.wait_for(
                stop_event.wait(), timeout=max(settings.law_sync_interval_hours, 1) * 3600
            )
        except TimeoutError:
            continue


@asynccontextmanager
async def lifespan(_: FastAPI):
    task: asyncio.Task[None] | None = None
    settings = get_settings()
    if settings.law_sync_enabled:
        task = asyncio.create_task(_law_sync_loop(asyncio.Event()), name="government-law-sync")
    try:
        yield
    finally:
        if task is not None:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass


app = FastAPI(title="ai-agent", version="0.1.0", lifespan=lifespan)

app.include_router(health.router)
app.include_router(analyze.router)
app.include_router(ocr.router)
app.include_router(rag.router)
app.include_router(document_authoring.router)
app.include_router(guidance.router)


def main() -> None:
    import uvicorn

    uvicorn.run("ai_agent.main:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
    main()
