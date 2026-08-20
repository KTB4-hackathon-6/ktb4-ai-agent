# ILLO

외국인 근로자가 근로계약서의 주요 조건과 위험을 이해하고, 필요한 경우 고용노동부 진정서 작성과 제출 경로 확인까지 이어갈 수 있도록 돕는 다국어 권리구제 준비 서비스입니다.

ILLO는 업로드한 문서를 OCR로 읽고, 구조화된 근로조건에 규칙 기반 검사와 법령 검색 기반 AI 검토를 적용합니다. 결과는 사용자가 선택한 언어로 설명하며, 상담 흐름에서 부족한 정보를 보완해 HWPX 진정서 초안을 만들 수 있습니다.

> ILLO가 제공하는 결과는 법률 상담이나 행정기관의 판단을 대신하지 않으며, 진정서를 사용자 대신 제출하지 않습니다.

## 주요 기능

- **근로계약서 분석**: PDF·JPG·PNG 문서를 OCR하고 임금, 근로시간, 휴게시간, 휴일, 계약기간 등의 근로조건을 구조화합니다.
- **규칙 및 AI 교차 검토**: 결정 가능한 항목은 백엔드 규칙으로 검사하고, 법적 맥락이 필요한 항목은 RAG 기반 AI가 관련 법령과 함께 설명합니다.
- **비동기 진행 상태**: `OCR → STRUCTURING → GENERATING_RESPONSE → COMPLETED` 단계를 화면에 표시합니다.
- **다국어 지원**: 한국어, 영어, 베트남어, 태국어, 인도네시아어, 몽골어, 크메르어를 지원합니다.
- **진정서 작성**: 분석 세션의 문맥을 이어받아 누락 필드를 대화로 확인하고 고용노동부 진정서 HWPX 파일을 생성합니다.
- **제출 안내**: 관할 지방고용노동관서, 노동포털 온라인 제출 경로, 상담 전화와 준비할 증빙자료를 안내합니다.
- **급여명세서 진단 및 문서 대조 API**: 급여명세서 단독 진단과 근로계약서·급여명세서 교차검증 API를 제공합니다. 현재 메인 웹 화면에는 연결되어 있지 않습니다.

## 서비스 흐름

```text
문서 업로드
  → OCR 및 근로조건 구조화
  → 규칙 기반 진단
  → 법령 검색 기반 AI 검토
  → 사용자 언어로 결과 확인
  → 진정서 누락 정보 문답
  → HWPX 다운로드
  → 관할 기관 및 제출 방법 확인
```

## 아키텍처

```text
React / Vite (5173)
        │ /api
        ▼
Spring Boot (8080)
  ├─ 세션 및 비동기 분석 작업 관리
  ├─ Clova OCR 호출
  ├─ DeepSeek 기반 문서 구조화
  ├─ 계약서·급여명세서 규칙 검사
  └─ HWPX 생성
        │ /review, /docs, /guide
        ▼
FastAPI AI (8000)
  ├─ DeepSeek 기반 검토·문답 워크플로우
  ├─ Upstage 임베딩 + Chroma 법령 검색
  └─ 국가법령정보센터 법령 스냅샷 동기화
```

Spring의 공개 API는 성공과 실패 모두 다음 봉투 형식을 사용합니다.

```json
{
  "code": "SUCCESS",
  "data": {}
}
```

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Frontend | React 19, TypeScript 6, Vite 8, i18next, Framer Motion, Vitest, Oxlint |
| Backend | Java 26, Spring Boot 4.1, Gradle, springdoc-openapi |
| AI | Python 3.12+, FastAPI, LangChain, LangGraph, DeepSeek, Upstage, Chroma |
| 외부 연동 | Naver Clova OCR, 국가법령정보 공동활용 Open API, 고용노동부 노동포털 |
| 문서 출력 | 고용노동부 진정서 HWPX 템플릿 |

## 프로젝트 구조

```text
.
├── frontend/        # 업로드, 분석 결과, 진정서 작성 및 기관 안내 UI
├── backend/         # 공개 API, OCR·구조화·규칙 검사, 세션, HWPX 생성
├── ai/              # 법령 RAG, AI 검토, 진정서 문답, 제출 안내
├── docs/            # 서비스 명세, API 계약, 양식 및 설계 문서
├── test-fixtures/   # 백엔드·AI 통합 계약 테스트용 fixture
├── docker-compose.yml
├── SETUP.md         # 세부 로컬 개발환경 설명
└── README.md
```

## 로컬 실행

### 사전 요구사항

- Java 26
- Node.js 24 및 npm
- Python 3.12 이상
- [uv](https://docs.astral.sh/uv/)

전체 분석 흐름에는 다음 외부 서비스 자격 증명이 필요합니다.

- `NAVER_OCR_INVOKE_URL`, `NAVER_OCR_SECRET_KEY`: 문서 OCR
- `DEEPSEEK_API_KEY`: 근로조건 구조화와 AI 검토
- `UPSTAGE_API_KEY`: 법령 RAG 임베딩

국가법령정보센터 동기화 키가 없거나 동기화에 실패하면 저장소의 기존 법령 스냅샷을 사용합니다.

### 1. 환경변수 설정

프로젝트 루트에서 예시 파일을 복사한 뒤 실제 값을 입력합니다.

```bash
cp .env.example .env
```

AI 서버는 루트 `.env`를 읽습니다. Spring Boot는 `.env`를 자동으로 읽지 않으므로 실행할 셸에 값을 내보내야 합니다.

```bash
set -a
source .env
AI_BASE_URL=http://localhost:8000
set +a
```

실제 키와 개인정보는 `.env`, 코드, 로그 또는 Git에 추가하지 않습니다. Spring 전용 타임아웃과 설정 예시는 [`backend/.env.example`](backend/.env.example), 프론트엔드 API 주소 설정은 [`frontend/.env.example`](frontend/.env.example)을 참고하세요.

### 2. AI 서버 실행

```bash
cd ai
uv sync
uv run ai-agent
```

FastAPI 문서는 `http://localhost:8000/docs`, 상태 확인은 `http://localhost:8000/health`에서 확인할 수 있습니다.

### 3. 백엔드 실행

환경변수를 내보낸 터미널에서 실행합니다.

```bash
cd backend
./gradlew bootRun
```

- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`

### 4. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

기본 개발 주소는 `http://localhost:5173`이며, Vite가 `/api` 요청을 `http://localhost:8080`으로 프록시합니다. 다른 API 서버를 사용할 때는 `VITE_API_BASE_URL`을 설정합니다.

## 주요 공개 API

| Method | Path | 설명 |
| --- | --- | --- |
| `POST` | `/api/sessions` | 30분 TTL의 임시 상담 세션 생성 |
| `POST` | `/api/sessions/{sessionId}/contract-analyses` | 비동기 근로계약서 분석 시작 |
| `GET` | `/api/sessions/{sessionId}/contract-analyses/{analysisId}` | 분석 단계와 결과 조회 |
| `POST` | `/api/contracts/diagnose` | 근로계약서 OCR·구조화·규칙 진단 |
| `POST` | `/api/contracts/analyze` | 근로계약서 진단과 AI 검토를 동기 실행 |
| `POST` | `/api/payslips/diagnose` | 급여명세서 OCR·구조화·규칙 진단 |
| `POST` | `/api/employment-documents/cross-check` | 계약서와 급여명세서 대조 |
| `POST` | `/api/sessions/{sessionId}/chat` | 세션 문맥을 사용한 상담 메시지 처리 |
| `GET` | `/api/sessions/{sessionId}/messages` | 세션 메시지 조회 |
| `POST` | `/api/sessions/{sessionId}/documents` | 진정서 정보 보완 및 HWPX 생성 |
| `POST` | `/api/sessions/{sessionId}/guidance` | 관할 기관과 제출 절차 안내 |

정확한 요청·응답 스키마와 상태 코드는 실행 중인 Swagger UI에서 확인할 수 있습니다. Spring과 FastAPI 사이의 내부 계약은 [`docs/api/analysis-api.md`](docs/api/analysis-api.md)에 정리되어 있습니다.

## 테스트와 정적 검사

```bash
# Backend
cd backend
./gradlew test
./gradlew build

# Frontend
cd frontend
npm test
npm run lint
npm run build

# AI
cd ai
uv run pytest
uv run ruff check .
```

실제 외부 모델을 호출하는 AI 평가는 기본적으로 건너뜁니다. 필요한 키를 설정한 뒤 `RUN_LIVE_RAG=1` 또는 `RUN_LIVE_AI_EVAL=1`로 별도 실행할 수 있습니다. 자세한 명령은 [`ai/README.md`](ai/README.md)를 참고하세요.

## 현재 구현 범위와 제한사항

- 메인 프론트엔드 흐름은 근로계약서 분석, 진정서 작성, 제출 안내에 연결되어 있습니다. 급여명세서 진단과 계약서 대조는 공개 백엔드 API로만 제공됩니다.
- 프론트엔드는 선택한 파일을 현재 그대로 서버에 전송합니다. 클라이언트 측 민감정보 가림 기능은 설계 문서만 존재하며 현재 업로드 흐름에는 구현되어 있지 않습니다.
- Spring의 상담 세션과 비동기 작업 상태는 메모리에 저장되며 기본 TTL은 30분입니다. 서버가 재시작되면 사라지고 여러 백엔드 인스턴스 사이에서 공유되지 않습니다.
- AI 대화 체크포인트는 로컬 SQLite, 법령 검색 인덱스는 로컬 Chroma에 저장됩니다. 다중 인스턴스 운영을 위한 공유 저장소는 구성되어 있지 않습니다.
- 업로드 형식은 PDF, JPEG, PNG이며 파일당 최대 10MB, 한 요청은 최대 21MB입니다. 프론트엔드는 선택 파일 합계를 20MB로 제한합니다.
- 관할 관서 자동 조회가 실패하면 고용노동부의 공식 관할관서 검색 페이지와 공통 상담 채널을 안내합니다.
- `docker-compose.yml`에는 MongoDB와 S3 환경변수 등 배포용 구성이 포함되어 있지만, 현재 서비스 코드의 세션·분석 저장소는 MongoDB나 S3를 사용하지 않습니다.

## 관련 문서

- [로컬 개발환경 설정](SETUP.md)
- [ILLO 서비스 기능 명세](docs/ILLO_SERVICE_SPEC.md)
- [세션·채팅 API](docs/api/session-chat-api.md)
- [분석 API](docs/api/analysis-api.md)
- [진정서 HWPX 템플릿](docs/forms/labor-complaint.md)
- [AI 모듈](ai/README.md)
