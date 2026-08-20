import { useRef, useState, type DragEvent } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { mergeUploadFiles, removeUploadFile } from '../../upload/files'
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
  const [dragging, setDragging] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const dragDepth = useRef(0)

  const addFiles = (incomingFiles: File[]) => {
    const merged = mergeUploadFiles(files, incomingFiles)
    onFilesChange(merged.files)
    setFileError(merged.rejected.length > 0
      ? t('upload.unsupportedFiles', { files: merged.rejected.map((file) => file.name).join(', ') })
      : null)
  }

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    dragDepth.current += 1
    setDragging(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    dragDepth.current -= 1
    if (dragDepth.current <= 0) {
      dragDepth.current = 0
      setDragging(false)
    }
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    addFiles(Array.from(event.dataTransfer.files))
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
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

      {!ready ? (
        <div
          className={`drop-zone${dragging ? ' dragging' : ''}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <strong>{dragging ? t('upload.dropActive') : t('upload.dropPrompt')}</strong>
          <small>{t('upload.formats')}</small>
          <label className="ghost-button" htmlFor="employment-documents">{t('upload.chooseFiles')}</label>
          <p className="upload-combined-note">{t('upload.combinedFileNote')}</p>
        </div>
      ) : (
        <div
          className={`upload-file-manager${dragging ? ' dragging' : ''}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <header className="upload-file-manager-head">
            <div>
              <strong>{t('upload.selectedCount', { count: files.length })}</strong>
              <small>{t('upload.combinedFileNote')}</small>
            </div>
            <label className="ghost-button" htmlFor="employment-documents">{t('upload.addFiles')}</label>
          </header>

          <ul className="selected-files" aria-label={t('upload.selectedFiles')}>
            {files.map((file) => (
              <li key={`${file.name}-${file.lastModified}`}>
                <span className="upload-file-type" aria-hidden="true">{file.type === 'application/pdf' ? 'PDF' : 'IMG'}</span>
                <span className="upload-file-name">{file.name}</span>
                <button
                  type="button"
                  aria-label={t('upload.removeFile', { file: file.name })}
                  onClick={() => onFilesChange(removeUploadFile(files, file))}
                >
                  {t('upload.remove')}
                </button>
              </li>
            ))}
          </ul>

          <div className="upload-privacy-callout">
            <span aria-hidden="true">🔒</span>
            <div>
              <strong>{t('upload.privacyHeading')}</strong>
              <small>{t('upload.privacyNote')}</small>
            </div>
          </div>

          <motion.button
            className="primary-button upload-redaction-button"
            type="button"
            onClick={() => onStart(files)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            {t('upload.redact')}
          </motion.button>
        </div>
      )}

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

      {(fileError || error) && (
        <p className="inline-error" role="alert">{fileError || error}</p>
      )}
    </motion.section>
  )
}

export default UploadPanel
