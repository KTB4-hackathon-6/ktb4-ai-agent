import { motion } from 'framer-motion'
import { complaintGroups, draftNotice } from '../../mocks/chatbot'
import StageMascot from './StageMascot'

/**
 * ILLO_SERVICE_SPEC 4.6 진정서 완성
 * 완성된 초안을 미리 보여주고, 내려받기와 함께 확인 안내를 반드시 같이 표시한다.
 */
type DraftReadyPanelProps = {
  values: Record<string, string>
  preparing: boolean
  error: string | null
  onDownload: () => void
  onNext: () => void
  onEdit: () => void
}

const panelMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: 'easeOut' as const },
}

function DraftReadyPanel({ values, preparing, error, onDownload, onNext, onEdit }: DraftReadyPanelProps) {
  return (
    <motion.section className="panel draft-ready-panel" {...panelMotion}>
      <header className="draft-head">
        <div className="panel-heading-with-mascot">
          <StageMascot variant="ready" compact />
          <div>
            <span className="panel-eyebrow">진정서 완성 / Complaint ready</span>
            <h2>진정서 초안이 준비되었습니다</h2>
            <p className="panel-lead">
              내용을 한 번 더 확인한 뒤 내려받아 접수해 주세요.
              <small>Check it once more, then download and submit.</small>
            </p>
          </div>
        </div>
      </header>

      <article className="draft-preview">
        <h3 className="draft-preview-title">진정서 (SN001)</h3>
        {complaintGroups.map((group) => (
          <section className="draft-preview-group" key={group.id}>
            <h4>{group.ko}</h4>
            <dl>
              {group.rows.map((row) => (
                <div key={row.key}>
                  <dt>{row.ko}</dt>
                  <dd>{values[row.key]?.trim() ? values[row.key] : '—'}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </article>

      <aside className="draft-notice">
        <strong>내려받기 전에 확인해 주세요</strong>
        <ul>
          {draftNotice.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </aside>

      {error && <p className="inline-error" role="alert">{error}</p>}

      <div className="panel-actions">
        <motion.button
          className="primary-button"
          type="button"
          disabled={preparing}
          onClick={onDownload}
          whileHover={preparing ? undefined : { y: -2 }}
          whileTap={preparing ? undefined : { scale: 0.97 }}
        >
          {preparing ? '진정서 생성 중… / Preparing…' : '진정서 내려받기 / Download HWPX'}
        </motion.button>
        <button className="ghost-button" type="button" onClick={onNext}>접수할 기관 보기 / Where to submit</button>
        <button className="text-button" type="button" onClick={onEdit}>내용 고치기 / Edit</button>
      </div>
    </motion.section>
  )
}

export default DraftReadyPanel
