import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import StageMascot from './StageMascot'

/** ILLO_SERVICE_SPEC 4.1 문서 업로드 — 근로계약서와 급여명세서를 함께 받는다 */
type UploadPanelProps = {
  files: File[]
  error: string | null
  onFilesChange: (files: File[]) => void
  onStart: (files: File[]) => void
}

const panelMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: 'easeOut' as const },
}

function UploadPanel({ files, error, onFilesChange, onStart }: UploadPanelProps) {
  const { t } = useTranslation()
  const ready = files.length > 0

  const addFiles = (incomingFiles: File[]) => {
    const merged = [...files]
    incomingFiles.forEach((incoming) => {
      const duplicate = merged.some((file) =>
        file.name === incoming.name
        && file.size === incoming.size
        && file.lastModified === incoming.lastModified)
      if (!duplicate) merged.push(incoming)
    })
    onFilesChange(merged)
  }

  return (
    <motion.section className="panel upload-panel" {...panelMotion}>
      <div className="upload-intro">
        <StageMascot variant="upload" compact />
        <div>
          <h2>{t('upload.heading')}</h2>
          <p>{t('upload.description')}</p>
        </div>
      </div>

      <div className="upload-features" aria-label={t('upload.features.aria')}>
        <span><b aria-hidden="true">▰</b> {t('upload.features.redaction')}</span>
        <span><b aria-hidden="true">↔</b> {t('upload.features.compare')}</span>
        <span><b aria-hidden="true">✓</b> {t('upload.features.guidance')}</span>
      </div>

      <div className={ready ? 'drop-zone filled' : 'drop-zone'}>
        <span className="drop-mark" aria-hidden="true">{ready ? '✓' : '＋'}</span>
        <strong>{ready ? t('upload.filesReady', { count: files.length }) : t('upload.choosePrompt')}</strong>
        <small>{t('upload.formats')}</small>
        {ready && (
          <ul className="selected-files" aria-label={t('upload.selectedFiles')}>
            {files.map((file) => <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>)}
          </ul>
        )}
        <label className="ghost-button" htmlFor="employment-documents">
          {ready ? t('upload.addFiles') : t('upload.chooseFiles')}
        </label>
        <input
          className="sr-only"
          id="employment-documents"
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          multiple
          onChange={(event) => {
            addFiles(Array.from(event.target.files ?? []))
            event.currentTarget.value = ''
          }}
        />
      </div>

      {error && (
        <p className="inline-error" role="alert">{error}</p>
      )}

      <div className="panel-actions">
        <motion.button
          className="primary-button"
          type="button"
          disabled={!ready}
          onClick={() => ready && onStart(files)}
          whileHover={ready ? { y: -2 } : undefined}
          whileTap={ready ? { scale: 0.97 } : undefined}
        >
          {t('upload.redact')}
        </motion.button>
        <span className="panel-note">{t('upload.privacyNote')}</span>
      </div>
    </motion.section>
  )
}

export default UploadPanel
