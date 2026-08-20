import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { ContractAnalysisJob, ContractAnalysisStage } from '../../api/contracts'
import StageMascot from './StageMascot'

/** ILLO_SERVICE_SPEC 4.2 분석 진행 — 문서 읽기, 정보 정리, 대응 방법 만들기 세 단계만 보여준다 */
const progressSteps: Array<{
  stage: Exclude<ContractAnalysisStage, 'COMPLETED'>
  key: string
}> = [
  { stage: 'OCR', key: 'ocr' },
  { stage: 'STRUCTURING', key: 'structuring' },
  { stage: 'GENERATING_RESPONSE', key: 'generating' },
]

type AnalysisProgressProps = {
  job: ContractAnalysisJob | null
}

const panelMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: 'easeOut' as const },
}

function AnalysisProgress({ job }: AnalysisProgressProps) {
  const { t } = useTranslation()
  const currentStage = job?.stage === 'COMPLETED' ? null : (job?.stage ?? 'OCR')
  const currentIndex = currentStage
    ? progressSteps.findIndex((step) => step.stage === currentStage)
    : progressSteps.length

  return (
    <motion.section className="panel analysis-panel" aria-live="polite" {...panelMotion}>
      <div className="panel-heading-with-mascot">
        <StageMascot variant="analyzing" compact />
        <div>
          <h2>{t('analysis.heading')}</h2>
          <p className="panel-lead">{t('analysis.description')}</p>
        </div>
      </div>
      <ol className="analysis-steps">
        {progressSteps.map((step, index) => {
          const completed = job?.status === 'COMPLETED' || index < currentIndex
          const failed = job?.status === 'FAILED' && index === currentIndex
          const active = !failed && !completed && index === currentIndex
          const state = completed ? 'completed' : failed ? 'failed' : active ? 'active' : 'pending'
          return (
            <li className={`analysis-step ${state}`} key={step.stage} aria-current={active ? 'step' : undefined}>
              <span className="analysis-step-icon" aria-hidden="true">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={state}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {completed ? '✓' : failed ? '!' : active ? <span className="step-spinner" /> : index + 1}
                  </motion.span>
                </AnimatePresence>
              </span>
              <span>
                <b>{t(`analysis.step.${step.key}`)}</b>
                {step.stage === 'OCR' && active && job && (
                  <em>{t('analysis.processedFiles', { processed: job.processedFiles, total: job.totalFiles })}</em>
                )}
              </span>
            </li>
          )
        })}
      </ol>
    </motion.section>
  )
}

export default AnalysisProgress
