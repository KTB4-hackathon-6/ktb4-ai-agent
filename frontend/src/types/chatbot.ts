export type UploadState = 'idle' | 'processing' | 'done' | 'error'

/**
 * ILLO_SERVICE_SPEC 5. 상태와 분기
 * 이동할 수 없는 상태로 직접 접근하면 세션의 마지막 유효 상태로 복원한다.
 */
export type FlowState =
  | 'UPLOAD'
  | 'ANALYZING'
  | 'REVIEW'
  | 'REVIEW_UPDATING'
  | 'DRAFTING'
  | 'DRAFT_READY'
  | 'AGENCY'
  | 'COMPLETED'

/** ILLO_SERVICE_SPEC 4.0 — 크메르·네팔·베트남·인도네시아·미얀마 우선, 한국어·영어 제공 */
export type PreferredLanguage = 'km' | 'ne' | 'vi' | 'id' | 'my' | 'ko' | 'en'

/** ILLO_SERVICE_SPEC 4.3 — 현재 확인상 특이사항 없음 / 추가 확인 필요 / 주의 필요 */
export type ReviewStatus = 'ok' | 'check' | 'warn'
