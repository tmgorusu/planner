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
        <h1 className="brand">
          Taal<span>.</span>
        </h1>
        <p className="lede">Compare coach and student video. Pose stays on this device.</p>
        <StatsBar stats={stats} />
        <div className="cta-row">
          <button type="button" className="btn btn-secondary" onClick={onDemo} disabled={busy}>
            Open Mahal sample
          </button>
        </div>
      </section>

      <div className="upload-grid">
        <label className={`upload-tile${coachFile ? ' filled' : ''}`}>
          <strong>Coach</strong>
          <span>{coachFile ? coachFile.name : 'Add coach video'}</span>
          <input
            type="file"
            accept="video/*"
            capture="environment"
            onChange={(e) => onCoach(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className={`upload-tile${studentFile ? ' filled' : ''}`}>
          <strong>Student</strong>
          <span>{studentFile ? studentFile.name : 'Add student video'}</span>
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
        Score
      </button>
      <p className="note">No account. Sample is Mahal — any style works for uploads.</p>
    </>
  )
}
