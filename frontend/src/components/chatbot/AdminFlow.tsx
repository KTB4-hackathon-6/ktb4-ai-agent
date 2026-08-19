import { adminDocumentItems } from '../../mocks/chatbot'
import type { UploadState } from '../../types/chatbot'
import ChatMessage from './ChatMessage'

type AdminFlowProps = {
  state: UploadState
  onStartAnalysis: () => void
  onConnect: () => void
}

function AdminFlow({ state, onStartAnalysis, onConnect }: AdminFlowProps) {
  return (
    <>
      <ChatMessage
        who="bot"
        ko="행정 문서 사진이나 PDF를 업로드해주세요."
        en="Please upload a photo or PDF of your admin document."
      />
      {state === 'idle' && (
        <section className="upload-panel">
          <label className="upload-target">
            <span className="upload-icon" aria-hidden="true">＋</span>
            <strong>행정 문서 사진 업로드</strong>
            <small>Upload admin document</small>
            <input type="file" accept="image/*,.pdf" onChange={onStartAnalysis} />
          </label>
          <button className="primary-button" onClick={onStartAnalysis}>데모 문서로 분석 / Analyze Demo Document</button>
        </section>
      )}
      {state === 'processing' && (
        <section className="processing-panel">
          <span className="pulse" />
          <strong>문서를 분석하고 있습니다... / Reading your document...</strong>
        </section>
      )}
      {state === 'done' && (
        <>
          <section className="result-panel admin-result">
            <h2>체류기간 연장허가 신청서 / Visa Extension Application</h2>
            <div className="admin-grid">
              {adminDocumentItems.map((item) => (
                <div key={item.label}>
                  <strong>{item.label}</strong>
                  <p>{item.value}</p>
                </div>
              ))}
            </div>
          </section>
          <button className="secondary-button nested-action" onClick={onConnect}>상담기관에 문의하기 / Ask a counselor</button>
        </>
      )}
    </>
  )
}

export default AdminFlow
