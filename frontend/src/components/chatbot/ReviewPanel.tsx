import { AnimatePresence, motion } from 'framer-motion'
import type { ContractAnalysisResponse } from '../../api/contracts'
import {
  evidenceToKeep,
  judgmentLimits,
  statusLabels,
} from '../../config/chatbot'
import { reviewCards, reviewCounts } from '../../review/presentation'
import StageMascot from './StageMascot'

/**
 * ILLO_SERVICE_SPEC 4.3 결과 확인
 * API가 반환한 분석 항목과 기준 대조 결과, 다음 행동, 증거 안내, 판단 제한을 보여준다.
 */
type ReviewPanelProps = {
  result: ContractAnalysisResponse | null
  openItem: string | null
  checkedEvidence: string[]
  onToggleItem: (itemId: string | null) => void
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
  openItem,
  checkedEvidence,
  onToggleItem,
  onToggleEvidence,
  onStartDraft,
  onSkipToAgency,
}: ReviewPanelProps) {
  const cards = result ? reviewCards(result) : []
  const counts = reviewCounts(cards)
  const attentionCount = counts.check + counts.warn

  return (
    <motion.section className="panel review-panel" {...panelMotion}>
      <header className="review-head">
        <div className="panel-heading-with-mascot">
          <StageMascot variant="review" compact />
          <div>
            <span className="panel-eyebrow">결과 확인 / Review</span>
            <h2>{attentionCount > 0 ? `확인이 필요한 항목이 ${attentionCount}건 있습니다` : '현재 결과에서 주의 항목이 발견되지 않았습니다'}</h2>
            <p className="panel-lead review-summary">
              {result?.analysis.summary || result?.answer || '분석 결과를 불러오지 못했습니다.'}
              <small>The result below comes from the documents you uploaded.</small>
            </p>
          </div>
        </div>
        <ul className="count-badges">
          <li className="count-badge warn"><b>{counts.warn}</b>{statusLabels.warn.ko}</li>
          <li className="count-badge check"><b>{counts.check}</b>{statusLabels.check.ko}</li>
          <li className="count-badge ok"><b>{counts.ok}</b>{statusLabels.ok.ko}</li>
        </ul>
      </header>

      <div className="review-items">
        {cards.map((card) => {
          const open = openItem === card.id
          return (
            <motion.div className={`review-item ${card.status}`} key={card.id} layout>
              <button
                className="review-item-head"
                type="button"
                aria-expanded={open}
                onClick={() => onToggleItem(open ? null : card.id)}
              >
                <span className={`status-pill ${card.status}`}>{statusLabels[card.status].ko}</span>
                <span className="review-item-title">
                  <b>{card.title}</b>
                  <small>{card.description}</small>
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
                    <dt>판정 출처</dt>
                    <dd>{card.source}</dd>
                    {card.relatedDocuments.length > 0 && (
                      <>
                        <dt>관련 문서</dt>
                        <dd>{card.relatedDocuments.join(' · ')}</dd>
                      </>
                    )}
                    {card.legalBasis && (
                      <>
                        <dt>관련 기준</dt>
                        <dd>{card.legalBasis}</dd>
                      </>
                    )}
                  </motion.dl>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
        {cards.length === 0 && (
          <p className="ask-done">분석 결과에 별도 문제 항목이 없습니다. 아래 한계와 준비자료를 함께 확인하세요.</p>
        )}
      </div>

      {result && result.analysis.nextActions.length > 0 && (
        <div className="letter-block">
          <h3>권장되는 다음 행동 <span>Next actions from the analysis</span></h3>
          <ol className="next-actions">
            {result.analysis.nextActions.map((action, index) => <li key={`${action}-${index}`}>{action}</li>)}
          </ol>
        </div>
      )}

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

      {result && result.diagnosis.unverified_fields.length > 0 && (
        <div className="agent-block">
          <h3>문서에서 확인하지 못한 항목 <span>Not verified from the documents</span></h3>
          <ul className="limits-list">
            {result.diagnosis.unverified_fields.map((field) => <li key={field}>{field}</li>)}
          </ul>
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
