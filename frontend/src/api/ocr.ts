export type OcrDocumentType = 'contract' | 'payslip'

export type OcrAnalysisResponse = {
  documentType: OcrDocumentType
  processedAt: string
  fullText: string
}

type ApiEnvelope<T> = {
  code: string
  data: T
}

type ErrorData = {
  message?: string
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export class OcrApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(message: string, code: string, status: number) {
    super(message)
    this.name = 'OcrApiError'
    this.code = code
    this.status = status
  }
}

export async function analyzeDocument(
  file: File,
  documentType: OcrDocumentType,
): Promise<OcrAnalysisResponse> {
  const formData = new FormData()
  formData.append('image', file)
  formData.append('documentType', documentType)

  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}/api/documents/ocr`, {
      method: 'POST',
      body: formData,
    })
  } catch {
    throw new OcrApiError(
      '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
      'NETWORK_ERROR',
      0,
    )
  }

  const envelope = await readEnvelope<OcrAnalysisResponse | ErrorData>(response)
  if (!response.ok || envelope.code !== 'SUCCESS') {
    const errorData = envelope.data as ErrorData
    throw new OcrApiError(
      errorData.message ?? '문서를 인식하지 못했습니다. 다시 시도해주세요.',
      envelope.code,
      response.status,
    )
  }

  return envelope.data as OcrAnalysisResponse
}

async function readEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  try {
    return await response.json() as ApiEnvelope<T>
  } catch {
    throw new OcrApiError(
      '서버 응답을 확인할 수 없습니다. 잠시 후 다시 시도해주세요.',
      'INVALID_RESPONSE',
      response.status,
    )
  }
}
