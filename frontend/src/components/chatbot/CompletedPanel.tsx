import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { evidenceToKeep } from '../../config/chatbot'
import StageMascot from './StageMascot'

/**
 * ILLO_SERVICE_SPEC 4.8 완료
 * 진행한 내용을 요약하고, 다음에 무엇을 준비하면 되는지만 남긴다.
 */
type CompletedPanelProps = {
  draftDownloaded: boolean
  onRestart: () => void
}

const panelMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: 'easeOut' as const },
}

function CompletedPanel({ draftDownloaded, onRestart }: CompletedPanelProps) {
  const { t } = useTranslation()
  return (
    <motion.section className="panel completed-panel" {...panelMotion}>
      <StageMascot variant="completed" large />
      <h2>{t('completed.heading')}</h2>
      <p className="panel-lead">{t('completed.description')}</p>

      <ul className="done-summary">
        <li><b>{t('completed.document.label')}</b>{t('completed.document.value')}</li>
        <li><b>{t('completed.analysis.label')}</b>{t('completed.analysis.value')}</li>
        <li><b>{t('completed.draft.label')}</b>{draftDownloaded ? t('completed.draft.downloaded') : t('completed.draft.ready')}</li>
      </ul>

      <div className="done-next">
        <h3>{t('completed.evidence')}</h3>
        <ul>
          {evidenceToKeep.map((item) => <li key={item}>{t(`review.evidence.${item}`)}</li>)}
        </ul>
      </div>

      <div className="panel-actions">
        <button className="ghost-button" type="button" onClick={onRestart}>
          {t('completed.restart')}
        </button>
      </div>
    </motion.section>
  )
}

export default CompletedPanel
