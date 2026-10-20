type Props = {
  coachFile: File | null
  studentFile: File | null
  onCoach: (f: File | null) => void
  onStudent: (f: File | null) => void
  onAnalyze: () => void
  onDemo: () => void
  busy?: boolean
}

export function Home({
  coachFile,
  studentFile,
  onCoach,
  onStudent,
  onAnalyze,
  onDemo,
  busy,
}: Props) {
  const ready = Boolean(coachFile && studentFile)

  return (
    <>
      <section className="hero">
        <p className="eyebrow">Bhangra-first · on-device pose</p>
        <h1 className="brand">
          Taal<span>.</span>
        </h1>
        <p className="lede">
          Upload a coach clip and your take of the same routine. Compare side-by-side, then drill
          the weakest moments — footage stays on your phone.
        </p>
        <div className="cta-row">
          <button type="button" className="btn btn-secondary" onClick={onDemo} disabled={busy}>
            Try sample Bhangra routine
          </button>
        </div>
      </section>

      <div className="upload-grid">
        <label className={`upload-tile${coachFile ? ' filled' : ''}`}>
          <strong>Coach video</strong>
          <span>{coachFile ? coachFile.name : 'Same routine, reference take'}</span>
          <input
            type="file"
            accept="video/*"
            capture="environment"
            onChange={(e) => onCoach(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className={`upload-tile${studentFile ? ' filled' : ''}`}>
          <strong>Your video</strong>
          <span>{studentFile ? studentFile.name : 'Your practice take'}</span>
          <input
            type="file"
            accept="video/*"
            capture="environment"
            onChange={(e) => onStudent(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <button
        type="button"
        className="btn btn-primary"
        disabled={!ready || busy}
        onClick={onAnalyze}
      >
        Compare after practice
      </button>
      <p className="note">
        No accounts. Pose runs in the browser with MediaPipe. Demo name <strong>Taal</strong>{' '}
        (working title was Runway).
      </p>
    </>
  )
}
