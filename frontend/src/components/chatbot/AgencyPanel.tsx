import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { GuidanceResponse } from '../../api/contracts'
import { issueLabels } from '../../config/chatbot'
import StageMascot from './StageMascot'

/**
 * ILLO_SERVICE_SPEC 4.7 관련 기관·신고처
 * 문제 유형에 맞는 기관을 먼저 보여주고, 기관명·연락처·연결 주소만 제공한다.
 */
type AgencyPanelProps = {
  issue: keyof typeof issueLabels
  guidance: GuidanceResponse | null
  loading: boolean
  error: string | null
  onFinish: () => void
  onBack: () => void
}

const panelMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: 'easeOut' as const },
}

function AgencyPanel({ issue, guidance, loading, error, onFinish, onBack }: AgencyPanelProps) {
  const { t } = useTranslation()

  return (
    <motion.section className="panel agency-panel" {...panelMotion}>
      <header className="agency-head panel-heading-with-mascot">
        <StageMascot variant="agency" compact />
        <div>
          <span className="panel-eyebrow">{t('agency.eyebrow')}</span>
          <h2>{t('agency.heading')}</h2>
          <p className="panel-lead">{t('agency.description', { issue: t(`agency.issue.${issue}`) })}</p>
        </div>
      </header>

      {loading && (
        <div className="agency-guidance-status" aria-busy="true">
          <span className="step-spinner" aria-hidden="true" />
          <p>{t('agency.description', { issue: t(`agency.issue.${issue}`) })}</p>
        </div>
      )}
      {error && <p className="inline-error" role="alert">{error}</p>}
      {guidance && (
        <section className="agency-guidance-summary">
          <strong>{guidance.agencyName} · {guidance.jurisdictionOfficeName}</strong>
          <p>{guidance.answer}</p>
          {guidance.jurisdictionOfficeUrl && (
            <a
              className="agency-office-link"
              href={guidance.jurisdictionOfficeUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t('agency.channel.localOffice.name')} · {t('agency.open')}
            </a>
          )}
        </section>
      )}

      <ul className="agency-list">
        {guidance?.submissionOptions.map((option) => (
          <li className="agency-card primary" key={`${option.channel}-${option.label}`}>
            <div>
              <strong>{option.label}</strong>
              <p>{option.instructions}</p>
              {option.address && <small>{option.address}</small>}
            </div>
            {option.url && (
              <a className="ghost-button" href={option.url} target="_blank" rel="noreferrer">
                {t('agency.open')}
              </a>
            )}
          </li>
        ))}
        {guidance && (
          <li className="agency-card primary">
            <div>
              <strong>{t('agency.channel.moel1350.name')}</strong>
              <p>{t('agency.channel.moel1350.detail')}</p>
            </div>
            <a className="ghost-button" href={`tel:${guidance.helplinePhone}`}>
              {t('agency.call')}
            </a>
          </li>
        )}
        {guidance && (
          <li className="agency-card primary">
            <div>
              <strong>{t('agency.channel.foreignCentre.name')}</strong>
              <p>{t('agency.channel.foreignCentre.detail')}</p>
            </div>
            <a className="ghost-button" href={`tel:${guidance.foreignWorkerHelplinePhone}`}>
              {t('agency.call')}
            </a>
          </li>
        )}
      </ul>

      {guidance?.notes && <p className="agency-note">{guidance.notes}</p>}

      <div className="panel-actions agency-actions">
        <motion.button
          className="primary-button"
          type="button"
          onClick={onBack}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
        >
          {t('agency.back')}
        </motion.button>
        <button className="ghost-button" type="button" onClick={onFinish}>{t('agency.done')}</button>
      </div>
    </motion.section>
  )
}

export default AgencyPanel
