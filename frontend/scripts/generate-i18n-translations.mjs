import { readFile, writeFile } from 'node:fs/promises'

const sourcePath = new URL('../src/i18n/locales/ko.json', import.meta.url)
const localeDirectory = new URL('../src/i18n/locales/', import.meta.url)
const inventoryPath = new URL('../src/i18n/frontend-hardcoded-texts.json', import.meta.url)
const targets = ['en', 'vi', 'th', 'id', 'mn', 'km']
const separator = '__ILLO_TRANSLATION_SPLIT_9F3A__'
const source = JSON.parse(await readFile(sourcePath, 'utf8'))
const entries = Object.entries(source)
const translations = { ko: source }

function protectPlaceholders(value) {
  let index = 0
  return value.replace(/\{([^}]+)\}/g, () => `__ILLOPH${index++}__`)
}

function restorePlaceholders(value, sourceValue) {
  const variables = [...sourceValue.matchAll(/\{([^}]+)\}/g)].map((match) => match[1])
  return value.replace(/__ILLOPH(\d+)__/g, (_, index) => `{${variables[Number(index)]}}`)
}

for (const locale of targets) {
  const request = new URLSearchParams({
    client: 'gtx',
    sl: 'ko',
    tl: locale,
    dt: 't',
    q: entries.map(([, value]) => protectPlaceholders(value)).join(`\n${separator}\n`),
  })
  const response = await fetch('https://translate.googleapis.com/translate_a/single', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: request,
  })
  if (!response.ok) throw new Error(`${locale} translation failed: ${response.status}`)
  const body = await response.json()
  const translated = body[0].map((segment) => segment[0]).join('')
  const values = translated.split(separator).map((value, index) => restorePlaceholders(value.trim(), entries[index][1]))
  if (values.length !== entries.length) {
    throw new Error(`${locale} translation count mismatch: ${values.length}/${entries.length}`)
  }
  const resource = Object.fromEntries(entries.map(([key], index) => [key, values[index]]))
  translations[locale] = resource
  await writeFile(new URL(`${locale}.json`, localeDirectory), `${JSON.stringify(resource, null, 2)}\n`)
}

let previousEntries = new Map()
try {
  const previous = JSON.parse(await readFile(inventoryPath, 'utf8'))
  previousEntries = new Map(previous.entries.map((entry) => [entry.key, entry]))
} catch {
  // The locale resources remain sufficient when no previous audit inventory exists.
}

const inventory = {
  _meta: {
    generatedAt: new Date().toISOString(),
    sourceRef: 'feat/frontend-i18n working tree',
    entryCount: entries.length,
    targetLanguages: ['ko', ...targets],
    translationMethod: 'Google Translate machine translation; unreviewed',
    scope: 'Current frontend static UI, including manual redaction flow',
  },
  entries: entries.map(([key, value]) => {
    const previous = previousEntries.get(key)
    return {
      key,
      sources: previous?.sources ?? [],
      kind: previous?.kind ?? 'ui_static',
      values: { ko: value },
      machineTranslations: Object.fromEntries(['ko', ...targets].map((locale) => [locale, translations[locale][key]])),
    }
  }),
}

await writeFile(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`)
