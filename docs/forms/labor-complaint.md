# 진정서 HWPX 템플릿 명세

## 1. 원본과 템플릿

| 항목 | 값 |
|---|---|
| 원본 서식명 | 진정서 |
| 원본 형식 | HWP 5.x, 49,152 bytes |
| 원본 파일명 | `진정서+양식.hwp` |
| 작업용 파일명 | `진정서양식.hwp` (`+` 제거) |
| 공식 서식 번호 | 원본 문서에 표시되지 않음 |
| 내부 템플릿 ID | `LABOR_COMPLAINT_001` |
| 템플릿 버전 | `1.0` |
| 페이지 | 1페이지 |
| 구조 | 표 3개, 선택 체크박스 5개 묶음, 자유서술 1개, 첨부 파일명 영역 1개 |
| 템플릿 | `backend/src/main/resources/forms/labor-complaint-001/labor-complaint-001-template.hwpx` |
| 매핑 | `backend/src/main/resources/forms/labor-complaint-001/labor-complaint-001-field-mapping.json` |

원본에는 별도의 신청 취지, 작성일, 서명·날인 입력란이 없다. 양식에 없는 필드는 응답
스키마나 HWPX 생성 과정에서 임의로 추가하지 않는다.

변환은 파일명 특수문자를 제거한 작업용 복사본을 대상으로 수행했다. 원본 HWP는 수정하지
않았으며, 생성된 HWPX는 ZIP 무결성, 필수 entry, XML 파싱 및 한컴오피스 한글 Viewer 열기를
검증했다.

## 2. 전체 필드

`필수`는 원본에 필수 표시가 있다는 뜻이 아니라, 연락·대상 특정·사실관계 확인과 문서 제출에
필요한 애플리케이션 규칙이다. 선택값을 모르면 빈칸을 유지한다.

| 필드 ID | 원본 표시명 | 타입 | 필수 | 최대 길이 | 주된 출처 |
|---|---|---|---:|---:|---|
| `complainant.fullName` | 진정인 성명 | text | O | 100 | 계약서 후보, 사용자 확인 |
| `complainant.residentRegistrationNumber` | 주민등록번호 | sensitive text | X | 30 | 사용자 |
| `complainant.address` | 주소 | text | O | 300 | 사용자 |
| `complainant.telephone` | 전화번호 | phone | X | 30 | 사용자 |
| `complainant.mobilePhone` | 휴대전화번호 | phone | O | 30 | 사용자 |
| `complainant.email` | 전자우편주소 | email | X | 254 | 사용자 |
| `complainant.receiveStatusUpdates` | 처리 상황 수신여부 | boolean | X | 20 | 사용자 |
| `complainant.notifyViaLaborPortal` | 노동포털 통지여부 | boolean | X | 20 | 사용자 |
| `respondent.fullName` | 피진정인 성명 | text | O | 100 | 계약서 사용자 성명, 사용자 확인 |
| `respondent.contact` | 연락처 | phone | X | 30 | 사용자 또는 계약서 |
| `respondent.address` | 주소 | text | X | 300 | 사용자 또는 계약서 |
| `respondent.workplaceType` | 사업체 구분 | enum | O | 30 | 사용자 |
| `respondent.workplaceName` | 사업장명 | text | O | 200 | 계약서 업체명 |
| `respondent.actualWorkplaceAddress` | 사업장 주소(실근무장소) | text | O | 300 | 계약서 근로장소, 사용자 확인 |
| `respondent.workplaceTelephone` | 사업장전화번호 | phone | X | 30 | 계약서 |
| `respondent.employeeCount` | 근로자 수 | integer | X | 20 | 사용자 |
| `complaint.employmentStartDate` | 입사일 | date | O | 10 | 사용자 확인 |
| `complaint.employmentEndDate` | 퇴사일 | date | X | 10 | 사용자 |
| `complaint.unpaidWagesTotal` | 체불임금총액 | KRW integer | X | 30 | 규칙 결과로 계산 후 사용자 확인 |
| `complaint.employmentStatus` | 퇴직 여부 | enum | O | 20 | 사용자 |
| `complaint.unpaidSeverancePay` | 체불퇴직금액 | KRW integer | X | 30 | 사용자·계산 |
| `complaint.otherUnpaidAmount` | 기타체불금액 | KRW integer | X | 30 | 사용자·계산 |
| `complaint.jobDescription` | 업무 내용 | text | O | 300 | 계약서 직무내용 |
| `complaint.payday` | 임금 지급일 | text | X | 100 | 계약서 또는 사용자 |
| `complaint.contractMethod` | 근로계약방법 | enum | O | 20 | 계약서 존재 시 `WRITTEN` 후보 |
| `complaint.details` | 내용 | textarea | O | 4,000 | 계약서·법률 검토·사용자 진술 |
| `complaint.attachmentFileNames` | 파일 첨부 | string list | X | 합계 1,000 | 업로드 문서 |
| `submission.recipientLaborOfficeName` | 고용노동(지)청장 귀하 | text | O | 100 | 사용자·관할 확인 |

enum은 다음 값을 사용한다.

- `respondent.workplaceType`: `WORKPLACE`, `CONSTRUCTION_SITE`
- `complaint.employmentStatus`: `RESIGNED`, `EMPLOYED`
- `complaint.contractMethod`: `WRITTEN`, `ORAL`

주민등록번호 라벨은 원본 그대로 유지한다. 외국인등록번호 등 실제 제출 식별정보의 적합성은
사용자가 관할 기관 안내에 따라 확인해야 하며 AI가 임의 생성하지 않는다.

## 3. 계약서 자료와 출처

현재 범위는 `ai/docs/근로계약서`의 계약서 샘플과 추출 결과만 사용하며 급여명세서는 제외한다.
제조업 위반 샘플에서 자동 후보로 만들 수 있는 값은 다음과 같다.

- 근로자 성명, 사용자 성명, 업체명, 사업장 연락처·소재지
- 근로장소와 직무내용
- 서면 계약 존재 여부
- 계약상 월 임금·시급과 최저임금 차이에 기반한 체불 가능 금액
- 최저임금 미달, 임금 지급일 누락, 휴게시간 부족 등 진정 내용의 근거

입사일은 계약서 작성일이나 계약기간 개월 수와 동일하다고 단정하지 않는다. 진정인 연락처,
현재 주소, 실제 근무지, 근로자 수, 퇴직 상태, 관할 관서 등 계약서에서 확정할 수 없는 값은
`missingFields`로 질문한다. 완성형 테스트에서만 명시적인 허구 값을 사용한다.

## 4. HWPX 치환 방식

생성 서비스는 원본 문구의 전역 문자열 치환을 하지 않는다. 매핑 파일은 각 필드를 다음 중
하나로 지정한다.

- `TABLE_CELL`: `Contents/section0.xml`의 표 인덱스와 `rowAddr`/`colAddr`로 정확한 셀 선택
- `TEXT_MATCH`: 유일한 하단 수신처 문구만 정확히 한 번 찾아 값 패턴 적용

DOM API로 텍스트 노드를 작성하므로 `<`, `>`, `&`, 따옴표는 XML에서 안전하게
이스케이프된다. 빈 선택 필드는 빈칸, 선택하지 않은 체크박스는 원래의 미선택 표시로 남긴다.
목록은 한 셀 안에서 쉼표로 구분한다.

생성기는 다음을 검증한다.

- `mimetype`, `META-INF/container.xml`, `Contents/content.hpf`, `Contents/header.xml`,
  `Contents/section0.xml` 존재
- ZIP entry 중복, 절대 경로, 역슬래시, `..` 경로 차단
- XML 외부 엔티티와 DTD 비활성화
- 모든 XML/HPF 파싱 가능 여부
- 템플릿을 수정하지 않고 매 요청마다 새 bytes 생성
- 템플릿 ID와 버전 일치

## 5. 버전 관리

템플릿과 매핑은 항상 같은 디렉터리에서 같은 버전으로 관리한다.

1. 표 구조, 셀 위치, 필드 의미가 바뀌면 템플릿과 매핑을 함께 변경한다.
2. 템플릿 구조가 호환되지 않게 바뀌면 매핑 파일의 내부 `templateVersion`을 올린다.
3. AI 응답에는 템플릿 버전을 노출하지 않으며 Spring 생성기가 템플릿과 매핑 버전을 검증한다.
4. Java record, 공유 fixture와 생성 테스트를 같은 변경에서 갱신한다.
5. 이전 버전을 계속 지원하려면 별도 버전 디렉터리와 명시적 라우팅을 추가한다.

## 6. 알려진 제한사항

- 공식 서식 번호는 원본에 표시되지 않아 내부 ID를 사용한다.
- 공개 다운로드 API는 추가하지 않았다. 현재 범위는 생성 서비스와 통합 테스트까지다.
- LibreOffice는 HWPX 입력을 렌더링하지 못했다. 대신 한컴오피스 한글 Viewer에서 1페이지 전체를
  상·하단으로 나누어 시각 확인했다.
- Viewer는 편집·저장 기능이 없으므로 변환 자체는 공개 Apache-2.0 Java 기반 변환기로 수행했다.
