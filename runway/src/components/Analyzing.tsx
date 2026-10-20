type Props = {
  progress: number
  message: string
}

export function Analyzing({ progress, message }: Props) {
  const pct = Math.round(progress * 100)
  return (
    <section className="panel progress-block">
      <h2 className="brand" style={{ fontSize: '1.5rem' }}>
        Scoring
      </h2>
      <p className="state-line">{message}</p>
      <div className="progress-bar" aria-valuenow={pct}>
        <i style={{ width: `${pct}%` }} />
      </div>
      <p className="note">{pct}%</p>
    </section>
  )
}
