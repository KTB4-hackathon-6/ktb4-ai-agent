FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir uv==0.11.15

COPY pyproject.toml uv.lock ./
COPY src ./src
RUN uv sync --locked --no-dev

EXPOSE 8000

CMD ["uv", "run", "--no-dev", "uvicorn", "ai_agent.main:app", "--host", "0.0.0.0", "--port", "8000"]
