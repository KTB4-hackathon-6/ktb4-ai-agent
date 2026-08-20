import { motion } from 'framer-motion'
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

const optionLabels: Record<string, string> = {
  WORKPLACE: '사업장',
  CONSTRUCTION_SITE: '공사현장',
  RESIGNED: '퇴직',
  EMPLOYED: '재직 중',
  WRITTEN: '서면 계약',
  ORAL: '구두 계약',
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
            <span className="panel-eyebrow">진정서 작성 / Complaint</span>
            <h2>ILLO와 대화하며 진정서를 작성합니다</h2>
            <p className="panel-lead">
              AI가 필요한 항목을 한 번에 하나씩 질문합니다. 아래 입력창에 자연어로 답해주세요.
              <small>The AI asks for one required item at a time.</small>
            </p>
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
            <small>필수 항목 확인 상황</small>
          </div>
        )}
      </header>

      <div className="complaint-chat" aria-live="polite" aria-label="진정서 작성 대화">
        {messages.map((message) => (
          <div className={`complaint-message ${message.role}`} key={message.id}>
            <span className="complaint-message-role">{message.role === 'assistant' ? 'ILLO AI' : '나'}</span>
            <p>{message.content}</p>
          </div>
        ))}
        {preparing && (
          <div className="complaint-message assistant pending">
            <span className="complaint-message-role">ILLO AI</span>
            <p><span className="step-spinner" aria-hidden="true" /> 답변을 확인하고 있습니다…</p>
          </div>
        )}
      </div>

      {missingField && !preparing && (
        <aside className="current-question-card">
          <span>현재 확인 항목 · {missingField.displayName}</span>
          <strong>{missingField.question}</strong>
          <small>{missingField.reason}</small>
          {missingField.sensitive && <em>민감정보가 포함될 수 있습니다. 공용 기기에서는 입력 후 화면을 닫아주세요.</em>}
          {quickReplies.length > 0 && (
            <div className="draft-options" aria-label={`${missingField.displayName} 빠른 답변`}>
              {quickReplies.map((option) => (
                <button className="chip" type="button" key={option} onClick={() => onReply(option)}>
                  {optionLabels[option] ?? option}
                </button>
              ))}
            </div>
          )}
        </aside>
      )}

      {draft && (
        <details className="complaint-live-preview">
          <summary>현재까지 작성된 내용 확인</summary>
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
            완성된 진정서 확인 / Review complaint
          </motion.button>
        )}
        <button className="ghost-button" type="button" onClick={onBack} disabled={preparing}>
          결과로 돌아가기 / Back to review
        </button>
        {!completed && !preparing && <span className="panel-note">아래 채팅 입력창에 답변을 입력해주세요.</span>}
      </div>
    </motion.section>
  )
}

export default ComplaintDraftPanel
