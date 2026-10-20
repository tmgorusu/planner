import { resultLine, xpForLevel } from '../lib/game'
import type { AnalysisResult, PlayerStats } from '../lib/types'
import { StatsBar } from './StatsBar'

type Props = {
  analysis: AnalysisResult
  stats: PlayerStats
  practicedLabel?: string
  xpGained?: number
  onAgain: () => void
  onHome: () => void
}

export function Feedback({
  analysis,
  stats,
  practicedLabel,
  xpGained = 0,
  onAgain,
  onHome,
}: Props) {
  const weakest = [...analysis.weakMoments].sort((a, b) => a.score - b.score)[0]
  const need = xpForLevel(stats.level)
  const lines = resultLine(analysis.overallScore)

  return (
    <section className="panel feedback-hero">
      <p className="eyebrow">Result</p>
      <p className="big-score">{analysis.overallScore}</p>
      <p className="state-line">{lines.happened}</p>
      {xpGained > 0 && (
        <p className="state-line">
          +{xpGained} XP
          {practicedLabel ? ` · practiced ${practicedLabel}` : ''}.
        </p>
      )}
      <StatsBar stats={stats} />
      <p className="state-line next" style={{ marginTop: '0.75rem' }}>
        Next: {weakest?.tip ?? lines.next} ({stats.xp}/{need} XP to level {stats.level + 1})
      </p>
      <div className="cta-row" style={{ marginTop: '1rem' }}>
        <button type="button" className="btn btn-primary" onClick={onAgain}>
          Practice next spot
        </button>
        <button type="button" className="btn btn-ghost" onClick={onHome}>
          Home
        </button>
      </div>
    </section>
  )
}
