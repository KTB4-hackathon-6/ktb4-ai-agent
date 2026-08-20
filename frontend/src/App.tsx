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
import { complaintGroups, languages, reviewItems } from './mocks/chatbot'
import type { FlowState, PreferredLanguage, UploadState } from './types/chatbot'
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

function initialDraftValues(): Record<string, string> {
  return Object.fromEntries(complaintGroups.flatMap((group) => group.rows.map((row) => [row.key, row.value])))
}

function detectIssue() {
  const attention = reviewItems.filter((item) => item.status !== 'ok')
  return attention.some((item) => ['job', 'place'].includes(item.id)) ? 'condition' : 'wage'
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
  const [openItem, setOpenItem] = useState<string | null>('holiday')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [checkedEvidence, setCheckedEvidence] = useState<string[]>([])
  const [draftValues, setDraftValues] = useState<Record<string, string>>(initialDraftValues)
  const [draftDownloaded, setDraftDownloaded] = useState(false)
  const [freeText, setFreeText] = useState('')
  const analysisAbortRef = useRef<AbortController | null>(null)
  const updateTimerRef = useRef<number | null>(null)

  useEffect(() => () => {
    analysisAbortRef.current?.abort()
    if (updateTimerRef.current) window.clearTimeout(updateTimerRef.current)
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

  const answerQuestion = (id: string, answer: string) => {
    setAnswers((previous) => {
      const next = { ...previous }
      if (answer) next[id] = answer
      else delete next[id]
      return next
    })
    if (!answer) return
    setFlowState('REVIEW_UPDATING')
    if (updateTimerRef.current) window.clearTimeout(updateTimerRef.current)
    updateTimerRef.current = window.setTimeout(() => {
      updateTimerRef.current = null
      setFlowState('REVIEW')
    }, 600)
  }

  const downloadDraft = async () => {
    if (!contractResult) return
    setDocumentState('processing')
    setDocumentError(null)
    try {
      const preparation = documentPreparation ?? await prepareLaborComplaint(
        contractResult.sessionId,
        '진정서 작성을 시작해줘',
        language,
      )
      setDocumentPreparation(preparation)
      downloadGeneratedDocument(preparation.document)
      setDocumentState('done')
      setDraftDownloaded(true)
    } catch (error) {
      setDocumentError(error instanceof ContractApiError ? error.message : '진정서를 만들지 못했습니다. 다시 시도해주세요.')
      setDocumentState('error')
    }
  }

  const restart = () => {
    analysisAbortRef.current?.abort()
    setFlowState('UPLOAD')
    setContractResult(null)
    setContractProgress(null)
    setUploadError(null)
    setDocumentPreparation(null)
    setDocumentState('idle')
    setDocumentError(null)
    setDocumentFiles([])
    setOpenItem('holiday')
    setAnswers({})
    setCheckedEvidence([])
    setDraftValues(initialDraftValues())
    setDraftDownloaded(false)
    setFreeText('')
  }

  const sendFreeText = () => {
    const value = freeText.trim()
    if (!value) return
    setFreeText('')
    setDraftValues((previous) => ({
      ...previous,
      contractGap: [previous.contractGap, value].filter(Boolean).join('\n'),
    }))
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
          answers={answers}
          checkedEvidence={checkedEvidence}
          draftValues={draftValues}
          draftDownloaded={draftDownloaded}
          documentState={documentState}
          documentError={documentError}
          issue={detectIssue()}
          onDocumentFilesChange={setDocumentFiles}
          onStartAnalysis={runContractAnalysis}
          onToggleItem={setOpenItem}
          onAnswer={answerQuestion}
          onToggleEvidence={(id) => setCheckedEvidence((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])}
          onDraftChange={(key, value) => setDraftValues((previous) => ({ ...previous, [key]: value }))}
          onGoTo={setFlowState}
          onDownloadDraft={downloadDraft}
          onRestart={restart}
        />

        <ChatComposer state={flowState} value={freeText} onChange={setFreeText} onSubmit={sendFreeText} />
      </div>
    </main>
  )
}

export default App
