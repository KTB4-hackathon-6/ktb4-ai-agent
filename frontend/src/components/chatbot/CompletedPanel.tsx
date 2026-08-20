import { motion } from 'framer-motion'
import { evidenceToKeep } from '../../mocks/chatbot'
import StageMascot from './StageMascot'

/**
 * ILLO_SERVICE_SPEC 4.8 완료
 * 진행한 내용을 요약하고, 다음에 무엇을 준비하면 되는지만 남긴다.
 */
type CompletedPanelProps = {
  answered: number
  totalQuestions: number
  draftDownloaded: boolean
  onRestart: () => void
}

const panelMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: 'easeOut' as const },
}

function CompletedPanel({ answered, totalQuestions, draftDownloaded, onRestart }: CompletedPanelProps) {
  return (
    <motion.section className="panel completed-panel" {...panelMotion}>
      <StageMascot variant="completed" large />
      <h2>여기까지 잘 하셨습니다</h2>
      <p className="panel-lead">
        확인한 내용과 진정서 초안을 정리했습니다. 다음 단계는 기관에 직접 접수하는 것입니다.
        <small>Everything is summarised. Submitting is the next step, and you do that yourself.</small>
      </p>

      <ul className="done-summary">
        <li><b>문서 확인</b>계약서 · 급여명세서 비교 완료</li>
        <li><b>추가 확인</b>{answered}/{totalQuestions}개 답변 반영</li>
        <li><b>진정서</b>{draftDownloaded ? '초안 내려받기 완료' : '초안 작성 완료'}</li>
      </ul>

      <div className="done-next">
        <h3>다음에 준비하면 좋은 자료</h3>
        <ul>
          {evidenceToKeep.map((item) => <li key={item.id}>{item.ko}</li>)}
        </ul>
      </div>

      <div className="panel-actions">
        <button className="ghost-button" type="button" onClick={onRestart}>
          다른 문서 확인하기 / Check another document
        </button>
      </div>
    </motion.section>
  )
}

export default CompletedPanel
