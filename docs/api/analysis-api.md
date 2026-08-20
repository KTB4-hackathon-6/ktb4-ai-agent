# FastAPI 검토·문서 작성·제출 안내 API 계약

이 문서는 Spring 백엔드와 AI 서버 사이의 3단계 내부 연동 계약을 정의한다. 기존
`POST /analyze`는 제거하고 문제 검토는 `POST /review`, 문서 작성은 `POST /docs`, 해결 및
제출 안내는 `POST /guide`로 분리한다.

> 상태: **통합 계약**. Python 서버의 `POST /review`, `POST /docs`, `POST /guide` 요청·응답
> 스키마와 Spring 클라이언트의 Java record가 이 계약을 사용한다.

| 단계 | Method | Path | 역할 |
|---|---|---|---|
| 1 | `POST` | `/review` | OCR 문서의 문제를 지적하고 대응 방법을 안내 |
| 2 | `POST` | `/docs` | 사용자가 선택한 문서의 구조화 데이터를 만들거나 누락 입력을 질문 |
| 3 | `POST` | `/guide` | 완성된 문서를 어디에 어떻게 제출할지 기관·링크·절차를 안내 |

세 API 모두 `Content-Type: application/json`을 사용한다. Spring 공개 API의
`{ "code": string, "data": object }` 봉투와는 별개의 계약이다.

### 공통 직렬화 규칙

| 항목 | 규칙 |
|---|---|
| JSON 필드명 | 문서에 적힌 `camelCase`를 그대로 사용 |
| 날짜 | ISO 8601 달력 날짜 `YYYY-MM-DD`, 시간대 없음 |
| 금액 | 원 단위의 0 이상 정수. 소수와 통화 기호를 보내지 않음 |
| 선택 스칼라 | 값이 없으면 필드를 생략하지 않고 `null` |
| 배열 | 필드를 생략하거나 `null`로 보내지 않고, 값이 없으면 `[]` |
| 알 수 없는 필드 | 요청 모델에서 거부 (`extra="forbid"`) |
| 문자열 공백 | 식별자와 필수 문자열은 앞뒤 공백 제거 후 빈 문자열이면 거부 |
| 선호 언어 | 모든 요청의 `preferredLanguage`에 `vi`, `en`, `th`, `id`, `mn`, `km`, `ko` 중 하나를 전달 |

```text
파일 + 요청 텍스트 → /review → 문제 검토 완료
                                      ↓ 사용자가 진정서 작성 요청
                       /docs → NEEDS_INPUT 또는 READY
                                      ↓ 사용자가 방법 질문
                                 /guide → 기관·링크·절차
```

AI 서버는 `sessionId`별 최신 `/review` 문맥에 OCR 원문, 규칙 검사 결과와 문제 검토 결과를
보관한다. `/docs`는 이 문맥을 사용하므로 OCR 원문과 검토 결과를 다시 받지 않는다. 현재
계약은 한 세션에 활성 검토 문맥이 하나라고 가정한다. 새 `/review`가 성공하면 같은 세션의
이전 검토 문맥과 작성 중 초안을 교체한다.

Spring 세션 TTL은 현재 세션 생성 시점부터 30분이며 연장되지 않는다. AI 문맥은 `/review`
완료 시점부터 최대 30분 동안 유지하고, 만료되면 `REVIEW_CONTEXT_REQUIRED`를 반환한다. Spring
세션이 먼저 만료되면 Spring이 후속 호출을 차단한다. 여러 FastAPI worker나 여러 인스턴스를 사용할 때는
모든 worker가 같은 문맥 저장소를 사용해야 한다. 프로세스 메모리 저장소는 로컬 단일 worker
개발 환경에만 허용한다. 민감정보가 포함된 문맥은 만료 시 삭제하고 요청·응답 본문을 로그에
남기지 않는다.

## 1. POST /review

### 요청

기존 `/analyze` 요청 스키마를 유지하며 `input.text`는 반드시 존재해야 한다.

```json
{
  "requestId": "review-001",
  "sessionId": "session-001",
  "preferredLanguage": "vi",
  "input": {
    "text": "계약서에서 잘못된 부분과 대응 방법을 알려줘",
    "documentIds": ["doc-001"]
  },
  "documents": [
    {
      "documentId": "doc-001",
      "fileName": "employment-contract.pdf",
      "pages": [
        {"pageNumber": 1, "text": "월 임금 1,750,000원"}
      ]
    }
  ],
  "legalChecks": [
    {"checkId": "BELOW_MINIMUM_WAGE", "result": "DETECTED"}
  ]
}
```

| 필드 | 타입 | 규칙 |
|---|---|---|
| `requestId` | `string` | 필수, 공백 불가, 요청 추적 식별자 |
| `sessionId` | `string` | 필수, 공백 불가, AI 검토 문맥 키 |
| `preferredLanguage` | `enum` | 필수. AI 답변에 사용할 사용자 선호 언어 코드 |
| `input.text` | `string` | 필수, 공백 불가, 최대 4,000자 |
| `input.documentIds` | `string[]` | 필수. 중복 없이 `documents[].documentId` 집합과 정확히 일치 |
| `documents` | `Document[]` | 필수. OCR 문서 목록, 없으면 `[]` |
| `documents[].documentId` | `string` | 요청 안에서 고유 |
| `documents[].fileName` | `string \| null` | 원본 파일명 |
| `documents[].pages` | `DocumentPage[]` | 페이지 번호 오름차순의 OCR 페이지 목록 |
| `documents[].pages[].pageNumber` | `integer` | 문서 안에서 고유한 1 이상 정수 |
| `documents[].pages[].text` | `string` | OCR 원문. 빈 페이지는 `""` 허용 |
| `legalChecks` | `LegalCheck[]` | 백엔드 규칙 검사 결과, 없으면 `[]` |
| `legalChecks[].checkId` | `CheckId` | 고정 검사 ID |
| `legalChecks[].result` | `CheckResult` | `DETECTED` 또는 `REVIEW_REQUIRED` |

지원하는 `checkId`는 다음과 같다.

- `WAGE_DISCLOSURE_MISSING`
- `WORKING_HOURS_DISCLOSURE_MISSING`
- `HOLIDAY_DISCLOSURE_MISSING`
- `PAYMENT_DATE_DISCLOSURE_MISSING`
- `BELOW_MINIMUM_WAGE`
- `REST_TIME_INSUFFICIENT`
- `WEEKLY_HOLIDAY_MISSING`
- `CONTRACT_PERIOD_REVIEW`
- `CONTRACT_PERIOD_EXCEEDED`
- `IN_PERSON_PAYMENT_RISK`
- `ACCOMMODATION_DEDUCTION_HIGH`

`DETECTED`는 백엔드의 결정적 규칙이 문제를 확인했다는 뜻이고, `REVIEW_REQUIRED`는 규칙만으로
확정할 수 없어 AI 설명 또는 사용자 확인이 필요하다는 뜻이다. 현재 `LegalCheck`에는 관련
문서 ID가 없으므로 문서가 여러 개일 때 어떤 문서에서 발생한 검사인지 전달할 수 없다. 이
연결이 필요해지면 `legalChecks[].relatedDocumentIds`를 양쪽 모델에 동시에 추가해야 한다.

### 응답

문제 지적과 대응 안내는 `/review`에서 마무리한다. 문서 작성 필드나 누락 질문은 포함하지
않는다. 현재 작성 문서는 진정서 하나로 고정하므로 문서 추천이나 종류 선택 정보도 반환하지
않는다.

```json
{
  "requestId": "review-001",
  "sessionId": "session-001",
  "status": "COMPLETED",
  "result": {
    "answer": "최저임금 미달 가능성과 임금 지급일 누락을 확인했습니다.",
    "analysis": {
      "summary": "계약서상 임금 조건에 문제가 있습니다.",
      "findings": [
        {
          "title": "MINIMUM_WAGE",
          "description": "계약서상 시급이 적용 최저임금보다 낮습니다.",
          "severity": "HIGH",
          "relatedDocumentIds": ["doc-001"]
        }
      ],
      "nextActions": [
        "사업주에게 임금 조정을 요청할 수 있습니다.",
        "관할 고용노동관서에 진정서를 제출할 수 있습니다."
      ]
    }
  },
  "error": null
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `result.answer` | `string` | 사용자에게 보여줄 최종 검토 설명 |
| `analysis.summary` | `string \| null` | 전체 문제 요약 |
| `analysis.findings` | `Finding[]` | 발견한 문제 항목 |
| `findings[].title` | `string` | 문제 제목 |
| `findings[].description` | `string` | 잘못된 부분과 이유 설명 |
| `findings[].severity` | `enum` | `INFO`, `LOW`, `MEDIUM`, `HIGH` |
| `findings[].relatedDocumentIds` | `string[]` | 관련 OCR 문서 ID |
| `analysis.nextActions` | `string[]` | 문제에 대한 대응 방법 |

문서가 포함된 `/review`에서는 `analysis`가 필수다. 문서와 법률 검사 없이 일반 질문만 전달한
경우에는 `analysis`가 `null`일 수 있으며 `answer`만 반환한다. `analysis`가 존재하면 내부 배열
두 개(`findings`, `nextActions`)는 항상 존재하고 빈 값은 `[]`로 보낸다.

## 2. POST /docs

### 요청

`/docs`는 `sessionId`에 저장된 최신 검토 문맥을 사용한다. 따라서 다음 값은 다시 보내지
않는다.

- `/review`의 `analysis` 결과
- `documents`와 OCR 원문
- `legalChecks`
- `reviewRequestId`
- `documentType`
- `templateId`
- 구조화된 `userInputs`

```json
{
  "requestId": "docs-001",
  "sessionId": "session-001",
  "preferredLanguage": "vi",
  "input": {
    "text": "진정서 작성을 시작해줘"
  }
}
```

| 필드 | 타입 | 규칙 |
|---|---|---|
| `requestId` | `string` | 필수, 공백 불가, `/docs` 호출마다 새로 생성 |
| `sessionId` | `string` | 필수, 선행 `/review`와 동일한 세션 |
| `preferredLanguage` | `enum` | 필수, 선행 요청과 같은 사용자 선호 언어 코드 |
| `input.text` | `string` | 필수, 공백 불가, 최대 4,000자 |

추가 입력을 받은 후에도 동일한 `/docs`를 호출한다. AI는 현재 세션에서 질문한 필드 하나와
다음 `input.text`를 연결해 값을 채운다.

```json
{
  "requestId": "docs-002",
  "sessionId": "session-001",
  "preferredLanguage": "vi",
  "input": {
    "text": "경기도 안산시 단원구 테스트로 10"
  }
}
```

`input.text`에는 주소, 연락처 등 민감정보가 포함될 수 있으므로 요청 본문 값을 로그에
기록하지 않는다.

지원 문서는 진정서 하나로 고정한다. `/docs`는 `input.text`에서 작성 시작 또는 직전 질문의
답변을 해석하며 문서 종류를 선택하지 않는다.

### 추가 입력이 필요한 응답

```json
{
  "requestId": "docs-001",
  "sessionId": "session-001",
  "status": "COMPLETED",
  "result": {
    "answer": "진정서 작성을 위해 주소를 입력해 주세요.",
    "documentDrafts": [
      {
        "status": "NEEDS_INPUT",
        "data": {
          "complainant": {
            "fullName": "NGUYEN VAN TEST",
            "residentRegistrationNumber": null,
            "address": null,
            "telephone": null,
            "mobilePhone": "010-0000-0001",
            "email": null,
            "receiveStatusUpdates": null,
            "notifyViaLaborPortal": null
          },
          "respondent": {
            "fullName": "김테스트",
            "contact": null,
            "address": null,
            "workplaceType": "WORKPLACE",
            "workplaceName": "테스트산업 주식회사",
            "actualWorkplaceAddress": "경기도 안산시 단원구 공단로 30",
            "workplaceTelephone": null,
            "employeeCount": null
          },
          "complaint": {
            "employmentStartDate": "2026-02-20",
            "employmentEndDate": null,
            "unpaidWagesTotal": 406923,
            "employmentStatus": "EMPLOYED",
            "unpaidSeverancePay": null,
            "otherUnpaidAmount": null,
            "jobDescription": "생산 및 검수",
            "payday": null,
            "contractMethod": "WRITTEN",
            "details": "최저임금 미달 가능성이 있습니다.",
            "attachmentFileNames": ["employment-contract.pdf"]
          },
          "submission": {"recipientLaborOfficeName": null}
        },
        "missingFields": [
          {
            "fieldId": "complainant.address",
            "displayName": "주소",
            "required": true,
            "inputType": "TEXT",
            "question": "현재 주소를 입력해 주세요.",
            "reason": "진정서 필수 항목입니다.",
            "sensitive": true,
            "validationRules": {
              "pattern": null,
              "minLength": 1,
              "maxLength": 300,
              "minValue": null,
              "maxValue": null,
              "allowedValues": []
            },
            "status": "MISSING"
          }
        ]
      }
    ]
  },
  "error": null
}
```

### 문서 작성 준비가 끝난 응답

필수값이 모두 채워지면 초안 `status`는 `READY`, `missingFields`는 `[]`가 된다. Spring은
`READY` 초안의 `data`를 고정된 진정서 HWPX 생성기에 전달한다. `NEEDS_INPUT` 상태에서도
사용자가 현재 작성본 다운로드를 요청할 수 있도록 확인된 값만 채우고 누락값은 빈칸으로 둔
HWPX 스냅샷을 함께 생성한다.

| 필드 | 타입 | 설명 |
|---|---|---|
| `result.answer` | `string` | 문서 작성 진행 상태 안내 |
| `result.documentDrafts` | `DocumentDraft[]` | 현재 작성 중인 문서 초안 한 개 |
| `documentDrafts[].status` | `enum` | AI 응답은 `NEEDS_INPUT` 또는 `READY` |
| `documentDrafts[].data` | `LaborComplaintFormData` | 문서 양식과 1:1 대응하는 구조화 데이터 |
| `documentDrafts[].missingFields` | `MissingField[]` | `NEEDS_INPUT`이면 다음 질문 한 개, `READY`이면 `[]` |

누락값이 여러 개여도 한 응답에는 질문 하나만 반환한다. 사용자가 답하면 AI가 값을 반영하고
다음 누락값을 하나 질문한다.

`NEEDS_INPUT`은 `missingFields`가 정확히 한 개여야 하고, 해당 `fieldId`의 `data` 값은 `null`
또는 빈 값이어야 한다. `READY`는 `missingFields`가 `[]`이고 모든 필수값이 채워져야 한다.
AI 서버는 `GENERATED` 또는 `FAILED`를 초안 상태로 반환하지 않는다. 문서 생성 성공·실패는
Spring 영역의 상태다.

AI가 질문하는 항목은 문서 생성에 필요한 필수값이며 `missingFields[].required`는 `true`,
`status`는 `MISSING`이다. 선택값을 알 수 없으면 질문하지 않고 `data`에 `null` 또는 `[]`로
유지한다.

전체 진정서 필드와 필수 여부는 `docs/forms/labor-complaint.md`를 참고한다. 완성형 fixture는
`test-fixtures/analysis/labor-complaint-ready.json`에 있다.

## 3. POST /guide

문서가 `READY`가 된 후 사용자가 제출 방법을 물으면 호출한다. `/review`와 `/docs` 문맥은
`sessionId`로 연결하므로 완성된 문서 데이터를 다시 보내지 않는다.

### 요청

```json
{
  "requestId": "guide-001",
  "sessionId": "session-001",
  "preferredLanguage": "vi",
  "input": {
    "text": "완성한 진정서를 어디에 어떻게 제출해야 해?"
  }
}
```

| 필드 | 타입 | 규칙 |
|---|---|---|
| `requestId` | `string` | 필수, 공백 불가, 요청 추적 식별자 |
| `sessionId` | `string` | 필수, 문서 작성과 동일한 세션 |
| `preferredLanguage` | `enum` | 필수, 문서 작성과 같은 사용자 선호 언어 코드 |
| `input.text` | `string` | 필수, 공백 불가, 최대 4,000자 |

### 응답

```json
{
  "requestId": "guide-001",
  "sessionId": "session-001",
  "status": "COMPLETED",
  "result": {
    "answer": "관할 지방고용노동관서에 온라인 또는 방문으로 제출할 수 있습니다.",
    "agencyCode": "MOEL",
    "agencyName": "고용노동부",
    "jurisdictionOfficeName": "관할 지방고용노동관서",
    "submissionOptions": [
      {
        "channel": "ONLINE",
        "label": "온라인 제출",
        "url": "https://official-service.example/labor-complaint",
        "address": null,
        "instructions": "공식 민원 서비스에서 작성 내용을 확인한 뒤 제출합니다."
      },
      {
        "channel": "VISIT",
        "label": "방문 제출",
        "url": null,
        "address": "관할 지방고용노동관서 민원실",
        "instructions": "진정서와 증빙자료를 지참해 방문합니다."
      }
    ],
    "requiredAttachments": ["근로계약서", "임금 지급 내역 등 증빙자료"],
    "steps": [
      "문서의 작성 내용을 확인합니다.",
      "증빙자료를 준비합니다.",
      "온라인 또는 방문 방법을 선택해 제출합니다."
    ],
    "notes": "제출 전에 관할 기관과 접수 조건을 다시 확인합니다."
  },
  "error": null
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `result.answer` | `string` | 사용자 질문에 대한 제출 방법 설명 |
| `agencyCode` | `enum` | 기관 식별 코드, 현재 `MOEL` |
| `agencyName` | `string` | 기관명 |
| `jurisdictionOfficeName` | `string` | 관할 지청 또는 관서명 |
| `submissionOptions` | `SubmissionOption[]` | 온라인·방문·우편 제출 방법 |
| `submissionOptions[].channel` | `enum` | `ONLINE`, `VISIT`, `MAIL` |
| `submissionOptions[].url` | `string \| null` | 온라인 제출 공식 링크 |
| `submissionOptions[].address` | `string \| null` | 방문·우편 제출 주소 |
| `submissionOptions[].label` | `string` | 화면에 표시할 제출 방법 이름 |
| `submissionOptions[].instructions` | `string` | 해당 방법의 실행 안내 |
| `requiredAttachments` | `string[]` | 함께 준비할 증빙자료 |
| `steps` | `string[]` | 사용자가 따라야 할 순서 |
| `notes` | `string \| null` | 주의사항 |

AI가 임의의 기관 URL을 생성하지 않도록 Spring은 `agencyCode`에 대응하는 공식 기관
카탈로그와 도메인 허용 목록으로 URL을 검증하거나 교체해야 한다. 문서가 아직 `READY`가
아니면 `/guide`는 `DOCUMENT_NOT_READY`를 반환한다.

`ONLINE`은 `url`이 필수이고, `VISIT`과 `MAIL`은 `address`가 필수다. URL은 AI가 생성하지 않고
서버가 관리하는 기관 카탈로그에서 선택한다. 예시의 `official-service.example`은 테스트용이며
운영 응답에 사용하지 않는다.

## 4. 기존 /analyze 대비 변경

| 구분 | 기존 `/analyze` | 변경 후 |
|---|---|---|
| API | 문제 검토·문서 작성·방법 안내가 한 요청에 혼재 | `/review`, `/docs`, `/guide`로 분리 |
| 최초 요청 | 파일, 텍스트, OCR, 규칙 검사 | `/review`가 동일하게 수신 |
| 문제 지적 | 문서 초안과 함께 반환 가능 | `/review`에서 완료 |
| 문서 작성 대상 | 명확한 선택 모델 없음 | 진정서 하나로 고정하고 `/docs input.text`로 작성 의사 전달 |
| 문서 작성 요청 | 검토 정보와 원문을 재전송 | `sessionId` 문맥과 `input.text`만 사용 |
| 요청 텍스트 | `/analyze input.text` | `/review`, `/docs` 모두 `input.text` 필수 |
| 선호 언어 | 명시적 필드 없음 | 모든 요청에 `preferredLanguage` 필수 |
| 검토 연결 ID | `requestId`만 존재 | `/docs`에 `reviewRequestId` 없음 |
| 누락값 수집 | 여러 필드를 한 번에 받을 수 있음 | 질문 하나와 답변 하나를 반복 |
| 문서 템플릿 | 템플릿 식별 정보가 계약에 노출될 수 있음 | 진정서 하나로 고정하고 템플릿 ID·버전을 Spring 내부에서 관리 |
| 제출 안내 | 분석 답변에 섞일 수 있음 | 사용자가 물으면 `/guide`에서 기관·링크·절차 반환 |

## 5. 공통 응답과 오류

- `COMPLETED`: `result` 필수, `error`는 `null`
- `FAILED`: `result`는 `null`, `error` 필수
- 응답 `requestId`, `sessionId`는 요청 값과 같아야 한다.
- 애플리케이션 오류 응답은 항상 `{requestId, sessionId, status, result, error}` 구조를 사용한다.
- `error`는 `{ "code": string, "message": string }`이며 두 문자열 모두 비어 있으면 안 된다.
- Pydantic 요청 파싱 전에 발생하는 `422`만 FastAPI 기본 `{"detail": [...]}` 형식을 사용한다.
  요청 자체에 `requestId` 또는 `sessionId`가 없을 수 있어 공통 실패 봉투를 만들 수 없기 때문이다.

| HTTP | code | 설명 |
|---:|---|---|
| `200` | `COMPLETED` | 검토, 문서 데이터 구성 또는 제출 안내 완료 |
| `400` | `TEXT_INPUT_REQUIRED` | `input.text`가 문자열이지만 비어 있거나 공백뿐임 |
| `400` | `REVIEW_CONTEXT_REQUIRED` | `/docs` 세션에 완료된 검토 문맥이 없음 |
| `400` | `DOCUMENT_NOT_READY` | `/guide` 세션의 문서가 아직 완성되지 않음 |
| `422` | FastAPI 검증 오류 | 필수 필드 누락, `null`, 타입·enum·길이 또는 요청 불변식 위반 |
| `502` | `MODEL_REQUEST_FAILED` | 모델 호출 실패 |

기관 연결 정보는 `/docs` 응답에 포함하지 않고 사용자가 방법을 요청할 때 `/guide`에서
제공한다.

## 6. Python 구현 기준

### 권장 파일 경계

| 파일 | 책임 |
|---|---|
| `schemas/common.py` | `ContractModel`, 상태, 오류, 공통 입력 |
| `schemas/review.py` | `/review` 요청·응답과 enum |
| `schemas/documents.py` | `/docs`, 진정서 데이터, 누락 필드 validator |
| `schemas/guidance.py` | `/guide`와 제출 방법 validator |
| `api/routes/review.py` | `/review` 라우트와 오류 매핑 |
| `api/routes/documents.py` | `/docs` 라우트와 문맥 갱신 |
| `api/routes/guidance.py` | `/guide` 라우트 |
| `services/context_store.py` | `sessionId`별 검토·초안 문맥과 TTL |

모든 계약 모델은 같은 엄격한 기반 모델을 상속한다.

```python
from pydantic import BaseModel, ConfigDict


class ContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
```

응답 상태 불변식, `DocumentDraft.status`와 `missingFields` 관계, 제출 채널별 URL·주소 조건은
`model_validator(mode="after")`로 검증한다. 날짜는 `datetime.date`, 금액은 `Field(ge=0)`인
`int`로 모델링한다. Java와 JSON 이름이 이미 같으므로 별도 alias generator는 사용하지 않는다.

### 최소 계약 테스트

- 세 정상 예시를 각 Pydantic 응답 모델로 검증한다.
- `test-fixtures/analysis/labor-complaint-ready.json`을 `/docs` 응답 모델과 Java record 양쪽에서 읽는다.
- 공백 `input.text`는 400으로, 필드 누락·`null`, 알 수 없는 필드, 잘못된 enum과 불일치한
  `documentIds`는 422로 거부한다.
- `COMPLETED`와 `FAILED`의 `result`/`error` 조합 네 가지를 검증한다.
- `NEEDS_INPUT` 질문 1개와 `READY` 질문 0개 불변식을 검증한다.
- `ONLINE` URL 누락, `VISIT`·`MAIL` 주소 누락을 거부한다.
- `/review` 없이 `/docs`, `READY` 없이 `/guide`, 만료된 문맥을 각각 정해진 오류로 반환한다.
- 동일 세션에서 새 `/review`가 기존 초안 문맥을 교체하는지 검증한다.

## 7. 구현 전에 확정할 남은 쟁점

아래 항목은 문서만으로 안전하게 결정할 수 없어 양쪽 개발자가 합의한 뒤 계약과 코드를 함께
수정해야 한다.

1. **검사와 문서의 연결:** 다중 문서 요청을 지원하려면 `LegalCheck`에
   `relatedDocumentIds`가 필요한지 결정한다.
2. **재시도와 동시성:** 같은 `requestId` 재전송의 멱등성, 같은 세션의 동시 `/docs` 요청을
   거부할지 직렬화할지 정한다. 확정 전에는 호출자가 세션별로 `/docs`를 한 번에 하나만 보낸다.
3. **추출값 출처:** 사용자가 AI 추출값을 확인·수정해야 한다면 제거된 `fieldSources` 또는
   필드별 확인 상태를 다시 계약에 포함할지 결정한다.
4. **문자열 세부 제한:** 진정서 필드별 최대 길이와 형식은
   `docs/forms/labor-complaint.md`에 있지만 API 모델 전체에는 아직 강제되지 않는다.

## 8. 현재 구현과의 차이

| 영역 | 현재 상태 | 계약 충족을 위해 필요한 작업 |
|---|---|---|
| Spring | `/review`, `/docs`, `/guide` 클라이언트와 Java record 적용 | 최종 통합 호출 확인 |
| 선호 언어 전달 | 모든 요청에서 `preferredLanguage` 전달·검증 | 최종 통합 호출 확인 |
| Python 라우트 | `POST /review`, `POST /docs`, `POST /guide` 등록 | 없음 |
| Python 요청 모델 | 공통 필드와 엔드포인트별 입력 계약 적용 | 없음 |
| Python 응답 모델 | 검토, 진정서 초안, 제출 안내 계약 적용 | 없음 |
| Python 문맥 | SQLite checkpointer로 검토 결과와 진정서 초안을 `sessionId`에 저장 | 30분 TTL 적용 |
| 엄격한 검증 | 공통 `extra="forbid"`와 응답 불변식 적용 | 없음 |
