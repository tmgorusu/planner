import type { PlayerStats } from '../lib/types'
import { StatsBar } from './StatsBar'

type Props = {
  coachFile: File | null
  studentFile: File | null
  onCoach: (f: File | null) => void
  onStudent: (f: File | null) => void
  onAnalyze: () => void
  onDemo: () => void
  stats: PlayerStats
  busy?: boolean
}

export function Home({
  coachFile,
  studentFile,
  onCoach,
  onStudent,
  onAnalyze,
  onDemo,
  stats,
  busy,
}: Props) {
  const ready = Boolean(coachFile && studentFile)

  return (
    <>
      <section className="hero">
        <p className="eyebrow">Coach vs you · on-device pose</p>
        <h1 className="brand">
          Taal<span>.</span>
        </h1>
        <p className="lede">
          Drop a coach clip and your take. Stack focus beats, clear drills, climb levels — footage
          never leaves your phone.
        </p>
        <StatsBar stats={stats} />
        <div className="cta-row">
          <button type="button" className="btn btn-secondary" onClick={onDemo} disabled={busy}>
            Try sample: Mahal step
          </button>
        </div>
      </section>

      <div className="upload-grid">
        <label className={`upload-tile${coachFile ? ' filled' : ''}`}>
          <strong>Coach video</strong>
          <span>{coachFile ? coachFile.name : 'Reference take of the routine'}</span>
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
        Score my take
      </button>
      <p className="note">
        Any style welcome. Pose runs in-browser with MediaPipe. No accounts. Sample routine is one
        Mahal step — not the brand.
      </p>
    </>
  )
}
