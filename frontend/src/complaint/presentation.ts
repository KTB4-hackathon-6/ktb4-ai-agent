import type { LaborComplaintFormData } from '../api/contracts'
import i18n, { normalizeLanguage } from '../i18n'

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
  return i18n.t(value ? 'complaintPreview.yes' : 'complaintPreview.no')
}

function workplaceType(value: LaborComplaintFormData['respondent']['workplaceType']) {
  if (value === 'WORKPLACE') return i18n.t('complaintPreview.workplace')
  if (value === 'CONSTRUCTION_SITE') return i18n.t('complaintPreview.constructionSite')
  return null
}

function employmentStatus(value: LaborComplaintFormData['complaint']['employmentStatus']) {
  if (value === 'EMPLOYED') return i18n.t('complaintPreview.employed')
  if (value === 'RESIGNED') return i18n.t('complaintPreview.resigned')
  return null
}

function contractMethod(value: LaborComplaintFormData['complaint']['contractMethod']) {
  if (value === 'WRITTEN') return i18n.t('complaintPreview.written')
  if (value === 'ORAL') return i18n.t('complaintPreview.oral')
  return null
}

function amount(value: number | null) {
  if (value === null) return null
  const locale = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)
  return i18n.t('complaintPreview.currency', { value: new Intl.NumberFormat(locale).format(value) })
}

export function complaintPreviewGroups(data: LaborComplaintFormData): ComplaintPreviewGroup[] {
  return [
    {
      id: 'complainant',
      label: i18n.t('complaintPreview.group.complainant'),
      rows: [
        { fieldId: 'complainant.fullName', label: i18n.t('complaintPreview.fullName'), value: text(data.complainant.fullName) },
        { fieldId: 'complainant.address', label: i18n.t('complaintPreview.address'), value: text(data.complainant.address) },
        { fieldId: 'complainant.telephone', label: i18n.t('complaintPreview.telephone'), value: text(data.complainant.telephone) },
        { fieldId: 'complainant.mobilePhone', label: i18n.t('complaintPreview.mobilePhone'), value: text(data.complainant.mobilePhone) },
        { fieldId: 'complainant.email', label: i18n.t('complaintPreview.email'), value: text(data.complainant.email) },
        { fieldId: 'complainant.receiveStatusUpdates', label: i18n.t('complaintPreview.receiveStatusUpdates'), value: yesNo(data.complainant.receiveStatusUpdates) },
        { fieldId: 'complainant.notifyViaLaborPortal', label: i18n.t('complaintPreview.notifyViaLaborPortal'), value: yesNo(data.complainant.notifyViaLaborPortal) },
      ],
    },
    {
      id: 'respondent',
      label: i18n.t('complaintPreview.group.respondent'),
      rows: [
        { fieldId: 'respondent.fullName', label: i18n.t('complaintPreview.respondentName'), value: text(data.respondent.fullName) },
        { fieldId: 'respondent.contact', label: i18n.t('complaintPreview.respondentContact'), value: text(data.respondent.contact) },
        { fieldId: 'respondent.address', label: i18n.t('complaintPreview.respondentAddress'), value: text(data.respondent.address) },
        { fieldId: 'respondent.workplaceType', label: i18n.t('complaintPreview.workplaceType'), value: workplaceType(data.respondent.workplaceType) },
        { fieldId: 'respondent.workplaceName', label: i18n.t('complaintPreview.workplaceName'), value: text(data.respondent.workplaceName) },
        { fieldId: 'respondent.actualWorkplaceAddress', label: i18n.t('complaintPreview.actualWorkplaceAddress'), value: text(data.respondent.actualWorkplaceAddress) },
        { fieldId: 'respondent.workplaceTelephone', label: i18n.t('complaintPreview.workplaceTelephone'), value: text(data.respondent.workplaceTelephone) },
        { fieldId: 'respondent.employeeCount', label: i18n.t('complaintPreview.employeeCount'), value: text(data.respondent.employeeCount) },
      ],
    },
    {
      id: 'complaint',
      label: i18n.t('complaintPreview.group.complaint'),
      rows: [
        { fieldId: 'complaint.employmentStartDate', label: i18n.t('complaintPreview.employmentStartDate'), value: text(data.complaint.employmentStartDate) },
        { fieldId: 'complaint.employmentEndDate', label: i18n.t('complaintPreview.employmentEndDate'), value: text(data.complaint.employmentEndDate) },
        { fieldId: 'complaint.employmentStatus', label: i18n.t('complaintPreview.employmentStatus'), value: employmentStatus(data.complaint.employmentStatus) },
        { fieldId: 'complaint.unpaidWagesTotal', label: i18n.t('complaintPreview.unpaidWagesTotal'), value: amount(data.complaint.unpaidWagesTotal) },
        { fieldId: 'complaint.unpaidSeverancePay', label: i18n.t('complaintPreview.unpaidSeverancePay'), value: amount(data.complaint.unpaidSeverancePay) },
        { fieldId: 'complaint.otherUnpaidAmount', label: i18n.t('complaintPreview.otherUnpaidAmount'), value: amount(data.complaint.otherUnpaidAmount) },
        { fieldId: 'complaint.jobDescription', label: i18n.t('complaintPreview.jobDescription'), value: text(data.complaint.jobDescription) },
        { fieldId: 'complaint.payday', label: i18n.t('complaintPreview.payday'), value: text(data.complaint.payday) },
        { fieldId: 'complaint.contractMethod', label: i18n.t('complaintPreview.contractMethod'), value: contractMethod(data.complaint.contractMethod) },
        { fieldId: 'complaint.details', label: i18n.t('complaintPreview.details'), value: text(data.complaint.details) },
        { fieldId: 'complaint.attachmentFileNames', label: i18n.t('complaintPreview.attachments'), value: data.complaint.attachmentFileNames.length > 0 ? data.complaint.attachmentFileNames.join(', ') : null },
      ],
    },
    {
      id: 'submission',
      label: i18n.t('complaintPreview.group.submission'),
      rows: [
        { fieldId: 'submission.recipientLaborOfficeName', label: i18n.t('complaintPreview.recipientLaborOfficeName'), value: text(data.submission.recipientLaborOfficeName) },
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
