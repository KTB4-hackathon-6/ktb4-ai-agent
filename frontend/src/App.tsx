import { useEffect, useRef, useState } from 'react'
import { analyzeDocument, OcrApiError, type OcrAnalysisResponse } from './api/ocr'
import AdminFlow from './components/chatbot/AdminFlow'
import AgencyFlow from './components/chatbot/AgencyFlow'
import ChatComposer from './components/chatbot/ChatComposer'
import ContractFlow from './components/chatbot/ContractFlow'
import ChatHeader from './components/chatbot/ChatHeader'
import ChatMessage, { type ChatMessageItem } from './components/chatbot/ChatMessage'
import LanguageSelector from './components/chatbot/LanguageSelector'
import { type ResultTab } from './components/chatbot/ResultsPanel'
import ServiceMenu from './components/chatbot/ServiceMenu'
import WorkCheckFlow from './components/chatbot/WorkCheckFlow'
import {
  chatScript,
  type ServiceView,
} from './mocks/chatbot'
import type { UploadState } from './types/chatbot'
import './App.css'

type View = ServiceView | null

function App() {
  const [language, setLanguage] = useState('vi')
  const [languageChosen, setLanguageChosen] = useState(false)
  const [view, setView] = useState<View>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [ocrResult, setOcrResult] = useState<OcrAnalysisResponse | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [adminState, setAdminState] = useState<UploadState>('idle')
  const [openClause, setOpenClause] = useState<string | null>(null)
  const [chatStep, setChatStep] = useState(0)
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([
    { who: 'bot', ko: chatScript[0].ko, en: chatScript[0].en },
  ])
  const [resultsShown, setResultsShown] = useState(false)
  const [resultTab, setResultTab] = useState<ResultTab>('letter')
  const [checkedEvidence, setCheckedEvidence] = useState<string[]>([])
  const [consent, setConsent] = useState(false)
  const [freeText, setFreeText] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [view, uploadState, adminState, chatMessages, resultsShown])

  const selectView = (nextView: ServiceView) => {
    setView(nextView)
    if (nextView === 'contract') {
      setUploadState('idle')
      setOcrResult(null)
      setUploadError(null)
    }
    if (nextView === 'admin') setAdminState('idle')
  }

  const runContractAnalysis = async (file?: File) => {
    setUploadState('processing')
    setOcrResult(null)
    setUploadError(null)

    if (!file) {
      window.setTimeout(() => setUploadState('done'), 1100)
      return
    }

    try {
		const result = await analyzeDocument(file)
      setOcrResult(result)
      setUploadState('done')
    } catch (error) {
      setUploadError(error instanceof OcrApiError ? error.message : '문서를 인식하지 못했습니다. 다시 시도해주세요.')
      setUploadState('error')
    }
  }

  const runAdminDemoAnalysis = () => {
    setAdminState('processing')
    window.setTimeout(() => setAdminState('done'), 1100)
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

  const analysisDone = uploadState === 'done' || adminState === 'done'
  const pipelineDone = [true, view !== null, analysisDone, chatStep === chatScript.length - 1, resultsShown, view === 'agencies']
  return (
    <main className="app-shell">
      <ChatHeader completedSteps={pipelineDone} />

      <section className="chat" aria-live="polite">
        <ChatMessage who="bot" ko="안녕하세요! 먼저 언어를 선택해주세요." en="Hi! Please choose your language first." />
        <LanguageSelector
          selectedLanguage={language}
          onSelect={(selectedLanguage) => {
            setLanguage(selectedLanguage)
            setLanguageChosen(true)
          }}
        />

        {languageChosen && (
          <>
            <ChatMessage who="bot" ko="무엇을 도와드릴까요? 아래에서 선택해주세요." en="What can I help you with? Pick an option below." />
            <ServiceMenu onSelect={selectView} />
          </>
        )}

        {view === 'work' && (
          <WorkCheckFlow
            messages={chatMessages}
            currentStep={chatStep}
            resultsShown={resultsShown}
            activeResultTab={resultTab}
            checkedEvidence={checkedEvidence}
            onPickOption={pickChatOption}
            onShowResults={() => setResultsShown(true)}
            onResultTabChange={setResultTab}
            onToggleEvidence={(id) => setCheckedEvidence((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])}
            onConnect={() => selectView('agencies')}
          />
        )}

        {view === 'contract' && (
          <ContractFlow
            uploadState={uploadState}
            ocrResult={ocrResult}
            uploadError={uploadError}
            openClause={openClause}
            messages={chatMessages}
            currentStep={chatStep}
            resultsShown={resultsShown}
            activeResultTab={resultTab}
            checkedEvidence={checkedEvidence}
            onStartAnalysis={runContractAnalysis}
            onResetUpload={() => {
              setUploadState('idle')
              setUploadError(null)
            }}
            onToggleClause={setOpenClause}
            onPickOption={pickChatOption}
            onShowResults={() => setResultsShown(true)}
            onResultTabChange={setResultTab}
            onToggleEvidence={(id) => setCheckedEvidence((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])}
            onConnect={() => selectView('agencies')}
          />
        )}

        {view === 'admin' && (
          <AdminFlow
            state={adminState}
            onStartAnalysis={runAdminDemoAnalysis}
            onConnect={() => selectView('agencies')}
          />
        )}

        {view === 'agencies' && <AgencyFlow consent={consent} onConsentChange={setConsent} />}
        <div ref={chatEndRef} />
      </section>

      <ChatComposer value={freeText} onChange={setFreeText} onSubmit={sendFreeText} />
    </main>
  )
}

export default App
