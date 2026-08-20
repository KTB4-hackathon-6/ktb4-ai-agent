import { motion } from 'framer-motion'
import { chatScript } from '../../mocks/chatbot'
import ChatMessage, { type ChatMessageItem } from './ChatMessage'

type QuestionFlowProps = {
  messages: ChatMessageItem[]
  currentStep: number
  resultsShown: boolean
  onPickOption: (ko: string, en: string) => void
  onShowResults: () => void
}

const listMotion = {
  initial: 'hidden',
  animate: 'visible',
  variants: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.05 } },
  },
}

const itemMotion = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0 },
}

function QuestionFlow({
  messages,
  currentStep,
  resultsShown,
  onPickOption,
  onShowResults,
}: QuestionFlowProps) {
  const options = chatScript[currentStep]?.options ?? []

  return (
    <>
      {messages.map((message, index) => (
        <ChatMessage key={`${message.ko}-${index}`} {...message} />
      ))}
      {options.length > 0 && (
        <motion.div className="options nested-options" {...listMotion}>
          {options.map(([ko, en]) => (
            <motion.button
              className="pill-button"
              key={ko}
              onClick={() => onPickOption(ko, en)}
              variants={itemMotion}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              {ko} <span>/ {en}</span>
            </motion.button>
          ))}
        </motion.div>
      )}
      {currentStep === chatScript.length - 1 && !resultsShown && (
        <motion.button
          className="primary-button nested-action"
          onClick={onShowResults}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
        >
          결과 확인하기 / View Results
        </motion.button>
      )}
    </>
  )
}

export default QuestionFlow
