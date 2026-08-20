import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import illoMascot from '../../assets/illo-mascot.png'
import type { FlowState } from '../../types/chatbot'

/**
 * ILLO_SERVICE_SPEC 3. 화면 구성
 * 입력창은 사용자가 직접 설명해야 하는 상태에서만 열어 두고, 업로드·분석·완료 상태에서는 감춘다.
 */
const placeholderByState: Record<FlowState, string> = {
  UPLOAD: '문서 업로드나 서비스 이용에 대해 궁금한 점을 물어보세요',
  ANALYZING: '문서를 분석하고 있습니다. 잠시만 기다려주세요…',
  REVIEW: '더 알려주실 내용이 있으면 적어주세요 (예: 7월 20일은 오전만 근무)',
  REVIEW_UPDATING: '답변을 반영하는 중입니다…',
  DRAFTING: '진정서에 넣고 싶은 내용을 적어주세요',
  DRAFT_READY: '고칠 내용을 적어주세요',
  AGENCY: '기관 안내에 대해 물어보고 싶은 내용을 적어주세요',
  COMPLETED: '추가로 궁금한 점이 있으면 언제든 물어보세요',
}

const assistantMoodByState: Record<FlowState, { icon: string; label: string; className: string }> = {
  UPLOAD: { icon: '✦', label: '문서를 기다리고 있어요', className: 'waiting' },
  ANALYZING: { icon: '⌕', label: '꼼꼼히 읽고 있어요', className: 'thinking' },
  REVIEW: { icon: '?', label: '함께 확인해볼게요', className: 'reviewing' },
  REVIEW_UPDATING: { icon: '↻', label: '답변을 반영하고 있어요', className: 'thinking' },
  DRAFTING: { icon: '✎', label: '내용을 정리하고 있어요', className: 'writing' },
  DRAFT_READY: { icon: '✓', label: '초안을 확인해주세요', className: 'ready' },
  AGENCY: { icon: '⌖', label: '도움받을 곳을 찾았어요', className: 'guiding' },
  COMPLETED: { icon: '★', label: '수고하셨어요!', className: 'celebrating' },
}

type ChatComposerProps = {
  state: FlowState
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
}

function ChatComposer({ state, value, onChange, onSubmit }: ChatComposerProps) {
  const placeholder = placeholderByState[state]
  const mood = assistantMoodByState[state]
  const unavailable = state === 'ANALYZING' || state === 'REVIEW_UPDATING'

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <aside className="chat-dock" aria-label="AI 챗봇">
      <div className="chat-assistant">
        <span className={`assistant-avatar ${mood.className}`}>
          <img src={illoMascot} alt="" aria-hidden="true" />
          <span className="assistant-mood" aria-hidden="true">{mood.icon}</span>
        </span>
        <span>
          <strong>ILLO AI</strong>
          <small><i aria-hidden="true" /> {mood.label}</small>
        </span>
      </div>
      <form className="composer" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="free-message">AI 챗봇에게 질문하기</label>
        <input
          id="free-message"
          value={value}
          disabled={unavailable}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
        <motion.button
          type="submit"
          aria-label="메시지 보내기"
          disabled={!value.trim() || unavailable}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.96 }}
        >
          <span>보내기</span>
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
