import { useEffect, useRef, useState } from 'react'
import ChatComposer from './components/chatbot/ChatComposer'
import ChatHeader from './components/chatbot/ChatHeader'
import ChatMessage, { type ChatMessageItem } from './components/chatbot/ChatMessage'
import LanguageSelector from './components/chatbot/LanguageSelector'
import ServiceMenu, { type ServiceView } from './components/chatbot/ServiceMenu'
import './App.css'

type View = ServiceView | null
type UploadState = 'idle' | 'processing' | 'done'

const chatScript = [
  {
    ko: '몇 가지만 더 확인할게요. 최근 4주간 실제로 하루 몇 시간 정도 일하셨나요?',
    en: 'A few more things to check. How many hours did you actually work per day in the last 4 weeks?',
    options: [
      ['계약서와 동일 (1일 8시간)', 'Same as contract (8h/day)'],
      ['가끔 초과 (1일 9~10시간)', 'Occasionally more (9–10h/day)'],
      ['매일 초과 (1일 10시간 이상)', 'Every day more (10h+/day)'],
    ],
  },
  {
    ko: '숙식비로 매달 실제 얼마가 공제되고 있나요?',
    en: 'How much is actually deducted for room & board each month?',
    options: [
      ['20만원 이하', 'Under 200,000 KRW'],
      ['20~35만원', '200,000–350,000 KRW'],
      ['35만원 초과', 'Over 350,000 KRW'],
    ],
  },
  {
    ko: '휴게시간은 실제로 보장받고 계신가요?',
    en: 'Do you actually get rest breaks?',
    options: [
      ['네, 충분히 쉬어요', 'Yes, enough rest'],
      ['가끔 못 쉬어요', 'Sometimes no rest'],
      ['거의 못 쉬어요', 'Almost never'],
    ],
  },
  {
    ko: '답변 감사합니다. 확인하신 내용을 바탕으로 대응 자료를 준비했습니다.',
    en: "Thank you. We've prepared response materials based on your answers.",
    options: [],
  },
]

const clauses = [
  {
    id: 'wage', status: 'ok', label: '문제없음 / OK', title: '임금 및 지급방법', en: 'Wage & Payment',
    original: '월 통상임금 2,096,270원, 매월 10일 근로자 명의 계좌로 지급',
    explanation: "Monthly base wage is 2,096,270 KRW, paid by the 10th of each month to the worker's own bank account.",
    legal: '최저임금법 제6조, 근로기준법 제43조',
  },
  {
    id: 'hours', status: 'danger', label: '주의 필요 / Attention needed', title: '근로시간', en: 'Working Hours',
    original: '1일 10시간, 주 6일 근무 (연장근로 별도 합의 없음)',
    explanation: 'Legal limit is 8h/day and 40h/week. Overtime requires separate agreement and 1.5x pay.',
    legal: '근로기준법 제50조(근로시간), 제53조(연장근로의 제한)',
  },
  {
    id: 'rest', status: 'warn', label: '확인 필요 / Check needed', title: '휴게시간', en: 'Rest Time',
    original: '근무 중 휴게시간이 별도로 명시되어 있지 않음',
    explanation: 'The contract does not specify rest breaks — actual practice needs to be confirmed.',
    legal: '근로기준법 제54조',
  },
  {
    id: 'deduction', status: 'danger', label: '주의 필요 / Attention needed', title: '숙식비 공제', en: 'Room & Board Deduction',
    original: '월 급여에서 숙식비 350,000원 공제',
    explanation: 'This may exceed the guideline cap on room & board deductions relative to ordinary wages.',
    legal: '외국인근로자의 고용 등에 관한 법률 시행령, 숙식비 징수 관련 지침',
  },
  {
    id: 'period', status: 'ok', label: '문제없음 / OK', title: '계약기간', en: 'Contract Period',
    original: '2026.03.01 ~ 2029.02.28 (3년)',
    explanation: 'Within the standard contract period range for E-9 workers.',
    legal: '외국인근로자의 고용 등에 관한 법률 제9조',
  },
  {
    id: 'duties', status: 'warn', label: '확인 필요 / Check needed', title: '업무내용 및 근무장소', en: 'Job Duties & Location',
    original: '업무: 축산업 보조, 근무지: OO농장',
    explanation: 'Please confirm whether the actual assigned duties and workplace match the contract.',
    legal: '외국인근로자의 고용 등에 관한 법률 제25조',
  },
]

const evidence = [
  ['contract', '근로계약서 사본', 'Copy of labor contract'],
  ['payslip', '최근 3개월 급여명세서', 'Pay slips (last 3 months)'],
  ['attendance', '출퇴근 기록 (사진/메모)', 'Attendance records (photo/notes)'],
  ['deduction', '숙식비 공제 내역 확인서', 'Room & board deduction statement'],
  ['bank', '통장 입금 내역', 'Bank deposit records'],
]

const agencies = [
  ['외국인노동자지원센터', 'Migrant Worker Support Center', '다국어 상담 / Multilingual counseling', '1577-0071', 'tel:15770071'],
  ['고용노동부 고객상담센터', 'Ministry of Employment & Labor', '노동 신고·상담 / Labor complaints', '국번없이 1350', 'tel:1350'],
  ['관할 지방고용노동청', 'Regional Labor Office', '근로감독관 신고 / File with a labor inspector', '홈페이지 안내', 'tel:1350'],
  ['이주민센터 (NGO)', 'Migrant Center (NGO)', '현장 지원·통역 / On-site support & interpreting', '문의하기', 'tel:15772270'],
]

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
            {[
              ['계약상 근로시간(1일 8시간) vs 실제 응답(초과 근무 있음)', 'Contract hours (8h/day) vs. your answer (overtime reported)'],
              ['숙식비 공제 기준 대비 실제 공제액 확인 필요', 'Actual room & board deduction needs to be checked against the guideline cap'],
              ['휴게시간 미보장 가능성 — 실제 제공 여부 추가 확인 필요', 'Possible lack of rest breaks — needs further confirmation'],
            ].map(([ko, en]) => <div className="summary-item" key={ko}><div>{ko}</div><small>{en}</small></div>)}
            <h3>증거 자료 체크리스트 / Evidence Checklist</h3>
            {evidence.map(([id, ko, en]) => {
              const checked = checkedEvidence.includes(id)
              return (
                <button className="evidence-item" key={id} onClick={() => setCheckedEvidence((items) => checked ? items.filter((item) => item !== id) : [...items, id])}>
                  <span className={checked ? 'check checked' : 'check'} aria-hidden="true">{checked ? '✓' : ''}</span>
                  <span>{ko} <em>/ {en}</em></span>
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
                  {clauses.map((clause) => {
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
                  {[
                    ['처리기한 / Deadline', '2026.09.02까지 (D-14)'],
                    ['담당기관 / Agency', '관할 출입국·외국인청'],
                    ['필요서류 / Required documents', '여권, 외국인등록증, 표준근로계약서, 재직증명서'],
                    ['제출방법 / How to submit', '하이코리아 온라인 신청 또는 관할청 방문'],
                  ].map(([label, value]) => <div key={label}><strong>{label}</strong><p>{value}</p></div>)}
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
              <div className="agency-list">{agencies.map(([ko, en, description, phone, href]) => <article className="agency" key={ko}><div><h3>{ko}</h3><p>{en} · {description}</p></div><a href={href}>{phone}</a></article>)}</div>
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
