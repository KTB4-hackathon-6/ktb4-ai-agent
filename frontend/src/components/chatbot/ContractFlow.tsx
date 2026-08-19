import type { ContractAnalysisResponse } from '../../api/contracts'
import { contractClauses } from '../../mocks/chatbot'
import type { UploadState } from '../../types/chatbot'
import ChatMessage, { type ChatMessageItem } from './ChatMessage'
import QuestionFlow from './QuestionFlow'
import ResultsPanel, { type ResultTab } from './ResultsPanel'

type ContractFlowProps = {
  uploadState: UploadState
  contractResult: ContractAnalysisResponse | null
  uploadError: string | null
  openClause: string | null
  messages: ChatMessageItem[]
  currentStep: number
  resultsShown: boolean
  activeResultTab: ResultTab
  checkedEvidence: string[]
  onStartAnalysis: (files?: File[]) => void
  onResetUpload: () => void
  onToggleClause: (clauseId: string | null) => void
  onPickOption: (ko: string, en: string) => void
  onShowResults: () => void
  onResultTabChange: (tab: ResultTab) => void
  onToggleEvidence: (id: string) => void
  onConnect: () => void
}

function ContractFlow({
  uploadState,
  contractResult,
  uploadError,
  openClause,
  messages,
  currentStep,
  resultsShown,
  activeResultTab,
  checkedEvidence,
  onStartAnalysis,
  onResetUpload,
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
            <strong>근로계약서 PDF 또는 사진 여러 장 업로드</strong>
            <small>Upload multiple contract PDFs or images</small>
            <input
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              multiple
              onChange={(event) => {
                const files = Array.from(event.target.files ?? [])
                if (files.length > 0) onStartAnalysis(files)
              }}
            />
          </label>
          <button className="primary-button" onClick={() => onStartAnalysis()}>데모 계약서로 진단 시작 / Start Demo Diagnosis</button>
        </section>
      )}
      {uploadState === 'processing' && (
        <section className="processing-panel">
          <span className="pulse" />
          <strong>분석 중입니다... / Analyzing your contract...</strong>
        </section>
      )}
      {uploadState === 'error' && (
        <section className="error-panel" role="alert">
          <strong>계약서 분석에 실패했습니다. / Analysis failed</strong>
          <p>{uploadError}</p>
          <button className="secondary-button" onClick={onResetUpload}>다른 파일 선택 / Choose another file</button>
        </section>
      )}
      {uploadState === 'done' && (
        <>
          {contractResult ? (
            <ContractAnalysisResult
              result={contractResult}
              openClause={openClause}
              onToggleClause={onToggleClause}
            />
          ) : (
            <DemoDiagnosis openClause={openClause} onToggleClause={onToggleClause} />
          )}
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

type DiagnosisProps = {
  openClause: string | null
  onToggleClause: (clauseId: string | null) => void
}

function ContractAnalysisResult({
  result,
  openClause,
  onToggleClause,
}: DiagnosisProps & { result: ContractAnalysisResponse }) {
  const { facts, violations, unverified_fields: unverifiedFields } = result.diagnosis
  const factItems = [
    ['주당 근로시간', `${facts.weekly_working_hours}시간`],
    ['하루 근로시간', `${facts.daily_working_hours}시간`],
    ['월 급여', `${facts.monthly_wage.toLocaleString('ko-KR')}원`],
    ['계산 시급', `${facts.hourly_wage.toLocaleString('ko-KR')}원`],
    ['계약 기간', `${facts.contract_period_months}개월`],
    ['숙식비 공제', `${facts.accommodation_deduction_krw.toLocaleString('ko-KR')}원`],
  ]

  return (
    <>
      <section className="result-panel agent-result">
        <span className="result-eyebrow">AI AGENT RESPONSE</span>
        <h2>{result.analysis.summary || '계약서 분석 결과'}</h2>
        <p className="agent-answer">{result.answer}</p>
        {result.analysis.findings.length > 0 && (
          <div className="agent-section">
            <h3>주요 발견사항</h3>
            {result.analysis.findings.map((finding, index) => (
              <article className="agent-finding" key={`${finding.title}-${index}`}>
                <strong>{finding.title}</strong>
                <p>{finding.description}</p>
              </article>
            ))}
          </div>
        )}
        {result.analysis.nextActions.length > 0 && (
          <div className="agent-section">
            <h3>다음 행동</h3>
            <ol className="next-actions">
              {result.analysis.nextActions.map((action, index) => <li key={`${action}-${index}`}>{action}</li>)}
            </ol>
          </div>
        )}
      </section>

      <section className="result-panel diagnosis">
        <h2>계약서 진단 리포트 / Diagnosis Report</h2>
        <div className="fact-grid">
          {factItems.map(([label, value]) => (
            <div key={label}><span>{label}</span><strong>{value}</strong></div>
          ))}
        </div>
        <div className="legend">
          <span className="warn">● 확인 필요</span>
          <span className="danger">● 주의 필요</span>
        </div>
        {violations.length === 0 ? (
          <p className="empty-result">확인된 규칙 위반 항목이 없습니다.</p>
        ) : violations.map((violation, index) => {
          const id = `${violation.rule_id}-${index}`
          const open = openClause === id
          const status = violation.severity === 'warning' ? 'danger' : 'warn'
          return (
            <button
              className={`clause ${status}`}
              key={id}
              onClick={() => onToggleClause(open ? null : id)}
              aria-expanded={open}
            >
              <div className="clause-heading">
                <div>
                  <span className={`status ${status}`}>
                    {status === 'danger' ? '주의 필요 / Warning' : '확인 필요 / Review'}
                  </span>
                  <h3>{violation.message}</h3>
                  <p>{violation.law_name} {violation.article}</p>
                </div>
                <span className={open ? 'chevron open' : 'chevron'}>⌄</span>
              </div>
              {open && (
                <div className="clause-details">
                  <strong>진단 코드 / Check ID</strong><p>{violation.rule_id}</p>
                  <strong>관련 법적 근거 / Legal basis</strong><p>{violation.law_name} {violation.article}</p>
                </div>
              )}
            </button>
          )
        })}
        {unverifiedFields.length > 0 && (
          <p className="unverified-fields">
            OCR 원문에서 확인하지 못한 항목: {unverifiedFields.join(', ')}
          </p>
        )}
      </section>
    </>
  )
}

function DemoDiagnosis({ openClause, onToggleClause }: DiagnosisProps) {
  return (
    <section className="result-panel diagnosis">
      <h2>데모 진단 리포트 / Demo Diagnosis Report</h2>
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
  )
}

export default ContractFlow
