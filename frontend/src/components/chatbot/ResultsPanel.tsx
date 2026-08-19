import { evidenceItems, summaryItems } from '../../mocks/chatbot'

export type ResultTab = 'letter' | 'summary'

type ResultsPanelProps = {
  visible: boolean
  activeTab: ResultTab
  checkedEvidence: string[]
  onTabChange: (tab: ResultTab) => void
  onToggleEvidence: (id: string) => void
  onConnect: () => void
}

function ResultsPanel({
  visible,
  activeTab,
  checkedEvidence,
  onTabChange,
  onToggleEvidence,
  onConnect,
}: ResultsPanelProps) {
  if (!visible) return null

  return (
    <>
      <section className="result-panel">
        <h2>대응 문서 &amp; 증거자료 / Response Documents &amp; Evidence</h2>
        <p className="panel-description">확인하신 내용을 바탕으로 준비했습니다. Prepared based on what you confirmed.</p>
        <div className="tabs" role="tablist" aria-label="대응 문서 보기">
          <button className={activeTab === 'letter' ? 'tab active' : 'tab'} onClick={() => onTabChange('letter')}>확인요청문 / Request Letter</button>
          <button className={activeTab === 'summary' ? 'tab active' : 'tab'} onClick={() => onTabChange('summary')}>사건요약·증거목록 / Summary &amp; Evidence</button>
        </div>
        {activeTab === 'letter' ? (
          <div className="letter-copy">
            <p>안녕하세요. 근로 조건을 확인하던 중 실제 근로시간과 숙식비 공제 내역에 대해 문의드리고자 합니다. 최근 4주간의 실제 근무기록과 공제 산정 기준을 알려주시면 감사하겠습니다.</p>
            <p>Hello. While reviewing my working conditions, I would like to ask about my actual working hours and the room &amp; board deduction. Could you share the records and deduction basis for the last 4 weeks?</p>
          </div>
        ) : (
          <div className="summary-copy">
            <h3>비교 요약 / Comparison Summary</h3>
            {summaryItems.map((item) => (
              <div className="summary-item" key={item.ko}>
                <div>{item.ko}</div>
                <small>{item.en}</small>
              </div>
            ))}
            <h3>증거 자료 체크리스트 / Evidence Checklist</h3>
            {evidenceItems.map((item) => {
              const checked = checkedEvidence.includes(item.id)
              return (
                <button className="evidence-item" key={item.id} onClick={() => onToggleEvidence(item.id)}>
                  <span className={checked ? 'check checked' : 'check'} aria-hidden="true">{checked ? '✓' : ''}</span>
                  <span>{item.ko} <em>/ {item.en}</em></span>
                </button>
              )
            })}
          </div>
        )}
        <p className="disclaimer">최종 신고·제출은 본인이 직접 진행합니다 / You always submit the final report yourself.</p>
      </section>
      <button className="secondary-button nested-action" onClick={onConnect}>상담기관 연결하기 / Connect to a counselor</button>
    </>
  )
}

export default ResultsPanel
