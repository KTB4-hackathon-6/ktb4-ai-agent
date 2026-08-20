import type { FormEvent } from 'react'
import { motion } from 'framer-motion'

type ChatComposerProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
}

function ChatComposer({ value, onChange, onSubmit }: ChatComposerProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="free-message">직접 메시지 입력</label>
      <input
        id="free-message"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="직접 입력 (선택사항) / Type your own message (optional)"
      />
      <motion.button type="submit" whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}>
        전송 / Send
      </motion.button>
    </form>
  )
}

export default ChatComposer
