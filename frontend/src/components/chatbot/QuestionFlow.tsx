import { chatScript } from '../../mocks/chatbot'
import ChatMessage, { type ChatMessageItem } from './ChatMessage'

type QuestionFlowProps = {
  messages: ChatMessageItem[]
  currentStep: number
  resultsShown: boolean
  onPickOption: (ko: string, en: string) => void
  onShowResults: () => void
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
        <div className="options nested-options">
          {options.map(([ko, en]) => (
            <button className="pill-button" key={ko} onClick={() => onPickOption(ko, en)}>
              {ko} <span>/ {en}</span>
            </button>
          ))}
        </div>
      )}
      {currentStep === chatScript.length - 1 && !resultsShown && (
        <button className="primary-button nested-action" onClick={onShowResults}>결과 확인하기 / View Results</button>
      )}
    </>
  )
}

export default QuestionFlow
