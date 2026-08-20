import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { DocumentPreparationResponse } from '../../api/contracts'
import { complaintPreviewGroups } from '../../complaint/presentation'
import StageMascot from './StageMascot'

type DraftReadyPanelProps = {
  preparation: DocumentPreparationResponse
  downloaded: boolean
  onDownload: () => void
  onNext: () => void
  onBackToConversation: () => void
}

const panelMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: 'easeOut' as const },
}

function DraftReadyPanel({
  preparation,
  downloaded,
  onDownload,
  onNext,
  onBackToConversation,
}: DraftReadyPanelProps) {
  const { t } = useTranslation()
  const draft = preparation.documentDrafts[0]
  const groups = complaintPreviewGroups(draft.data)

  return (
    <motion.section className="panel draft-ready-panel" {...panelMotion}>
      <header className="draft-head">
        <div className="panel-heading-with-mascot">
          <StageMascot variant="ready" compact />
          <div>
            <span className="panel-eyebrow">{t('draftReady.eyebrow')}</span>
            <h2>{t('draftReady.heading')}</h2>
            <p className="panel-lead">{t('draftReady.description')}</p>
          </div>
        </div>
      </header>

      <article className="draft-preview">
        <h3 className="draft-preview-title">{t('draftReady.title')}</h3>
        {groups.map((group) => (
          <section className="draft-preview-group" key={group.id}>
            <h4>{group.label}</h4>
            <dl>
              {group.rows.map((row) => (
                <div key={row.fieldId}>
                  <dt>{row.label}</dt>
                  <dd>{row.value ?? '—'}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </article>

      <aside className="draft-notice">
        <strong>{t('draftReady.notice.heading')}</strong>
        <ul>
          <li>{t('draftReady.notice.draft')}</li>
          <li>{t('draftReady.notice.notSubmitted')}</li>
          <li>{t('draftReady.notice.verify')}</li>
        </ul>
      </aside>

      <div className="panel-actions">
        <motion.button
          className="primary-button"
          type="button"
          onClick={onDownload}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
        >
          {downloaded ? t('draftReady.downloadAgain') : t('draftReady.download')}
        </motion.button>
        <button className="ghost-button" type="button" onClick={onNext}>{t('draftReady.agencies')}</button>
        <button className="text-button" type="button" onClick={onBackToConversation}>{t('draftReady.conversation')}</button>
      </div>
    </motion.section>
  )
}

export default DraftReadyPanel
