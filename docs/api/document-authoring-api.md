# FastAPI 문서작성 API 계약

`POST /docs`는 같은 `sessionId`로 완료한 `/review` 결과를 불러와 SN001 진정서 필드를 대화로 채운다.

## Request

```json
{
  "requestId": "docs-001",
  "sessionId": "session-001",
  "input": {
    "text": "제 전화번호는 010-1234-5678이에요"
  }
}
```

`input.text`는 `null`일 수 있다. 처음 호출할 때 `null`이면 검토 결과에서 채울 수 있는 값을 먼저 채우고 부족한 정보를 질문한다.

## Response

```json
{
  "requestId": "docs-001",
  "sessionId": "session-001",
  "status": "COMPLETED",
  "result": {
    "answer": "사업장 주소를 알려주세요.",
    "form": {
      "formId": "SN001",
      "formName": "진정서(체불, 기타 노동법 위반)",
      "fields": {
        "workerName": "응우옌 반 남",
        "workerPhone": "010-1234-5678",
        "workerAddress": null,
        "employerName": null,
        "employerPhone": null,
        "workplaceName": null,
        "workplaceAddress": null,
        "employmentStartDate": null,
        "employmentEndDate": null,
        "claimType": "임금체불",
        "claimPeriod": null,
        "claimAmount": "200,000원",
        "claimDetails": null,
        "requestedAction": null
      }
    }
  },
  "error": null
}
```

응답은 매 호출마다 전체 필드 스냅샷을 반환하며 확인되지 않은 값은 `null`이다. PDF와 DOCX 렌더링은 백엔드가 담당한다.

## 오류

| HTTP 상태 | 오류 코드 | 설명 |
|---:|---|---|
| `409` | `REVIEW_REQUIRED` | 같은 `sessionId`의 `/review` 결과가 없음 |
| `422` | FastAPI 기본 검증 오류 | 요청 스키마 위반 |
| `502` | `MODEL_REQUEST_FAILED` | 문서작성 모델 호출 실패 |
