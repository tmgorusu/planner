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
        <h1 className="brand" style={{ fontSize: '1.35rem' }}>
          Challenge
        </h1>
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          Back
        </button>
      </div>

      <section className="panel">
        <p className="eyebrow">Focus beat · +{moment.xp} XP</p>
        <h2>{moment.challenge}</h2>
        <p className="note">{moment.tip}</p>
      </section>

      <div className="stage">
        <VideoPane
          src={videos.coachUrl}
          label="Coach"
          color="#ff5a7a"
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
          label="You"
          color="#3ee0c5"
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
          Loop it
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setMirrored((m) => !m)}
        >
          {mirrored ? 'Mirrored' : 'Normal'}
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
        Loops cleared: <strong>{loops}</strong> / 1 to unlock XP. Feedback after the drill — not
        live.
      </p>
      <button type="button" className="btn btn-primary" onClick={onDone} disabled={loops < 1}>
        {loops < 1 ? 'Clear one loop' : `Bank +${moment.xp} XP`}
      </button>
    </div>
  )
}
