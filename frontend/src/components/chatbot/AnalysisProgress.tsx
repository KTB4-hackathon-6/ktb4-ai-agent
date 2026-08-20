import { AnimatePresence, motion } from 'framer-motion'
import type { ContractAnalysisJob, ContractAnalysisStage } from '../../api/contracts'
import StageMascot from './StageMascot'

/** ILLO_SERVICE_SPEC 4.2 분석 진행 — 문서 읽기, 정보 정리, 대응 방법 만들기 세 단계만 보여준다 */
const progressSteps: Array<{
  stage: Exclude<ContractAnalysisStage, 'COMPLETED'>
  ko: string
  en: string
}> = [
  { stage: 'OCR', ko: '문서 글자 읽기', en: 'Reading the documents' },
  { stage: 'STRUCTURING', ko: '문서 정보 정리', en: 'Organising the details' },
  { stage: 'GENERATING_RESPONSE', ko: '문제점과 대응 방법 만들기', en: 'Preparing your guidance' },
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
  const currentStage = job?.stage === 'COMPLETED' ? null : (job?.stage ?? 'OCR')
  const currentIndex = currentStage
    ? progressSteps.findIndex((step) => step.stage === currentStage)
    : progressSteps.length

  return (
    <motion.section className="panel analysis-panel" aria-live="polite" {...panelMotion}>
      <div className="panel-heading-with-mascot">
        <StageMascot variant="analyzing" compact />
        <div>
          <h2>문서를 확인하고 있습니다</h2>
          <p className="panel-lead">
            잠시만 기다려 주세요. 1분 정도 걸릴 수 있습니다.
            <small>This usually takes about a minute.</small>
          </p>
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
                <b>{step.ko}</b>
                <small>{step.en}</small>
                {step.stage === 'OCR' && active && job && (
                  <em>{job.processedFiles}/{job.totalFiles}개 문서 처리 완료</em>
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
