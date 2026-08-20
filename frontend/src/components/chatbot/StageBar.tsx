import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { flowStages } from '../../config/chatbot'
import type { FlowState } from '../../types/chatbot'

/** ILLO_SERVICE_SPEC 5 상태와 분기 — 화면 상태를 6개 진행 단계로 묶어 보여준다 */
const stageIndexOf: Record<FlowState, number> = {
  UPLOAD: 0,
  ANALYZING: 1,
  REVIEW: 2,
  DRAFTING: 3,
  DRAFT_READY: 3,
  AGENCY: 4,
  COMPLETED: 5,
}

type StageBarProps = {
  state: FlowState
}

function StageBar({ state }: StageBarProps) {
  const { t } = useTranslation()
  const current = stageIndexOf[state]
  const stageCount = flowStages.length
  const fillPercent = stageCount > 1 ? (current / (stageCount - 1)) * 100 : 0

  return (
    <nav className="stage-bar" aria-label={t('stage.aria')}>
      <span className="mobile-stage-current">
        <b>{current + 1}/{flowStages.length}</b>
        {t(`stage.${flowStages[current].id}`)}
      </span>
      <div className="stage-track-wrap" style={{ '--stage-count': stageCount } as CSSProperties}>
        <div className="stage-track" aria-hidden="true">
          <motion.div
            className="stage-track-fill"
            initial={false}
            animate={{ width: `${fillPercent}%` }}
            transition={{ type: 'spring', stiffness: 180, damping: 24, mass: 0.55 }}
          >
            <span className="stage-track-shine" />
          </motion.div>
        </div>
        <ol className="stage-list">
          {flowStages.map((stage, index) => {
            const status = index < current ? 'done' : index === current ? 'now' : 'wait'
            const label = t(`stage.${stage.id}`)
            return (
              <motion.li className={`stage-chip ${status}`} key={stage.id} layout aria-current={status === 'now' ? 'step' : undefined}>
                <motion.span
                  className="stage-dot"
                  aria-hidden="true"
                  animate={status === 'now' ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                  transition={status === 'now' ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : undefined}
                >
                  {status === 'done' ? '✓' : index + 1}
                </motion.span>
                <span className="stage-label">
                  <strong title={label}>{label}</strong>
                </span>
              </motion.li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}

export default StageBar
