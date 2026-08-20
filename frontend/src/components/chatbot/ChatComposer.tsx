import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import illoMascot from '../../assets/illo-mascot.png'
import type { FlowState } from '../../types/chatbot'

/**
 * ILLO_SERVICE_SPEC 3. 화면 구성
 * 입력창은 사용자가 직접 설명해야 하는 상태에서만 열어 두고, 업로드·분석·완료 상태에서는 감춘다.
 */
const stateKeys: Record<FlowState, string> = {
  UPLOAD: 'upload', ANALYZING: 'analyzing', REVIEW: 'review', DRAFTING: 'drafting',
  DRAFT_READY: 'ready', AGENCY: 'agency', COMPLETED: 'completed',
}

const assistantMoodByState: Record<FlowState, { icon: string; className: string }> = {
  UPLOAD: { icon: '✦', className: 'waiting' }, ANALYZING: { icon: '⌕', className: 'thinking' },
  REVIEW: { icon: '?', className: 'reviewing' }, DRAFTING: { icon: '✎', className: 'writing' },
  DRAFT_READY: { icon: '✓', className: 'ready' }, AGENCY: { icon: '⌖', className: 'guiding' },
  COMPLETED: { icon: '★', className: 'celebrating' },
}

type ChatComposerProps = {
  state: FlowState
  value: string
  busy?: boolean
  onChange: (value: string) => void
  onSubmit: () => void
}

function ChatComposer({ state, value, busy = false, onChange, onSubmit }: ChatComposerProps) {
  const { t } = useTranslation()
  const stateKey = stateKeys[state]
  const placeholder = busy ? t('composer.busy') : t(`composer.placeholder.${stateKey}`)
  const mood = assistantMoodByState[state]
  const unavailable = busy || state !== 'DRAFTING'

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <aside className="chat-dock" aria-label={t('composer.aria')}>
      <div className="chat-assistant">
        <span className={`assistant-avatar ${mood.className}`}>
          <img src={illoMascot} alt="" aria-hidden="true" />
          <span className="assistant-mood" aria-hidden="true">{mood.icon}</span>
        </span>
        <span>
          <strong>ILLO AI</strong>
          <small><i aria-hidden="true" /> {t(`mascot.${stateKey}`)}</small>
        </span>
      </div>
      <form className="composer" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="free-message">{t('composer.inputLabel')}</label>
        <input
          id="free-message"
          value={value}
          maxLength={4000}
          disabled={unavailable}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
        <motion.button
          type="submit"
          aria-label={t('composer.send')}
          disabled={!value.trim() || unavailable}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.96 }}
        >
          <span>{t('composer.send')}</span>
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
        </motion.button>
      </form>
    </aside>
  )
}

export default ChatComposer
