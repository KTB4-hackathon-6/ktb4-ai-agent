import type { ContractAnalysisResponse } from '../api/contracts'
import type { ReviewStatus } from '../types/chatbot'

export type ReviewIssue = 'wage' | 'condition'

export type ReviewCard = {
  id: string
  status: ReviewStatus
  title: string
  description: string
  source: 'ai' | 'rule'
  relatedDocuments: string[]
  legalBasis: string | null
}

const conditionTerms = ['업무', '직무', '근무장소', '사업장', 'workplace', 'job', 'duty', 'location']

function findingStatus(severity: ContractAnalysisResponse['analysis']['findings'][number]['severity']): ReviewStatus {
  if (severity === 'HIGH') return 'warn'
  if (severity === 'INFO') return 'ok'
  return 'check'
}

export function reviewCards(result: ContractAnalysisResponse): ReviewCard[] {
  const findings = result.analysis.findings.map<ReviewCard>((finding, index) => ({
    id: `finding-${index}`,
    status: findingStatus(finding.severity),
    title: finding.title,
    description: finding.description,
    source: 'ai',
    relatedDocuments: finding.relatedDocumentIds,
    legalBasis: null,
  }))

  const rules = result.diagnosis.violations.map<ReviewCard>((violation) => ({
    id: `rule-${violation.rule_id}`,
    status: violation.severity === 'warning' ? 'warn' : 'check',
    title: `${violation.law_name} ${violation.article}`,
    description: violation.message,
    source: 'rule',
    relatedDocuments: [],
    legalBasis: `${violation.law_name} ${violation.article}`,
  }))

  return [...findings, ...rules]
}

export function reviewCounts(cards: ReviewCard[]): Record<ReviewStatus, number> {
  return cards.reduce<Record<ReviewStatus, number>>(
    (counts, card) => ({ ...counts, [card.status]: counts[card.status] + 1 }),
    { warn: 0, check: 0, ok: 0 },
  )
}

export function detectReviewIssue(result: ContractAnalysisResponse | null): ReviewIssue {
  if (!result) return 'wage'
  const text = [
    result.analysis.summary,
    result.answer,
    ...result.analysis.findings.flatMap((finding) => [finding.title, finding.description]),
    ...result.diagnosis.violations.map((violation) => violation.message),
  ].filter(Boolean).join(' ').toLowerCase()

  return conditionTerms.some((term) => text.includes(term)) ? 'condition' : 'wage'
}
