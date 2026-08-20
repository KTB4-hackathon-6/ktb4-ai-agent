import { motion } from 'framer-motion'

export type ChatMessageItem = {
  who: 'bot' | 'user'
  ko: string
  en: string
}

type ChatMessageProps = ChatMessageItem

const messageMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease: 'easeOut' as const },
}

function ChatMessage({ who, ko, en }: ChatMessageProps) {
  if (who === 'user') {
    return (
      <motion.div className="message-row user-row" {...messageMotion}>
        <div className="message user-message">
          <div>{ko}</div>
          <div className="message-en">{en}</div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div className="message-row bot-row" {...messageMotion}>
      <div className="bot-avatar" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 12l2 2 4-4" />
          <path d="M12 3l7 4v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V7l7-4z" />
        </svg>
      </div>
      <div className="message bot-message">
        <div>{ko}</div>
        <div className="message-en">{en}</div>
      </div>
    </motion.div>
  )
}

export default ChatMessage
