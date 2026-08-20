import { motion } from 'framer-motion'
import { flowStages } from '../../mocks/chatbot'
import type { FlowState } from '../../types/chatbot'

/** ILLO_SERVICE_SPEC 5 상태와 분기 — 8개 상태를 6개 진행 단계로 묶어 보여준다 */
const stageIndexOf: Record<FlowState, number> = {
  UPLOAD: 0,
  ANALYZING: 1,
  REVIEW: 2,
  REVIEW_UPDATING: 2,
  DRAFTING: 3,
  DRAFT_READY: 3,
  AGENCY: 4,
  COMPLETED: 5,
}

type StageBarProps = {
  state: FlowState
}

function StageBar({ state }: StageBarProps) {
  const current = stageIndexOf[state]

  return (
    <nav className="stage-bar" aria-label="진행 단계 / Progress">
      <ol className="stage-list">
        {flowStages.map((stage, index) => {
          const status = index < current ? 'done' : index === current ? 'now' : 'wait'
          return (
            <motion.li className={`stage-chip ${status}`} key={stage.id} layout aria-current={status === 'now' ? 'step' : undefined}>
              <span className="stage-dot" aria-hidden="true">{status === 'done' ? '✓' : index + 1}</span>
              <span className="stage-label">
                <strong>{stage.ko}</strong>
                <small>{stage.en}</small>
              </span>
            </motion.li>
          )
        })}
      </ol>
    </nav>
  )
}

export default StageBar
