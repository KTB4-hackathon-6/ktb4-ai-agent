# FastAPI 검토 API 계약

이 문서는 AI 서버에 구현된 `POST /review` 요청·응답 계약을 정의한다. 백엔드가 프론트엔드에 반환하는 `{ "code": string, "data": object }` 공통 응답은 `AGENTS.md`의 백엔드 규칙을 따르며 이 문서의 범위에 포함하지 않는다.

> **계약 상태:** `legalChecks`와 `LegalCheck` 세부 스키마는 관련 법령과 판정 기준을 확인한 뒤 확정할 예정인 초안(TBD)이다. 나머지 필드는 현재 FastAPI 구현을 기준으로 한다.

## 1. 기본 정보

| 항목 | 값 |
|---|---|
| Method | `POST` |
| Path | `/review` |
| Content-Type | `application/json` |
| 기본 서버 주소 | `http://localhost:8000` |
| OpenAPI | `http://localhost:8000/openapi.json` |
| Swagger UI | `http://localhost:8000/docs` |

`/review`는 사용자 질문과 OCR 문서, deterministic validator 결과를 검토 에이전트에 전달한다. 질문 없이 문서나 검증 결과만 전달해도 요청할 수 있다.

## 2. Request

```json
{
  "requestId": "req-001",
  "sessionId": "session-001",
  "input": {
    "text": "계약서의 관리비를 회사가 공제해도 돼?",
    "documentIds": []
  },
  "documents": [],
  "legalChecks": []
}
```

### 2.1 최상위 스키마

| 필드 | 타입 | 필수 | 빈 값 | 설명 |
|---|---|---:|---|---|
| `requestId` | `string` | O | 빈 문자열 불가 | 요청 추적용 ID |
| `sessionId` | `string` | O | 빈 문자열 불가 | 백엔드가 관리하는 세션 ID |
| `input` | `AnalyzeInput` | O | 불가 | 현재 사용자 입력 |
| `documents` | `Document[]` | O | 문서가 없으면 `[]` | OCR 처리된 문서 목록 |
| `legalChecks` | `LegalCheck[]` | O | 검증 결과가 없으면 `[]` | 법 조항 사전 검증 결과. 세부 스키마는 TBD |

이 API에는 이전 대화 내역을 전달하지 않는다. `history`, `role`, `language`, `currentMessageId`, `documentType`, `ocrStatus` 필드는 사용하지 않는다.

### 2.2 AnalyzeInput 스키마

| 필드 | 타입 | 필수 | 빈 값 | 설명 |
|---|---|---:|---|---|
| `text` | `string \| null` | O | 문서 또는 검증 결과가 있으면 빈 값 가능 | 사용자 질문. 최대 4,000자 |
| `documentIds` | `string[]` | O | 문서가 없으면 `[]` | 현재 요청에 포함된 문서 ID 목록 |

`input.text`, `documents`, `legalChecks`가 모두 비어 있을 때만 `TEXT_INPUT_REQUIRED`를 반환한다.

### 2.3 Document 스키마

| 필드 | 타입 | 필수 | 빈 값 | 설명 |
|---|---|---:|---|---|
| `documentId` | `string` | O | 현재 별도 최소 길이 검증 없음 | 문서 식별자 |
| `fileName` | `string \| null` | O | 파일명을 얻지 못하면 `null` | 원본 파일명 |
| `pages` | `DocumentPage[]` | O | 인식 결과가 없으면 `[]` | 페이지별 OCR 결과 |
| `pages[].pageNumber` | `integer` | O | 1 미만 불가 | 1부터 시작하는 페이지 번호 |
| `pages[].text` | `string` | O | 빈 문자열 가능 | 페이지에서 OCR로 추출한 텍스트 |

이미지나 PDF가 없는 경우 다음처럼 전달한다.

```json
{
  "input": {
    "text": "임금을 받지 못했어",
    "documentIds": []
  },
  "documents": []
}
```

### 2.4 LegalCheck 스키마 — TBD

`legalChecks`는 현재 FastAPI 요청 모델과 백엔드 연동을 위한 임시 구조다. 법령, 판정 범위와 필요한 근거 데이터를 확인한 뒤 필드 이름, 결과 enum, nullable 여부 및 `values` 구조가 변경될 수 있다.

| 필드 | 타입 | 필수 | 빈 값 | 설명 |
|---|---|---:|---|---|
| `checkId` | `string` | O | 현재 별도 최소 길이 검증 없음 | 검증 결과 식별자 |
| `legalReference` | `LegalReference` | O | 불가 | 관련 법 조항 |
| `legalReference.lawName` | `string` | O | 빈 문자열 가능 | 법령 이름 |
| `legalReference.article` | `string` | O | 빈 문자열 가능 | 조 번호 |
| `legalReference.paragraph` | `string \| null` | O | 항이 없으면 `null` | 항 번호 |
| `legalReference.item` | `string \| null` | O | 호가 없으면 `null` | 호 번호 |
| `result` | `enum` | O | 불가 | 현재 임시 판정 값 |
| `reason` | `string \| null` | O | 설명이 없으면 `null` | 판정 이유 |
| `relatedDocumentIds` | `string[]` | O | 관련 문서가 없으면 `[]` | 관련 문서 ID |
| `values` | `object` | O | 비교값이 없으면 `{}` | 검증에 사용한 임시 key-value 데이터 |

현재 `result`는 다음 값을 허용한다.

| 값 | 의미 |
|---|---|
| `VIOLATION` | 검증 규칙상 위반 |
| `POSSIBLE_VIOLATION` | 위반 가능성 있음 |
| `PASS` | 검증 통과 |
| `UNKNOWN` | 판단할 수 없음 |

### 2.5 문서를 포함한 Request 예시

문서 검토 요청에서는 `input.text`를 `null`로 보낼 수 있다.

```json
{
  "requestId": "req-002",
  "sessionId": "session-001",
  "input": {
    "text": "계약서 내용을 확인해줘",
    "documentIds": [
      "doc-001"
    ]
  },
  "documents": [
    {
      "documentId": "doc-001",
      "fileName": "employment-contract.pdf",
      "pages": [
        {
          "pageNumber": 1,
          "text": "월 임금은 2,500,000원으로 한다."
        }
      ]
    }
  ],
  "legalChecks": [
    {
      "checkId": "check-001",
      "legalReference": {
        "lawName": "근로기준법",
        "article": "제43조",
        "paragraph": null,
        "item": null
      },
      "result": "UNKNOWN",
      "reason": null,
      "relatedDocumentIds": [
        "doc-001"
      ],
      "values": {}
    }
  ]
}
```

## 3. Response

```json
{
  "requestId": "req-001",
  "sessionId": "session-001",
  "status": "COMPLETED",
  "result": {
    "answer": "확인이 필요합니다.",
    "analysis": null
  },
  "error": null
}
```

### 3.1 최상위 스키마

| 필드 | 타입 | 필수 | 빈 값 | 설명 |
|---|---|---:|---|---|
| `requestId` | `string` | O | 빈 문자열 불가 | 요청에서 전달받은 ID |
| `sessionId` | `string` | O | 빈 문자열 불가 | 요청에서 전달받은 세션 ID |
| `status` | `COMPLETED \| FAILED` | O | 불가 | 처리 상태 |
| `result` | `AnalyzeResult \| null` | O | 실패하면 `null` | 성공 결과 |
| `error` | `AnalyzeError \| null` | O | 성공하면 `null` | 실패 정보 |

`COMPLETED`이면 `result`가 존재하고 `error`는 `null`이어야 한다. `FAILED`이면 `result`가 `null`이고 `error`가 존재해야 한다.

### 3.2 AnalyzeResult 스키마

| 필드 | 타입 | 필수 | 빈 값 | 설명 |
|---|---|---:|---|---|
| `answer` | `string` | O | 빈 문자열 불가 | 사용자에게 반환할 채팅 답변 |
| `analysis` | `Analysis \| null` | X | 텍스트 채팅이면 `null` | 문서 검토의 구조화된 분석 결과 |

### 3.3 Analysis 스키마

| 필드 | 타입 | 필수 | 빈 값 | 설명 |
|---|---|---:|---|---|
| `summary` | `string \| null` | X | 요약이 없으면 `null` | 분석 요약 |
| `findings` | `Finding[]` | O | 발견 사항이 없으면 `[]` | 발견한 문제 목록 |
| `nextActions` | `string[]` | O | 안내가 없으면 `[]` | 후속 행동 안내 |

### 3.4 Finding 스키마

| 필드 | 타입 | 필수 | 빈 값 | 설명 |
|---|---|---:|---|---|
| `title` | `string` | O | 현재 별도 최소 길이 검증 없음 | 발견 사항 제목 |
| `description` | `string` | O | 현재 별도 최소 길이 검증 없음 | 발견한 문제 설명 |
| `severity` | `INFO \| LOW \| MEDIUM \| HIGH` | O | 불가 | 발견 사항 중요도 |
| `relatedCheckIds` | `string[]` | O | 관련 검증이 없으면 `[]` | 관련 `legalChecks[].checkId` 목록 |
| `relatedDocumentIds` | `string[]` | O | 관련 문서가 없으면 `[]` | 관련 `documents[].documentId` 목록 |

### 3.5 AnalyzeError 스키마

| 필드 | 타입 | 필수 | 빈 값 | 설명 |
|---|---|---:|---|---|
| `code` | `string` | O | 빈 문자열 불가 | AI API 내부 오류 코드 |
| `message` | `string` | O | 빈 문자열 불가 | 오류 설명 |

## 4. 현재 처리 동작

### 4.1 텍스트 채팅

문서와 검증 결과가 없으면 `input.text`를 채팅 에이전트에 전달한다.

```json
{
  "requestId": "req-001",
  "sessionId": "session-001",
  "status": "COMPLETED",
  "result": {
    "answer": "사용자의 언어로 생성된 최소 채팅 응답",
    "analysis": null
  },
  "error": null
}
```

문서나 검증 결과가 있으면 이를 검토 에이전트에 전달하고 `analysis`를 채운다. 검토 결과는 같은 `sessionId`의 체크포인트에 저장되어 `/docs`가 이어서 사용한다.

### 4.2 빈 요청

질문, 문서, 검증 결과가 모두 비어 있으면 `400 Bad Request`를 반환한다.

```json
{
  "requestId": "req-002",
  "sessionId": "session-001",
  "status": "FAILED",
  "result": null,
  "error": {
    "code": "TEXT_INPUT_REQUIRED",
    "message": "input.text 또는 검토할 문서가 필요합니다."
  }
}
```

### 4.3 모델 호출 실패

채팅 모델 호출 중 예외가 발생하면 `502 Bad Gateway`를 반환한다.

```json
{
  "requestId": "req-003",
  "sessionId": "session-001",
  "status": "FAILED",
  "result": null,
  "error": {
    "code": "MODEL_REQUEST_FAILED",
    "message": "AI 모델 요청에 실패했습니다."
  }
}
```

### 4.4 Pydantic 요청 검증 실패

필수 필드 누락, 잘못된 enum 또는 `pageNumber` 범위 오류 등 라우트 진입 전 검증 실패는 FastAPI 기본 `422 Unprocessable Content` 형식으로 반환한다. 이 응답은 `AnalyzeResponse` 형식이 아니다.

```json
{
  "detail": [
    {
      "type": "missing",
      "loc": [
        "body",
        "requestId"
      ],
      "msg": "Field required",
      "input": {}
    }
  ]
}
```

## 5. HTTP 상태와 오류 코드

| HTTP 상태 | status 또는 code | 설명 |
|---:|---|---|
| `200 OK` | `COMPLETED` | 채팅 또는 문서 검토 완료 |
| `400 Bad Request` | `TEXT_INPUT_REQUIRED` | 질문, 문서, 검증 결과가 모두 없음 |
| `422 Unprocessable Content` | FastAPI 기본 검증 오류 | Pydantic 요청 스키마 위반 |
| `502 Bad Gateway` | `MODEL_REQUEST_FAILED` | 채팅 모델 호출 실패 |

## 6. 현재 제한사항

- `legalChecks` 세부 계약은 법령 검토 후 변경될 수 있다.
- `/review`는 문서작성 에이전트를 실행하지 않는다. 작성은 `/docs`에서 시작한다.
