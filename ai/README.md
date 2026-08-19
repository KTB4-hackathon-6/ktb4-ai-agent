# ai

근로계약서 OCR 추출 및 근로기준법·외국인고용법 RAG 검색 모듈입니다.

- OCR (계약서 이미지/PDF → 텍스트)
- RAG 기반 근로기준법·외국인고용법 조항 검색

> 위험도 판정·문서 생성 등 에이전트 오케스트레이션은 별도 팀원이 LangChain으로 구현합니다.

## 구조

```
src/ai_agent/
  main.py              # FastAPI 진입점
  config.py             # 환경변수 설정
  api/routes/
    health.py
    ocr.py               # POST /ocr/extract
    rag.py                # GET /rag/search
  schemas/
    ocr.py
    rag.py
    rules.py              # ContractFacts, RuleViolation
  services/
    ocr.py               # OCR 클라이언트 (Naver Clova OCR)
    rag/retriever.py       # 법령 조항 검색 (embedding/vector store TBD)
    rules.py               # 근로조건 위반 판정 (룰 기반, LLM 미개입)
tests/
```

## 개발 환경 설정

```bash
cd ai
uv sync
cp .env.example .env  # 값 채워넣기
```

### Naver Clova OCR 키 발급

1. [NCP 콘솔](https://console.ncloud.com) 가입 후 **AI・NAVER API > CLOVA OCR**로 이동
2. 도메인 생성 (General 템플릿) → **Invoke URL** 확인
3. 해당 도메인의 **Secret Key** 발급
4. `.env`에 `NAVER_OCR_INVOKE_URL`, `NAVER_OCR_SECRET_KEY`로 입력

## 실행

```bash
uv run ai-agent
# 또는
uv run uvicorn ai_agent.main:app --reload
```

## 테스트 / 린트

```bash
uv run pytest
uv run ruff check .
```
