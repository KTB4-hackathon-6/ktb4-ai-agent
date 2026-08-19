import { contractClauses } from '../../mocks/chatbot'
import type { UploadState } from '../../types/chatbot'
import ChatMessage, { type ChatMessageItem } from './ChatMessage'
import QuestionFlow from './QuestionFlow'
import ResultsPanel, { type ResultTab } from './ResultsPanel'

type ContractFlowProps = {
  uploadState: UploadState
  openClause: string | null
  messages: ChatMessageItem[]
  currentStep: number
  resultsShown: boolean
  activeResultTab: ResultTab
  checkedEvidence: string[]
  onStartAnalysis: () => void
  onToggleClause: (clauseId: string | null) => void
  onPickOption: (ko: string, en: string) => void
  onShowResults: () => void
  onResultTabChange: (tab: ResultTab) => void
  onToggleEvidence: (id: string) => void
  onConnect: () => void
}

function ContractFlow({
  uploadState,
  openClause,
  messages,
  currentStep,
  resultsShown,
  activeResultTab,
  checkedEvidence,
  onStartAnalysis,
  onToggleClause,
  onPickOption,
  onShowResults,
  onResultTabChange,
  onToggleEvidence,
  onConnect,
}: ContractFlowProps) {
  return (
    <>
      <ChatMessage who="bot" ko="좋아요, 근로계약서를 업로드해주세요." en="Great, please upload your labor contract." />
      {uploadState === 'idle' && (
        <section className="upload-panel">
          <label className="upload-target">
            <span className="upload-icon" aria-hidden="true">＋</span>
            <strong>근로계약서 사진 업로드</strong>
            <small>Upload contract photo</small>
            <input type="file" accept="image/*,.pdf" onChange={onStartAnalysis} />
          </label>
          <button className="primary-button" onClick={onStartAnalysis}>데모 계약서로 진단 시작 / Start Demo Diagnosis</button>
        </section>
      )}
      {uploadState === 'processing' && (
        <section className="processing-panel">
          <span className="pulse" />
          <strong>분석 중입니다... / Analyzing your contract...</strong>
        </section>
      )}
      {uploadState === 'done' && (
        <>
          <section className="result-panel diagnosis">
            <h2>진단 리포트 / Diagnosis Report</h2>
            <div className="legend">
              <span className="ok">● 문제없음 / OK</span>
              <span className="warn">● 확인 필요</span>
              <span className="danger">● 주의 필요</span>
            </div>
            {contractClauses.map((clause) => {
              const open = openClause === clause.id
              return (
                <button
                  className={`clause ${clause.status}`}
                  key={clause.id}
                  onClick={() => onToggleClause(open ? null : clause.id)}
                  aria-expanded={open}
                >
                  <div className="clause-heading">
                    <div>
                      <span className={`status ${clause.status}`}>{clause.label}</span>
                      <h3>{clause.title}</h3>
                      <p>{clause.en}</p>
                    </div>
                    <span className={open ? 'chevron open' : 'chevron'}>⌄</span>
                  </div>
                  {open && (
                    <div className="clause-details">
                      <strong>원문 / Original</strong><p>{clause.original}</p>
                      <strong>설명 / Explanation (EN)</strong><p>{clause.explanation}</p>
                      <strong>관련 법적 근거 / Legal basis</strong><p>{clause.legal}</p>
                    </div>
                  )}
                </button>
              )
            })}
          </section>
          <QuestionFlow
            messages={messages}
            currentStep={currentStep}
            resultsShown={resultsShown}
            onPickOption={onPickOption}
            onShowResults={onShowResults}
          />
          <ResultsPanel
            visible={resultsShown}
            activeTab={activeResultTab}
            checkedEvidence={checkedEvidence}
            onTabChange={onResultTabChange}
            onToggleEvidence={onToggleEvidence}
            onConnect={onConnect}
          />
        </>
      )}
    </>
  )
}

export default ContractFlow
