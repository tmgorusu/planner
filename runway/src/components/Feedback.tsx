import type { AnalysisResult } from '../lib/types'

type Props = {
  analysis: AnalysisResult
  practicedLabel?: string
  onAgain: () => void
  onHome: () => void
}

export function Feedback({ analysis, practicedLabel, onAgain, onHome }: Props) {
  const weakest = [...analysis.weakMoments].sort((a, b) => a.score - b.score)[0]

  return (
    <section className="panel feedback-hero">
      <p className="eyebrow">After practice</p>
      <h1 className="brand" style={{ fontSize: '2.2rem' }}>
        Nice work
      </h1>
      <p className="big-score">{analysis.overallScore}</p>
      <p className="lede" style={{ margin: '0 auto 1rem' }}>
        Overall match to coach. {practicedLabel ? `You drilled “${practicedLabel}”.` : ''} Keep the
        bounce grounded and the arms sharp on the upbeat.
      </p>
      <p className="note">
        Next focus: <strong>{weakest?.label ?? 'Shoulder pulse'}</strong> — {weakest?.tip}
      </p>
      <div className="cta-row" style={{ marginTop: '1.25rem' }}>
        <button type="button" className="btn btn-primary" onClick={onAgain}>
          Practice again
        </button>
        <button type="button" className="btn btn-ghost" onClick={onHome}>
          New routine
        </button>
      </div>
    </section>
  )
}
