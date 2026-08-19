# ai

근로계약서 OCR 추출 및 근로기준법·외국인고용법 RAG 검색 모듈입니다.

- OCR (계약서 이미지/PDF → 텍스트)
- 경량 LLM으로 OCR 원문을 구조화된 근로조건 값(`ContractFacts`)으로 추출 — 판단은 하지 않고 읽어내기만 함
- 룰 기반 근로조건 위반 판정 (최저임금·주 52시간·휴게시간·주휴일·필수 명시사항) — LLM 미개입
- RAG 기반 노동법령 조항 검색 (Upstage solar 임베딩 + Chroma)

`POST /contracts/diagnose`가 OCR → 구조화 → 룰 판정을 한 번에 실행해 `{facts, violations}`를 반환한다.
이 결과를 넘겨받아 RAG·의미검색으로 추가 문제를 찾고, 번역·가이드·문서 초안을 만드는 에이전트 오케스트레이션은
별도 팀원이 LangChain으로 구현한다.

## 구조

```
src/ai_agent/
  main.py              # FastAPI 진입점
  config.py             # 환경변수 설정
  api/routes/
    health.py
    ocr.py               # POST /ocr/extract
    rag.py                # GET /rag/search
    contracts.py           # POST /contracts/diagnose (OCR -> 구조화 -> 룰 판정)
  schemas/
    ocr.py
    rag.py
    rules.py              # ContractFacts, RuleViolation
    diagnosis.py           # ContractDiagnosis (facts + violations)
  services/
    ocr.py               # OCR 클라이언트 (Naver Clova OCR)
    extraction.py          # OCR raw_text -> ContractFacts (경량 LLM + 숫자 근거 검증)
    rag/corpus.py          # data/laws.json -> Document 로딩
    rag/store.py           # Chroma 인덱스 (Upstage solar 임베딩)
    rag/retriever.py       # 법령 조항 검색 + search_labor_law 툴
    rules.py               # 근로조건 위반 판정 (룰 기반, LLM 미개입)
  data/laws.json         # 법령 조문 스냅샷 (검색 대상 원문)
scripts/
  build_law_corpus.py    # 국가법령정보센터 -> data/laws.json (일회성)
tests/
```

## 개발 환경 설정

```bash
cd ai
uv sync
cp ../.env.example ../.env  # 프로젝트 루트에 생성 후 값 채워넣기
```

### 법령 검색 (RAG)

검색 대상은 `src/ai_agent/data/laws.json`에 고정된 조문 스냅샷이다. 검색할 때 외부 법령 API를
호출하지 않는다.

| 법령 | 커버하는 문제 |
|---|---|
| 근로기준법 | 근로조건 명시, 임금 지급, 금품 청산, 근로시간·휴게·휴일, 가산수당 |
| 최저임금법 | 최저임금 미달 |
| 외국인근로자의 고용 등에 관한 법률 | 출국만기보험, 취업활동 기간, 차별 금지, 사업장 변경 |
| 근로자퇴직급여 보장법 | 퇴직금 |
| 임금채권보장법 | 체불 대지급금 |

원문은 국가법령정보센터에서 받아 고정한다. **조문을 손으로 고쳐 쓰지 않는다** — 인용이
틀리면 agent가 잘못된 법적 근거를 제시하게 된다. 법 개정으로 갱신할 때만 재실행한다.

```bash
uv run python scripts/build_law_corpus.py
```

인덱스는 첫 검색 때 Chroma(`ai/.chroma`)에 만들어지고 이후 재사용된다. `laws.json`의
판본(`snapshot_date` + 조문 수)이 인덱스와 다르면 자동으로 다시 색인하므로, 코퍼스를
갱신한 뒤 인덱스를 손으로 지울 필요는 없다.

### Upstage API 키 발급

1. [Upstage 콘솔](https://console.upstage.ai) 가입 후 API 키 발급
2. 프로젝트 루트 `.env`에 `UPSTAGE_API_KEY`로 입력

임베딩 모델은 `solar-embedding-1-large`를 쓴다. 색인은 `-passage`, 질의는 `-query` 모델로
자동 분기된다.

### Naver Clova OCR 키 발급

1. [NCP 콘솔](https://console.ncloud.com) 가입 후 **AI・NAVER API > CLOVA OCR**로 이동
2. 도메인 생성 (General 템플릿) → **Invoke URL** 확인
3. 해당 도메인의 **Secret Key** 발급
4. 프로젝트 루트 `.env`에 `NAVER_OCR_INVOKE_URL`, `NAVER_OCR_SECRET_KEY`로 입력

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

실제 모델을 호출하는 평가는 기본적으로 skip된다. 필요할 때만 켠다.

```bash
RUN_LIVE_RAG=1 uv run pytest tests/test_retrieval_e2e.py -s   # 검색 품질(top-3 hit rate)
RUN_LIVE_AI_EVAL=1 uv run pytest tests/test_reviewer_e2e.py   # 문제 검토 agent
```
