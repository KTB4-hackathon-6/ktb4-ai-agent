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
  severity: string
  relatedCheckIds: string[]
  relatedDocumentIds: string[]
}

export type ContractAnalysisResponse = {
  requestId: string
  diagnosis: ContractDiagnosis
  answer: string
  analysis: {
    summary: string
    findings: AnalysisFinding[]
    nextActions: string[]
  }
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

export async function analyzeContract(files: File[], text: string): Promise<ContractAnalysisResponse> {
  const session = await request<CreateSessionResponse>('/api/sessions', { method: 'POST' })
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))
  formData.append('sessionId', session.sessionId)
  formData.append('text', text)

  return request<ContractAnalysisResponse>('/api/contracts/analyze', {
    method: 'POST',
    body: formData,
  })
}

type CreateSessionResponse = {
  sessionId: string
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, init)
  } catch {
    throw new ContractApiError(
      '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
      'NETWORK_ERROR',
      0,
    )
  }

  const envelope = await readEnvelope<T | ErrorData>(response)
  if (!response.ok || envelope.code !== 'SUCCESS') {
    const errorData = envelope.data as ErrorData
    throw new ContractApiError(
      errorData.message ?? '계약서를 분석하지 못했습니다. 다시 시도해주세요.',
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
      '서버 응답을 확인할 수 없습니다. 잠시 후 다시 시도해주세요.',
      'INVALID_RESPONSE',
      response.status,
    )
  }
}
