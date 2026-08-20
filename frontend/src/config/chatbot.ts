import type { PreferredLanguage } from '../types/chatbot'

/** Spring과 FastAPI가 공통으로 받는 PreferredLanguage 코드만 노출한다. */
export const languages = [
  { code: 'km', native: 'ភាសាខ្មែរ' },
  { code: 'vi', native: 'Tiếng Việt' },
  { code: 'th', native: 'ภาษาไทย' },
  { code: 'id', native: 'Bahasa Indonesia' },
  { code: 'mn', native: 'Монгол хэл' },
  { code: 'ko', native: '한국어' },
  { code: 'en', native: 'English' },
] satisfies ReadonlyArray<{ code: PreferredLanguage; native: string }>

export const flowStages = [
  { id: 'upload' },
  { id: 'analyze' },
  { id: 'review' },
  { id: 'draft' },
  { id: 'agency' },
  { id: 'done' },
] as const

export const evidenceToKeep = ['timesheet', 'orders', 'payments', 'notes'] as const

export const judgmentLimits = ['userStatement', 'noPayslip', 'noRecords', 'noLegalDecision'] as const

export const issueLabels = { wage: 'wage', condition: 'condition' } as const
