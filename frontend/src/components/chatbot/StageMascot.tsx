import illoMascot from '../../assets/illo-mascot.png'

export type StageMascotVariant =
  | 'upload'
  | 'analyzing'
  | 'review'
  | 'drafting'
  | 'ready'
  | 'agency'
  | 'completed'

const moods: Record<StageMascotVariant, { icon: string; label: string }> = {
  upload: { icon: '+', label: '문서를 기다리고 있어요' },
  analyzing: { icon: '⌕', label: '꼼꼼히 읽고 있어요' },
  review: { icon: '?', label: '함께 확인해볼게요' },
  drafting: { icon: '✎', label: '내용을 정리하고 있어요' },
  ready: { icon: '✓', label: '초안을 확인해주세요' },
  agency: { icon: '⌖', label: '도움받을 곳을 찾았어요' },
  completed: { icon: '★', label: '수고하셨어요!' },
}

type StageMascotProps = {
  variant: StageMascotVariant
  compact?: boolean
  large?: boolean
}

function StageMascot({ variant, compact = false, large = false }: StageMascotProps) {
  const mood = moods[variant]

  return (
    <div
      className={`stage-mascot-card ${variant}${compact ? ' compact' : ''}${large ? ' large' : ''}`}
      aria-label={`ILLO 도우미: ${mood.label}`}
    >
      <span className="stage-mascot-avatar" aria-hidden="true">
        <img src={illoMascot} alt="" />
        <i>{mood.icon}</i>
      </span>
      {!compact && (
        <span className="stage-mascot-copy">
          <small>ILLO 도우미</small>
          <strong>{mood.label}</strong>
        </span>
      )}
    </div>
  )
}

export default StageMascot
