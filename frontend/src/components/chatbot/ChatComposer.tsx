import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

type ChatComposerProps = {
  value: string
  busy?: boolean
  onChange: (value: string) => void
  onSubmit: () => void
}

function ChatComposer({ value, busy = false, onChange, onSubmit }: ChatComposerProps) {
  const { t } = useTranslation()
  const placeholder = busy ? t('composer.busy') : t('composer.placeholder.drafting')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className="composer complaint-composer" aria-label={t('composer.aria')} onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="free-message">{t('composer.inputLabel')}</label>
        <input
          id="free-message"
          value={value}
          maxLength={4000}
          disabled={busy}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
        <motion.button
          type="submit"
          aria-label={t('composer.send')}
          disabled={!value.trim() || busy}
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
  )
}

export default ChatComposer
