import type { LaborComplaintFormData } from '../api/contracts'

export type ComplaintPreviewRow = {
  fieldId: string
  label: string
  value: string | null
}

export type ComplaintPreviewGroup = {
  id: string
  label: string
  rows: ComplaintPreviewRow[]
}

const REQUIRED_FIELD_IDS = [
  'complainant.fullName',
  'complainant.address',
  'complainant.mobilePhone',
  'respondent.fullName',
  'respondent.workplaceType',
  'respondent.workplaceName',
  'respondent.actualWorkplaceAddress',
  'complaint.employmentStartDate',
  'complaint.employmentStatus',
  'complaint.jobDescription',
  'complaint.contractMethod',
  'complaint.details',
] as const

function text(value: string | number | null) {
  if (value === null || value === '') return null
  return String(value)
}

function yesNo(value: boolean | null) {
  if (value === null) return null
  return value ? '예' : '아니요'
}

function workplaceType(value: LaborComplaintFormData['respondent']['workplaceType']) {
  if (value === 'WORKPLACE') return '사업장'
  if (value === 'CONSTRUCTION_SITE') return '공사현장'
  return null
}

function employmentStatus(value: LaborComplaintFormData['complaint']['employmentStatus']) {
  if (value === 'EMPLOYED') return '재직 중'
  if (value === 'RESIGNED') return '퇴직'
  return null
}

function contractMethod(value: LaborComplaintFormData['complaint']['contractMethod']) {
  if (value === 'WRITTEN') return '서면 계약'
  if (value === 'ORAL') return '구두 계약'
  return null
}

function amount(value: number | null) {
  return value === null ? null : `${value.toLocaleString('ko-KR')}원`
}

export function complaintPreviewGroups(data: LaborComplaintFormData): ComplaintPreviewGroup[] {
  return [
    {
      id: 'complainant',
      label: '진정인',
      rows: [
        { fieldId: 'complainant.fullName', label: '성명', value: text(data.complainant.fullName) },
        { fieldId: 'complainant.address', label: '주소', value: text(data.complainant.address) },
        { fieldId: 'complainant.telephone', label: '일반 전화번호', value: text(data.complainant.telephone) },
        { fieldId: 'complainant.mobilePhone', label: '휴대전화', value: text(data.complainant.mobilePhone) },
        { fieldId: 'complainant.email', label: '이메일', value: text(data.complainant.email) },
        { fieldId: 'complainant.receiveStatusUpdates', label: '처리상황 알림', value: yesNo(data.complainant.receiveStatusUpdates) },
        { fieldId: 'complainant.notifyViaLaborPortal', label: '전자문서 통지', value: yesNo(data.complainant.notifyViaLaborPortal) },
      ],
    },
    {
      id: 'respondent',
      label: '피진정인·사업장',
      rows: [
        { fieldId: 'respondent.fullName', label: '피진정인 성명', value: text(data.respondent.fullName) },
        { fieldId: 'respondent.contact', label: '피진정인 연락처', value: text(data.respondent.contact) },
        { fieldId: 'respondent.address', label: '피진정인 주소', value: text(data.respondent.address) },
        { fieldId: 'respondent.workplaceType', label: '사업체 구분', value: workplaceType(data.respondent.workplaceType) },
        { fieldId: 'respondent.workplaceName', label: '회사명', value: text(data.respondent.workplaceName) },
        { fieldId: 'respondent.actualWorkplaceAddress', label: '실제 근무장소', value: text(data.respondent.actualWorkplaceAddress) },
        { fieldId: 'respondent.workplaceTelephone', label: '회사 전화번호', value: text(data.respondent.workplaceTelephone) },
        { fieldId: 'respondent.employeeCount', label: '근로자 수', value: text(data.respondent.employeeCount) },
      ],
    },
    {
      id: 'complaint',
      label: '진정 내용',
      rows: [
        { fieldId: 'complaint.employmentStartDate', label: '근무 시작일', value: text(data.complaint.employmentStartDate) },
        { fieldId: 'complaint.employmentEndDate', label: '근무 종료일', value: text(data.complaint.employmentEndDate) },
        { fieldId: 'complaint.employmentStatus', label: '재직 상태', value: employmentStatus(data.complaint.employmentStatus) },
        { fieldId: 'complaint.unpaidWagesTotal', label: '미지급 임금', value: amount(data.complaint.unpaidWagesTotal) },
        { fieldId: 'complaint.unpaidSeverancePay', label: '미지급 퇴직금', value: amount(data.complaint.unpaidSeverancePay) },
        { fieldId: 'complaint.otherUnpaidAmount', label: '기타 미지급액', value: amount(data.complaint.otherUnpaidAmount) },
        { fieldId: 'complaint.jobDescription', label: '업무 내용', value: text(data.complaint.jobDescription) },
        { fieldId: 'complaint.payday', label: '임금 지급일', value: text(data.complaint.payday) },
        { fieldId: 'complaint.contractMethod', label: '계약 방식', value: contractMethod(data.complaint.contractMethod) },
        { fieldId: 'complaint.details', label: '진정 내용', value: text(data.complaint.details) },
        { fieldId: 'complaint.attachmentFileNames', label: '첨부자료', value: data.complaint.attachmentFileNames.length > 0 ? data.complaint.attachmentFileNames.join(', ') : null },
      ],
    },
    {
      id: 'submission',
      label: '제출처',
      rows: [
        { fieldId: 'submission.recipientLaborOfficeName', label: '관할 노동관서', value: text(data.submission.recipientLaborOfficeName) },
      ],
    },
  ]
}

export function requiredFieldProgress(data: LaborComplaintFormData) {
  const rows = complaintPreviewGroups(data).flatMap((group) => group.rows)
  const byId = new Map(rows.map((row) => [row.fieldId, row.value]))
  const completed = REQUIRED_FIELD_IDS.filter((fieldId) => Boolean(byId.get(fieldId))).length
  return { completed, total: REQUIRED_FIELD_IDS.length }
}
