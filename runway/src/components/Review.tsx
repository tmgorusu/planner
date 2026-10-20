import { useEffect, useRef, useState } from 'react'
import type { AnalysisResult, VideoPair } from '../lib/types'
import { Timeline } from './Timeline'
import { VideoPane } from './VideoPane'

type Props = {
  videos: VideoPair
  analysis: AnalysisResult
  onPractice: (momentId: string) => void
  onFeedback: () => void
  onHome: () => void
}

function tone(score: number) {
  if (score >= 75) return 'good'
  if (score >= 55) return 'mid'
  return 'low'
}

export function Review({ videos, analysis, onPractice, onFeedback, onHome }: Props) {
  const coachRef = useRef<HTMLVideoElement>(null)
  const studentRef = useRef<HTMLVideoElement>(null)
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)

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
      sPause()
    }
    const sPause = () => studentRef.current?.pause()
    c.addEventListener('ended', onEnded)
    return () => c.removeEventListener('ended', onEnded)
  }, [])

  return (
    <>
      <div className="topbar">
        <h1 className="brand">
          Taal<span>.</span>
        </h1>
        <button type="button" className="btn btn-ghost" onClick={onHome}>
          New
        </button>
      </div>

      <div className="stage">
        <VideoPane
          src={videos.coachUrl}
          label="Coach"
          color="#f0b429"
          poses={analysis.coachPoses}
          currentTime={time}
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
          label="You"
          color="#2dd4a8"
          poses={analysis.studentPoses}
          currentTime={time}
          videoRef={studentRef}
        />
      </div>

      <div className="controls">
        <button type="button" className="btn btn-primary" onClick={togglePlay}>
          {playing ? 'Pause' : 'Play together'}
        </button>
        <span className="sync-pill">
          Beat sync ~{Math.round(analysis.syncOffset * 1000)}ms ·{' '}
          {analysis.source === 'demo' ? 'demo poses' : 'MediaPipe'}
        </span>
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
        <h2>Section scores</h2>
        <div className="score-row">
          <div className="score-chip">
            <p className="label">Overall</p>
            <p className={`value ${tone(analysis.overallScore)}`}>{analysis.overallScore}</p>
          </div>
          {analysis.sectionScores.map((s) => (
            <div className="score-chip" key={s.id}>
              <p className="label">{s.label}</p>
              <p className={`value ${tone(s.score)}`}>{s.score}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Weakest moments</h2>
        <ul className="weak-list">
          {analysis.weakMoments.map((w, i) => (
            <li key={w.id}>
              <button type="button" className="weak-item" onClick={() => onPractice(w.id)}>
                <span className="idx">{i + 1}</span>
                <span>
                  <strong>{w.label}</strong>
                  <br />
                  <span className="note">
                    {w.start.toFixed(1)}s–{w.end.toFixed(1)}s · score {w.score}
                  </span>
                </span>
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
          Practice slow + mirrored
        </button>
        <button type="button" className="btn btn-primary" onClick={onFeedback}>
          See feedback
        </button>
      </div>
    </>
  )
}
