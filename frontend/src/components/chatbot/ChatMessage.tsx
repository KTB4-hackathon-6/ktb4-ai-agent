export type ChatMessageItem = {
  who: 'bot' | 'user'
  ko: string
  en: string
}

type ChatMessageProps = ChatMessageItem

function ChatMessage({ who, ko, en }: ChatMessageProps) {
  if (who === 'user') {
    return (
      <div className="message-row user-row">
        <div className="message user-message">
          <div>{ko}</div>
          <div className="message-en">{en}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="message-row bot-row">
      <div className="bot-avatar" aria-hidden="true">N</div>
      <div className="message bot-message">
        <div>{ko}</div>
        <div className="message-en">{en}</div>
      </div>
    </div>
  )
}

export default ChatMessage
