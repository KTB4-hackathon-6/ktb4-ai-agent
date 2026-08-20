import { AnimatePresence, motion } from 'framer-motion'
import type { ContractAnalysisResponse } from '../../api/contracts'
import {
  evidenceToKeep,
  judgmentLimits,
  requestLetter,
  reviewIntro,
  reviewItems,
  statusLabels,
} from '../../mocks/chatbot'
import type { ReviewStatus } from '../../types/chatbot'
import ComparisonTable from './ComparisonTable'
import ConfirmQuestions from './ConfirmQuestions'
import StageMascot from './StageMascot'

/**
 * ILLO_SERVICE_SPEC 4.3 결과 확인
 * 항목별 결과, 세 자료 비교, 고용주 확인 요청문, 증거 안내, 판단 제한을 한 화면에서 보여준다.
 */
type ReviewPanelProps = {
  result: ContractAnalysisResponse | null
  updating: boolean
  openItem: string | null
  answers: Record<string, string>
  checkedEvidence: string[]
  onToggleItem: (itemId: string | null) => void
  onAnswer: (id: string, answer: string) => void
  onToggleEvidence: (id: string) => void
  onStartDraft: () => void
  onSkipToAgency: () => void
}

const panelMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: 'easeOut' as const },
}

function ReviewPanel({
  result,
  updating,
  openItem,
  answers,
  checkedEvidence,
  onToggleItem,
  onAnswer,
  onToggleEvidence,
  onStartDraft,
  onSkipToAgency,
}: ReviewPanelProps) {
  const counts = reviewItems.reduce<Record<ReviewStatus, number>>(
    (acc, item) => ({ ...acc, [item.status]: acc[item.status] + 1 }),
    { warn: 0, check: 0, ok: 0 },
  )

  return (
    <motion.section className="panel review-panel" {...panelMotion}>
      <header className="review-head">
        <div className="panel-heading-with-mascot">
          <StageMascot variant="review" compact />
          <div>
            <span className="panel-eyebrow">결과 확인 / Review</span>
            <h2>확인이 필요한 항목이 {counts.check + counts.warn}건 있습니다</h2>
            <p className="panel-lead review-summary">
              {result?.analysis.summary || reviewIntro.ko}
              <small>{reviewIntro.en}</small>
            </p>
          </div>
        </div>
        <ul className="count-badges">
          <li className="count-badge warn"><b>{counts.warn}</b>{statusLabels.warn.ko}</li>
          <li className="count-badge check"><b>{counts.check}</b>{statusLabels.check.ko}</li>
          <li className="count-badge ok"><b>{counts.ok}</b>{statusLabels.ok.ko}</li>
        </ul>
      </header>

      {updating && (
        <p className="updating-note" aria-live="polite">
          답변을 반영해 결과를 다시 정리하고 있습니다…
        </p>
      )}

      <ComparisonTable />

      <div className="review-items">
        {reviewItems.map((item) => {
          const open = openItem === item.id
          return (
            <motion.div className={`review-item ${item.status}`} key={item.id} layout>
              <button
                className="review-item-head"
                type="button"
                aria-expanded={open}
                onClick={() => onToggleItem(open ? null : item.id)}
              >
                <span className={`status-pill ${item.status}`}>{statusLabels[item.status].ko}</span>
                <span className="review-item-title">
                  <b>{item.ko}</b>
                  <small>{item.summary}</small>
                </span>
                <motion.span className="chevron" animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} aria-hidden="true">⌄</motion.span>
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.dl
                    className="review-item-body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <dt>계약서 원문</dt>
                    <dd>{item.original}</dd>
                    <dt>쉬운 설명</dt>
                    <dd>{item.plain}</dd>
                    {item.userNote && (
                      <>
                        <dt>사용자 설명</dt>
                        <dd>{item.userNote}</dd>
                      </>
                    )}
                    {item.payslipNote && (
                      <>
                        <dt>급여명세서</dt>
                        <dd>{item.payslipNote}</dd>
                      </>
                    )}
                    <dt>관련 조항</dt>
                    <dd>{item.legal.join(' · ')}</dd>
                  </motion.dl>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      <ConfirmQuestions answers={answers} updating={updating} onAnswer={onAnswer} />

      <div className="letter-block">
        <h3>고용주에게 물어볼 내용 <span>Ask your employer</span></h3>
        <p className="letter-body">{requestLetter.ko}</p>
        <p className="letter-help">{requestLetter.en}</p>
      </div>

      <div className="evidence-block">
        <h3>앞으로 모아두면 좋은 자료 <span>Keep these from now on</span></h3>
        <ul className="evidence-list">
          {evidenceToKeep.map((item) => {
            const checked = checkedEvidence.includes(item.id)
            return (
              <li key={item.id}>
                <button className="evidence-item" type="button" aria-pressed={checked} onClick={() => onToggleEvidence(item.id)}>
                  <span className={checked ? 'evidence-check checked' : 'evidence-check'} aria-hidden="true">{checked ? '✓' : ''}</span>
                  <span>
                    {item.ko}
                    <small>{item.en}</small>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {result && result.analysis.findings.length > 0 && (
        <div className="agent-block">
          <h3>분석 결과 상세 <span>From the analysis</span></h3>
          {result.analysis.findings.map((finding, index) => (
            <article className="agent-finding" key={`${finding.title}-${index}`}>
              <strong>{finding.title}</strong>
              <p>{finding.description}</p>
            </article>
          ))}
          {result.analysis.nextActions.length > 0 && (
            <ol className="next-actions">
              {result.analysis.nextActions.map((action, index) => <li key={`${action}-${index}`}>{action}</li>)}
            </ol>
          )}
        </div>
      )}

      <div className="limits-block">
        <h3>이 결과의 한계 <span>What this cannot decide</span></h3>
        <ul className="limits-list">
          {judgmentLimits.map((limit) => <li key={limit}>{limit}</li>)}
        </ul>
      </div>

      <div className="panel-actions">
        <motion.button
          className="primary-button"
          type="button"
          onClick={onStartDraft}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
        >
          진정서 작성하기 / Prepare complaint
        </motion.button>
        <button className="ghost-button" type="button" onClick={onSkipToAgency}>
          기관 안내만 보기 / Just show agencies
        </button>
      </div>
    </motion.section>
  )
}

export default ReviewPanel
