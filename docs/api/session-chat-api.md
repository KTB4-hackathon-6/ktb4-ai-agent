# 세션 채팅 API와 AI 연동 계약

이 문서는 Spring 백엔드의 세션 채팅 API와 FastAPI `POST /review`, `POST /docs`,
`POST /guide` 사이에서 동기화해야 하는 값을 정의한다.

## 1. 처리 흐름

```text
클라이언트
  → Spring POST /api/sessions/{sessionId}/chat
  → Spring이 USER 메시지 저장
  → Spring이 FastAPI POST /review 호출
  → FastAPI가 answer와 문제 검토 결과를 반환
  → Spring이 AI 메시지 저장
  → Spring이 analysis와 USER/AI 메시지를 클라이언트에 반환
```

클라이언트는 메시지 역할을 지정하지 않는다. 공개 채팅 API로 들어온 메시지는 Spring이 항상 `USER`로 저장하며, `AI` 메시지는 FastAPI 응답을 받은 Spring 서비스만 저장한다.

## 2. 클라이언트 API

### 2.1 채팅 요청

| 항목 | 값 |
|---|---|
| Method | `POST` |
| Path | `/api/sessions/{sessionId}/chat` |
| Content-Type | `application/json` |

```json
{
  "content": "계약서의 관리비를 회사가 공제해도 돼?",
  "preferredLanguage": "vi"
}
```

`content`는 공백이 아닌 문자열이어야 하며 최대 4,000자다. `preferredLanguage`는 필수이며
`vi`, `en`, `th`, `id`, `mn`, `km`, `ko` 중 하나다. 요청에 `role`을 포함해도 역할 결정에는 사용하지 않는다.

성공하면 `201 Created`와 공통 응답 봉투를 반환한다.

```json
{
  "code": "SUCCESS",
  "data": {
    "requestId": "0a14ac7b-ec61-4fc4-a913-4f8caee41ed7",
    "analysis": null,
    "userMessage": {
      "messageId": "6dc5f7b6-a267-44ed-9308-718ad14134e1",
      "role": "USER",
      "content": "계약서의 관리비를 회사가 공제해도 돼?",
      "createdAt": "2026-08-19T09:00:00Z"
    },
    "aiMessage": {
      "messageId": "30df1f15-c13c-43ad-a986-616242b5eca0",
      "role": "AI",
      "content": "확인이 필요합니다.",
      "createdAt": "2026-08-19T09:00:01Z"
    }
  }
}
```

### 2.2 메시지 복구

| 항목 | 값 |
|---|---|
| Method | `GET` |
| Path | `/api/sessions/{sessionId}/messages` |

메시지 저장 순서대로 `data.messages`를 반환한다. 이 경로는 조회 전용이며 클라이언트가 AI 메시지를 직접 저장하는 API는 제공하지 않는다.

## 3. Spring에서 FastAPI로 보내는 값

Spring은 현재 FastAPI 계약에 맞춰 첫 단계 요청을 `POST /review`로 보낸다.

```json
{
  "requestId": "0a14ac7b-ec61-4fc4-a913-4f8caee41ed7",
  "sessionId": "f805a616-34d8-4328-853a-ff029cf88d8b",
  "preferredLanguage": "vi",
  "input": {
    "text": "계약서의 관리비를 회사가 공제해도 돼?",
    "documentIds": []
  },
  "documents": [],
  "legalChecks": []
}
```

일반 채팅 API는 문서와 법률 검증 결과를 포함하지 않으므로 관련 배열을 빈 배열로 전달한다.
`POST /api/contracts/analyze`는 OCR 원문을 `documents`에, Spring 규칙 진단 결과를
`legalChecks`에 넣어 같은 FastAPI 경로로 전달한다. 상세 스키마는
`docs/api/analysis-api.md`를 따른다.

Frontend는 `POST /api/sessions/{sessionId}/contract-analyses`로 비동기 작업을 시작하고,
`GET /api/sessions/{sessionId}/contract-analyses/{analysisId}`를 1초마다 조회한다. 작업 상태는
`PROCESSING`, `COMPLETED`, `FAILED`이며 처리 단계는 `OCR`, `STRUCTURING`,
`GENERATING_RESPONSE`, `COMPLETED`로 구분한다.

FastAPI의 `/review` 응답 `result.analysis`가 존재하면 Spring은 문제 요약, 문제 항목,
후속 행동을 역직렬화해 채팅 응답의 `data.analysis`에 보존한다. 문서 작성 데이터는
`/review` 응답에 포함하지 않는다. 사용자가 문서 작성을 시작하면 Spring이 별도 `/docs`를
호출하며, `NEEDS_INPUT`이면 누락 질문을 반환하고 `READY`이면 HWPX 생성 서비스에 전달한다.
작성 문서는 진정서 하나로 고정한다. `/docs`는
`input.text`만 받고 `sessionId`에 저장된 최신 검토·문서 작성 문맥을 사용한다. OCR 원문과
검토 결과는 중복 전송하지 않는다. 누락값은 한 번에 하나씩 질문하고 다음 `/docs` 요청의
`input.text`를 답변으로 적용한다. 문서가 완성된 뒤 사용자가 제출 방법을 물으면 `/guide`가
같은 세션 문맥을 사용해 관할 기관, 공식 링크와 제출 절차를 반환한다.

## 4. 동기화 값과 책임

| 값 | 생성·관리 주체 | 동기화 규칙 |
|---|---|---|
| `sessionId` | Spring | 클라이언트 경로, Spring 메시지 저장소, FastAPI 요청에서 동일한 값을 사용한다. FastAPI가 세션 메모리를 구현할 때 이 값을 대화 스레드 키로 사용해야 한다. |
| `requestId` | Spring | AI 호출마다 새 UUID를 생성한다. FastAPI는 같은 값을 응답해야 하며 Spring은 불일치 응답을 저장하지 않는다. |
| `content` / `input.text` | 클라이언트 / Spring | Spring에 저장한 USER 메시지 내용과 FastAPI에 보낸 `input.text`가 같아야 한다. 최대 길이는 양쪽 모두 4,000자다. OCR 원문은 `documents` 스키마로 별도 전송한다. |
| `preferredLanguage` | 클라이언트 / Spring | 프론트에서 선택한 `vi`, `en`, `th`, `id`, `mn`, `km`, `ko` 중 하나를 모든 FastAPI 요청에 전달한다. |
| `result.answer` | FastAPI | 공백이 아닌 정상 응답만 Spring이 `AI` 메시지 내용으로 저장한다. |
| `/review result.analysis` | FastAPI | 문제 요약, 문제 항목과 후속 행동만 Spring 응답에 보존한다. |
| `/docs result.documentDrafts` | FastAPI | 문서 필드, 값의 출처와 누락 질문을 문서 작성 단계에서만 반환한다. |
| `/guide result` | FastAPI | 문서 완성 후 관할 기관, 제출 채널, 공식 링크, 준비자료와 절차를 반환한다. |
| `status` | FastAPI | `COMPLETED`일 때만 AI 메시지를 저장한다. `FAILED` 또는 알 수 없는 값은 업스트림 실패로 처리한다. |
| 응답 `sessionId` | FastAPI | 요청의 `sessionId`와 같아야 한다. 불일치하면 Spring은 응답을 폐기한다. |
| 응답 `requestId` | FastAPI | 요청의 `requestId`와 같아야 한다. 불일치하면 Spring은 응답을 폐기한다. |
| `messageId` | Spring | USER/AI 메시지마다 Spring이 생성한다. FastAPI와 동기화하지 않는다. |
| `createdAt` | Spring | 메시지 저장 시각을 UTC로 생성한다. FastAPI와 동기화하지 않는다. |
| `documentIds`, `documents`, `legalChecks` | Spring | 일반 채팅에서는 빈 배열이며, 계약 분석에서는 OCR 문서 ID·페이지 원문·규칙 진단 결과를 전달한다. |

## 5. 세션 상태 책임

| 상태 | 현재 책임 |
|---|---|
| 클라이언트 화면 복구용 메시지 | Spring 인메모리 메시지 저장소 |
| 세션 유효성 및 30분 TTL | Spring 인메모리 세션 저장소 |
| AI 멀티턴 대화 문맥 | FastAPI에서 `sessionId` 기반으로 구현 예정 |
| 계약서 분석 작업 상태 | Spring 인메모리 작업 저장소, 30분 TTL |

FastAPI의 세션 메모리가 추가되면 Spring과 동일한 `sessionId`를 사용해야 한다. FastAPI 측 TTL은 최소한 Spring 세션 TTL과 맞추고, Spring 세션이 만료된 뒤 AI 문맥이 불필요하게 남지 않도록 정리 정책을 함께 정해야 한다.

FastAPI가 재시작되거나 여러 워커로 실행될 때도 문맥을 유지해야 한다면 프로세스 메모리가 아닌 Redis 또는 데이터베이스 기반 체크포인터가 필요하다.

## 6. 오류 처리

| 상황 | Spring 응답 | 메시지 저장 결과 |
|---|---|---|
| 세션 없음 또는 만료 | `404 SESSION_NOT_FOUND` | 저장하지 않음 |
| 빈 내용 또는 4,000자 초과 | `400 INVALID_REQUEST` | 저장하지 않음 |
| FastAPI 연결·타임아웃·비정상 HTTP 응답 | `502 AI_REQUEST_FAILED` | USER 메시지만 유지 |
| 응답 ID 불일치, 실패 상태, 빈 AI 답변 | `502 AI_REQUEST_FAILED` | USER 메시지만 유지 |
| 존재하지 않거나 만료된 분석 작업 조회 | `404 ANALYSIS_NOT_FOUND` | 변경 없음 |
| 분석 실행 큐 포화 | `503 ANALYSIS_BUSY` | 저장하지 않음 |
| 정상 응답 | `201 SUCCESS` | USER와 AI 메시지 모두 저장 |

AI 요청이 실패하면 사용자가 보낸 사실을 복구할 수 있도록 USER 메시지는 유지하고 AI 메시지는 저장하지 않는다. 현재는 재시도 멱등성 키를 제공하지 않으므로 클라이언트가 같은 질문을 다시 보내면 별도의 USER 메시지로 저장된다.

## 7. 환경변수

| 변수 | 기본값 | 설명 |
|---|---|---|
| `AI_BASE_URL` | `http://localhost:8000` | FastAPI 기본 주소 |
| `AI_CONNECT_TIMEOUT` | `2s` | 연결 제한 시간 |
| `AI_READ_TIMEOUT` | `50s` | 문서 검토 제한 시간(45초)보다 길게 둔 응답 대기 제한 시간 |

로컬에서는 Spring과 FastAPI를 각각 `8080`, `8000` 포트로 실행하면 기본값을 그대로 사용할 수 있다.

## 8. 현재 제한사항

- FastAPI의 `sessionId` 기반 대화 메모리는 아직 구현되지 않았다.
- Spring 메시지 저장소는 인메모리이므로 서버 재시작 시 복구되지 않는다.
- 같은 세션에서 여러 채팅 요청을 동시에 처리하는 순서 보장은 아직 정의하지 않았다.
- 규칙 위반의 정확한 원문 페이지 위치는 아직 추적하지 않아 각 `legalCheck`가 요청의 모든 문서 ID를 참조한다.
- HWPX 공개 다운로드 API는 아직 없으며 생성 서비스와 통합 테스트까지만 구현되어 있다.
