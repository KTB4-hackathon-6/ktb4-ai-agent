from fastapi import FastAPI

from ai_agent.api.routes import analyze, document_authoring, health, ocr, rag

app = FastAPI(title="ai-agent", version="0.1.0")

app.include_router(health.router)
app.include_router(analyze.router)
app.include_router(ocr.router)
app.include_router(rag.router)
app.include_router(document_authoring.router)


def main() -> None:
    import uvicorn

    uvicorn.run("ai_agent.main:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
    main()
