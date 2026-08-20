import { AnimatePresence } from 'framer-motion'
import type {
  ContractAnalysisJob,
  ContractAnalysisResponse,
  DocumentPreparationResponse,
  GuidanceResponse,
} from '../../api/contracts'
import type { ComplaintChatMessage, FlowState, UploadState } from '../../types/chatbot'
import AgencyPanel from './AgencyPanel'
import AnalysisProgress from './AnalysisProgress'
import ComplaintDraftPanel from './ComplaintDraftPanel'
import CompletedPanel from './CompletedPanel'
import DraftReadyPanel from './DraftReadyPanel'
import ReviewPanel from './ReviewPanel'
import UploadPanel from './UploadPanel'
import { issueLabels } from '../../config/chatbot'

type ContractFlowProps = {
  state: FlowState
  contractResult: ContractAnalysisResponse | null
  contractProgress: ContractAnalysisJob | null
  uploadError: string | null
  documentFiles: File[]
  openItem: string | null
  documentPreparation: DocumentPreparationResponse | null
  complaintMessages: ComplaintChatMessage[]
  draftDownloaded: boolean
  documentState: UploadState
  documentError: string | null
  guidance: GuidanceResponse | null
  guidanceLoading: boolean
  guidanceError: string | null
  chatValue: string
  issue: keyof typeof issueLabels
  onDocumentFilesChange: (files: File[]) => void
  onStartAnalysis: (files: File[]) => void
  onToggleItem: (itemId: string | null) => void
  onStartDraft: () => void
  onSubmitComplaint: (content: string) => void
  onChatChange: (content: string) => void
  onChatSubmit: () => void
  onGoTo: (state: FlowState) => void
  onDownloadDraft: () => void
  onRestart: () => void
}

function ContractFlow({
  state, contractResult, contractProgress, uploadError, documentFiles, openItem,
  documentPreparation, complaintMessages, draftDownloaded, documentState, documentError,
  guidance, guidanceLoading, guidanceError, chatValue,
  issue, onDocumentFilesChange, onStartAnalysis, onToggleItem,
  onStartDraft, onSubmitComplaint, onChatChange, onChatSubmit, onGoTo, onDownloadDraft, onRestart,
}: ContractFlowProps) {
  return (
    <div className="app-body">
      <section className="stage-area" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {state === 'UPLOAD' && (
            <UploadPanel
              key="upload"
              files={documentFiles}
              error={uploadError}
              onFilesChange={onDocumentFilesChange}
              onStart={onStartAnalysis}
            />
          )}
          {state === 'ANALYZING' && <AnalysisProgress key="analyzing" job={contractProgress} />}
          {state === 'REVIEW' && (
            <ReviewPanel key="review" result={contractResult} openItem={openItem} onToggleItem={onToggleItem} onStartDraft={onStartDraft} onSkipToAgency={() => onGoTo('AGENCY')} />
          )}
          {state === 'DRAFTING' && (
            <ComplaintDraftPanel
              key="drafting"
              preparation={documentPreparation}
              messages={complaintMessages}
              preparing={documentState === 'processing'}
              error={documentError}
              inputValue={chatValue}
              onReply={onSubmitComplaint}
              onInputChange={onChatChange}
              onInputSubmit={onChatSubmit}
              onReady={() => onGoTo('DRAFT_READY')}
              onBack={() => onGoTo('REVIEW')}
            />
          )}
          {state === 'DRAFT_READY' && documentPreparation && (
            <DraftReadyPanel
              key="draft-ready"
              preparation={documentPreparation}
              downloaded={draftDownloaded}
              onDownload={onDownloadDraft}
              onNext={() => onGoTo('AGENCY')}
              onBackToConversation={() => onGoTo('DRAFTING')}
            />
          )}
          {state === 'AGENCY' && (
            <AgencyPanel
              key="agency"
              issue={issue}
              guidance={guidance}
              loading={guidanceLoading}
              error={guidanceError}
              onFinish={() => onGoTo('COMPLETED')}
              onBack={() => onGoTo('REVIEW')}
            />
          )}
          {state === 'COMPLETED' && <CompletedPanel key="completed" draftDownloaded={draftDownloaded} onRestart={onRestart} />}
        </AnimatePresence>
      </section>
    </div>
  )
}

export default ContractFlow
