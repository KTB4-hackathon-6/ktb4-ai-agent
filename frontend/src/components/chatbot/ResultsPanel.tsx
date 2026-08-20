import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { DocumentPreparationResponse } from '../../api/contracts'
import { evidenceItems, summaryItems } from '../../mocks/chatbot'
import type { UploadState } from '../../types/chatbot'

export type ResultTab = 'letter' | 'summary'

type ResultsPanelProps = {
  visible: boolean
  activeTab: ResultTab
  checkedEvidence: string[]
  documentPreparation?: DocumentPreparationResponse | null
  documentState?: UploadState
  documentError?: string | null
  onTabChange: (tab: ResultTab) => void
  onToggleEvidence: (id: string) => void
  onPrepareDocument?: (content: string) => void
  onDownloadDocument?: () => void
}

const tabs: Array<{ id: ResultTab; label: string }> = [
  { id: 'letter', label: '확인요청문 / Request Letter' },
  { id: 'summary', label: '사건요약·증거목록 / Summary & Evidence' },
]

function ResultsPanel({
  visible,
  activeTab,
  checkedEvidence,
  documentPreparation,
  documentState = 'idle',
  documentError,
  onTabChange,
  onToggleEvidence,
  onPrepareDocument,
  onDownloadDocument,
}: ResultsPanelProps) {
  const [documentAnswer, setDocumentAnswer] = useState('')
  if (!visible) return null

  const draft = documentPreparation?.documentDrafts[0]
  const missingField = draft?.status === 'NEEDS_INPUT' ? draft.missingFields[0] : null
  const isPreparing = documentState === 'processing'

  return (
    <>
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
      {onPrepareDocument && onDownloadDocument && <motion.section
        className="result-panel document-download-panel"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <span className="result-eyebrow">HWPX DOCUMENT</span>
        <h2>진정서 작성 및 다운로드 / Labor Complaint</h2>
        {!documentPreparation ? (
          <>
            <p className="panel-description">
              분석된 구조화 데이터를 공식 진정서 양식에 채웁니다. 아직 확인하지 못한 값은 빈칸으로 남습니다.
            </p>
            <button
              className="primary-button"
              disabled={isPreparing}
              onClick={() => onPrepareDocument('진정서 작성을 시작해줘')}
            >
              {isPreparing ? '작성 중… / Preparing…' : '진정서 작성 시작 / Prepare complaint'}
            </button>
          </>
        ) : (
          <>
            <p className="document-status" role="status">{documentPreparation.answer}</p>
            <div className={draft?.status === 'READY' ? 'document-badge ready' : 'document-badge partial'}>
              {draft?.status === 'READY'
                ? '필수 항목 작성 완료 / Complete'
                : '현재까지 작성된 초안 / Partial draft'}
            </div>
            {missingField && (
              <form
                className="document-answer-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  const value = documentAnswer.trim()
                  if (!value) return
                  onPrepareDocument(value)
                  setDocumentAnswer('')
                }}
              >
                <label htmlFor="document-answer">{missingField.question}</label>
                <small>{missingField.reason}</small>
                <div>
                  <input
                    id="document-answer"
                    value={documentAnswer}
                    disabled={isPreparing}
                    onChange={(event) => setDocumentAnswer(event.target.value)}
                    placeholder={missingField.displayName}
                  />
                  <button className="secondary-button" disabled={isPreparing} type="submit">
                    {isPreparing ? '반영 중…' : '답변 반영'}
                  </button>
                </div>
              </form>
            )}
            <button className="primary-button" onClick={onDownloadDocument}>
              {draft?.status === 'READY' ? '완성된 진정서 다운로드' : '현재 작성본 다운로드'}
              {' / Download HWPX'}
            </button>
          </>
        )}
        {documentError && <p className="document-error" role="alert">{documentError}</p>}
      </motion.section>}
    </>
  )
}

export default ResultsPanel
