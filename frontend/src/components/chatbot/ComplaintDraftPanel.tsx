import { motion } from 'framer-motion'
import { complaintGroups } from '../../mocks/chatbot'
import StageMascot from './StageMascot'

/**
 * ILLO_SERVICE_SPEC 4.5 진정서 작성
 * 노동포털 SN001 서식의 항목을 그대로 보여주고, 비어 있는 항목만 채우도록 안내한다.
 */
type ComplaintDraftPanelProps = {
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onReady: () => void
  onBack: () => void
}

const panelMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: 'easeOut' as const },
}

const requiredKeys = complaintGroups
  .flatMap((group) => group.rows)
  .filter((row) => !row.optional)
  .map((row) => row.key)

function missingDraftKeys(values: Record<string, string>) {
  return requiredKeys.filter((key) => !values[key]?.trim())
}

function ComplaintDraftPanel({ values, onChange, onReady, onBack }: ComplaintDraftPanelProps) {
  const missing = missingDraftKeys(values)
  const filled = requiredKeys.length - missing.length
  const nextKey = missing[0]

  return (
    <motion.section className="panel draft-panel" {...panelMotion}>
      <header className="draft-head">
        <div className="panel-heading-with-mascot">
          <StageMascot variant="drafting" compact />
          <div>
            <span className="panel-eyebrow">진정서 작성 / Complaint</span>
            <h2>진정서에 들어갈 내용을 채워주세요</h2>
            <p className="panel-lead">
              앞에서 확인한 내용은 이미 채워두었습니다. 노란색 표시가 있는 곳만 채우면 됩니다.
              <small>Only the highlighted fields are still empty.</small>
            </p>
          </div>
        </div>
        <div className="draft-progress" aria-live="polite">
          <strong>{filled}<span>/{requiredKeys.length}</span></strong>
          <div className="progress-track" role="presentation">
            <motion.div
              className="progress-fill"
              animate={{ width: `${(filled / requiredKeys.length) * 100}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
          <small>필수 항목 입력 상황</small>
        </div>
      </header>

      {complaintGroups.map((group) => (
        <div className="draft-group" key={group.id}>
          <h3>{group.ko} <span>{group.en}</span></h3>
          <dl className="draft-rows">
            {group.rows.map((row) => {
              const value = values[row.key] ?? ''
              const empty = !value.trim()
              const state = row.optional && empty ? 'optional' : empty ? 'empty' : 'filled'
              return (
                <div className={`draft-row ${state}`} key={row.key} aria-current={row.key === nextKey ? 'step' : undefined}>
                  <dt>
                    <label htmlFor={`draft-${row.key}`}>{row.ko}</label>
                    {row.optional && <small>선택</small>}
                  </dt>
                  <dd>
                    {row.options ? (
                      <div className="draft-options" role="group" aria-labelledby={`draft-${row.key}`}>
                        <span className="sr-only" id={`draft-${row.key}`}>{row.ko}</span>
                        {row.options.map((option) => (
                          <button
                            className={value === option ? 'chip selected' : 'chip'}
                            type="button"
                            key={option}
                            onClick={() => onChange(row.key, option)}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    ) : row.multiline ? (
                      <textarea
                        id={`draft-${row.key}`}
                        rows={2}
                        value={value}
                        placeholder="입력해주세요"
                        onChange={(event) => onChange(row.key, event.target.value)}
                      />
                    ) : (
                      <input
                        id={`draft-${row.key}`}
                        value={value}
                        placeholder="입력해주세요"
                        onChange={(event) => onChange(row.key, event.target.value)}
                      />
                    )}
                  </dd>
                </div>
              )
            })}
          </dl>
        </div>
      ))}

      <div className="panel-actions">
        <motion.button
          className="primary-button"
          type="button"
          disabled={missing.length > 0}
          onClick={onReady}
          whileHover={missing.length > 0 ? undefined : { y: -2 }}
          whileTap={missing.length > 0 ? undefined : { scale: 0.97 }}
        >
          진정서 확인하기 / Review complaint
        </motion.button>
        <button className="ghost-button" type="button" onClick={onBack}>결과로 돌아가기 / Back to review</button>
        {missing.length > 0 && (
          <span className="panel-note">{missing.length}개 항목이 더 필요합니다.</span>
        )}
      </div>
    </motion.section>
  )
}

export default ComplaintDraftPanel
