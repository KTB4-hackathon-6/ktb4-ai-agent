# AI 응답 스트리밍 전환 설계

- 상태: 승인 대기
- 작성일: 2026-08-20
- 관련 사전조사: 대화 내 조사 결과 (AI/Backend/Frontend 현황 grep 기반 분석, 별도 문서화하지 않음)

## 배경 및 목표

현재 AI 서버(`ai/`)는 FastAPI + LangChain/LangGraph 기반으로 `/review`, `/docs`,
`/guide` 세 엔드포인트를 제공하지만, 모두 `agent.ainvoke()`로 LLM 응답 전체가
완성될 때까지 기다린 뒤 한 번에 JSON을 반환한다. Backend(`backend/`)는 Spring
`RestClient`(블로킹)로 이 응답을 그대로 받아 DB에 저장한 뒤 REST 응답으로
프론트에 전달하고, Frontend(`frontend/`)는 `fetch` + `response.json()`으로 전체
응답을 한 번에 파싱한다. 스트리밍 관련 코드는 세 레이어 어디에도 없다(grep 0건).

이 설계는 AI가 생성하는 모든 텍스트 응답 엔드포인트(`/review`, `/docs`,
`/guide`)를 Server-Sent Events(SSE) 기반 스트리밍으로 전환하여, 사용자가 answer
텍스트를 토큰 단위로 실시간으로 받아볼 수 있도록 하는 것을 목표로 한다.

계약서 분석(`ContractAnalysisJobService`)에 이미 쓰이고 있는 "단계 기반
폴링"(OCR→STRUCTURING→GENERATING_RESPONSE) 패턴은 이번 작업 범위에서 **제외**하며
그대로 유지한다 — 파일 업로드/OCR이 얽혀 있어 순수 토큰 스트리밍과 성격이 다르고,
현재 해커톤 일정상 별도로 다룰 이유가 없다고 판단했다.

## 범위

**포함**
- AI 서버의 `/review`, `/docs`, `/guide` 세 엔드포인트를 SSE로 완전 교체(기존
  동기 JSON 엔드포인트는 유지하지 않음).
- Backend의 세션 채팅(`/api/sessions/{sessionId}/chat`) 등 위 AI 엔드포인트를
  호출하는 모든 경로를 SSE 릴레이로 전환.
- Frontend의 관련 채팅 UI를 스트리밍 수신/렌더링 구조로 전환.
- `frontend/nginx.conf`의 `/api/` 프록시 설정에 SSE 버퍼링 방지 옵션 추가.

**제외**
- 계약서 분석(OCR/STRUCTURING) 파이프라인의 폴링 방식 변경.
- WebSocket 등 양방향 통신 도입.
- Spring WebFlux로의 전면 전환.

## 전체 아키텍처

```
[AI: FastAPI]  --SSE(text/event-stream)-->  [Backend: SseEmitter]  --SSE-->  [nginx] --SSE--> [Frontend: fetch reader]
   astream_events()      백그라운드 블로킹 스레드가 릴레이           proxy_buffering off 필요
```

- AI 서버가 SSE 스트림의 원천(source)이다.
- Backend는 AI의 스트림을 받아 그대로 프론트로 릴레이하면서, 스트림 종료 시점에
  조립된 전체 응답을 DB에 저장한다(오늘의 "완성된 응답을 받은 후 저장" 흐름을
  유지하되 트리거 시점만 스트림 종료로 이동).
- nginx는 버퍼링 없이 그대로 통과시키는 역할만 한다.
- Frontend가 최종 소비자로, 델타 텍스트를 점진적으로 렌더링한다.

### 백엔드 릴레이 방식 결정

Spring WebFlux 전면 전환은 기존 blocking `RestClient`/JPA 코드와 리액티브 스택을
섞어 써야 해서 리스크와 변경 범위가 큰 반면, 이번 해커톤 일정에서 얻는 이득이
크지 않다고 판단해 채택하지 않는다.

대신 기존 Spring MVC 스택을 유지한 채 컨트롤러가 `SseEmitter`를 반환하고, 별도
스레드(`TaskExecutor`, 계약서 분석과 동일 패턴)가 Java `HttpClient`로 AI의 SSE
스트림을 블로킹 방식으로 읽으며 청크가 올 때마다 `emitter.send(...)`로 전달하는
방식을 채택한다. 동시 접속자가 매우 많아지면 스레드 풀 고갈 우려가 있으나
해커톤 규모에서는 문제가 되지 않는다.

## SSE 이벤트 프로토콜

`/review`, `/docs`, `/guide` 공통으로 아래 세 이벤트 타입을 사용한다. 기존
`{code, data}` 응답 봉투 규약(`AGENTS.md`)을 이벤트 payload에도 동일하게 적용한다.

- **`token`**: `data: {"code": "STREAM_TOKEN", "data": {"delta": "텍스트 조각"}}`
  — answer 텍스트의 델타.
- **`complete`**: `data: {"code": "STREAM_COMPLETE", "data": {"answer": "...", "issues": [...], "next_actions": [...], "form_data": {...}}}`
  — 스트림 종료 시 구조화 필드 전체. `answer`는 검증/폴백용으로 풀텍스트를 함께
  포함하며, 델타 누락이 있었다면 프론트가 이 값으로 최종 텍스트를 덮어쓴다.
- **`error`**: `data: {"code": "AI_STREAM_ERROR", "data": {"message": "..."}}`
  — 중간 실패 시.

15초 간격으로 하트비트 주석(`: ping\n\n`)을 보내 프록시/로드밸런서의 유휴
타임아웃을 방지한다.

## 레이어별 변경

### AI (`ai/`)

- `api/routes/analyze.py`, `document_authoring.py`, `guidance.py`의 라우트를
  `StreamingResponse(media_type="text/event-stream")` 반환으로 교체.
- `agent.ainvoke()` 호출을 LangGraph `astream_events()`로 교체하고,
  `on_chat_model_stream` 이벤트에서 텍스트 델타를 추출해 `token` 이벤트로 즉시
  전송한다.
- 스트림 종료 시 조립된 구조화 payload를 `complete` 이벤트로, 에이전트/툴콜
  에러는 `error` 이벤트로 변환해 전송한다.

**기술적 리스크 (구현 계획에서 최우선 스파이크로 검증 필요)**: 현재
`/review`(`reviewer.py`)와 `/docs`(`remedy/workflow.py`)는 `ToolStrategy`로
구조화 출력을 강제하고 있어, `answer`가 자유 텍스트가 아니라 tool-call JSON
인자 내부에 들어간다. 이 상태로는 사람이 읽기 좋은 형태로 토큰 단위 스트리밍이
어렵다. 하이브리드 방식(answer는 토큰 스트리밍, 나머지 구조화 필드는 스트림
종료 시 한 번에)을 구현하려면, 에이전트 그래프를 "먼저 answer를 순수 텍스트
응답으로 생성 → 그다음 스텝에서 issues/form_data를 도구 호출로 부착"하는 순서로
재구성해야 한다. LLM 호출 횟수를 늘리는 것(사용자가 명시적으로 배제한
"이중 호출" 옵션)과는 다르며, 하나의 에이전트 턴 안에서 생성 순서만 바꾸는
것이 목표다. 이 재구성이 LangGraph/LangChain의 `ToolStrategy` 및 `ChatDeepSeek`
스트리밍 API와 실제로 호환되는지는 설계만으로 확정할 수 없으므로, 구현 계획의
첫 번째 태스크로 프로토타입 검증(스파이크)을 배치한다.

### Backend (`backend/`)

- `FastApiAnalysisClient`에 스트리밍 전용 메서드를 추가한다. Java `HttpClient`
  (`BodyHandlers.ofLines()` 또는 InputStream)로 AI의 `text/event-stream`을
  라인 단위로 읽는다.
- `SessionChatController` 등 관련 컨트롤러가 `ResponseEntity` 대신 `SseEmitter`를
  반환하도록 변경한다.
- `TaskExecutor`(계약서 분석과 동일 패턴)로 백그라운드 스레드에서 AI 스트림을
  읽어 `emitter.send(...)`로 그대로 릴레이한다.
- `SessionChatService`: `token` 이벤트가 올 때마다 텍스트를 누적하다가
  `complete` 이벤트 수신 시점에 조립된 전체 answer + 구조화 필드를
  `messageService.addAiMessage(...)`로 DB에 저장한다.
- 에러 시: 부분 answer는 저장하지 않고 `error` 이벤트만 프론트로 전달한다
  (기존 실패 시 동작과 동일하게 유지).

### Frontend (`frontend/`)

- `EventSource`는 POST 바디/커스텀 헤더를 지원하지 않으므로,
  `fetch(url, {method: 'POST', body, signal})` +
  `response.body.getReader()` + `TextDecoder`로 SSE 프레임을 직접 파싱하는
  유틸(`streamChat()`)을 신규 작성한다. 프레임이 청크 경계에서 잘리는 경우를
  버퍼링으로 처리한다.
- `ChatMessage` 렌더링을 "진행 중 말풍선" 상태로 확장한다: `token` 수신마다
  텍스트를 append하고, `complete` 수신 시 issues 등 구조화 데이터를 반영해
  메시지를 확정하며, `error` 수신 시 기존 에러/재시도 UI로 폴백한다.
- 취소는 기존 `contracts.ts` 폴링에서 쓰는 `AbortController` 패턴을 재사용한다.

### 인프라 (`frontend/nginx.conf`)

- `location /api/`에 `proxy_buffering off;`, `proxy_read_timeout` 연장(예: 120s),
  `proxy_set_header Connection '';`를 추가해 SSE가 중간에 버퍼링되지 않도록 한다.

## 에러 처리 / 재연결

- 자동 재연결은 구현하지 않는다. 연결이 끊기면 프론트가 에러 상태를 보여주고
  사용자가 수동으로 재시도한다(현재 실패 UX와 동일).
- 하트비트로 유휴 타임아웃을 방지하고, 실제 LLM/네트워크 에러는 `error` 이벤트로
  명시적으로 전달한다.

## 테스트 전략

- **AI**: `astream_events` 기반 스트리밍 서비스 함수에 대한 유닛 테스트. 가짜
  스트리밍 모델 더블로 델타 순서와 최종 payload의 정확성을 검증한다.
- **Backend**: 스텁 AI 서버(WireMock 또는 MockWebServer로 청크 단위
  `text/event-stream` 응답을 재현)를 이용해 `SseEmitter` 릴레이 동작과 스트림
  종료 시 DB 저장 로직을 통합 테스트로 검증한다.
- **Frontend**: `streamChat()` 파싱 유틸에 대해 프레임이 청크 경계에서 잘리는
  케이스를 포함한 Vitest 단위 테스트를 작성하고, 개발 서버에서 수동 브라우저
  검증을 병행한다.

## 미해결 리스크 요약

1. `ToolStrategy` 구조화 출력과 텍스트 토큰 스트리밍의 호환성 — AI 레이어 섹션의
   기술적 리스크 참고. 구현 착수 전 스파이크로 검증 필요.
2. Backend 블로킹 릴레이 스레드의 동시성 한도 — 해커톤 트래픽 규모에서는
   허용 가능하다고 판단했으나, 실제 부하 테스트는 범위 밖.
