type Props = {
  progress: number
  message: string
}

export function Analyzing({ progress, message }: Props) {
  return (
    <section className="panel progress-block">
      <p className="eyebrow">Reading pose · client-side</p>
      <h2 className="brand" style={{ fontSize: '2rem' }}>
        Finding the weak beats
      </h2>
      <p className="lede" style={{ margin: '0 auto' }}>
        {message}
      </p>
      <div className="progress-bar" aria-valuenow={Math.round(progress * 100)}>
        <i style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <p className="note">{Math.round(progress * 100)}%</p>
    </section>
  )
}
