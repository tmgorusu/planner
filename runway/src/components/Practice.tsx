import { useEffect, useRef, useState } from 'react'
import type { AnalysisResult, VideoPair, WeakMoment } from '../lib/types'
import { VideoPane } from './VideoPane'

type Props = {
  videos: VideoPair
  analysis: AnalysisResult
  moment: WeakMoment
  onBack: () => void
  onDone: () => void
}

export function Practice({ videos, analysis, moment, onBack, onDone }: Props) {
  const coachRef = useRef<HTMLVideoElement>(null)
  const studentRef = useRef<HTMLVideoElement>(null)
  const [time, setTime] = useState(moment.start)
  const [mirrored, setMirrored] = useState(true)
  const [rate, setRate] = useState(0.5)
  const [loops, setLoops] = useState(0)
  const poseOnly = Boolean(videos.poseOnly)

  useEffect(() => {
    const c = coachRef.current
    const s = studentRef.current
    if (!c || !s) return
    c.currentTime = moment.start
    s.currentTime = moment.start
    setTime(moment.start)
    setLoops(0)
  }, [moment])

  useEffect(() => {
    const c = coachRef.current
    if (!c) return

    const onTick = () => {
      if (c.currentTime >= moment.end) {
        c.currentTime = moment.start
        if (studentRef.current) studentRef.current.currentTime = moment.start
        setLoops((n) => n + 1)
      }
    }

    c.addEventListener('timeupdate', onTick)
    return () => c.removeEventListener('timeupdate', onTick)
  }, [moment])

  const playLoop = async () => {
    const c = coachRef.current
    const s = studentRef.current
    if (!c || !s) return
    c.currentTime = moment.start
    s.currentTime = moment.start
    await Promise.all([c.play(), s.play()])
  }

  return (
    <div className="practice-stage">
      <div className="topbar">
        <h1 className="brand" style={{ fontSize: '1.2rem' }}>
          Practice
        </h1>
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          Back
        </button>
      </div>

      <section className="panel">
        <h2>{moment.label}</h2>
        <p className="note">{moment.tip}</p>
        <p className="state-line">+{moment.xp} XP when you finish one loop.</p>
      </section>

      <div className="stage">
        <VideoPane
          src={videos.coachUrl}
          label="Coach"
          color="#e84d6a"
          poses={analysis.coachPoses}
          currentTime={time}
          mirrored={mirrored}
          poseOnly={poseOnly}
          videoRef={coachRef}
          playbackRate={rate}
          onTimeUpdate={(t) => {
            setTime(t)
            if (studentRef.current && Math.abs(studentRef.current.currentTime - t) > 0.2) {
              studentRef.current.currentTime = t
            }
          }}
        />
        <VideoPane
          src={videos.studentUrl}
          label="Student"
          color="#2ec4a8"
          poses={analysis.studentPoses}
          currentTime={time}
          mirrored={mirrored}
          poseOnly={poseOnly}
          videoRef={studentRef}
          playbackRate={rate}
        />
      </div>

      <div className="controls">
        <button type="button" className="btn btn-primary" onClick={playLoop}>
          Loop
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setMirrored((m) => !m)}
        >
          {mirrored ? 'Mirror on' : 'Mirror off'}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setRate((r) => (r === 0.5 ? 0.75 : r === 0.75 ? 1 : 0.5))}
        >
          {rate}×
        </button>
      </div>
      <p className="note">
        Loops: {loops}/1
      </p>
      <button type="button" className="btn btn-primary" onClick={onDone} disabled={loops < 1}>
        {loops < 1 ? 'Loop once to continue' : `Finish (+${moment.xp} XP)`}
      </button>
    </div>
  )
}
