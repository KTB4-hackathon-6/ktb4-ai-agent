import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { ContractAnalysisResponse } from '../../api/contracts'
import {
  evidenceToKeep,
  judgmentLimits,
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
  const { t } = useTranslation()
  const cards = result ? reviewCards(result) : []
  const counts = reviewCounts(cards)
  const attentionCount = counts.check + counts.warn

  return (
    <motion.section className="panel review-panel" {...panelMotion}>
      <header className="review-head">
        <div className="panel-heading-with-mascot">
          <StageMascot variant="review" compact />
          <div>
            <span className="panel-eyebrow">{t('review.eyebrow')}</span>
            <h2>{attentionCount > 0 ? t('review.attentionCount', { count: attentionCount }) : t('review.noAttention')}</h2>
            <p className="panel-lead review-summary">
              {result?.analysis.summary || result?.answer || t('review.summaryFallback')}
            </p>
          </div>
        </div>
        <ul className="count-badges">
          <li className="count-badge warn"><b>{counts.warn}</b>{t('review.status.warn')}</li>
          <li className="count-badge check"><b>{counts.check}</b>{t('review.status.check')}</li>
          <li className="count-badge ok"><b>{counts.ok}</b>{t('review.status.ok')}</li>
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
                <span className={`status-pill ${card.status}`}>{t(`review.status.${card.status}`)}</span>
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
                    <dt>{t('review.source.label')}</dt>
                    <dd>{t(`review.source.${card.source}`)}</dd>
                    {card.relatedDocuments.length > 0 && (
                      <>
                        <dt>{t('review.relatedDocuments')}</dt>
                        <dd>{card.relatedDocuments.join(' · ')}</dd>
                      </>
                    )}
                    {card.legalBasis && (
                      <>
                        <dt>{t('review.legalBasis')}</dt>
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
          <p className="ask-done">{t('review.noItems')}</p>
        )}
      </div>

      {result && result.analysis.nextActions.length > 0 && (
        <div className="letter-block">
          <h3>{t('review.nextActions')}</h3>
          <ol className="next-actions">
            {result.analysis.nextActions.map((action, index) => <li key={`${action}-${index}`}>{action}</li>)}
          </ol>
        </div>
      )}

      <div className="evidence-block">
        <h3>{t('review.evidence.heading')}</h3>
        <ul className="evidence-list">
          {evidenceToKeep.map((item) => {
            const checked = checkedEvidence.includes(item)
            return (
              <li key={item}>
                <button className="evidence-item" type="button" aria-pressed={checked} onClick={() => onToggleEvidence(item)}>
                  <span className={checked ? 'evidence-check checked' : 'evidence-check'} aria-hidden="true">{checked ? '✓' : ''}</span>
                  <span>
                    {t(`review.evidence.${item}`)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {result && result.diagnosis.unverified_fields.length > 0 && (
        <div className="agent-block">
          <h3>{t('review.unverified')}</h3>
          <ul className="limits-list">
            {result.diagnosis.unverified_fields.map((field) => <li key={field}>{field}</li>)}
          </ul>
        </div>
      )}

      <div className="limits-block">
        <h3>{t('review.limits.heading')}</h3>
        <ul className="limits-list">
          {judgmentLimits.map((limit) => <li key={limit}>{t(`review.limits.${limit}`)}</li>)}
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
