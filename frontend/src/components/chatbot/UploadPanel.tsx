import { motion } from 'framer-motion'
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
          <h2>근로계약서와 급여명세서를 올려주세요</h2>
          <p>
            사진이나 PDF 모두 괜찮습니다. 두 문서를 비교해서 확인이 필요한 부분을 찾아드려요.
            <small>Upload your contract and payslip — photos or PDF are both fine.</small>
          </p>
        </div>
      </div>

      <div className="upload-features" aria-label="문서 분석 기능">
        <span><b aria-hidden="true">▰</b> 기기 내 개인정보 가림</span>
        <span><b aria-hidden="true">↔</b> 두 문서 비교</span>
        <span><b aria-hidden="true">✓</b> 쉬운 결과 안내</span>
      </div>

      <div className={ready ? 'drop-zone filled' : 'drop-zone'}>
        <span className="drop-mark" aria-hidden="true">{ready ? '✓' : '＋'}</span>
        <strong>{ready ? `${files.length}개 파일이 준비되었습니다` : '파일을 선택하세요'}</strong>
        <small>JPG · PNG · PDF / 한 장씩 추가하거나 여러 장을 한 번에 올릴 수 있습니다</small>
        {ready && (
          <ul className="selected-files" aria-label="선택한 문서 파일">
            {files.map((file) => <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>)}
          </ul>
        )}
        <label className="ghost-button" htmlFor="employment-documents">
          {ready ? '파일 추가 / Add files' : '파일 선택 / Choose files'}
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
          민감정보 가리기 / Hide private information
        </motion.button>
        <span className="panel-note">직접 가린 사본만 서버로 전송됩니다.</span>
      </div>
    </motion.section>
  )
}

export default UploadPanel
