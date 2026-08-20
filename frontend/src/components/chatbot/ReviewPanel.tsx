import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { ContractAnalysisResponse } from '../../api/contracts'
import { evidenceToKeep } from '../../config/chatbot'
import { groupReviewCards, reviewCards, reviewCounts, type ReviewCard } from '../../review/presentation'
import StageMascot from './StageMascot'

/**
 * ILLO_SERVICE_SPEC 4.3 결과 확인
 * API가 반환한 분석 항목과 기준 대조 결과, 다음 행동, 증거 안내, 판단 제한을 보여준다.
 */
type ReviewPanelProps = {
  result: ContractAnalysisResponse | null
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
  onStartDraft,
  onSkipToAgency,
}: ReviewPanelProps) {
  const { t } = useTranslation()
  const cards = result ? reviewCards(result) : []
  const counts = reviewCounts(cards)
  const groups = groupReviewCards(cards)
  const attentionCount = counts.check + counts.warn
  const [showNormal, setShowNormal] = useState(false)

  const renderCard = (card: ReviewCard) => (
    <motion.div className={`review-item ${card.status}`} key={card.id} layout>
      <div className="review-item-head">
        <span className={`status-pill ${card.status}`}>{t(`review.status.${card.status}`)}</span>
        <span className="review-item-title">
          <b>{card.title}</b>
          <small>{card.description}</small>
        </span>
      </div>
    </motion.div>
  )

  return (
    <motion.section className="panel review-panel" {...panelMotion}>
      <header className="review-head">
        <div className="panel-heading-with-mascot">
          <StageMascot variant="review" compact />
          <div>
            <span className="panel-eyebrow">{t('review.eyebrow')}</span>
            <h2>{attentionCount > 0 ? t('review.attentionCount', { count: attentionCount }) : t('review.noAttention')}</h2>
          </div>
        </div>
        <ul className="count-badges">
          <li className="count-badge warn"><b>{counts.warn}</b>{t('review.status.warn')}</li>
          <li className="count-badge check"><b>{counts.check}</b>{t('review.status.check')}</li>
          <li className="count-badge ok"><b>{counts.ok}</b>{t('review.status.ok')}</li>
        </ul>
      </header>

      <div className="review-layout">
        <section className="review-findings" aria-labelledby="review-findings-heading">
          <header className="review-section-head">
            <div>
              <h3 id="review-findings-heading">{t('review.attentionHeading')}</h3>
              <p>{t('review.attentionDescription')}</p>
            </div>
            <strong>{attentionCount}</strong>
          </header>

          <div className="review-items">
            {groups.attention.map(renderCard)}
            {groups.attention.length === 0 && <p className="ask-done">{t('review.noItems')}</p>}
          </div>

          {groups.normal.length > 0 && (
            <section className="review-normal-group">
              <button
                className="review-normal-toggle"
                type="button"
                aria-expanded={showNormal}
                onClick={() => setShowNormal((value) => !value)}
              >
                <span>{t('review.normalHeading', { count: groups.normal.length })}</span>
                <b>{showNormal ? t('review.hideNormal') : t('review.showNormal')}</b>
              </button>
              <AnimatePresence initial={false}>
                {showNormal && (
                  <motion.div
                    className="review-items review-normal-items"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    {groups.normal.map(renderCard)}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          )}
        </section>

        <aside className="review-action-rail">
          <section className="review-action-block primary">
            <h3>{t('review.actionHeading')}</h3>
            {result && result.analysis.nextActions.length > 0 ? (
              <ol className="next-actions">
                {result.analysis.nextActions.map((action, index) => <li key={`${action}-${index}`}>{action}</li>)}
              </ol>
            ) : <p>{t('review.actionFallback')}</p>}
          </section>

          <section className="review-action-block">
            <h3>{t('review.evidence.heading')}</h3>
            <ul className="evidence-list">
              {evidenceToKeep.map((item) => (
                <li className="evidence-item" key={item}>{t(`review.evidence.${item}`)}</li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <div className="panel-actions">
        <motion.button
          className="primary-button"
          type="button"
          onClick={onStartDraft}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
        >
          {t('review.prepareComplaint')}
        </motion.button>
        <button className="ghost-button" type="button" onClick={onSkipToAgency}>
          {t('review.showAgencies')}
        </button>
      </div>
    </motion.section>
  )
}

export default ReviewPanel
