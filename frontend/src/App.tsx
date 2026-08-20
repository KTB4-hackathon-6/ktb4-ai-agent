import { useEffect, useRef, useState } from 'react'
import {
  analyzeContract,
  ContractApiError,
  downloadGeneratedDocument,
  prepareLaborComplaint,
  type ContractAnalysisJob,
  type ContractAnalysisResponse,
  type DocumentPreparationResponse,
} from './api/contracts'
import ChatComposer from './components/chatbot/ChatComposer'
import ChatHeader from './components/chatbot/ChatHeader'
import ContractFlow from './components/chatbot/ContractFlow'
import { languages } from './config/chatbot'
import { detectReviewIssue } from './review/presentation'
import type { ComplaintChatMessage, FlowState, PreferredLanguage, UploadState } from './types/chatbot'
import './App.css'

function detectDeviceLanguage(): PreferredLanguage {
  if (typeof navigator === 'undefined') return 'en'
  const supported = languages.map((item) => item.code)
  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const candidate of candidates) {
    const primary = candidate?.toLowerCase().split('-')[0]
    if (primary && supported.includes(primary as PreferredLanguage)) return primary as PreferredLanguage
  }
  return 'en'
}

function App() {
  const [language, setLanguage] = useState<PreferredLanguage>(detectDeviceLanguage)
  const [flowState, setFlowState] = useState<FlowState>('UPLOAD')
  const [contractResult, setContractResult] = useState<ContractAnalysisResponse | null>(null)
  const [contractProgress, setContractProgress] = useState<ContractAnalysisJob | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [documentPreparation, setDocumentPreparation] = useState<DocumentPreparationResponse | null>(null)
  const [documentState, setDocumentState] = useState<UploadState>('idle')
  const [documentError, setDocumentError] = useState<string | null>(null)
  const [documentFiles, setDocumentFiles] = useState<File[]>([])
  const [openItem, setOpenItem] = useState<string | null>(null)
  const [checkedEvidence, setCheckedEvidence] = useState<string[]>([])
  const [complaintMessages, setComplaintMessages] = useState<ComplaintChatMessage[]>([])
  const [draftDownloaded, setDraftDownloaded] = useState(false)
  const [freeText, setFreeText] = useState('')
  const analysisAbortRef = useRef<AbortController | null>(null)
  const complaintAbortRef = useRef<AbortController | null>(null)

  useEffect(() => () => {
    analysisAbortRef.current?.abort()
    complaintAbortRef.current?.abort()
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
        '근로계약서와 급여명세서를 비교해 주의할 점과 대응 방법을 설명해 주세요.',
        language,
        setContractProgress,
        abortController.signal,
      )
      setContractResult(result)
      setFlowState('REVIEW')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setUploadError(error instanceof ContractApiError ? error.message : '문서를 비교하지 못했습니다. 다시 시도해주세요.')
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
      if (ready) setFlowState('DRAFT_READY')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setDocumentError(error instanceof ContractApiError ? error.message : '진정서를 만들지 못했습니다. 다시 시도해주세요.')
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
    void runComplaintTurn('진정서 작성을 시작해줘', false)
  }

  const downloadDraft = () => {
    if (!documentPreparation) return
    downloadGeneratedDocument(documentPreparation.document)
    setDraftDownloaded(true)
  }

  const restart = () => {
    analysisAbortRef.current?.abort()
    complaintAbortRef.current?.abort()
    setFlowState('UPLOAD')
    setContractResult(null)
    setContractProgress(null)
    setUploadError(null)
    setDocumentPreparation(null)
    setDocumentState('idle')
    setDocumentError(null)
    setDocumentFiles([])
    setOpenItem(null)
    setCheckedEvidence([])
    setComplaintMessages([])
    setDraftDownloaded(false)
    setFreeText('')
  }

  const sendFreeText = () => {
    const value = freeText.trim()
    if (!value || flowState !== 'DRAFTING' || documentState === 'processing') return
    setFreeText('')
    void runComplaintTurn(value, true)
  }

  return (
    <main className="app-shell">
      <ChatHeader language={language} state={flowState} onLanguageChange={setLanguage} />

      <div className="workspace-stack">
        <ContractFlow
          state={flowState}
          contractResult={contractResult}
          contractProgress={contractProgress}
          uploadError={uploadError}
          documentFiles={documentFiles}
          openItem={openItem}
          checkedEvidence={checkedEvidence}
          documentPreparation={documentPreparation}
          complaintMessages={complaintMessages}
          draftDownloaded={draftDownloaded}
          documentState={documentState}
          documentError={documentError}
          issue={detectReviewIssue(contractResult)}
          onDocumentFilesChange={setDocumentFiles}
          onStartAnalysis={runContractAnalysis}
          onToggleItem={setOpenItem}
          onToggleEvidence={(id) => setCheckedEvidence((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])}
          onStartDraft={startComplaintDraft}
          onSubmitComplaint={(content) => void runComplaintTurn(content, true)}
          onGoTo={setFlowState}
          onDownloadDraft={downloadDraft}
          onRestart={restart}
        />

        <ChatComposer
          state={flowState}
          value={freeText}
          busy={flowState === 'DRAFTING' && documentState === 'processing'}
          onChange={setFreeText}
          onSubmit={sendFreeText}
        />
      </div>
    </main>
  )
}

export default App
