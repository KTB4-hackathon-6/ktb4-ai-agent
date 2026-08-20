import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { issueLabels, supportChannels } from '../../config/chatbot'
import StageMascot from './StageMascot'

/**
 * ILLO_SERVICE_SPEC 4.7 관련 기관·신고처
 * 문제 유형에 맞는 기관을 먼저 보여주고, 기관명·연락처·연결 주소만 제공한다.
 */
type AgencyPanelProps = {
  issue: keyof typeof issueLabels
  onFinish: () => void
  onBack: () => void
}

const panelMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: 'easeOut' as const },
}

function AgencyPanel({ issue, onFinish, onBack }: AgencyPanelProps) {
  const { t } = useTranslation()
  const ordered = [...supportChannels].sort((a, b) => Number(b.issue === issue) - Number(a.issue === issue))

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

      <ul className="agency-list">
        {ordered.map((channel) => (
          <li className={channel.issue === issue ? 'agency-card primary' : 'agency-card'} key={channel.id}>
            <div>
              <strong>{t(`agency.channel.${channel.id}.name`)}</strong>
              <p>{t(`agency.channel.${channel.id}.detail`)}</p>
            </div>
            <a
              className="ghost-button"
              href={channel.href}
              target={channel.href.startsWith('tel:') ? undefined : '_blank'}
              rel={channel.href.startsWith('tel:') ? undefined : 'noreferrer'}
            >
              {channel.href.startsWith('tel:') ? t('agency.call') : t('agency.open')}
            </a>
          </li>
        ))}
      </ul>

      <p className="agency-note">
        {t('agency.note')}
      </p>

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
