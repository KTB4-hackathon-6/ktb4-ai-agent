import illoMascot from '../../assets/illo-mascot.png'
import { useTranslation } from 'react-i18next'

export type StageMascotVariant =
  | 'upload'
  | 'analyzing'
  | 'review'
  | 'drafting'
  | 'ready'
  | 'agency'
  | 'completed'

const moods: Record<StageMascotVariant, { icon: string }> = {
  upload: { icon: '+' },
  analyzing: { icon: '⌕' },
  review: { icon: '?' },
  drafting: { icon: '✎' },
  ready: { icon: '✓' },
  agency: { icon: '⌖' },
  completed: { icon: '★' },
}

type StageMascotProps = {
  variant: StageMascotVariant
  compact?: boolean
  large?: boolean
}

function StageMascot({ variant, compact = false, large = false }: StageMascotProps) {
  const { t } = useTranslation()
  const mood = moods[variant]
  const label = t(`mascot.${variant}`)

  return (
    <div
      className={`stage-mascot-card ${variant}${compact ? ' compact' : ''}${large ? ' large' : ''}`}
      aria-label={t('mascot.aria', { mood: label })}
    >
      <span className="stage-mascot-avatar" aria-hidden="true">
        <img src={illoMascot} alt="" />
        <i>{mood.icon}</i>
      </span>
      {!compact && (
        <span className="stage-mascot-copy">
          <small>{t('mascot.helper')}</small>
          <strong>{label}</strong>
        </span>
      )}
    </div>
  )
}

export default StageMascot
