import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { DocumentPreparationResponse } from '../../api/contracts'
import { complaintPreviewGroups, requiredFieldProgress } from '../../complaint/presentation'
import type { ComplaintChatMessage } from '../../types/chatbot'
import StageMascot from './StageMascot'

type ComplaintDraftPanelProps = {
  preparation: DocumentPreparationResponse | null
  messages: ComplaintChatMessage[]
  preparing: boolean
  error: string | null
  onReply: (content: string) => void
  onReady: () => void
  onBack: () => void
}

const panelMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: 'easeOut' as const },
}

function ComplaintDraftPanel({
  preparation,
  messages,
  preparing,
  error,
  onReply,
  onReady,
  onBack,
}: ComplaintDraftPanelProps) {
  const { t } = useTranslation()
  const draft = preparation?.documentDrafts[0] ?? null
  const missingField = draft?.missingFields[0] ?? null
  const progress = draft ? requiredFieldProgress(draft.data) : null
  const previewGroups = draft ? complaintPreviewGroups(draft.data) : []
  const completed = draft?.status === 'READY'
  const quickReplies = missingField?.validationRules.allowedValues ?? []

  return (
    <motion.section className="panel draft-panel" {...panelMotion}>
      <header className="draft-head">
        <div className="panel-heading-with-mascot">
          <StageMascot variant="drafting" compact />
          <div>
            <span className="panel-eyebrow">{t('complaint.eyebrow')}</span>
            <h2>{t('complaint.heading')}</h2>
            <p className="panel-lead">{t('complaint.description')}</p>
          </div>
        </div>
        {progress && (
          <div className="draft-progress" aria-live="polite">
            <strong>{progress.completed}<span>/{progress.total}</span></strong>
            <div className="progress-track" role="presentation">
              <motion.div
                className="progress-fill"
                animate={{ width: `${(progress.completed / progress.total) * 100}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
            <small>{t('complaint.progress')}</small>
          </div>
        )}
      </header>

      <div className="complaint-chat" aria-live="polite" aria-label={t('complaint.chatAria')}>
        {messages.map((message) => (
          <div className={`complaint-message ${message.role}`} key={message.id}>
            <span className="complaint-message-role">{message.role === 'assistant' ? 'ILLO AI' : t('complaint.me')}</span>
            <p>{message.content}</p>
          </div>
        ))}
        {preparing && (
          <div className="complaint-message assistant pending">
            <span className="complaint-message-role">ILLO AI</span>
            <p><span className="step-spinner" aria-hidden="true" /> {t('complaint.checking')}</p>
          </div>
        )}
      </div>

      {missingField && !preparing && (
        <aside className="current-question-card">
          <span>{t('complaint.currentField', { field: missingField.displayName })}</span>
          <strong>{missingField.question}</strong>
          <small>{missingField.reason}</small>
          {missingField.sensitive && <em>{t('complaint.sensitive')}</em>}
          {quickReplies.length > 0 && (
            <div className="draft-options" aria-label={t('complaint.quickReplies', { field: missingField.displayName })}>
              {quickReplies.map((option) => (
                <button className="chip" type="button" key={option} onClick={() => onReply(option)}>
                  {t(`complaint.option.${option}`, { defaultValue: option })}
                </button>
              ))}
            </div>
          )}
        </aside>
      )}

      {draft && (
        <details className="complaint-live-preview">
          <summary>{t('complaint.preview')}</summary>
          <div className="draft-preview compact">
            {previewGroups.map((group) => (
              <section className="draft-preview-group" key={group.id}>
                <h4>{group.label}</h4>
                <dl>
                  {group.rows.filter((row) => row.value !== null).map((row) => (
                    <div key={row.fieldId}>
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </details>
      )}

      {error && <p className="inline-error" role="alert">{error}</p>}

      <div className="panel-actions">
        {completed && (
          <motion.button
            className="primary-button"
            type="button"
            onClick={onReady}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            {t('complaint.review')}
          </motion.button>
        )}
        <button className="ghost-button" type="button" onClick={onBack} disabled={preparing}>
          {t('complaint.back')}
        </button>
        {!completed && !preparing && <span className="panel-note">{t('complaint.inputNote')}</span>}
      </div>
    </motion.section>
  )
}

export default ComplaintDraftPanel
