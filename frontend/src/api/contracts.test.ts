import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestSubmissionGuidance } from './contracts'

describe('requestSubmissionGuidance', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('requests session guidance and returns the envelope data', async () => {
    const guidance = {
      answer: '관할 지방고용노동관서에 제출할 수 있습니다.',
      agencyCode: 'MOEL' as const,
      agencyName: '고용노동부',
      jurisdictionOfficeName: '고용노동부 안산지청',
      jurisdictionOfficeUrl: 'https://www.moel.go.kr/ansan/',
      helplinePhone: '1350',
      foreignWorkerHelplinePhone: '1577-0071',
      submissionOptions: [{
        channel: 'ONLINE' as const,
        label: '노동포털 온라인 제출',
        url: 'https://labor.moel.go.kr/minwonApply/minwonFormat.do?searchVal=SN001',
        address: null,
        instructions: '로그인한 뒤 제출합니다.',
      }],
      requiredAttachments: ['근로계약서'],
      steps: ['작성 내용을 확인합니다.'],
      notes: null,
    }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ code: 'SUCCESS', data: guidance }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ))

    const result = await requestSubmissionGuidance(
      'session-001',
      '완성한 진정서를 어디에 제출해야 해?',
      'ko',
    )

    expect(result).toEqual(guidance)
    expect(fetchMock).toHaveBeenCalledWith('/api/sessions/session-001/guidance', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        content: '완성한 진정서를 어디에 제출해야 해?',
        preferredLanguage: 'ko',
      }),
    }))
  })
})
