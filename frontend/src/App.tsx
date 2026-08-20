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
import ContractFlow from './components/chatbot/ContractFlow'
import ChatHeader from './components/chatbot/ChatHeader'
import { type ChatMessageItem } from './components/chatbot/ChatMessage'
import { type ResultTab } from './components/chatbot/ResultsPanel'
import {
  chatScript,
  languages,
} from './mocks/chatbot'
import type { PreferredLanguage, UploadState } from './types/chatbot'
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
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [contractResult, setContractResult] = useState<ContractAnalysisResponse | null>(null)
  const [contractProgress, setContractProgress] = useState<ContractAnalysisJob | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [documentPreparation, setDocumentPreparation] = useState<DocumentPreparationResponse | null>(null)
  const [documentState, setDocumentState] = useState<UploadState>('idle')
  const [documentError, setDocumentError] = useState<string | null>(null)
  const [openClause, setOpenClause] = useState<string | null>(null)
  const [chatStep, setChatStep] = useState(0)
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([
    { who: 'bot', ko: chatScript[0].ko, en: chatScript[0].en },
  ])
  const [resultsShown, setResultsShown] = useState(false)
  const [resultTab, setResultTab] = useState<ResultTab>('letter')
  const [checkedEvidence, setCheckedEvidence] = useState<string[]>([])
  const [freeText, setFreeText] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const analysisAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [uploadState, chatMessages, resultsShown, documentPreparation])

  useEffect(() => () => analysisAbortRef.current?.abort(), [])

  const runContractAnalysis = async (files: File[]) => {
    analysisAbortRef.current?.abort()
    setUploadState('processing')
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
      setUploadState('done')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setUploadError(error instanceof ContractApiError ? error.message : '문서를 비교하지 못했습니다. 다시 시도해주세요.')
      setUploadState('error')
    } finally {
      if (analysisAbortRef.current === abortController) analysisAbortRef.current = null
    }
  }

  const prepareDocument = async (content: string) => {
    if (!contractResult) return
    setDocumentState('processing')
    setDocumentError(null)
    try {
      const result = await prepareLaborComplaint(
        contractResult.sessionId,
        content,
        language,
      )
      setDocumentPreparation(result)
      setDocumentState('done')
    } catch (error) {
      setDocumentError(error instanceof ContractApiError ? error.message : '진정서를 만들지 못했습니다. 다시 시도해주세요.')
      setDocumentState('error')
    }
  }
  const pickChatOption = (ko: string, en: string) => {
    const next = chatStep + 1
    setChatMessages((messages) => [
      ...messages,
      { who: 'user', ko, en },
      ...(chatScript[next] ? [{ who: 'bot' as const, ko: chatScript[next].ko, en: chatScript[next].en }] : []),
    ])
    setChatStep(next)
  }

  const sendFreeText = () => {
    const value = freeText.trim()
    if (!value) return
    setChatMessages((messages) => [...messages, { who: 'user', ko: value, en: '직접 입력 / Free text' }])
    setFreeText('')
  }

  return (
    <main className="app-shell">
      <ChatHeader language={language} onLanguageChange={setLanguage} />

      <section className="chat" aria-live="polite">
        <ContractFlow
          uploadState={uploadState}
          contractResult={contractResult}
          contractProgress={contractProgress}
          uploadError={uploadError}
          openClause={openClause}
          messages={chatMessages}
          currentStep={chatStep}
          resultsShown={resultsShown}
          activeResultTab={resultTab}
          checkedEvidence={checkedEvidence}
          onStartAnalysis={runContractAnalysis}
          onResetUpload={() => {
            analysisAbortRef.current?.abort()
            setUploadState('idle')
            setContractProgress(null)
            setUploadError(null)
          }}
          onToggleClause={setOpenClause}
          onPickOption={pickChatOption}
          onShowResults={() => setResultsShown(true)}
          onResultTabChange={setResultTab}
          onToggleEvidence={(id) => setCheckedEvidence((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])}
          documentPreparation={documentPreparation}
          documentState={documentState}
          documentError={documentError}
          onPrepareDocument={prepareDocument}
          onDownloadDocument={() => {
            if (documentPreparation) downloadGeneratedDocument(documentPreparation.document)
          }}
        />
        <div ref={chatEndRef} />
      </section>

      <ChatComposer value={freeText} onChange={setFreeText} onSubmit={sendFreeText} />
    </main>
  )
}

export default App
