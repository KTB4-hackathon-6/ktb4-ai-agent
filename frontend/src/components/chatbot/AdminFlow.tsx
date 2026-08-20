import { motion } from 'framer-motion'
import { adminDocumentItems } from '../../mocks/chatbot'
import type { UploadState } from '../../types/chatbot'
import ChatMessage from './ChatMessage'

type AdminFlowProps = {
  state: UploadState
  onStartAnalysis: () => void
}

const panelMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease: 'easeOut' as const },
}

function AdminFlow({ state, onStartAnalysis }: AdminFlowProps) {
  return (
    <>
      <ChatMessage
        who="bot"
        ko="행정 문서 사진이나 PDF를 업로드해주세요."
        en="Please upload a photo or PDF of your admin document."
      />
      {state === 'idle' && (
        <motion.section className="upload-panel" {...panelMotion}>
          <label className="upload-target">
            <span className="upload-icon" aria-hidden="true">＋</span>
            <strong>행정 문서 사진 업로드</strong>
            <small>Upload admin document</small>
            <input type="file" accept="image/*,.pdf" onChange={onStartAnalysis} />
          </label>
          <motion.button className="primary-button" onClick={onStartAnalysis} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
            데모 문서로 분석 / Analyze Demo Document
          </motion.button>
        </motion.section>
      )}
      {state === 'processing' && (
        <motion.section className="processing-panel" {...panelMotion}>
          <motion.span
            className="pulse"
            animate={{ scale: [0.9, 1, 0.9], opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
          />
          <strong>문서를 분석하고 있습니다... / Reading your document...</strong>
        </motion.section>
      )}
      {state === 'done' && (
        <motion.section className="result-panel admin-result" {...panelMotion}>
          <h2>체류기간 연장허가 신청서 / Visa Extension Application</h2>
          <div className="admin-grid">
            {adminDocumentItems.map((item) => (
              <div key={item.label}>
                <strong>{item.label}</strong>
                <p>{item.value}</p>
              </div>
            ))}
          </div>
        </motion.section>
      )}
    </>
  )
}

export default AdminFlow
