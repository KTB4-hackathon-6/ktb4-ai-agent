# Postman 설정

로컬에서 backend(Spring Boot)와 ai(FastAPI) 서비스 API를 테스트하기 위한 Postman 컬렉션/환경 파일입니다.

## Import

1. Postman → **Import** → 이 폴더의 두 파일을 함께 선택
   - `KTB4-AI-Agent.postman_collection.json`
   - `local.postman_environment.json`
2. 우측 상단 환경 선택기에서 **KTB4 AI Agent - Local**로 전환

## 사전 준비

- Backend: `cd backend && ./gradlew bootRun` (기본 포트 8080). `NAVER_OCR_INVOKE_URL`, `NAVER_OCR_SECRET_KEY` 환경변수가 있어야 실제 OCR 호출이 성공합니다 (`.env.example` 참고).
- AI: `cd ai && uv run uvicorn ai_agent.main:app --reload` (기본 포트 8000).
- 포트가 다르면 환경 변수 `backendBaseUrl` / `aiBaseUrl` 값을 수정하세요.

## 포함된 요청

| 폴더 | 요청 | 설명 |
|---|---|---|
| Backend | OCR 텍스트 추출 | `POST /api/documents/ocr` — multipart(image, documentType) → `{ code, data }` |
| AI Service | 헬스 체크 | `GET /health` |
| AI Service | OCR 텍스트 추출 | `POST /ocr/extract` — multipart(file) → `{ raw_text }` |
| AI Service | 계약서 분석 | `POST /analyze` — JSON body (예시 값 포함) |
| AI Service | 법령 조항 검색 | `GET /rag/search` — 아직 미구현(501) |

OCR 요청은 `image`/`file` 파트에 직접 테스트할 이미지·PDF를 선택한 뒤 실행하세요.
