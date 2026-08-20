import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  analyzeContract,
  ContractApiError,
  downloadGeneratedDocument,
  prepareLaborComplaint,
  requestSubmissionGuidance,
  type ContractAnalysisJob,
  type ContractAnalysisResponse,
  type DocumentPreparationResponse,
  type GuidanceResponse,
} from './api/contracts'
import ChatHeader from './components/chatbot/ChatHeader'
import ContractFlow from './components/chatbot/ContractFlow'
import { normalizeLanguage } from './i18n'
import { detectReviewIssue } from './review/presentation'
import type { ComplaintChatMessage, FlowState, UploadState } from './types/chatbot'
import './App.css'

function App() {
  const { t, i18n } = useTranslation()
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)
  const [flowState, setFlowState] = useState<FlowState>('UPLOAD')
  const [contractResult, setContractResult] = useState<ContractAnalysisResponse | null>(null)
  const [contractProgress, setContractProgress] = useState<ContractAnalysisJob | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [documentPreparation, setDocumentPreparation] = useState<DocumentPreparationResponse | null>(null)
  const [documentState, setDocumentState] = useState<UploadState>('idle')
  const [documentError, setDocumentError] = useState<string | null>(null)
  const [documentFiles, setDocumentFiles] = useState<File[]>([])
  const [complaintMessages, setComplaintMessages] = useState<ComplaintChatMessage[]>([])
  const [draftDownloaded, setDraftDownloaded] = useState(false)
  const [freeText, setFreeText] = useState('')
  const [guidance, setGuidance] = useState<GuidanceResponse | null>(null)
  const [guidanceLoading, setGuidanceLoading] = useState(false)
  const [guidanceError, setGuidanceError] = useState<string | null>(null)
  const analysisAbortRef = useRef<AbortController | null>(null)
  const complaintAbortRef = useRef<AbortController | null>(null)
  const guidanceAbortRef = useRef<AbortController | null>(null)

  useEffect(() => () => {
    analysisAbortRef.current?.abort()
    complaintAbortRef.current?.abort()
    guidanceAbortRef.current?.abort()
  }, [])

  const runContractAnalysis = async (files: File[]) => {
    analysisAbortRef.current?.abort()
    setFlowState('ANALYZING')
    setContractResult(null)
    setContractProgress(null)
    setUploadError(null)
    setDocumentPreparation(null)
    setDocumentState('idle')
    setDocumentError(null)

    const abortController = new AbortController()
    analysisAbortRef.current = abortController
    try {
      const result = await analyzeContract(
        files,
        t('app.analysis.requestPrompt'),
        language,
        setContractProgress,
        abortController.signal,
      )
      setContractResult(result)
      setFlowState('REVIEW')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setUploadError(error instanceof ContractApiError ? error.message : t('app.analysis.compareFailed'))
      setFlowState('UPLOAD')
    } finally {
      if (analysisAbortRef.current === abortController) analysisAbortRef.current = null
    }
  }

  const runComplaintTurn = async (content: string, includeUserMessage: boolean) => {
    if (!contractResult || documentState === 'processing') return
    complaintAbortRef.current?.abort()
    const abortController = new AbortController()
    complaintAbortRef.current = abortController
    setDocumentState('processing')
    setDocumentError(null)
    if (includeUserMessage) {
      setComplaintMessages((messages) => [...messages, {
        id: crypto.randomUUID(),
        role: 'user',
        content,
      }])
    }

    try {
      const preparation = await prepareLaborComplaint(
        contractResult.sessionId,
        content,
        language,
        abortController.signal,
      )
      setDocumentPreparation(preparation)
      setComplaintMessages((messages) => [...messages, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: preparation.answer,
      }])
      const ready = preparation.documentDrafts[0]?.status === 'READY'
      setDocumentState(ready ? 'done' : 'idle')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setDocumentError(error instanceof ContractApiError ? error.message : t('app.complaint.createFailed'))
      setDocumentState('error')
    } finally {
      if (complaintAbortRef.current === abortController) complaintAbortRef.current = null
    }
  }

  const startComplaintDraft = () => {
    complaintAbortRef.current?.abort()
    setFlowState('DRAFTING')
    setDocumentPreparation(null)
    setDocumentState('idle')
    setDocumentError(null)
    setComplaintMessages([])
    setDraftDownloaded(false)
    void runComplaintTurn(t('app.complaint.startPrompt'), false)
  }

  const downloadDraft = () => {
    if (!documentPreparation) return
    downloadGeneratedDocument(documentPreparation.document)
    setDraftDownloaded(true)
  }

  const runSubmissionGuidance = async () => {
    if (!contractResult) return
    guidanceAbortRef.current?.abort()
    const abortController = new AbortController()
    guidanceAbortRef.current = abortController
    setGuidance(null)
    setGuidanceLoading(true)
    setGuidanceError(null)

    try {
      const result = await requestSubmissionGuidance(
        contractResult.sessionId,
        t('agency.heading'),
        language,
        abortController.signal,
      )
      setGuidance(result)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setGuidanceError(error instanceof ContractApiError ? error.message : t('api.error.invalidResponse'))
    } finally {
      if (guidanceAbortRef.current === abortController) {
        guidanceAbortRef.current = null
        setGuidanceLoading(false)
      }
    }
  }

  const goTo = (nextState: FlowState) => {
    setFlowState(nextState)
    if (nextState !== 'AGENCY') {
      guidanceAbortRef.current?.abort()
      setGuidanceLoading(false)
      return
    }
    if (contractResult) {
      void runSubmissionGuidance()
      return
    }
    guidanceAbortRef.current?.abort()
    setGuidance(null)
    setGuidanceLoading(false)
    setGuidanceError(null)
  }

  const restart = () => {
    analysisAbortRef.current?.abort()
    complaintAbortRef.current?.abort()
    guidanceAbortRef.current?.abort()
    setFlowState('UPLOAD')
    setContractResult(null)
    setContractProgress(null)
    setUploadError(null)
    setDocumentPreparation(null)
    setDocumentState('idle')
    setDocumentError(null)
    setDocumentFiles([])
    setComplaintMessages([])
    setDraftDownloaded(false)
    setFreeText('')
    setGuidance(null)
    setGuidanceLoading(false)
    setGuidanceError(null)
  }

  const sendFreeText = () => {
    const value = freeText.trim()
    if (!value || flowState !== 'DRAFTING' || documentState === 'processing') return
    setFreeText('')
    void runComplaintTurn(value, true)
  }

  return (
    <main className="app-shell">
      <ChatHeader
        language={language}
        state={flowState}
        onLanguageChange={(code) => void i18n.changeLanguage(code)}
      />

      <div className="workspace-stack">
        <ContractFlow
          state={flowState}
          contractResult={contractResult}
          contractProgress={contractProgress}
          uploadError={uploadError}
          documentFiles={documentFiles}
          documentPreparation={documentPreparation}
          complaintMessages={complaintMessages}
          draftDownloaded={draftDownloaded}
          documentState={documentState}
          documentError={documentError}
          guidance={guidance}
          guidanceLoading={guidanceLoading}
          guidanceError={guidanceError}
          chatValue={freeText}
          issue={detectReviewIssue(contractResult)}
          onDocumentFilesChange={setDocumentFiles}
          onStartAnalysis={runContractAnalysis}
          onStartDraft={startComplaintDraft}
          onSubmitComplaint={(content) => void runComplaintTurn(content, true)}
          onChatChange={setFreeText}
          onChatSubmit={sendFreeText}
          onGoTo={goTo}
          onDownloadDraft={downloadDraft}
          onRestart={restart}
        />

      </div>
    </main>
  )
}

export default App
