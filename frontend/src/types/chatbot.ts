export type UploadState = 'idle' | 'processing' | 'done' | 'error'

export type ComplaintChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

/**
 * ILLO_SERVICE_SPEC 5. 상태와 분기
 * 이동할 수 없는 상태로 직접 접근하면 세션의 마지막 유효 상태로 복원한다.
 */
export type FlowState =
  | 'UPLOAD'
  | 'ANALYZING'
  | 'REVIEW'
  | 'DRAFTING'
  | 'DRAFT_READY'
  | 'AGENCY'
  | 'COMPLETED'

/** Spring PreferredLanguage 및 FastAPI PreferredLanguage와 동일한 코드만 사용한다. */
export type PreferredLanguage = 'vi' | 'en' | 'th' | 'id' | 'mn' | 'km' | 'ko'

/** ILLO_SERVICE_SPEC 4.3 — 현재 확인상 특이사항 없음 / 추가 확인 필요 / 주의 필요 */
export type ReviewStatus = 'ok' | 'check' | 'warn'
