const pipelineLabels = ['언어', '요청', '분석', '확인', '자료', '연결']

type ChatHeaderProps = {
  completedSteps: boolean[]
}

function ChatHeader({ completedSteps }: ChatHeaderProps) {
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-avatar" aria-hidden="true">N</div>
        <div>
          <div className="brand-name">노동나침반 상담봇</div>
          <div className="online"><span />온라인 / Online</div>
        </div>
      </div>
      <ol className="pipeline" aria-label="상담 진행 단계">
        {pipelineLabels.map((label, index) => (
          <li className={completedSteps[index] ? 'done' : ''} key={label}>
            {completedSteps[index] ? '●' : '○'} {label}
          </li>
        ))}
      </ol>
    </header>
  )
}

export default ChatHeader
