import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import type { PreferredLanguage } from '../types/chatbot'
import { supportedLanguages, translationResources } from './resources'

const fallbackLanguage: PreferredLanguage = 'ko'

export function normalizeLanguage(language?: string): PreferredLanguage {
  const primary = language?.toLowerCase().split('-')[0]
  return supportedLanguages.includes(primary as PreferredLanguage)
    ? primary as PreferredLanguage
    : fallbackLanguage
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: translationResources,
    supportedLngs: supportedLanguages,
    fallbackLng: fallbackLanguage,
    keySeparator: false,
    load: 'languageOnly',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'illo-language',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
      prefix: '{',
      suffix: '}',
    },
  })

const updateDocumentLanguage = (language: string) => {
  if (typeof document !== 'undefined') document.documentElement.lang = normalizeLanguage(language)
}

updateDocumentLanguage(i18n.resolvedLanguage ?? i18n.language)
i18n.on('languageChanged', updateDocumentLanguage)

export default i18n
