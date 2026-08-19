const languages = [
  { code: 'vi', native: 'Tiếng Việt', ko: '베트남어' },
  { code: 'en', native: 'English', ko: '영어' },
  { code: 'th', native: 'ภาษาไทย', ko: '태국어' },
  { code: 'id', native: 'Bahasa Indonesia', ko: '인도네시아어' },
  { code: 'mn', native: 'Монгол хэл', ko: '몽골어' },
  { code: 'km', native: 'ភាសាខ្មែរ', ko: '캄보디아어' },
]

type LanguageSelectorProps = {
  selectedLanguage: string
  onSelect: (language: string) => void
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
