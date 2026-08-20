import { AnimatePresence } from 'framer-motion'
import type { ContractAnalysisJob, ContractAnalysisResponse } from '../../api/contracts'
import type { FlowState, UploadState } from '../../types/chatbot'
import AgencyPanel from './AgencyPanel'
import AnalysisProgress from './AnalysisProgress'
import ComplaintDraftPanel from './ComplaintDraftPanel'
import CompletedPanel from './CompletedPanel'
import DraftReadyPanel from './DraftReadyPanel'
import ReviewPanel from './ReviewPanel'
import UploadPanel from './UploadPanel'
import { confirmQuestions, issueLabels } from '../../mocks/chatbot'

type ContractFlowProps = {
  state: FlowState
  contractResult: ContractAnalysisResponse | null
  contractProgress: ContractAnalysisJob | null
  uploadError: string | null
  documentFiles: File[]
  openItem: string | null
  answers: Record<string, string>
  checkedEvidence: string[]
  draftValues: Record<string, string>
  draftDownloaded: boolean
  documentState: UploadState
  documentError: string | null
  issue: keyof typeof issueLabels
  onDocumentFilesChange: (files: File[]) => void
  onStartAnalysis: (files: File[]) => void
  onToggleItem: (itemId: string | null) => void
  onAnswer: (id: string, answer: string) => void
  onToggleEvidence: (id: string) => void
  onDraftChange: (key: string, value: string) => void
  onGoTo: (state: FlowState) => void
  onDownloadDraft: () => void
  onRestart: () => void
}

function ContractFlow({
  state, contractResult, contractProgress, uploadError, documentFiles, openItem,
  answers, checkedEvidence, draftValues, draftDownloaded, documentState, documentError,
  issue, onDocumentFilesChange, onStartAnalysis, onToggleItem, onAnswer, onToggleEvidence,
  onDraftChange, onGoTo, onDownloadDraft, onRestart,
}: ContractFlowProps) {
  return (
    <div className="app-body">
      <section className="stage-area" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {state === 'UPLOAD' && <UploadPanel key="upload" files={documentFiles} error={uploadError} onFilesChange={onDocumentFilesChange} onStart={onStartAnalysis} />}
          {state === 'ANALYZING' && <AnalysisProgress key="analyzing" job={contractProgress} />}
          {(state === 'REVIEW' || state === 'REVIEW_UPDATING') && (
            <ReviewPanel key="review" result={contractResult} updating={state === 'REVIEW_UPDATING'} openItem={openItem} answers={answers} checkedEvidence={checkedEvidence} onToggleItem={onToggleItem} onAnswer={onAnswer} onToggleEvidence={onToggleEvidence} onStartDraft={() => onGoTo('DRAFTING')} onSkipToAgency={() => onGoTo('AGENCY')} />
          )}
          {state === 'DRAFTING' && <ComplaintDraftPanel key="drafting" values={draftValues} onChange={onDraftChange} onReady={() => onGoTo('DRAFT_READY')} onBack={() => onGoTo('REVIEW')} />}
          {state === 'DRAFT_READY' && <DraftReadyPanel key="draft-ready" values={draftValues} preparing={documentState === 'processing'} error={documentError} onDownload={onDownloadDraft} onNext={() => onGoTo('AGENCY')} onEdit={() => onGoTo('DRAFTING')} />}
          {state === 'AGENCY' && <AgencyPanel key="agency" issue={issue} onFinish={() => onGoTo('COMPLETED')} onBack={() => onGoTo('REVIEW')} />}
          {state === 'COMPLETED' && <CompletedPanel key="completed" answered={confirmQuestions.filter((question) => answers[question.id]).length} totalQuestions={confirmQuestions.length} draftDownloaded={draftDownloaded} onRestart={onRestart} />}
        </AnimatePresence>
      </section>
    </div>
  )
}

export default ContractFlow
