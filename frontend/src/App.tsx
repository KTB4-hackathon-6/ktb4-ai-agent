import { useEffect, useRef, useState } from 'react'
import ChatComposer from './components/chatbot/ChatComposer'
import ChatHeader from './components/chatbot/ChatHeader'
import ChatMessage, { type ChatMessageItem } from './components/chatbot/ChatMessage'
import LanguageSelector from './components/chatbot/LanguageSelector'
import ServiceMenu from './components/chatbot/ServiceMenu'
import {
  adminDocumentItems,
  agencyItems,
  chatScript,
  contractClauses,
  evidenceItems,
  summaryItems,
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
  const [resultTab, setResultTab] = useState<'letter' | 'summary'>('letter')
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
  const renderChatFlow = () => {
    const options = chatScript[chatStep]?.options ?? []
    return (
      <>
        {chatMessages.map((message, index) => (
          <ChatMessage key={`${message.ko}-${index}`} {...message} />
        ))}
        {options.length > 0 && (
          <div className="options nested-options">
            {options.map(([ko, en]) => <button className="pill-button" key={ko} onClick={() => pickChatOption(ko, en)}>{ko} <span>/ {en}</span></button>)}
          </div>
        )}
        {chatStep === chatScript.length - 1 && !resultsShown && (
          <button className="primary-button nested-action" onClick={() => setResultsShown(true)}>결과 확인하기 / View Results</button>
        )}
      </>
    )
  }

  const renderResults = () => resultsShown && (
    <>
      <section className="result-panel">
        <h2>대응 문서 &amp; 증거자료 / Response Documents &amp; Evidence</h2>
        <p className="panel-description">확인하신 내용을 바탕으로 준비했습니다. Prepared based on what you confirmed.</p>
        <div className="tabs" role="tablist" aria-label="대응 문서 보기">
          <button className={resultTab === 'letter' ? 'tab active' : 'tab'} onClick={() => setResultTab('letter')}>확인요청문 / Request Letter</button>
          <button className={resultTab === 'summary' ? 'tab active' : 'tab'} onClick={() => setResultTab('summary')}>사건요약·증거목록 / Summary &amp; Evidence</button>
        </div>
        {resultTab === 'letter' ? (
          <div className="letter-copy">
            <p>안녕하세요. 근로 조건을 확인하던 중 실제 근로시간과 숙식비 공제 내역에 대해 문의드리고자 합니다. 최근 4주간의 실제 근무기록과 공제 산정 기준을 알려주시면 감사하겠습니다.</p>
            <p>Hello. While reviewing my working conditions, I would like to ask about my actual working hours and the room &amp; board deduction. Could you share the records and deduction basis for the last 4 weeks?</p>
          </div>
        ) : (
          <div className="summary-copy">
            <h3>비교 요약 / Comparison Summary</h3>
            {summaryItems.map((item) => <div className="summary-item" key={item.ko}><div>{item.ko}</div><small>{item.en}</small></div>)}
            <h3>증거 자료 체크리스트 / Evidence Checklist</h3>
            {evidenceItems.map((item) => {
              const checked = checkedEvidence.includes(item.id)
              return (
                <button className="evidence-item" key={item.id} onClick={() => setCheckedEvidence((items) => checked ? items.filter((checkedId) => checkedId !== item.id) : [...items, item.id])}>
                  <span className={checked ? 'check checked' : 'check'} aria-hidden="true">{checked ? '✓' : ''}</span>
                  <span>{item.ko} <em>/ {item.en}</em></span>
                </button>
              )
            })}
          </div>
        )}
        <p className="disclaimer">최종 신고·제출은 본인이 직접 진행합니다 / You always submit the final report yourself.</p>
      </section>
      <button className="secondary-button nested-action" onClick={() => selectView('agencies')}>상담기관 연결하기 / Connect to a counselor</button>
    </>
  )

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
            {renderChatFlow()}
            {renderResults()}
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
                {renderChatFlow()}
                {renderResults()}
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
