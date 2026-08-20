import type { PreferredLanguage, ReviewStatus } from '../types/chatbot'

/**
 * ILLO_SERVICE_SPEC 4.0 언어 선택과 출력
 * 크메르어, 네팔어, 베트남어, 인도네시아어, 미얀마어를 우선 지원하고 한국어와 영어도 제공한다.
 */
export const languages = [
  { code: 'km', native: 'ភាសាខ្មែរ', ko: '크메르어' },
  { code: 'ne', native: 'नेपाली', ko: '네팔어' },
  { code: 'vi', native: 'Tiếng Việt', ko: '베트남어' },
  { code: 'id', native: 'Bahasa Indonesia', ko: '인도네시아어' },
  { code: 'my', native: 'မြန်မာဘာသာ', ko: '미얀마어' },
  { code: 'ko', native: '한국어', ko: '한국어' },
  { code: 'en', native: 'English', ko: '영어' },
] satisfies ReadonlyArray<{ code: PreferredLanguage; native: string; ko: string }>

/** ILLO_SERVICE_SPEC 5 상태와 분기 — 화면 상단 진행 표시에 쓰는 6단계 */
export const flowStages = [
  { id: 'upload', ko: '업로드', en: 'Upload' },
  { id: 'analyze', ko: '분석', en: 'Analyse' },
  { id: 'review', ko: '검토', en: 'Review' },
  { id: 'draft', ko: '진정서', en: 'Complaint' },
  { id: 'agency', ko: '기관 안내', en: 'Agencies' },
  { id: 'done', ko: '완료', en: 'Done' },
] as const

/** ILLO_SERVICE_SPEC 4.3 — 결과 표시는 세 단계로만 구분한다 */
export const statusLabels: Record<ReviewStatus, { ko: string; en: string }> = {
  warn: { ko: '주의 필요', en: 'Attention needed' },
  check: { ko: '추가 확인 필요', en: 'Needs confirming' },
  ok: { ko: '특이사항 없음', en: 'Nothing found' },
}

/**
 * 데모 데이터는 docs/T07-service-ui-spec.md 시나리오를 따른다.
 * 계약서는 매주 일요일 휴일, 사용자 설명은 7월 일요일 4일 × 8시간, 급여명세서는 휴일근로 0시간·0원.
 */
export const reviewIntro = {
  ko: '계약서에는 일요일이 휴일로 되어 있지만, 7월 일요일 4일 동안 32시간 일했다고 하셨습니다.\n급여명세서에는 휴일근로 시간과 수당이 없어 추가 확인이 필요합니다.',
  en: 'The contract makes Sunday a rest day, but you worked 32 hours across four Sundays in July. The payslip shows no holiday hours or pay, so this needs confirming.',
}

/** ILLO_SERVICE_SPEC 4.3 — 계약서·사용자 설명·급여명세서의 값을 출처와 함께 나란히 보여준다 */
export const comparisonRows = [
  {
    id: 'holiday',
    ko: '휴일',
    en: 'Rest day',
    contract: '매주 일요일 휴일',
    user: '7월 일요일 4일 근무',
    payslip: '휴일근로 0시간',
    flagged: true,
  },
  {
    id: 'holiday-pay',
    ko: '휴일근로수당',
    en: 'Holiday premium',
    contract: '가산수당 규정 있음',
    user: '받은 기억 없음',
    payslip: '0원',
    flagged: true,
  },
  {
    id: 'base-wage',
    ko: '기본급',
    en: 'Basic pay',
    contract: '2,500,000원',
    user: '—',
    payslip: '2,500,000원',
    flagged: false,
  },
  {
    id: 'totals',
    ko: '지급총액 · 실지급액',
    en: 'Gross · net',
    contract: '—',
    user: '—',
    payslip: '계산 일치',
    flagged: false,
  },
] as const

/**
 * ILLO_SERVICE_SPEC 4.3 — 임금·근로시간·휴일·업무·근무장소·숙식비·기타 공제를 항목별로 본다.
 * 계약과 일치하거나 산술적으로 정상인 항목은 정상 항목으로 그대로 보존한다.
 */
export const reviewItems: ReadonlyArray<{
  id: string
  status: ReviewStatus
  ko: string
  en: string
  summary: string
  original: string
  plain: string
  userNote?: string
  payslipNote?: string
  legal: string[]
}> = [
  {
    id: 'wage',
    status: 'ok',
    ko: '임금',
    en: 'Wages',
    summary: '기본급 2,500,000원, 지급총액과 실지급액 계산이 맞습니다',
    original: '제3조 임금: 월 기본급 2,500,000원, 매월 10일 지급',
    plain: '월 기본급은 250만 원이고, 급여명세서의 계산도 맞습니다.',
    legal: ['근로기준법 제17조', '근로기준법 제43조'],
  },
  {
    id: 'hours',
    status: 'ok',
    ko: '근로시간',
    en: 'Working hours',
    summary: '1일 8시간, 주 40시간으로 법정 한도 안입니다',
    original: '제4조 근로시간: 09:00 ~ 18:00 (휴게 1시간), 주 5일',
    plain: '하루 8시간, 주 40시간으로 정해져 있습니다.',
    legal: ['근로기준법 제50조'],
  },
  {
    id: 'holiday',
    status: 'check',
    ko: '휴일',
    en: 'Rest days',
    summary: '계약상 일요일은 휴일인데, 7월 일요일 4일 근무 설명이 있습니다',
    original: '제5조 휴일: 매주 일요일',
    plain: '계약서에는 매주 일요일이 휴일로 되어 있습니다.',
    userNote: '사용자 설명상 7월 일요일 4일, 하루 8시간씩 총 32시간 근무',
    payslipNote: '급여명세서에는 휴일근로 0시간, 수당 0원',
    legal: ['근로기준법 제55조', '근로기준법 제56조'],
  },
  {
    id: 'job',
    status: 'ok',
    ko: '업무',
    en: 'Job content',
    summary: '계약서의 업무와 실제 업무가 같습니다',
    original: '제2조 업무내용: 금속가공제품 조립 및 검사',
    plain: '조립·검사 업무로 계약 내용과 같습니다.',
    legal: ['근로기준법 제17조'],
  },
  {
    id: 'place',
    status: 'ok',
    ko: '근무장소',
    en: 'Workplace',
    summary: '계약서 주소와 실제 근무지가 같습니다',
    original: '제2조 근무장소: 경기도 광주시 초월읍 ○○로 12',
    plain: '계약서에 적힌 공장 한 곳에서 근무하고 있습니다.',
    legal: ['외국인근로자의 고용 등에 관한 법률 제25조'],
  },
  {
    id: 'lodging',
    status: 'ok',
    ko: '숙식비',
    en: 'Food and lodging',
    summary: '숙식비 공제가 없습니다',
    original: '제6조 숙식 제공: 해당 없음',
    plain: '숙식비로 빠지는 돈이 없습니다.',
    legal: ['근로기준법 제43조'],
  },
  {
    id: 'deduction',
    status: 'ok',
    ko: '기타 공제',
    en: 'Other deductions',
    summary: '4대보험 외에 빠진 항목이 없습니다',
    original: '제9조 사회보험: 고용 ■ 산재 ■ 국민연금 ■ 건강 ■',
    plain: '4대보험만 공제되어 있습니다.',
    legal: ['근로기준법 제43조'],
  },
]

/** docs/T07-service-ui-spec.md 7. 추가 확인 — 정해진 순서대로 하나씩 확인한다 */
export const confirmQuestions = [
  {
    id: 'sundays',
    label: '근무한 일요일',
    ko: '실제로 근무한 일요일은 언제인가요?',
    en: 'Which Sundays did you actually work?',
    options: ['7월 6·13·20·27일', '일부만 근무했어요', '날짜를 모르겠어요'],
    effect: '휴일근로 일수와 시간을 계산합니다',
  },
  {
    id: 'hours',
    label: '출퇴근 시각',
    ko: '그날 출근과 퇴근은 몇 시였나요?',
    en: 'What time did you start and finish on those days?',
    options: ['09:00 ~ 18:00 · 휴게 1시간', '다른 시간대였어요', '기억이 안 나요'],
    effect: '하루 근로시간과 가산수당 기준을 정합니다',
  },
  {
    id: 'records',
    label: '기록 보유',
    ko: '출퇴근 기록이나 근무표, 메시지가 있나요?',
    en: 'Do you have a timesheet, roster or messages?',
    options: ['있어요', '없어요', '찾아봐야 해요'],
    effect: '증거로 쓸 수 있는 자료를 정리합니다',
  },
  {
    id: 'swap',
    label: '대체휴일 합의',
    ko: '일요일 대신 다른 날에 쉬기로 합의했나요?',
    en: 'Did you agree to take another day off instead?',
    options: ['합의 없었어요', '합의했어요', '모르겠어요'],
    effect: '휴일 대체 여부를 확인합니다',
  },
  {
    id: 'included',
    label: '포함 안내',
    ko: '휴일근로수당이 다른 수당에 포함됐다고 들으셨나요?',
    en: 'Were you told the holiday pay was included in another allowance?',
    options: ['들은 적 없어요', '들었어요', '기억이 안 나요'],
    effect: '수당 지급 주장을 어떻게 다룰지 정합니다',
  },
] as const

/** ILLO_SERVICE_SPEC 4.3 — 고용주에게 그대로 전달할 수 있는 한국어 확인 요청문 */
export const requestLetter = {
  ko: '7월 일요일 근무 4일, 총 32시간에 대한 휴일근로 시간과 수당 산정 내역을 확인하고자 합니다.\n날짜별 근무기록과 지급 내역을 알려주시기 바랍니다.',
  en: 'It asks the employer to show how the 32 hours across four July Sundays were counted and paid, with the daily records.',
}

/** ILLO_SERVICE_SPEC 4.3 — 지금은 없지만 앞으로 모아두면 좋은 자료 */
export const evidenceToKeep = [
  { id: 'timesheet', ko: '출퇴근 기록 또는 근무표', en: 'Timesheet or roster' },
  { id: 'orders', ko: '작업지시 · 메시지 기록', en: 'Work instructions and messages' },
  { id: 'payments', ko: '월별 지급내역', en: 'Monthly payment records' },
  { id: 'notes', ko: '날짜별 근무 메모', en: 'Your own daily notes' },
]

/** ILLO_SERVICE_SPEC 4.3 — 모든 결과에 함께 표시하는 판단 제한 */
export const judgmentLimits = [
  '사용자 설명만 있는 사실은 “사용자 설명상”으로 표시합니다.',
  '급여명세서가 없으면 수당 지급 여부와 미지급액을 확정하지 않습니다.',
  '근무기록이 없으면 설명한 시간은 주장값으로만 둡니다.',
  '현재 자료만으로 법 위반을 확정하지 않습니다.',
]

/**
 * ILLO_SERVICE_SPEC 4.5 진정서 작성 — 노동포털 SN001 서식의 입력 항목.
 * 값이 비어 있는 항목은 화면에서 직접 채우고, optional 항목은 진행률 계산에서 제외한다.
 */
export const complaintGroups: ReadonlyArray<{
  id: string
  ko: string
  en: string
  rows: ReadonlyArray<{
    key: string
    ko: string
    value: string
    optional?: boolean
    options?: readonly string[]
    multiline?: boolean
  }>
}> = [
  {
    id: 'petitioner',
    ko: '진정인',
    en: 'Complainant',
    rows: [
      { key: 'petitionerName', ko: '성명', value: 'NGUYEN THI HUONG' },
      { key: 'petitionerAddress', ko: '주소', value: '경기 광주시 초월읍 ○○로 12' },
      { key: 'petitionerMobile', ko: '휴대전화 번호', value: '010-0000-1234' },
      { key: 'petitionerEmail', ko: '이메일', value: 'huong@example.com' },
      { key: 'petitionerTel', ko: '일반 전화번호', value: '', optional: true },
      { key: 'receiveStatusUpdates', ko: '처리상황 알림 수신', value: '받겠습니다', options: ['받겠습니다', '받지 않겠습니다'] },
      { key: 'notifyElectronic', ko: '처리결과 전자문서 통지', value: '받겠습니다', options: ['받겠습니다', '받지 않겠습니다'] },
    ],
  },
  {
    id: 'respondent',
    ko: '피진정인 · 사업장',
    en: 'Employer and workplace',
    rows: [
      { key: 'respondentName', ko: '피진정인 성명', value: '김○○' },
      { key: 'respondentContact', ko: '피진정인 연락처', value: '031-000-0012' },
      { key: 'workplaceType', ko: '사업체 구분', value: '', options: ['사업장', '공사현장'] },
      { key: 'workplaceName', ko: '회사명', value: '○○금속' },
      { key: 'workplaceAddress', ko: '회사 주소', value: '경기 광주시 초월읍 ○○로 12' },
      { key: 'actualWorkplace', ko: '실제 근무 장소', value: '회사 주소와 같음' },
      { key: 'workplaceTel', ko: '회사 전화번호', value: '' },
      { key: 'employeeCount', ko: '근로자 수', value: '18', optional: true },
    ],
  },
  {
    id: 'complaint',
    ko: '진정 내용',
    en: 'The complaint',
    rows: [
      { key: 'employmentPeriod', ko: '근무 기간', value: '2026.03.02 ~ 재직 중' },
      { key: 'payday', ko: '임금 지급일', value: '매월 10일' },
      { key: 'unpaidPeriod', ko: '미지급 기간', value: '2026.07' },
      { key: 'contractGap', ko: '계약 내용과 실제의 차이', value: '휴일근로 32시간이 급여명세서에 없음', multiline: true },
      { key: 'requestedAction', ko: '요청하는 내용', value: '', multiline: true },
      { key: 'attachments', ko: '증거자료 목록', value: '', multiline: true },
    ],
  },
]

/** ILLO_SERVICE_SPEC 4.6 — 진정서를 내려받기 전에 반드시 함께 보여주는 안내 */
export const draftNotice = [
  '이 진정서는 사용자가 제공한 내용을 정리한 초안입니다.',
  '제출 전에 사실관계와 날짜, 금액을 다시 확인해 주세요.',
  '제출은 노동포털 또는 관할 지방고용노동관서에서 직접 진행합니다.',
]

/**
 * ILLO_SERVICE_SPEC 4.7 관련 기관·신고처
 * 기관명, 주소, 전화번호는 백엔드가 관리하는 고정 목록에서 내려받고, 문제 유형에 따라 순서를 정한다.
 */
export const supportChannels = [
  {
    id: 'labor-portal',
    ko: '고용노동부 노동포털',
    en: 'MOEL Labor Portal',
    detail: '진정서(SN001) 온라인 접수',
    href: 'https://labor.moel.go.kr/minwonApply/minwonFormat.do?searchVal=SN001&searchGubun=1',
    issue: 'wage',
  },
  {
    id: 'local-office',
    ko: '지방고용노동관서',
    en: 'Local Labor Office',
    detail: '사업장 소재지 관할 관서 찾기',
    href: 'https://www.moel.go.kr/agency/agency/agencyList.do',
    issue: 'wage',
  },
  {
    id: 'moel-1350',
    ko: '고용노동부 고객상담센터',
    en: 'MOEL Counselling Centre',
    detail: '1350 · 평일 09:00 ~ 18:00',
    href: 'tel:1350',
    issue: 'wage',
  },
  {
    id: 'foreign-centre',
    ko: '외국인력상담센터',
    en: 'Foreign Workforce Counselling Centre',
    detail: '1577-0071 · 모국어 고충상담',
    href: 'tel:15770071',
    issue: 'condition',
  },
  {
    id: 'eps',
    ko: 'EPS · 관할 고용센터',
    en: 'EPS and Employment Centre',
    detail: '근무장소 · 업무 · 사업장 변경 상담',
    href: 'https://www.eps.go.kr/',
    issue: 'condition',
  },
] as const

export const issueLabels = {
  wage: { ko: '임금 · 수당 · 공제', en: 'Wages and deductions' },
  condition: { ko: '업무 · 근무장소 · 사업장', en: 'Work and workplace' },
} as const
