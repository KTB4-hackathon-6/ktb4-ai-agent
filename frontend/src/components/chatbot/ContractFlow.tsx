import { Fragment, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type {
  ContractAnalysisJob,
  ContractAnalysisStage,
  ContractAnalysisResponse,
} from '../../api/contracts'
import { contractClauses } from '../../mocks/chatbot'
import type { UploadState } from '../../types/chatbot'
import ChatMessage, { type ChatMessageItem } from './ChatMessage'
import QuestionFlow from './QuestionFlow'
import ResultsPanel, { type ResultTab } from './ResultsPanel'

type ContractFlowProps = {
  uploadState: UploadState
  contractResult: ContractAnalysisResponse | null
  contractProgress: ContractAnalysisJob | null
  uploadError: string | null
  openClause: string | null
  messages: ChatMessageItem[]
  currentStep: number
  resultsShown: boolean
  activeResultTab: ResultTab
  checkedEvidence: string[]
  onStartAnalysis: (files: File[]) => void
  onResetUpload: () => void
  onToggleClause: (clauseId: string | null) => void
  onPickOption: (ko: string, en: string) => void
  onShowResults: () => void
  onResultTabChange: (tab: ResultTab) => void
  onToggleEvidence: (id: string) => void
}

const panelMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease: 'easeOut' as const },
}

function ContractFlow({
  uploadState,
  contractResult,
  contractProgress,
  uploadError,
  openClause,
  messages,
  currentStep,
  resultsShown,
  activeResultTab,
  checkedEvidence,
  onStartAnalysis,
  onResetUpload,
  onToggleClause,
  onPickOption,
  onShowResults,
  onResultTabChange,
  onToggleEvidence,
}: ContractFlowProps) {
  const [documentFiles, setDocumentFiles] = useState<File[]>([])
  const uploadReady = documentFiles.length > 0

  const resetUpload = () => {
    setDocumentFiles([])
    onResetUpload()
  }

  const startAnalysis = () => {
    if (!uploadReady) return
    onStartAnalysis(documentFiles)
  }

  return (
    <>
      <ChatMessage
        who="bot"
        ko="근로계약서와 급여명세서를 업로드해주세요. 한 개의 PDF로 합치거나 여러 파일로 올려도 됩니다."
        en="Please upload your labor contract and pay slip. You can combine them into one PDF or upload multiple files."
      />
      {uploadState === 'idle' && (
        <motion.section className="upload-panel" {...panelMotion}>
          <DocumentUpload files={documentFiles} onChange={setDocumentFiles} />
          <p className="upload-requirement" aria-live="polite">
            {uploadReady
              ? `${documentFiles.length}개 파일이 준비되었습니다. / ${documentFiles.length} file(s) ready.`
              : '통합 PDF 한 개 또는 문서 사진 여러 장을 올려주세요. / Upload one combined PDF or multiple document images.'}
          </p>
          <motion.button
            className="primary-button"
            disabled={!uploadReady}
            onClick={startAnalysis}
            whileHover={uploadReady ? { y: -2 } : undefined}
            whileTap={uploadReady ? { scale: 0.97 } : undefined}
          >
            두 문서 비교 시작 / Compare Documents
          </motion.button>
        </motion.section>
      )}
      {uploadState === 'processing' && (
        <AnalysisProgress job={contractProgress} />
      )}
      {uploadState === 'error' && (
        <>
          {contractProgress && <AnalysisProgress job={contractProgress} />}
          <motion.section className="error-panel" role="alert" {...panelMotion}>
            <strong>문서 비교에 실패했습니다. / Comparison failed</strong>
            <p>{uploadError}</p>
            <button className="secondary-button" onClick={resetUpload}>다른 파일 선택 / Choose other files</button>
          </motion.section>
        </>
      )}
      {uploadState === 'done' && (
        <>
          {contractResult ? (
            <ContractAnalysisResult
              result={contractResult}
              openClause={openClause}
              onToggleClause={onToggleClause}
            />
          ) : (
            <DemoDiagnosis openClause={openClause} onToggleClause={onToggleClause} />
          )}
          <QuestionFlow
            messages={messages}
            currentStep={currentStep}
            resultsShown={resultsShown}
            onPickOption={onPickOption}
            onShowResults={onShowResults}
          />
          <ResultsPanel
            visible={resultsShown}
            activeTab={activeResultTab}
            checkedEvidence={checkedEvidence}
            onTabChange={onResultTabChange}
            onToggleEvidence={onToggleEvidence}
          />
        </>
      )}
    </>
  )
}

type DocumentUploadProps = {
  files: File[]
  onChange: (files: File[]) => void
}

function DocumentUpload({ files, onChange }: DocumentUploadProps) {
  return (
    <div className={files.length > 0 ? 'document-upload complete' : 'document-upload'}>
      <span className="document-number" aria-hidden="true">{files.length > 0 ? '✓' : '＋'}</span>
      <strong>근로계약서·급여명세서 업로드</strong>
      <small>한 개의 통합 PDF 또는 여러 JPG, PNG, PDF</small>
      {files.length > 0 && (
        <ul className="selected-files" aria-label="선택한 문서 파일">
          {files.map((file) => <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>)}
        </ul>
      )}
      <label className="secondary-button document-picker" htmlFor="employment-documents">
        {files.length > 0 ? '파일 다시 선택 / Replace' : '파일 선택 / Choose files'}
      </label>
      <input
        className="sr-only"
        id="employment-documents"
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        multiple
        onChange={(event) => onChange(Array.from(event.target.files ?? []))}
      />
    </div>
  )
}

const progressSteps: Array<{
  stage: Exclude<ContractAnalysisStage, 'COMPLETED'>
  ko: string
  en: string
}> = [
  { stage: 'OCR', ko: '문서 글자 읽기', en: 'Reading document' },
  { stage: 'STRUCTURING', ko: '문서 정보 정리', en: 'Organizing document details' },
  { stage: 'GENERATING_RESPONSE', ko: '문제점과 대응 방법 만들기', en: 'Preparing guidance' },
]

function AnalysisProgress({ job }: { job: ContractAnalysisJob | null }) {
  const currentStage = job?.stage === 'COMPLETED' ? null : (job?.stage ?? 'OCR')
  const currentIndex = currentStage
    ? progressSteps.findIndex((step) => step.stage === currentStage)
    : progressSteps.length

  return (
    <motion.section className="processing-panel analysis-progress" aria-live="polite" {...panelMotion}>
      <strong>계약서와 급여명세서를 비교하고 있습니다 / Comparing your documents</strong>
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

type DiagnosisProps = {
  openClause: string | null
  onToggleClause: (clauseId: string | null) => void
}

type ClauseItemProps = {
  id: string
  status: string
  statusLabel: string
  title: string
  subtitle: string
  open: boolean
  onToggle: () => void
  details: Array<{ label: string; value: string }>
}

function ClauseItem({ status, statusLabel, title, subtitle, open, onToggle, details }: ClauseItemProps) {
  return (
    <motion.button className={`clause ${status}`} onClick={onToggle} aria-expanded={open} layout>
      <div className="clause-heading">
        <div>
          <span className={`status ${status}`}>{statusLabel}</span>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <motion.span className="chevron" animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>⌄</motion.span>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="clause-details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {details.map((detail) => (
              <Fragment key={detail.label}>
                <strong>{detail.label}</strong>
                <p>{detail.value}</p>
              </Fragment>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

function ContractAnalysisResult({
  result,
  openClause,
  onToggleClause,
}: DiagnosisProps & { result: ContractAnalysisResponse }) {
  const { facts, violations, unverified_fields: unverifiedFields } = result.diagnosis
  const factItems = [
    ['주당 근로시간', `${facts.weekly_working_hours}시간`],
    ['하루 근로시간', `${facts.daily_working_hours}시간`],
    ['월 급여', `${facts.monthly_wage.toLocaleString('ko-KR')}원`],
    ['계산 시급', `${facts.hourly_wage.toLocaleString('ko-KR')}원`],
    ['계약 기간', `${facts.contract_period_months}개월`],
    ['숙식비 공제', `${facts.accommodation_deduction_krw.toLocaleString('ko-KR')}원`],
  ]

  return (
    <>
      <motion.section className="result-panel agent-result" {...panelMotion}>
        <span className="result-eyebrow">AI AGENT RESPONSE</span>
        <h2>{result.analysis.summary || '계약서 분석 결과'}</h2>
        <p className="agent-answer">{result.answer}</p>
        {result.analysis.findings.length > 0 && (
          <div className="agent-section">
            <h3>주요 발견사항</h3>
            {result.analysis.findings.map((finding, index) => (
              <article className="agent-finding" key={`${finding.title}-${index}`}>
                <strong>{finding.title}</strong>
                <p>{finding.description}</p>
              </article>
            ))}
          </div>
        )}
        {result.analysis.nextActions.length > 0 && (
          <div className="agent-section">
            <h3>다음 행동</h3>
            <ol className="next-actions">
              {result.analysis.nextActions.map((action, index) => <li key={`${action}-${index}`}>{action}</li>)}
            </ol>
          </div>
        )}
      </motion.section>

      <motion.section className="result-panel diagnosis" {...panelMotion}>
        <h2>계약서 진단 리포트 / Diagnosis Report</h2>
        <div className="fact-grid">
          {factItems.map(([label, value]) => (
            <div key={label}><span>{label}</span><strong>{value}</strong></div>
          ))}
        </div>
        <div className="legend">
          <span className="warn">● 확인 필요</span>
          <span className="danger">● 주의 필요</span>
        </div>
        {violations.length === 0 ? (
          <p className="empty-result">확인된 규칙 위반 항목이 없습니다.</p>
        ) : violations.map((violation, index) => {
          const id = `${violation.rule_id}-${index}`
          const open = openClause === id
          const status = violation.severity === 'warning' ? 'danger' : 'warn'
          return (
            <ClauseItem
              key={id}
              id={id}
              status={status}
              statusLabel={status === 'danger' ? '주의 필요 / Warning' : '확인 필요 / Review'}
              title={violation.message}
              subtitle={`${violation.law_name} ${violation.article}`}
              open={open}
              onToggle={() => onToggleClause(open ? null : id)}
              details={[
                { label: '진단 코드 / Check ID', value: violation.rule_id },
                { label: '관련 법적 근거 / Legal basis', value: `${violation.law_name} ${violation.article}` },
              ]}
            />
          )
        })}
        {unverifiedFields.length > 0 && (
          <p className="unverified-fields">
            OCR 원문에서 확인하지 못한 항목: {unverifiedFields.join(', ')}
          </p>
        )}
      </motion.section>
    </>
  )
}

function DemoDiagnosis({ openClause, onToggleClause }: DiagnosisProps) {
  return (
    <motion.section className="result-panel diagnosis" {...panelMotion}>
      <h2>데모 진단 리포트 / Demo Diagnosis Report</h2>
      <div className="legend">
        <span className="ok">● 문제없음 / OK</span>
        <span className="warn">● 확인 필요</span>
        <span className="danger">● 주의 필요</span>
      </div>
      {contractClauses.map((clause) => {
        const open = openClause === clause.id
        return (
          <ClauseItem
            key={clause.id}
            id={clause.id}
            status={clause.status}
            statusLabel={clause.label}
            title={clause.title}
            subtitle={clause.en}
            open={open}
            onToggle={() => onToggleClause(open ? null : clause.id)}
            details={[
              { label: '원문 / Original', value: clause.original },
              { label: '설명 / Explanation (EN)', value: clause.explanation },
              { label: '관련 법적 근거 / Legal basis', value: clause.legal },
            ]}
          />
        )
      })}
    </motion.section>
  )
}

export default ContractFlow
