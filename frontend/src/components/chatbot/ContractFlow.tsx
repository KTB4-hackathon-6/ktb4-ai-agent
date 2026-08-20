import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type {
  ContractAnalysisJob,
  ContractAnalysisResponse,
  DocumentPreparationResponse,
} from '../../api/contracts'
import {
  exportRedactedFiles,
  prepareRedactionPages,
  releaseRedactionPages,
} from '../../redaction/document'
import type { RedactionPage } from '../../redaction/types'
import type { ComplaintChatMessage, FlowState, UploadState } from '../../types/chatbot'
import AgencyPanel from './AgencyPanel'
import AnalysisProgress from './AnalysisProgress'
import ComplaintDraftPanel from './ComplaintDraftPanel'
import CompletedPanel from './CompletedPanel'
import DraftReadyPanel from './DraftReadyPanel'
import ReviewPanel from './ReviewPanel'
import RedactionReview from './RedactionReview'
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
  documentPreparation, complaintMessages, draftDownloaded, documentState, documentError, chatValue,
  issue, onDocumentFilesChange, onStartAnalysis, onToggleItem,
  onStartDraft, onSubmitComplaint, onChatChange, onChatSubmit, onGoTo, onDownloadDraft, onRestart,
}: ContractFlowProps) {
  const { t } = useTranslation()
  const [redactionStep, setRedactionStep] = useState<'upload' | 'preparing' | 'review' | 'exporting'>('upload')
  const [redactionPages, setRedactionPages] = useState<RedactionPage[]>([])
  const [redactionError, setRedactionError] = useState<string | null>(null)
  const [preparedPageCount, setPreparedPageCount] = useState(0)
  const redactionPagesRef = useRef<RedactionPage[]>([])
  const preparationGenerationRef = useRef(0)

  useEffect(() => {
    redactionPagesRef.current = redactionPages
  }, [redactionPages])

  useEffect(() => () => {
    preparationGenerationRef.current += 1
    releaseRedactionPages(redactionPagesRef.current)
  }, [])

  const startRedaction = async (files: File[]) => {
    if (files.length === 0) return
    const generation = preparationGenerationRef.current + 1
    preparationGenerationRef.current = generation
    setRedactionStep('preparing')
    setRedactionError(null)
    setPreparedPageCount(0)

    try {
      const pages = await prepareRedactionPages(files, ({ completedPages }) => {
        if (preparationGenerationRef.current === generation) setPreparedPageCount(completedPages)
      })
      if (preparationGenerationRef.current !== generation) {
        releaseRedactionPages(pages)
        return
      }
      setRedactionPages(pages)
      setRedactionStep('review')
    } catch (error) {
      if (preparationGenerationRef.current !== generation) return
      setRedactionError(error instanceof Error ? error.message : t('redaction.error.prepare'))
      setRedactionStep('upload')
    }
  }

  const cancelRedaction = () => {
    preparationGenerationRef.current += 1
    releaseRedactionPages(redactionPages)
    setRedactionPages([])
    setRedactionError(null)
    setPreparedPageCount(0)
    setRedactionStep('upload')
    onDocumentFilesChange([])
  }

  const submitRedactedDocuments = async () => {
    setRedactionStep('exporting')
    setRedactionError(null)
    try {
      const files = await exportRedactedFiles(redactionPages)
      releaseRedactionPages(redactionPages)
      setRedactionPages([])
      setRedactionStep('upload')
      onDocumentFilesChange([])
      onStartAnalysis(files)
    } catch (error) {
      setRedactionError(error instanceof Error ? error.message : t('redaction.error.export'))
      setRedactionStep('review')
    }
  }

  return (
    <div className="app-body">
      <section className="stage-area" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {state === 'UPLOAD' && redactionStep === 'upload' && (
            <UploadPanel
              key="upload"
              files={documentFiles}
              error={redactionError ?? uploadError}
              onFilesChange={onDocumentFilesChange}
              onStart={startRedaction}
            />
          )}
          {state === 'UPLOAD' && redactionStep === 'preparing' && (
            <motion.section
              key="redaction-preparing"
              className="panel redaction-preparing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              aria-live="polite"
            >
              <span className="step-spinner" aria-hidden="true" />
              <div>
                <h2>{t('redaction.preparing.heading')}</h2>
                <p>{t('redaction.preparing.description')}</p>
                {preparedPageCount > 0 && <small>{t('redaction.preparing.pages', { count: preparedPageCount })}</small>}
              </div>
              <button className="ghost-button" type="button" onClick={cancelRedaction}>{t('redaction.cancel')}</button>
            </motion.section>
          )}
          {state === 'UPLOAD' && (redactionStep === 'review' || redactionStep === 'exporting') && redactionPages.length > 0 && (
            <RedactionReview
              key="redaction-review"
              pages={redactionPages}
              exporting={redactionStep === 'exporting'}
              error={redactionError}
              onPagesChange={setRedactionPages}
              onCancel={cancelRedaction}
              onSubmit={submitRedactedDocuments}
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
          {state === 'AGENCY' && <AgencyPanel key="agency" issue={issue} onFinish={() => onGoTo('COMPLETED')} onBack={() => onGoTo('REVIEW')} />}
          {state === 'COMPLETED' && <CompletedPanel key="completed" draftDownloaded={draftDownloaded} onRestart={onRestart} />}
        </AnimatePresence>
      </section>
    </div>
  )
}

export default ContractFlow
