import { AnimatePresence, motion } from 'framer-motion'
import { evidenceItems, summaryItems } from '../../mocks/chatbot'

export type ResultTab = 'letter' | 'summary'

type ResultsPanelProps = {
  visible: boolean
  activeTab: ResultTab
  checkedEvidence: string[]
  onTabChange: (tab: ResultTab) => void
  onToggleEvidence: (id: string) => void
}

const tabs: Array<{ id: ResultTab; label: string }> = [
  { id: 'letter', label: '확인요청문 / Request Letter' },
  { id: 'summary', label: '사건요약·증거목록 / Summary & Evidence' },
]

function ResultsPanel({
  visible,
  activeTab,
  checkedEvidence,
  onTabChange,
  onToggleEvidence,
}: ResultsPanelProps) {
  if (!visible) return null

  return (
    <motion.section
      className="result-panel"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <h2>대응 문서 &amp; 증거자료 / Response Documents &amp; Evidence</h2>
      <p className="panel-description">확인하신 내용을 바탕으로 준비했습니다. Prepared based on what you confirmed.</p>
      <div className="tabs" role="tablist" aria-label="대응 문서 보기">
        {tabs.map((tab) => (
          <button
            className={activeTab === tab.id ? 'tab active' : 'tab'}
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
          >
            {activeTab === tab.id && (
              <motion.span className="tab-pill" layoutId="tab-pill" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />
            )}
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {activeTab === 'letter' ? (
          <motion.div
            className="letter-copy"
            key="letter"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <p>안녕하세요. 근로 조건을 확인하던 중 실제 근로시간과 숙식비 공제 내역에 대해 문의드리고자 합니다. 최근 4주간의 실제 근무기록과 공제 산정 기준을 알려주시면 감사하겠습니다.</p>
            <p>Hello. While reviewing my working conditions, I would like to ask about my actual working hours and the room &amp; board deduction. Could you share the records and deduction basis for the last 4 weeks?</p>
          </motion.div>
        ) : (
          <motion.div
            className="summary-copy"
            key="summary"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
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
                  <span className={checked ? 'check checked' : 'check'} aria-hidden="true">
                    <AnimatePresence>
                      {checked && (
                        <motion.span
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          ✓
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                  <span>{item.ko} <em>/ {item.en}</em></span>
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
      <p className="disclaimer">최종 신고·제출은 본인이 직접 진행합니다 / You always submit the final report yourself.</p>
    </motion.section>
  )
}

export default ResultsPanel
