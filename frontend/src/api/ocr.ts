import i18n from '../i18n'

export type OcrAnalysisResponse = {
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

export async function analyzeDocument(file: File): Promise<OcrAnalysisResponse> {
  const formData = new FormData()
  formData.append('image', file)

  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}/api/documents/ocr`, {
      method: 'POST',
      body: formData,
    })
  } catch {
    throw new OcrApiError(
      i18n.t('api.error.network'),
      'NETWORK_ERROR',
      0,
    )
  }

  const envelope = await readEnvelope<OcrAnalysisResponse | ErrorData>(response)
  if (!response.ok || envelope.code !== 'SUCCESS') {
    const errorData = envelope.data as ErrorData
    throw new OcrApiError(
      errorData.message ?? i18n.t('api.error.ocrFailed'),
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
      i18n.t('api.error.invalidResponse'),
      'INVALID_RESPONSE',
      response.status,
    )
  }
}
