import { motion } from 'framer-motion'
import { issueLabels, supportChannels } from '../../config/chatbot'
import StageMascot from './StageMascot'

/**
 * ILLO_SERVICE_SPEC 4.7 관련 기관·신고처
 * 문제 유형에 맞는 기관을 먼저 보여주고, 기관명·연락처·연결 주소만 제공한다.
 */
type AgencyPanelProps = {
  issue: keyof typeof issueLabels
  onFinish: () => void
  onBack: () => void
}

const panelMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: 'easeOut' as const },
}

function AgencyPanel({ issue, onFinish, onBack }: AgencyPanelProps) {
  const ordered = [...supportChannels].sort((a, b) => Number(b.issue === issue) - Number(a.issue === issue))

  return (
    <motion.section className="panel agency-panel" {...panelMotion}>
      <header className="agency-head panel-heading-with-mascot">
        <StageMascot variant="agency" compact />
        <div>
          <span className="panel-eyebrow">기관 안내 / Where to go</span>
          <h2>이 문제는 여기에 물어보면 됩니다</h2>
          <p className="panel-lead">
            지금 확인된 문제는 <b>{issueLabels[issue].ko}</b>에 해당합니다. 관련 기관을 먼저 보여드립니다.
            <small>Channels for {issueLabels[issue].en} come first.</small>
          </p>
        </div>
      </header>

      <ul className="agency-list">
        {ordered.map((channel) => (
          <li className={channel.issue === issue ? 'agency-card primary' : 'agency-card'} key={channel.id}>
            <div>
              <strong>{channel.ko}</strong>
              <small>{channel.en}</small>
              <p>{channel.detail}</p>
            </div>
            <a
              className="ghost-button"
              href={channel.href}
              target={channel.href.startsWith('tel:') ? undefined : '_blank'}
              rel={channel.href.startsWith('tel:') ? undefined : 'noreferrer'}
            >
              {channel.href.startsWith('tel:') ? '전화하기' : '열기'}
            </a>
          </li>
        ))}
      </ul>

      <p className="agency-note">
        상담과 접수는 각 기관에서 직접 진행됩니다. ILLO는 접수를 대신하지 않습니다.
      </p>

      <div className="panel-actions">
        <motion.button
          className="primary-button"
          type="button"
          onClick={onFinish}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
        >
          확인했습니다 / Done
        </motion.button>
        <button className="ghost-button" type="button" onClick={onBack}>결과 다시 보기 / Back to review</button>
      </div>
    </motion.section>
  )
}

export default AgencyPanel
