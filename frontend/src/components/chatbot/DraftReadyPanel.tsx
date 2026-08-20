import { motion } from 'framer-motion'
import type { DocumentPreparationResponse } from '../../api/contracts'
import { complaintPreviewGroups } from '../../complaint/presentation'
import StageMascot from './StageMascot'

type DraftReadyPanelProps = {
  preparation: DocumentPreparationResponse
  downloaded: boolean
  onDownload: () => void
  onNext: () => void
  onBackToConversation: () => void
}

const panelMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: 'easeOut' as const },
}

function DraftReadyPanel({
  preparation,
  downloaded,
  onDownload,
  onNext,
  onBackToConversation,
}: DraftReadyPanelProps) {
  const draft = preparation.documentDrafts[0]
  const groups = complaintPreviewGroups(draft.data)

  return (
    <motion.section className="panel draft-ready-panel" {...panelMotion}>
      <header className="draft-head">
        <div className="panel-heading-with-mascot">
          <StageMascot variant="ready" compact />
          <div>
            <span className="panel-eyebrow">진정서 완성 / Complaint ready</span>
            <h2>진정서 초안이 준비되었습니다</h2>
            <p className="panel-lead">
              AI와 대화하며 확인한 내용이 실제 SN001 HWPX 초안에 반영되었습니다.
              <small>Review the information before downloading the HWPX draft.</small>
            </p>
          </div>
        </div>
      </header>

      <article className="draft-preview">
        <h3 className="draft-preview-title">진정서 (SN001)</h3>
        {groups.map((group) => (
          <section className="draft-preview-group" key={group.id}>
            <h4>{group.label}</h4>
            <dl>
              {group.rows.map((row) => (
                <div key={row.fieldId}>
                  <dt>{row.label}</dt>
                  <dd>{row.value ?? '—'}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </article>

      <aside className="draft-notice">
        <strong>내려받기 전에 확인해 주세요</strong>
        <ul>
          <li>이 파일은 사용자가 제공한 내용을 정리한 진정서 초안입니다.</li>
          <li>파일을 내려받는 것만으로 신고가 접수되지 않습니다.</li>
          <li>제출 전에 이름, 주소, 날짜, 금액과 사실관계를 다시 확인해 주세요.</li>
        </ul>
      </aside>

      <div className="panel-actions">
        <motion.button
          className="primary-button"
          type="button"
          onClick={onDownload}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
        >
          {downloaded ? '진정서 다시 내려받기 / Download again' : '진정서 내려받기 / Download HWPX'}
        </motion.button>
        <button className="ghost-button" type="button" onClick={onNext}>접수할 기관 보기 / Where to submit</button>
        <button className="text-button" type="button" onClick={onBackToConversation}>작성 대화 보기 / View conversation</button>
      </div>
    </motion.section>
  )
}

export default DraftReadyPanel
