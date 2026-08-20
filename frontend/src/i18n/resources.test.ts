import { describe, expect, it } from 'vitest'
import { supportedLanguages, translationResources } from './resources'

describe('translation resources', () => {
  it('supports the same language codes as the API contract', () => {
    expect(supportedLanguages).toEqual(['km', 'vi', 'th', 'id', 'mn', 'ko', 'en'])
  })

  it('contains the same keys in every locale', () => {
    const expected = Object.keys(translationResources.ko.translation).sort()

    supportedLanguages.forEach((language) => {
      expect(Object.keys(translationResources[language].translation).sort()).toEqual(expected)
    })
  })

  it('keeps interpolation variables and non-empty values in every locale', () => {
    const variablePattern = /\{([^}]+)\}/g

    Object.entries(translationResources.ko.translation).forEach(([key, source]) => {
      const expectedVariables = [...source.matchAll(variablePattern)].map((match) => match[1]).sort()

      supportedLanguages.forEach((language) => {
        const value = translationResources[language].translation[key as keyof typeof translationResources.ko.translation]
        expect(value.trim(), `${language}:${key}`).not.toBe('')
        expect([...value.matchAll(variablePattern)].map((match) => match[1]).sort(), `${language}:${key}`).toEqual(expectedVariables)
      })
    })
  })
})
