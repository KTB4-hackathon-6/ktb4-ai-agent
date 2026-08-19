import { agencyItems } from '../../mocks/chatbot'
import ChatMessage from './ChatMessage'

type AgencyFlowProps = {
  consent: boolean
  onConsentChange: (consent: boolean) => void
}

function AgencyFlow({ consent, onConsentChange }: AgencyFlowProps) {
  return (
    <>
      <ChatMessage
        who="bot"
        ko="상담기관을 안내해드릴게요. AI는 신고를 대신 접수하지 않아요."
        en="Here are counseling agencies — the AI does not submit reports on your behalf."
      />
      <section className="result-panel agency-panel">
        <div className="agency-list">
          {agencyItems.map((agency) => (
            <article className="agency" key={agency.ko}>
              <div>
                <h3>{agency.ko}</h3>
                <p>{agency.en} · {agency.description}</p>
              </div>
              <a href={agency.href}>{agency.phone}</a>
            </article>
          ))}
        </div>
        <label className="consent">
          <input type="checkbox" checked={consent} onChange={(event) => onConsentChange(event.target.checked)} />
          <span>진단 요약을 상담사와 공유하는 데 동의합니다 / I agree to share my diagnosis summary with the counselor.</span>
        </label>
        {consent && (
          <p className="consent-note">
            동의해 주셔서 감사합니다. 상담 시 위 진단 요약을 함께 전달해 드립니다. / Thank you — your summary will be shared with the counselor.
          </p>
        )}
      </section>
    </>
  )
}

export default AgencyFlow
