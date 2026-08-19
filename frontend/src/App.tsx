import { useEffect, useRef, useState } from 'react'
import ChatComposer from './components/chatbot/ChatComposer'
import ChatHeader from './components/chatbot/ChatHeader'
import ChatMessage, { type ChatMessageItem } from './components/chatbot/ChatMessage'
import LanguageSelector from './components/chatbot/LanguageSelector'
import QuestionFlow from './components/chatbot/QuestionFlow'
import ResultsPanel, { type ResultTab } from './components/chatbot/ResultsPanel'
import ServiceMenu from './components/chatbot/ServiceMenu'
import {
  adminDocumentItems,
  agencyItems,
  chatScript,
  contractClauses,
  type ServiceView,
} from './mocks/chatbot'
import './App.css'

type View = ServiceView | null
type UploadState = 'idle' | 'processing' | 'done'

function App() {
  const [language, setLanguage] = useState('vi')
  const [languageChosen, setLanguageChosen] = useState(false)
  const [view, setView] = useState<View>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
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
    if (nextView === 'contract') setUploadState('idle')
    if (nextView === 'admin') setAdminState('idle')
  }

  const runDemoAnalysis = (kind: 'contract' | 'admin') => {
    if (kind === 'contract') {
      setUploadState('processing')
      window.setTimeout(() => setUploadState('done'), 1100)
    } else {
      setAdminState('processing')
      window.setTimeout(() => setAdminState('done'), 1100)
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
          <>
            <ChatMessage who="bot" ko="계약서가 없어도 괜찮아요. 실제 근무 상황을 몇 가지 여쭤보고 부당한 부분이 있는지 확인해드릴게요." en="No contract needed. I'll ask a few questions about your actual work situation and check for issues." />
            <QuestionFlow
              messages={chatMessages}
              currentStep={chatStep}
              resultsShown={resultsShown}
              onPickOption={pickChatOption}
              onShowResults={() => setResultsShown(true)}
            />
            <ResultsPanel
              visible={resultsShown}
              activeTab={resultTab}
              checkedEvidence={checkedEvidence}
              onTabChange={setResultTab}
              onToggleEvidence={(id) => setCheckedEvidence((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])}
              onConnect={() => selectView('agencies')}
            />
          </>
        )}

        {view === 'contract' && (
          <>
            <ChatMessage who="bot" ko="좋아요, 근로계약서를 업로드해주세요." en="Great, please upload your labor contract." />
            {uploadState === 'idle' && (
              <section className="upload-panel">
                <label className="upload-target">
                  <span className="upload-icon" aria-hidden="true">＋</span>
                  <strong>근로계약서 사진 업로드</strong><small>Upload contract photo</small>
                  <input type="file" accept="image/*,.pdf" onChange={() => runDemoAnalysis('contract')} />
                </label>
                <button className="primary-button" onClick={() => runDemoAnalysis('contract')}>데모 계약서로 진단 시작 / Start Demo Diagnosis</button>
              </section>
            )}
            {uploadState === 'processing' && <section className="processing-panel"><span className="pulse" /><strong>분석 중입니다... / Analyzing your contract...</strong></section>}
            {uploadState === 'done' && (
              <>
                <section className="result-panel diagnosis">
                  <h2>진단 리포트 / Diagnosis Report</h2>
                  <div className="legend"><span className="ok">● 문제없음 / OK</span><span className="warn">● 확인 필요</span><span className="danger">● 주의 필요</span></div>
                  {contractClauses.map((clause) => {
                    const open = openClause === clause.id
                    return (
                      <button className={`clause ${clause.status}`} key={clause.id} onClick={() => setOpenClause(open ? null : clause.id)} aria-expanded={open}>
                        <div className="clause-heading"><div><span className={`status ${clause.status}`}>{clause.label}</span><h3>{clause.title}</h3><p>{clause.en}</p></div><span className={open ? 'chevron open' : 'chevron'}>⌄</span></div>
                        {open && <div className="clause-details"><strong>원문 / Original</strong><p>{clause.original}</p><strong>설명 / Explanation (EN)</strong><p>{clause.explanation}</p><strong>관련 법적 근거 / Legal basis</strong><p>{clause.legal}</p></div>}
                      </button>
                    )
                  })}
                </section>
                <QuestionFlow
                  messages={chatMessages}
                  currentStep={chatStep}
                  resultsShown={resultsShown}
                  onPickOption={pickChatOption}
                  onShowResults={() => setResultsShown(true)}
                />
                <ResultsPanel
                  visible={resultsShown}
                  activeTab={resultTab}
                  checkedEvidence={checkedEvidence}
                  onTabChange={setResultTab}
                  onToggleEvidence={(id) => setCheckedEvidence((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])}
                  onConnect={() => selectView('agencies')}
                />
              </>
            )}
          </>
        )}

        {view === 'admin' && (
          <>
            <ChatMessage who="bot" ko="행정 문서 사진이나 PDF를 업로드해주세요." en="Please upload a photo or PDF of your admin document." />
            {adminState === 'idle' && (
              <section className="upload-panel">
                <label className="upload-target"><span className="upload-icon" aria-hidden="true">＋</span><strong>행정 문서 사진 업로드</strong><small>Upload admin document</small><input type="file" accept="image/*,.pdf" onChange={() => runDemoAnalysis('admin')} /></label>
                <button className="primary-button" onClick={() => runDemoAnalysis('admin')}>데모 문서로 분석 / Analyze Demo Document</button>
              </section>
            )}
            {adminState === 'processing' && <section className="processing-panel"><span className="pulse" /><strong>문서를 분석하고 있습니다... / Reading your document...</strong></section>}
            {adminState === 'done' && (
              <>
                <section className="result-panel admin-result"><h2>체류기간 연장허가 신청서 / Visa Extension Application</h2><div className="admin-grid">
                  {adminDocumentItems.map((item) => <div key={item.label}><strong>{item.label}</strong><p>{item.value}</p></div>)}
                </div></section>
                <button className="secondary-button nested-action" onClick={() => selectView('agencies')}>상담기관에 문의하기 / Ask a counselor</button>
              </>
            )}
          </>
        )}

        {view === 'agencies' && (
          <>
            <ChatMessage who="bot" ko="상담기관을 안내해드릴게요. AI는 신고를 대신 접수하지 않아요." en="Here are counseling agencies — the AI does not submit reports on your behalf." />
            <section className="result-panel agency-panel">
              <div className="agency-list">{agencyItems.map((agency) => <article className="agency" key={agency.ko}><div><h3>{agency.ko}</h3><p>{agency.en} · {agency.description}</p></div><a href={agency.href}>{agency.phone}</a></article>)}</div>
              <label className="consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>진단 요약을 상담사와 공유하는 데 동의합니다 / I agree to share my diagnosis summary with the counselor.</span></label>
              {consent && <p className="consent-note">동의해 주셔서 감사합니다. 상담 시 위 진단 요약을 함께 전달해 드립니다. / Thank you — your summary will be shared with the counselor.</p>}
            </section>
          </>
        )}
        <div ref={chatEndRef} />
      </section>

      <ChatComposer value={freeText} onChange={setFreeText} onSubmit={sendFreeText} />
    </main>
  )
}

export default App
