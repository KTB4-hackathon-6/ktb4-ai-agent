import { languages } from '../../mocks/chatbot'
import type { PreferredLanguage } from '../../types/chatbot'

type LanguageSelectorProps = {
  selectedLanguage: PreferredLanguage
  onSelect: (language: PreferredLanguage) => void
}

function LanguageSelector({ selectedLanguage, onSelect }: LanguageSelectorProps) {
  return (
    <div className="language-options">
      {languages.map((language) => (
        <button
          className={selectedLanguage === language.code ? 'language-chip selected' : 'language-chip'}
          key={language.code}
          lang={language.code}
          onClick={() => onSelect(language.code)}
        >
          {language.native} <span>({language.ko})</span>
        </button>
      ))}
    </div>
  )
}

export default LanguageSelector
