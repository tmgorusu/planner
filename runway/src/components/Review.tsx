import { useEffect, useRef, useState } from 'react'
import { xpForLevel } from '../lib/game'
import type { AnalysisResult, PlayerStats, VideoPair } from '../lib/types'
import { StatsBar } from './StatsBar'
import { Timeline } from './Timeline'
import { VideoPane } from './VideoPane'

type Props = {
  videos: VideoPair
  analysis: AnalysisResult
  stats: PlayerStats
  onPractice: (momentId: string) => void
  onFeedback: () => void
  onHome: () => void
}

function tone(score: number) {
  if (score >= 75) return 'good'
  if (score >= 55) return 'mid'
  return 'low'
}

export function Review({ videos, analysis, stats, onPractice, onFeedback, onHome }: Props) {
  const coachRef = useRef<HTMLVideoElement>(null)
  const studentRef = useRef<HTMLVideoElement>(null)
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const poseOnly = Boolean(videos.poseOnly)

  const syncSeek = (t: number) => {
    setTime(t)
    if (coachRef.current) coachRef.current.currentTime = t
    if (studentRef.current) studentRef.current.currentTime = Math.max(0, t - analysis.syncOffset * 0.15)
  }

  const togglePlay = async () => {
    const c = coachRef.current
    const s = studentRef.current
    if (!c || !s) return
    if (playing) {
      c.pause()
      s.pause()
      setPlaying(false)
      return
    }
    try {
      await Promise.all([c.play(), s.play()])
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }

  useEffect(() => {
    const c = coachRef.current
    if (!c) return
    const onEnded = () => {
      setPlaying(false)
      studentRef.current?.pause()
    }
    c.addEventListener('ended', onEnded)
    return () => c.removeEventListener('ended', onEnded)
  }, [])

  const need = xpForLevel(stats.level)
  const xpPct = Math.min(100, Math.round((stats.xp / need) * 100))

  return (
    <>
      <div className="topbar">
        <h1 className="brand">
          Taal<span>.</span>
        </h1>
        <button type="button" className="btn btn-ghost" onClick={onHome}>
          Home
        </button>
      </div>

      <StatsBar stats={stats} />

      <div className="stage">
        <VideoPane
          src={videos.coachUrl}
          label="Coach"
          color="#e84d6a"
          poses={analysis.coachPoses}
          currentTime={time}
          poseOnly={poseOnly}
          videoRef={coachRef}
          onTimeUpdate={(t) => {
            setTime(t)
            if (studentRef.current && Math.abs(studentRef.current.currentTime - t) > 0.18) {
              studentRef.current.currentTime = Math.max(0, t - analysis.syncOffset * 0.15)
            }
          }}
        />
        <VideoPane
          src={videos.studentUrl}
          label="Student"
          color="#2ec4a8"
          poses={analysis.studentPoses}
          currentTime={time}
          poseOnly={poseOnly}
          videoRef={studentRef}
        />
      </div>

      <div className="controls">
        <button type="button" className="btn btn-primary" onClick={togglePlay}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <span className="sync-pill">
          Sync {Math.round(analysis.syncOffset * 1000)}ms
          {analysis.source === 'demo' ? ' · sample' : ' · MediaPipe'}
        </span>
        {analysis.routineName && <span className="routine-chip">{analysis.routineName}</span>}
      </div>

      <Timeline
        duration={analysis.duration}
        currentTime={time}
        beatTimes={analysis.beatTimes}
        weakMoments={analysis.weakMoments}
        syncOffset={analysis.syncOffset}
        onSeek={syncSeek}
      />

      <section className="panel">
        <div className="match-hero">
          <div className={`match-score ${tone(analysis.overallScore)}`}>{analysis.overallScore}</div>
          <div>
            <h2 style={{ margin: 0 }}>Match</h2>
            <p className="note">
              Level {stats.level} · {stats.xp}/{need} XP
            </p>
            <div className="xp-track">
              <i style={{ width: `${xpPct}%` }} />
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Sections</h2>
        <div className="section-rail">
          {analysis.sectionScores.map((s) => (
            <div className="section-pip" key={s.id}>
              <p className="label">{s.label}</p>
              <p className={`value ${tone(s.score)}`}>{s.score}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Weak spots</h2>
        <p className="note" style={{ marginBottom: '0.5rem' }}>
          Tap a spot to practice.
        </p>
        <ul className="challenge-list">
          {analysis.weakMoments.map((w, i) => (
            <li key={w.id}>
              <button type="button" className="challenge-item" onClick={() => onPractice(w.id)}>
                <span className="idx">{i + 1}</span>
                <span>
                  <strong>{w.label}</strong>
                  <br />
                  <span className="note">
                    {w.start.toFixed(1)}–{w.end.toFixed(1)}s · {w.score}
                  </span>
                </span>
                <span className="xp-badge">+{w.xp} XP</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="cta-row">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onPractice(analysis.weakMoments[0]?.id ?? 'w1')}
        >
          Practice first spot
        </button>
        <button type="button" className="btn btn-primary" onClick={onFeedback}>
          Done
        </button>
      </div>
    </>
  )
}
