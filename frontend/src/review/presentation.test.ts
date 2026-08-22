import { afterEach, describe, expect, it } from 'vitest'
import type { ContractAnalysisResponse } from '../api/contracts'
import i18n from '../i18n'
import { detectReviewIssue, groupReviewCards, reviewCards, reviewCounts } from './presentation'

afterEach(async () => {
  await i18n.changeLanguage('ko')
})

function result(overrides: Partial<ContractAnalysisResponse> = {}): ContractAnalysisResponse {
  return {
    requestId: 'request-1',
    sessionId: 'session-1',
    answer: '분석 답변',
    diagnosis: {
      facts: {
        industry: 'manufacturing',
        weekly_working_hours: 40,
        daily_working_hours: 8,
        rest_minutes_per_workday: 60,
        rest_time_specified: true,
        weekly_paid_holidays: 1,
        monthly_wage: 2300000,
        hourly_wage: 11004,
        wage_specified: true,
        working_hours_specified: true,
        holiday_specified: true,
        contract_period_months: 12,
        payment_date_specified: true,
        payment_method_in_person: false,
        accommodation_deduction_krw: 150000,
      },
      violations: [],
      unverified_fields: [],
    },
    analysis: { summary: '분석 요약', findings: [], nextActions: [] },
    ...overrides,
  }
}

describe('review presentation', () => {
  it('builds cards from the API findings and rule checks without scenario values', () => {
    const input = result({
      analysis: {
        summary: '확인이 필요한 항목이 있습니다.',
        findings: [{
          title: '기본급 불일치',
          description: '계약서와 급여명세서의 기본급이 다릅니다.',
          severity: 'HIGH',
          relatedDocumentIds: ['contract-1', 'payslip-1'],
        }],
        nextActions: [],
      },
      diagnosis: {
        ...result().diagnosis,
        violations: [{
          rule_id: 'payment_date_review',
          law_name: '근로기준법',
          article: '제43조',
          message: '임금 지급일을 확인하세요.',
          severity: 'review',
        }],
      },
    })

    expect(reviewCards(input)).toEqual([
      expect.objectContaining({ id: 'finding-0', title: '기본급 불일치', status: 'warn' }),
      expect.objectContaining({ id: 'rule-payment_date_review', title: '근로기준법 제43조', status: 'check' }),
    ])
    expect(reviewCounts(reviewCards(input))).toEqual({ warn: 1, check: 1, ok: 0 })
  })

  it('localizes known rule ids instead of showing the Korean backend text', async () => {
    await i18n.changeLanguage('en')
    const input = result({
      diagnosis: {
        ...result().diagnosis,
        violations: [{
          rule_id: 'working_hours_disclosure_missing',
          law_name: '근로기준법',
          article: '제17조',
          message: '근로시간 항목이 계약서에 명시되어 있지 않습니다.',
          severity: 'warning',
        }],
      },
    })

    expect(reviewCards(input)[0]).toMatchObject({
      title: 'Labor Standards Act, Article 17',
      description: 'The contract does not state working hours.',
    })
  })

  it('interpolates rule params supplied by the backend', async () => {
    await i18n.changeLanguage('en')
    const input = result({
      diagnosis: {
        ...result().diagnosis,
        violations: [{
          rule_id: 'below_minimum_wage',
          law_name: '최저임금법',
          article: '제6조',
          message: '시급 9,000원은 2026년 최저임금 10,320원에 미달합니다.',
          severity: 'warning',
          params: { hourlyWage: 9000, minimumWage: 10320 },
        }],
      },
    })

    expect(reviewCards(input)[0].description)
      .toBe('The hourly wage of 9,000 KRW is below the 2026 minimum wage of 10,320 KRW.')
  })

  it('falls back to the backend message when params are missing', async () => {
    await i18n.changeLanguage('en')
    const backendMessage = '시급 9,000원은 2026년 최저임금 10,320원에 미달합니다.'
    const input = result({
      diagnosis: {
        ...result().diagnosis,
        violations: [{
          rule_id: 'below_minimum_wage',
          law_name: '최저임금법',
          article: '제6조',
          message: backendMessage,
          severity: 'warning',
        }],
      },
    })

    expect(reviewCards(input)[0].description).toBe(backendMessage)
  })

  it('uses only actual result text to determine the agency issue order', () => {
    const conditionResult = result({
      analysis: {
        summary: '계약 업무와 실제 근무장소를 확인하세요.',
        findings: [],
        nextActions: [],
      },
    })

    expect(detectReviewIssue(conditionResult)).toBe('condition')
    expect(detectReviewIssue(result())).toBe('wage')
  })

  it('groups attention cards before normal cards without changing their relative order', () => {
    const cards = [
      { id: 'ok-1', status: 'ok' as const },
      { id: 'check-1', status: 'check' as const },
      { id: 'warn-1', status: 'warn' as const },
      { id: 'ok-2', status: 'ok' as const },
    ].map((card) => ({
      ...card,
      title: card.id,
      description: card.id,
      source: 'ai' as const,
      relatedDocuments: [],
      legalBasis: null,
    }))

    expect(groupReviewCards(cards)).toEqual({
      attention: [cards[2], cards[1]],
      normal: [cards[0], cards[3]],
    })
  })
})
