# 세션 채팅 API와 AI 연동 계약

이 문서는 Spring 백엔드의 세션 채팅 API와 FastAPI `POST /analyze` 사이에서 동기화해야 하는 값을 정의한다. FastAPI 구현 자체는 이 변경 범위에 포함하지 않는다.

## 1. 처리 흐름

```text
클라이언트
  → Spring POST /api/sessions/{sessionId}/chat
  → Spring이 USER 메시지 저장
  → Spring이 FastAPI POST /analyze 호출
  → FastAPI가 AI 응답 반환
  → Spring이 AI 메시지 저장
  → Spring이 USER/AI 메시지를 클라이언트에 반환
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
  "content": "계약서의 관리비를 회사가 공제해도 돼?"
}
```

`content`는 공백이 아닌 문자열이어야 하며 최대 4,000자다. 요청에 `role`을 포함해도 역할 결정에는 사용하지 않는다.

성공하면 `201 Created`와 공통 응답 봉투를 반환한다.

```json
{
  "code": "SUCCESS",
  "data": {
    "requestId": "0a14ac7b-ec61-4fc4-a913-4f8caee41ed7",
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

Spring은 현재 FastAPI 계약에 맞춰 다음 요청을 `POST /analyze`로 보낸다.

```json
{
  "requestId": "0a14ac7b-ec61-4fc4-a913-4f8caee41ed7",
  "sessionId": "f805a616-34d8-4328-853a-ff029cf88d8b",
  "input": {
    "text": "계약서의 관리비를 회사가 공제해도 돼?",
    "documentIds": []
  },
  "documents": [],
  "legalChecks": []
}
```

현재 채팅 연동에는 문서와 법률 검증 결과를 포함하지 않으므로 관련 배열을 빈 배열로 전달한다.

## 4. 동기화 값과 책임

| 값 | 생성·관리 주체 | 동기화 규칙 |
|---|---|---|
| `sessionId` | Spring | 클라이언트 경로, Spring 메시지 저장소, FastAPI 요청에서 동일한 값을 사용한다. FastAPI가 세션 메모리를 구현할 때 이 값을 대화 스레드 키로 사용해야 한다. |
| `requestId` | Spring | AI 호출마다 새 UUID를 생성한다. FastAPI는 같은 값을 응답해야 하며 Spring은 불일치 응답을 저장하지 않는다. |
| `content` / `input.text` | 클라이언트 / Spring | Spring에 저장한 USER 메시지 내용과 FastAPI에 보낸 `input.text`가 같아야 한다. 최대 길이는 양쪽 모두 4,000자다. |
| `result.answer` | FastAPI | 공백이 아닌 정상 응답만 Spring이 `AI` 메시지 내용으로 저장한다. |
| `status` | FastAPI | `COMPLETED`일 때만 AI 메시지를 저장한다. `FAILED` 또는 알 수 없는 값은 업스트림 실패로 처리한다. |
| 응답 `sessionId` | FastAPI | 요청의 `sessionId`와 같아야 한다. 불일치하면 Spring은 응답을 폐기한다. |
| 응답 `requestId` | FastAPI | 요청의 `requestId`와 같아야 한다. 불일치하면 Spring은 응답을 폐기한다. |
| `messageId` | Spring | USER/AI 메시지마다 Spring이 생성한다. FastAPI와 동기화하지 않는다. |
| `createdAt` | Spring | 메시지 저장 시각을 UTC로 생성한다. FastAPI와 동기화하지 않는다. |
| `documentIds`, `documents`, `legalChecks` | 향후 정의 | 현재는 모두 빈 배열이다. 문서 분석 연동 시 별도 계약을 확정해야 한다. |

## 5. 세션 상태 책임

| 상태 | 현재 책임 |
|---|---|
| 클라이언트 화면 복구용 메시지 | Spring 인메모리 메시지 저장소 |
| 세션 유효성 및 30분 TTL | Spring 인메모리 세션 저장소 |
| AI 멀티턴 대화 문맥 | FastAPI에서 `sessionId` 기반으로 구현 예정 |

FastAPI의 세션 메모리가 추가되면 Spring과 동일한 `sessionId`를 사용해야 한다. FastAPI 측 TTL은 최소한 Spring 세션 TTL과 맞추고, Spring 세션이 만료된 뒤 AI 문맥이 불필요하게 남지 않도록 정리 정책을 함께 정해야 한다.

FastAPI가 재시작되거나 여러 워커로 실행될 때도 문맥을 유지해야 한다면 프로세스 메모리가 아닌 Redis 또는 데이터베이스 기반 체크포인터가 필요하다.

## 6. 오류 처리

| 상황 | Spring 응답 | 메시지 저장 결과 |
|---|---|---|
| 세션 없음 또는 만료 | `404 SESSION_NOT_FOUND` | 저장하지 않음 |
| 빈 내용 또는 4,000자 초과 | `400 INVALID_REQUEST` | 저장하지 않음 |
| FastAPI 연결·타임아웃·비정상 HTTP 응답 | `502 AI_REQUEST_FAILED` | USER 메시지만 유지 |
| 응답 ID 불일치, 실패 상태, 빈 AI 답변 | `502 AI_REQUEST_FAILED` | USER 메시지만 유지 |
| 정상 응답 | `201 SUCCESS` | USER와 AI 메시지 모두 저장 |

AI 요청이 실패하면 사용자가 보낸 사실을 복구할 수 있도록 USER 메시지는 유지하고 AI 메시지는 저장하지 않는다. 현재는 재시도 멱등성 키를 제공하지 않으므로 클라이언트가 같은 질문을 다시 보내면 별도의 USER 메시지로 저장된다.

## 7. 환경변수

| 변수 | 기본값 | 설명 |
|---|---|---|
| `AI_BASE_URL` | `http://localhost:8000` | FastAPI 기본 주소 |
| `AI_CONNECT_TIMEOUT` | `2s` | 연결 제한 시간 |
| `AI_READ_TIMEOUT` | `30s` | 응답 대기 제한 시간 |

로컬에서는 Spring과 FastAPI를 각각 `8080`, `8000` 포트로 실행하면 기본값을 그대로 사용할 수 있다.

## 8. 현재 제한사항

- FastAPI의 `sessionId` 기반 대화 메모리는 아직 구현되지 않았다.
- Spring 메시지 저장소는 인메모리이므로 서버 재시작 시 복구되지 않는다.
- 같은 세션에서 여러 채팅 요청을 동시에 처리하는 순서 보장은 아직 정의하지 않았다.
- 문서 및 법률 검증 결과는 FastAPI 요청에 아직 연결하지 않는다.
