import { useRef } from 'react'
import type { PlayerStats } from '../lib/types'
import { StatsBar } from './StatsBar'

/** Prefer library pickers on iOS/Android — no `capture` (that jumps to camera). */
const VIDEO_ACCEPT = 'video/*,video/mp4,video/quicktime,video/webm,video/x-m4v,.mp4,.mov,.m4v,.webm'

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
  const coachInputRef = useRef<HTMLInputElement>(null)
  const studentInputRef = useRef<HTMLInputElement>(null)

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
        <div className={`upload-tile${coachFile ? ' filled' : ''}`}>
          <strong>Coach</strong>
          <span className="upload-name">
            {coachFile ? coachFile.name : 'No video chosen'}
          </span>
          <input
            ref={coachInputRef}
            type="file"
            accept={VIDEO_ACCEPT}
            className="sr-only"
            aria-label="Choose coach video"
            onChange={(e) => {
              onCoach(e.target.files?.[0] ?? null)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            className="btn btn-ghost upload-pick"
            disabled={busy}
            onClick={() => coachInputRef.current?.click()}
          >
            Choose coach video
          </button>
        </div>
        <div className={`upload-tile${studentFile ? ' filled' : ''}`}>
          <strong>Student</strong>
          <span className="upload-name">
            {studentFile ? studentFile.name : 'No video chosen'}
          </span>
          <input
            ref={studentInputRef}
            type="file"
            accept={VIDEO_ACCEPT}
            className="sr-only"
            aria-label="Choose your video"
            onChange={(e) => {
              onStudent(e.target.files?.[0] ?? null)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            className="btn btn-ghost upload-pick"
            disabled={busy}
            onClick={() => studentInputRef.current?.click()}
          >
            Choose your video
          </button>
        </div>
      </div>

      <button
        type="button"
        className="btn btn-primary"
        disabled={!ready || busy}
        onClick={onAnalyze}
      >
        Score
      </button>
      <p className="note">
        Choose videos from Photos. No account. Sample is Mahal — any style works for uploads.
      </p>
    </>
  )
}
