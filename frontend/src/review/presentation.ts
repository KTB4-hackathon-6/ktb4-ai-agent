import type { ContractAnalysisResponse, RuleViolation } from '../api/contracts'
import type { ReviewStatus } from '../types/chatbot'
import i18n from '../i18n'

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

/**
 * 규칙 엔진 문구는 백엔드에서 한국어로 생성된다. 화면에서는 rule_id로 번역을 찾고,
 * 번역이 없는 규칙만 백엔드 원문을 그대로 보여준다.
 */
function ruleTitle(violation: RuleViolation): string {
  const key = `rule.title.${violation.rule_id}`
  return i18n.exists(key) ? i18n.t(key) : `${violation.law_name} ${violation.article}`
}

function ruleMessage(violation: RuleViolation): string {
  const key = `rule.message.${violation.rule_id}`
  if (!i18n.exists(key)) return violation.message

  const locale = i18n.resolvedLanguage ?? i18n.language
  const values = Object.fromEntries(
    Object.entries(violation.params ?? {}).map(([name, value]) => [
      name,
      typeof value === 'number' ? value.toLocaleString(locale) : value,
    ]),
  )
  const text = i18n.t(key, values)

  // params를 보내지 않는 구버전 백엔드와 붙으면 치환되지 않은 {name}이 남는다.
  // 자리표시자가 노출되느니 백엔드 원문을 그대로 보여준다.
  return /\{[A-Za-z]/.test(text) ? violation.message : text
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

  const rules = result.diagnosis.violations.map<ReviewCard>((violation) => {
    const title = ruleTitle(violation)
    return {
      id: `rule-${violation.rule_id}`,
      status: violation.severity === 'warning' ? 'warn' : 'check',
      title,
      description: ruleMessage(violation),
      source: 'rule',
      relatedDocuments: [],
      legalBasis: title,
    }
  })

  return [...findings, ...rules]
}

export function reviewCounts(cards: ReviewCard[]): Record<ReviewStatus, number> {
  return cards.reduce<Record<ReviewStatus, number>>(
    (counts, card) => ({ ...counts, [card.status]: counts[card.status] + 1 }),
    { warn: 0, check: 0, ok: 0 },
  )
}

export function groupReviewCards(cards: ReviewCard[]): { attention: ReviewCard[]; normal: ReviewCard[] } {
  return {
    attention: [
      ...cards.filter((card) => card.status === 'warn'),
      ...cards.filter((card) => card.status === 'check'),
    ],
    normal: cards.filter((card) => card.status === 'ok'),
  }
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
