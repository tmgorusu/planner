import { rankTitle, vibeLine, xpForLevel } from '../lib/game'
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

  return (
    <section className="panel feedback-hero">
      <p className="eyebrow">Run complete</p>
      <h1 className="brand" style={{ fontSize: '2rem' }}>
        Nice hit
      </h1>
      <p className="big-score">{analysis.overallScore}</p>
      <p className="lede" style={{ margin: '0 auto 0.75rem' }}>
        {vibeLine(analysis.overallScore)}
      </p>
      {xpGained > 0 && (
        <p className="sync-pill" style={{ margin: '0 auto 0.75rem' }}>
          +{xpGained} XP banked
          {practicedLabel ? ` · drilled “${practicedLabel}”` : ''}
        </p>
      )}
      <StatsBar stats={stats} />
      <p className="note" style={{ marginTop: '0.9rem' }}>
        You’re <strong>{rankTitle(stats.level)}</strong> · {stats.xp}/{need} to next level. Next
        focus: <strong>{weakest?.challenge ?? 'Timing snap'}</strong> — {weakest?.tip}
      </p>
      <div className="cta-row" style={{ marginTop: '1.25rem' }}>
        <button type="button" className="btn btn-primary" onClick={onAgain}>
          Next challenge
        </button>
        <button type="button" className="btn btn-ghost" onClick={onHome}>
          New routine
        </button>
      </div>
    </section>
  )
}
