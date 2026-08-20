import en from './locales/en.json'
import id from './locales/id.json'
import km from './locales/km.json'
import ko from './locales/ko.json'
import mn from './locales/mn.json'
import th from './locales/th.json'
import vi from './locales/vi.json'

export const supportedLanguages = ['km', 'vi', 'th', 'id', 'mn', 'ko', 'en'] as const

export const translationResources = {
  km: { translation: km },
  vi: { translation: vi },
  th: { translation: th },
  id: { translation: id },
  mn: { translation: mn },
  ko: { translation: ko },
  en: { translation: en },
} as const
