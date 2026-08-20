import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import illoLogo from '../../assets/illo-logo.png'
import { languages } from '../../mocks/chatbot'

type ChatHeaderProps = {
  language: string
  onLanguageChange: (code: string) => void
}

function ChatHeader({ language, onLanguageChange }: ChatHeaderProps) {
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
    <header className="app-header">
      <div className="brand">
        <div className="brand-logo-frame">
          <img
            className="brand-logo"
            src={illoLogo}
            alt="ILLO"
          />
        </div>
      </div>

      <div className="lang-switcher" ref={switcherRef}>
        <button
          className="lang-trigger"
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`언어 선택 / Choose language (${current.native})`}
          onClick={() => setOpen((value) => !value)}
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18" />
            <path d="M12 3c2.8 2.6 4.3 5.7 4.3 9s-1.5 6.4-4.3 9c-2.8-2.6-4.3-5.7-4.3-9s1.5-6.4 4.3-9z" />
          </svg>
        </button>
        <AnimatePresence>
          {open && (
            <motion.ul
              className="lang-menu"
              role="listbox"
              aria-label="언어 선택 / Choose language"
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
                    <small>{item.ko}</small>
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}

export default ChatHeader
