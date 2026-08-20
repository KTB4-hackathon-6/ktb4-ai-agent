import type { PreferredLanguage } from '../types/chatbot'

export const languages = [
  { code: 'vi', native: 'Tiếng Việt', ko: '베트남어' },
  { code: 'en', native: 'English', ko: '영어' },
  { code: 'th', native: 'ภาษาไทย', ko: '태국어' },
  { code: 'id', native: 'Bahasa Indonesia', ko: '인도네시아어' },
  { code: 'mn', native: 'Монгол хэл', ko: '몽골어' },
  { code: 'km', native: 'ភាសាខ្មែរ', ko: '캄보디아어' },
  { code: 'ko', native: '한국어', ko: '한국어' },
] satisfies ReadonlyArray<{ code: PreferredLanguage; native: string; ko: string }>

export const services = [
  { id: 'contract', label: '📄 근로계약서 분석하기 / Analyze my contract' },
  { id: 'work', label: '🔍 현재 근무 실태 체크하기 / Check my current working conditions' },
  { id: 'admin', label: '🗂 행정문서 확인하기 / Check an admin document' },
] as const

export type ServiceView = (typeof services)[number]['id']

export const chatScript = [
  {
    ko: '몇 가지만 더 확인할게요. 최근 4주간 실제로 하루 몇 시간 정도 일하셨나요?',
    en: 'A few more things to check. How many hours did you actually work per day in the last 4 weeks?',
    options: [
      ['계약서와 동일 (1일 8시간)', 'Same as contract (8h/day)'],
      ['가끔 초과 (1일 9~10시간)', 'Occasionally more (9–10h/day)'],
      ['매일 초과 (1일 10시간 이상)', 'Every day more (10h+/day)'],
    ],
  },
  {
    ko: '숙식비로 매달 실제 얼마가 공제되고 있나요?',
    en: 'How much is actually deducted for room & board each month?',
    options: [
      ['20만원 이하', 'Under 200,000 KRW'],
      ['20~35만원', '200,000–350,000 KRW'],
      ['35만원 초과', 'Over 350,000 KRW'],
    ],
  },
  {
    ko: '휴게시간은 실제로 보장받고 계신가요?',
    en: 'Do you actually get rest breaks?',
    options: [
      ['네, 충분히 쉬어요', 'Yes, enough rest'],
      ['가끔 못 쉬어요', 'Sometimes no rest'],
      ['거의 못 쉬어요', 'Almost never'],
    ],
  },
  {
    ko: '답변 감사합니다. 확인하신 내용을 바탕으로 대응 자료를 준비했습니다.',
    en: "Thank you. We've prepared response materials based on your answers.",
    options: [],
  },
]

export const contractClauses = [
  {
    id: 'wage', status: 'ok', label: '문제없음 / OK', title: '임금 및 지급방법', en: 'Wage & Payment',
    original: '월 통상임금 2,096,270원, 매월 10일 근로자 명의 계좌로 지급',
    explanation: "Monthly base wage is 2,096,270 KRW, paid by the 10th of each month to the worker's own bank account.",
    legal: '최저임금법 제6조, 근로기준법 제43조',
  },
  {
    id: 'hours', status: 'danger', label: '주의 필요 / Attention needed', title: '근로시간', en: 'Working Hours',
    original: '1일 10시간, 주 6일 근무 (연장근로 별도 합의 없음)',
    explanation: 'Legal limit is 8h/day and 40h/week. Overtime requires separate agreement and 1.5x pay.',
    legal: '근로기준법 제50조(근로시간), 제53조(연장근로의 제한)',
  },
  {
    id: 'rest', status: 'warn', label: '확인 필요 / Check needed', title: '휴게시간', en: 'Rest Time',
    original: '근무 중 휴게시간이 별도로 명시되어 있지 않음',
    explanation: 'The contract does not specify rest breaks — actual practice needs to be confirmed.',
    legal: '근로기준법 제54조',
  },
  {
    id: 'deduction', status: 'danger', label: '주의 필요 / Attention needed', title: '숙식비 공제', en: 'Room & Board Deduction',
    original: '월 급여에서 숙식비 350,000원 공제',
    explanation: 'This may exceed the guideline cap on room & board deductions relative to ordinary wages.',
    legal: '외국인근로자의 고용 등에 관한 법률 시행령, 숙식비 징수 관련 지침',
  },
  {
    id: 'period', status: 'ok', label: '문제없음 / OK', title: '계약기간', en: 'Contract Period',
    original: '2026.03.01 ~ 2029.02.28 (3년)',
    explanation: 'Within the standard contract period range for E-9 workers.',
    legal: '외국인근로자의 고용 등에 관한 법률 제9조',
  },
  {
    id: 'duties', status: 'warn', label: '확인 필요 / Check needed', title: '업무내용 및 근무장소', en: 'Job Duties & Location',
    original: '업무: 축산업 보조, 근무지: OO농장',
    explanation: 'Please confirm whether the actual assigned duties and workplace match the contract.',
    legal: '외국인근로자의 고용 등에 관한 법률 제25조',
  },
]

export const summaryItems = [
  { ko: '계약상 근로시간(1일 8시간) vs 실제 응답(초과 근무 있음)', en: 'Contract hours (8h/day) vs. your answer (overtime reported)' },
  { ko: '숙식비 공제 기준 대비 실제 공제액 확인 필요', en: 'Actual room & board deduction needs to be checked against the guideline cap' },
  { ko: '휴게시간 미보장 가능성 — 실제 제공 여부 추가 확인 필요', en: 'Possible lack of rest breaks — needs further confirmation' },
]

export const evidenceItems = [
  { id: 'contract', ko: '근로계약서 사본', en: 'Copy of labor contract' },
  { id: 'payslip', ko: '최근 3개월 급여명세서', en: 'Pay slips (last 3 months)' },
  { id: 'attendance', ko: '출퇴근 기록 (사진/메모)', en: 'Attendance records (photo/notes)' },
  { id: 'deduction', ko: '숙식비 공제 내역 확인서', en: 'Room & board deduction statement' },
  { id: 'bank', ko: '통장 입금 내역', en: 'Bank deposit records' },
]

export const adminDocumentItems = [
  { label: '처리기한 / Deadline', value: '2026.09.02까지 (D-14)' },
  { label: '담당기관 / Agency', value: '관할 출입국·외국인청' },
  { label: '필요서류 / Required documents', value: '여권, 외국인등록증, 표준근로계약서, 재직증명서' },
  { label: '제출방법 / How to submit', value: '하이코리아 온라인 신청 또는 관할청 방문' },
]
