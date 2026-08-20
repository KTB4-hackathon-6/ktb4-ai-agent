import { AnimatePresence, motion } from 'framer-motion'
import { confirmQuestions } from '../../mocks/chatbot'

/**
 * ILLO_SERVICE_SPEC 4.4 추가 확인
 * 정해진 순서로 한 번에 하나만 묻고, 답한 항목은 확인된 사실로 접어 둔다.
 * 형식이 정해진 답은 선택지로 받고, 그 밖의 내용은 아래 입력창으로 받는다.
 */
type ConfirmQuestionsProps = {
  answers: Record<string, string>
  updating: boolean
  onAnswer: (id: string, answer: string) => void
}

function ConfirmQuestions({ answers, updating, onAnswer }: ConfirmQuestionsProps) {
  const answered = confirmQuestions.filter((question) => answers[question.id])
  const current = confirmQuestions.find((question) => !answers[question.id])

  return (
    <div className="confirm-block">
      <div className="confirm-head">
        <h3>추가 확인 <span>Additional questions</span></h3>
        <span className="confirm-count">{answered.length}/{confirmQuestions.length}</span>
      </div>

      {answered.length > 0 && (
        <ul className="answered-list">
          {answered.map((question) => (
            <motion.li
              className="answered-row"
              key={question.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <span className="answered-mark" aria-hidden="true">✓</span>
              <span className="answered-label">{question.label}</span>
              <strong className="answered-value">{answers[question.id]}</strong>
              <button className="text-button" type="button" onClick={() => onAnswer(question.id, '')}>
                다시 답하기
              </button>
            </motion.li>
          ))}
        </ul>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {current ? (
          <motion.div
            className="ask-stage"
            key={current.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
          >
            <p className="ask-question">
              {current.ko}
              <small>{current.en}</small>
            </p>
            <div className="ask-options">
              {current.options.map((option) => (
                <motion.button
                  className="ask-option"
                  type="button"
                  key={option}
                  disabled={updating}
                  onClick={() => onAnswer(current.id, option)}
                  whileHover={updating ? undefined : { y: -2 }}
                  whileTap={updating ? undefined : { scale: 0.99 }}
                >
                  <span>{option}</span>
                  <span className="ask-arrow" aria-hidden="true">›</span>
                </motion.button>
              ))}
            </div>
            <p className="ask-effect">이 답변은 <b>{current.effect}</b></p>
          </motion.div>
        ) : (
          <motion.p
            className="ask-done"
            key="done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            확인이 필요한 내용을 모두 답해 주셨습니다. 아래에서 다음 단계를 선택하세요.
            <small>All questions answered — choose what to do next below.</small>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ConfirmQuestions
