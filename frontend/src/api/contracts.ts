import type { PreferredLanguage } from '../types/chatbot'
import i18n from '../i18n'

export type ContractFacts = {
  industry: 'manufacturing' | 'agriculture_livestock_fishery' | 'other'
  weekly_working_hours: number
  daily_working_hours: number
  rest_minutes_per_workday: number
  rest_time_specified: boolean
  weekly_paid_holidays: number
  monthly_wage: number
  hourly_wage: number
  wage_specified: boolean
  working_hours_specified: boolean
  holiday_specified: boolean
  contract_period_months: number
  payment_date_specified: boolean
  payment_method_in_person: boolean
  accommodation_deduction_krw: number
}

export type RuleViolation = {
  rule_id: string
  law_name: string
  article: string
  message: string
  severity: 'warning' | 'review'
}

export type ContractDiagnosis = {
  facts: ContractFacts
  violations: RuleViolation[]
  unverified_fields: string[]
}

export type AnalysisFinding = {
  title: string
  description: string
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH'
  relatedDocumentIds: string[]
}

export type LaborComplaintFormData = {
  complainant: {
    fullName: string | null
    residentRegistrationNumber: string | null
    address: string | null
    telephone: string | null
    mobilePhone: string | null
    email: string | null
    receiveStatusUpdates: boolean | null
    notifyViaLaborPortal: boolean | null
  }
  respondent: {
    fullName: string | null
    contact: string | null
    address: string | null
    workplaceType: 'WORKPLACE' | 'CONSTRUCTION_SITE' | null
    workplaceName: string | null
    actualWorkplaceAddress: string | null
    workplaceTelephone: string | null
    employeeCount: number | null
  }
  complaint: {
    employmentStartDate: string | null
    employmentEndDate: string | null
    unpaidWagesTotal: number | null
    employmentStatus: 'RESIGNED' | 'EMPLOYED' | null
    unpaidSeverancePay: number | null
    otherUnpaidAmount: number | null
    jobDescription: string | null
    payday: string | null
    contractMethod: 'WRITTEN' | 'ORAL' | null
    details: string | null
    attachmentFileNames: string[]
  }
  submission: {
    recipientLaborOfficeName: string | null
  }
}

export type MissingField = {
  fieldId: string
  displayName: string
  required: boolean
  inputType: 'TEXT' | 'DATE' | 'PHONE' | 'NUMBER' | 'TEXTAREA' | 'BOOLEAN' | 'SELECT' | 'FILE_LIST'
  question: string
  reason: string
  sensitive: boolean
  validationRules: {
    pattern: string | null
    minLength: number | null
    maxLength: number | null
    minValue: number | null
    maxValue: number | null
    allowedValues: string[]
  }
  status: 'MISSING' | 'PROVIDED' | 'CONFIRMED'
}

export type DocumentDraft = {
  status: 'READY' | 'NEEDS_INPUT' | 'GENERATED' | 'FAILED'
  data: LaborComplaintFormData
  missingFields: MissingField[]
}

export type ContractAnalysisApiResponse = {
  requestId: string
  diagnosis: ContractDiagnosis
  answer: string
  analysis: {
    summary: string | null
    findings: AnalysisFinding[]
    nextActions: string[]
  }
}

export type ContractAnalysisResponse = ContractAnalysisApiResponse & {
  sessionId: string
}

export type DocumentPreparationRequest = {
  input: {
    text: string
  }
}

export type DocumentPreparationResponse = {
  requestId: string
  answer: string
  documentDrafts: DocumentDraft[]
  document: GeneratedDocument
}

export type GeneratedDocument = {
  documentId: string
  templateId: string
  templateVersion: string
  fileName: string
  mimeType: string
  generatedAt: string
  bytes: string
  status: 'GENERATED'
}

export type GuidanceRequest = {
  input: {
    text: string
  }
}

export type GuidanceResponse = {
  answer: string
  agencyCode: 'MOEL'
  agencyName: string
  jurisdictionOfficeName: string
  submissionOptions: Array<{
    channel: 'ONLINE' | 'VISIT' | 'MAIL'
    label: string
    url: string | null
    address: string | null
    instructions: string
  }>
  requiredAttachments: string[]
  steps: string[]
  notes: string | null
}

export type CrossCheckFinding = {
  rule_id: string
  law_name: string
  message: string
  severity: 'WARNING' | 'REVIEW'
}

export type CrossCheckResult = {
  contract_employee_name: string
  payslip_employee_name: string
  pay_period: string
  findings: CrossCheckFinding[]
}

export type ContractAnalysisStage = 'OCR' | 'STRUCTURING' | 'GENERATING_RESPONSE' | 'COMPLETED'

export type ContractAnalysisJob = {
  analysisId: string
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED'
  stage: ContractAnalysisStage
  processedFiles: number
  totalFiles: number
  result: ContractAnalysisApiResponse | null
  error: {
    code: string
    message: string
  } | null
}

type ApiEnvelope<T> = {
  code: string
  data: T
}

type ErrorData = {
  message?: string
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export class ContractApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(message: string, code: string, status: number) {
    super(message)
    this.name = 'ContractApiError'
    this.code = code
    this.status = status
  }
}

export async function analyzeContract(
  files: File[],
  text: string,
  preferredLanguage: PreferredLanguage,
  onProgress: (job: ContractAnalysisJob) => void,
  signal?: AbortSignal,
): Promise<ContractAnalysisResponse> {
  const session = await request<CreateSessionResponse>('/api/sessions', { method: 'POST', signal })
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))
  formData.append('text', text)
  formData.append('preferredLanguage', preferredLanguage)

  let job = await request<ContractAnalysisJob>(
    `/api/sessions/${session.sessionId}/contract-analyses`, {
    method: 'POST',
    body: formData,
    signal,
  })
  onProgress(job)

  let consecutiveNetworkFailures = 0
  while (job.status === 'PROCESSING') {
    await wait(1000, signal)
    try {
      job = await request<ContractAnalysisJob>(
        `/api/sessions/${session.sessionId}/contract-analyses/${job.analysisId}`,
        { method: 'GET', signal },
      )
      consecutiveNetworkFailures = 0
      onProgress(job)
    } catch (error) {
      if (
        error instanceof ContractApiError
        && error.code === 'NETWORK_ERROR'
        && consecutiveNetworkFailures < 2
      ) {
        consecutiveNetworkFailures += 1
        continue
      }
      throw error
    }
  }

  if (job.status === 'FAILED') {
    throw new ContractApiError(
      job.error?.message ?? i18n.t('api.error.contractAnalysisFailed'),
      job.error?.code ?? 'ANALYSIS_FAILED',
      200,
    )
  }
  if (!job.result) {
    throw new ContractApiError(i18n.t('api.error.missingAnalysisResult'), 'INVALID_RESPONSE', 200)
  }
  return { ...job.result, sessionId: session.sessionId }
}

export async function crossCheckDocuments(
  contractFiles: File[],
  payslipFiles: File[],
  signal?: AbortSignal,
): Promise<CrossCheckResult> {
  const formData = new FormData()
  contractFiles.forEach((file) => formData.append('contractFiles', file))
  payslipFiles.forEach((file) => formData.append('payslipFiles', file))
  return request<CrossCheckResult>('/api/employment-documents/cross-check', {
    method: 'POST',
    body: formData,
    signal,
  })
}

export async function prepareLaborComplaint(
  sessionId: string,
  content: string,
  preferredLanguage: PreferredLanguage,
  signal?: AbortSignal,
): Promise<DocumentPreparationResponse> {
  return request<DocumentPreparationResponse>(
    `/api/sessions/${sessionId}/documents`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, preferredLanguage }),
      signal,
    },
  )
}

export function downloadGeneratedDocument(document: GeneratedDocument): void {
  const binary = window.atob(document.bytes)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  const url = URL.createObjectURL(new Blob([bytes], { type: document.mimeType }))
  const anchor = window.document.createElement('a')
  anchor.href = url
  anchor.download = document.fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

type CreateSessionResponse = {
  sessionId: string
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, init)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ContractApiError(
      i18n.t('api.error.network'),
      'NETWORK_ERROR',
      0,
    )
  }

  const envelope = await readEnvelope<T | ErrorData>(response)
  if (!response.ok || envelope.code !== 'SUCCESS') {
    const errorData = envelope.data as ErrorData
    throw new ContractApiError(
      errorData.message ?? i18n.t('api.error.contractAnalysisFailed'),
      envelope.code,
      response.status,
    )
  }

  return envelope.data as T
}

async function readEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  try {
    return await response.json() as ApiEnvelope<T>
  } catch {
    throw new ContractApiError(
      i18n.t('api.error.invalidResponse'),
      'INVALID_RESPONSE',
      response.status,
    )
  }
}

function wait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('The operation was aborted.', 'AbortError'))
      return
    }
    const handleAbort = () => {
      window.clearTimeout(timeoutId)
      reject(new DOMException('The operation was aborted.', 'AbortError'))
    }
    const timeoutId = window.setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort)
      resolve()
    }, milliseconds)
    signal?.addEventListener('abort', handleAbort, { once: true })
  })
}
