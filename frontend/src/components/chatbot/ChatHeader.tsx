import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import illoLogo from '../../assets/illo-logo.png'
import { languages } from '../../config/chatbot'
import type { FlowState, PreferredLanguage } from '../../types/chatbot'
import StageBar from './StageBar'

type ChatHeaderProps = {
  language: PreferredLanguage
  state: FlowState
  onLanguageChange: (code: PreferredLanguage) => void
}

function ChatHeader({ language, state, onLanguageChange }: ChatHeaderProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)
  const current = languages.find((item) => item.code === language) ?? languages[0]

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <header className="app-top">
      <div className="brand-row">
        <button
          className="compact-brand"
          type="button"
          aria-label={t('header.home')}
          title={t('header.home')}
          onClick={() => window.location.reload()}
        >
          <img src={illoLogo} alt="ILLO" />
        </button>

        <div className="lang-switcher" ref={switcherRef}>
        <button
          className="lang-trigger"
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={t('header.language.chooseWithCurrent', { current: current.native })}
          onClick={() => setOpen((value) => !value)}
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18" />
            <path d="M12 3c2.8 2.6 4.3 5.7 4.3 9s-1.5 6.4-4.3 9c-2.8-2.6-4.3-5.7-4.3-9s1.5-6.4 4.3-9z" />
          </svg>
          <span className="lang-current">{current.native}</span>
        </button>
        <AnimatePresence>
          {open && (
            <motion.ul
              className="lang-menu"
              role="listbox"
              aria-label={t('header.language.choose')}
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              {languages.map((item) => (
                <li key={item.code}>
                  <button
                    className={item.code === language ? 'lang-menu-item selected' : 'lang-menu-item'}
                    type="button"
                    role="option"
                    aria-selected={item.code === language}
                    onClick={() => {
                      onLanguageChange(item.code)
                      setOpen(false)
                    }}
                  >
                    <span>{item.native}</span>
                    <small>{t(`language.${item.code}`)}</small>
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
      </div>

      <section className="progress-shell" aria-label={t('header.progress')}>
        <StageBar state={state} />
      </section>
    </header>
  )
}

export default ChatHeader
