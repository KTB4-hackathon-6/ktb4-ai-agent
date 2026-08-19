import type { OcrAnalysisResponse } from '../../api/ocr'
import { contractClauses } from '../../mocks/chatbot'
import type { UploadState } from '../../types/chatbot'
import ChatMessage, { type ChatMessageItem } from './ChatMessage'
import QuestionFlow from './QuestionFlow'
import ResultsPanel, { type ResultTab } from './ResultsPanel'

type ContractFlowProps = {
  uploadState: UploadState
  ocrResult: OcrAnalysisResponse | null
  uploadError: string | null
  openClause: string | null
  messages: ChatMessageItem[]
  currentStep: number
  resultsShown: boolean
  activeResultTab: ResultTab
  checkedEvidence: string[]
  onStartAnalysis: (file?: File) => void
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
  ocrResult,
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
            <strong>근로계약서 사진 업로드</strong>
            <small>Upload contract photo</small>
            <input
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) onStartAnalysis(file)
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
          <strong>문서 인식에 실패했습니다. / OCR failed</strong>
          <p>{uploadError}</p>
          <button className="secondary-button" onClick={onResetUpload}>다른 파일 선택 / Choose another file</button>
        </section>
      )}
      {uploadState === 'done' && (
        <>
          {ocrResult && (
            <section className="result-panel ocr-result">
              <h2>문서 인식 결과 / OCR Result</h2>
              <p className="result-caption">문서에서 추출한 원문입니다. 아래 진단 내용은 현재 데모 데이터입니다.</p>
              <pre>{ocrResult.fullText || '인식된 텍스트가 없습니다.'}</pre>
            </section>
          )}
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
