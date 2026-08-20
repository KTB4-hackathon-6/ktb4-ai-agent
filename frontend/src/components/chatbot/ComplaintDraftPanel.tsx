import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { DocumentPreparationResponse } from '../../api/contracts'
import { requiredFieldProgress } from '../../complaint/presentation'
import type { ComplaintChatMessage } from '../../types/chatbot'
import ChatComposer from './ChatComposer'
import LaborComplaintPreview from './LaborComplaintPreview'
import StageMascot from './StageMascot'

type ComplaintDraftPanelProps = {
  preparation: DocumentPreparationResponse | null
  messages: ComplaintChatMessage[]
  preparing: boolean
  error: string | null
  inputValue: string
  onReply: (content: string) => void
  onInputChange: (content: string) => void
  onInputSubmit: () => void
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
  inputValue,
  onReply,
  onInputChange,
  onInputSubmit,
  onReady,
  onBack,
}: ComplaintDraftPanelProps) {
  const { t } = useTranslation()
  const draft = preparation?.documentDrafts[0] ?? null
  const missingField = draft?.missingFields[0] ?? null
  const progress = draft ? requiredFieldProgress(draft.data) : null
  const completed = draft?.status === 'READY'
  const quickReplies = missingField?.validationRules.allowedValues ?? []
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const chat = chatRef.current
    if (chat) chat.scrollTop = chat.scrollHeight
  }, [messages, preparing])

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

      <div className={`draft-workspace${draft ? ' with-preview' : ''}`}>
        <section className="complaint-chat-shell">
          <div className="complaint-chat" ref={chatRef} aria-live="polite" aria-label={t('complaint.chatAria')}>
            {messages.map((message) => (
              <div className={`complaint-message ${message.role}`} key={message.id}>
                <span className="complaint-message-role">{message.role === 'assistant' ? 'ILLO AI' : t('complaint.me')}</span>
                <p>{message.content}</p>
              </div>
            ))}
            {!preparing && quickReplies.length > 0 && (
              <div className="draft-options" aria-label={t('complaint.quickReplies', { field: missingField?.displayName ?? '' })}>
                {quickReplies.map((option) => (
                  <button className="chip" type="button" key={option} onClick={() => onReply(option)}>
                    {t(`complaint.option.${option}`, { defaultValue: option })}
                  </button>
                ))}
              </div>
            )}
            {preparing && (
              <div className="complaint-message assistant pending">
                <span className="complaint-message-role">ILLO AI</span>
                <p><span className="step-spinner" aria-hidden="true" /> {t('complaint.checking')}</p>
              </div>
            )}
          </div>

          {error && <p className="inline-error" role="alert">{error}</p>}
          <ChatComposer
            value={inputValue}
            busy={preparing}
            onChange={onInputChange}
            onSubmit={onInputSubmit}
          />
        </section>

        {draft && (
          <section className="complaint-live-preview" aria-label={t('complaint.preview')}>
            <h3>{t('complaint.preview')}</h3>
            <div className="complaint-preview-scroll">
              <LaborComplaintPreview data={draft.data} compact />
            </div>
          </section>
        )}
      </div>

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
      </div>
    </motion.section>
  )
}

export default ComplaintDraftPanel
