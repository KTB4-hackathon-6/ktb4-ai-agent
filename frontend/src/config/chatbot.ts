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

/** 백엔드에 세션용 제출 안내 API가 노출되기 전까지 사용하는 공식 고정 안내 목록. */
export const supportChannels = [
  { id: 'laborPortal', href: 'https://labor.moel.go.kr/minwonApply/minwonFormat.do?searchVal=SN001&searchGubun=1', issue: 'wage' },
  { id: 'localOffice', href: 'https://www.moel.go.kr/agency/agency/agencyList.do', issue: 'wage' },
  { id: 'moel1350', href: 'tel:1350', issue: 'wage' },
  { id: 'foreignCentre', href: 'tel:15770071', issue: 'condition' },
  { id: 'eps', href: 'https://www.eps.go.kr/', issue: 'condition' },
] as const

export const issueLabels = { wage: 'wage', condition: 'condition' } as const
