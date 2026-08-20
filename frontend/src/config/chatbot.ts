import type { PreferredLanguage, ReviewStatus } from '../types/chatbot'

/** Spring과 FastAPI가 공통으로 받는 PreferredLanguage 코드만 노출한다. */
export const languages = [
  { code: 'km', native: 'ភាសាខ្មែរ', ko: '크메르어' },
  { code: 'vi', native: 'Tiếng Việt', ko: '베트남어' },
  { code: 'th', native: 'ภาษาไทย', ko: '태국어' },
  { code: 'id', native: 'Bahasa Indonesia', ko: '인도네시아어' },
  { code: 'mn', native: 'Монгол хэл', ko: '몽골어' },
  { code: 'ko', native: '한국어', ko: '한국어' },
  { code: 'en', native: 'English', ko: '영어' },
] satisfies ReadonlyArray<{ code: PreferredLanguage; native: string; ko: string }>

export const flowStages = [
  { id: 'upload', ko: '업로드', en: 'Upload' },
  { id: 'analyze', ko: '분석', en: 'Analyse' },
  { id: 'review', ko: '검토', en: 'Review' },
  { id: 'draft', ko: '진정서', en: 'Complaint' },
  { id: 'agency', ko: '기관 안내', en: 'Agencies' },
  { id: 'done', ko: '완료', en: 'Done' },
] as const

export const statusLabels: Record<ReviewStatus, { ko: string; en: string }> = {
  warn: { ko: '주의 필요', en: 'Attention needed' },
  check: { ko: '추가 확인 필요', en: 'Needs confirming' },
  ok: { ko: '특이사항 없음', en: 'Nothing found' },
}

export const evidenceToKeep = [
  { id: 'timesheet', ko: '출퇴근 기록 또는 근무표', en: 'Timesheet or roster' },
  { id: 'orders', ko: '작업지시 · 메시지 기록', en: 'Work instructions and messages' },
  { id: 'payments', ko: '월별 지급내역', en: 'Monthly payment records' },
  { id: 'notes', ko: '날짜별 근무 메모', en: 'Your own daily notes' },
]

export const judgmentLimits = [
  '사용자 설명만 있는 사실은 “사용자 설명상”으로 표시합니다.',
  '급여명세서가 없으면 수당 지급 여부와 미지급액을 확정하지 않습니다.',
  '근무기록이 없으면 설명한 시간은 주장값으로만 둡니다.',
  '현재 자료만으로 법 위반을 확정하지 않습니다.',
]

/** 백엔드에 세션용 제출 안내 API가 노출되기 전까지 사용하는 공식 고정 안내 목록. */
export const supportChannels = [
  { id: 'labor-portal', ko: '고용노동부 노동포털', en: 'MOEL Labor Portal', detail: '진정서(SN001) 온라인 접수', href: 'https://labor.moel.go.kr/minwonApply/minwonFormat.do?searchVal=SN001&searchGubun=1', issue: 'wage' },
  { id: 'local-office', ko: '지방고용노동관서', en: 'Local Labor Office', detail: '사업장 소재지 관할 관서 찾기', href: 'https://www.moel.go.kr/agency/agency/agencyList.do', issue: 'wage' },
  { id: 'moel-1350', ko: '고용노동부 고객상담센터', en: 'MOEL Counselling Centre', detail: '1350 · 평일 09:00 ~ 18:00', href: 'tel:1350', issue: 'wage' },
  { id: 'foreign-centre', ko: '외국인력상담센터', en: 'Foreign Workforce Counselling Centre', detail: '1577-0071 · 모국어 고충상담', href: 'tel:15770071', issue: 'condition' },
  { id: 'eps', ko: 'EPS · 관할 고용센터', en: 'EPS and Employment Centre', detail: '근무장소 · 업무 · 사업장 변경 상담', href: 'https://www.eps.go.kr/', issue: 'condition' },
] as const

export const issueLabels = {
  wage: { ko: '임금 · 수당 · 공제', en: 'Wages and deductions' },
  condition: { ko: '업무 · 근무장소 · 사업장', en: 'Work and workplace' },
} as const
