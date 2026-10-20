import { useCallback, useMemo, useState } from 'react'
import { Analyzing } from './components/Analyzing'
import { Feedback } from './components/Feedback'
import { Home } from './components/Home'
import { Practice } from './components/Practice'
import { Review } from './components/Review'
import { buildDemoAnalysis } from './lib/demoPoses'
import { extractPosesFromVideo, waitForVideoMeta } from './lib/poseEngine'
import { analyzePoses } from './lib/scoring'
import type { AnalysisResult, AppPhase, VideoPair, WeakMoment } from './lib/types'

function loadVideoEl(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video')
    v.preload = 'auto'
    v.muted = true
    v.playsInline = true
    v.src = url
    v.onloadedmetadata = () => resolve(v)
    v.onerror = () => reject(new Error('Failed to load video'))
  })
}

export default function App() {
  const [phase, setPhase] = useState<AppPhase>('home')
  const [coachFile, setCoachFile] = useState<File | null>(null)
  const [studentFile, setStudentFile] = useState<File | null>(null)
  const [videos, setVideos] = useState<VideoPair | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('Preparing…')
  const [activeMomentId, setActiveMomentId] = useState<string | null>(null)
  const [practicedLabel, setPracticedLabel] = useState<string | undefined>()

  const activeMoment: WeakMoment | null = useMemo(() => {
    if (!analysis || !activeMomentId) return null
    return analysis.weakMoments.find((w) => w.id === activeMomentId) ?? analysis.weakMoments[0]
  }, [analysis, activeMomentId])

  const revokePair = useCallback((pair: VideoPair | null) => {
    if (!pair) return
    if (pair.coachUrl.startsWith('blob:')) URL.revokeObjectURL(pair.coachUrl)
    if (pair.studentUrl.startsWith('blob:')) URL.revokeObjectURL(pair.studentUrl)
  }, [])

  const resetHome = () => {
    revokePair(videos)
    setVideos(null)
    setAnalysis(null)
    setCoachFile(null)
    setStudentFile(null)
    setActiveMomentId(null)
    setPracticedLabel(undefined)
    setPhase('home')
  }

  const runDemo = async () => {
    revokePair(videos)
    setPhase('analyzing')
    setProgress(0.15)
    setMessage('Loading sample Bhangra routine…')

    const pair: VideoPair = {
      coachUrl: `${import.meta.env.BASE_URL}demo/coach.mp4`,
      studentUrl: `${import.meta.env.BASE_URL}demo/student.mp4`,
      coachName: 'Sample coach',
      studentName: 'Sample student',
    }
    setVideos(pair)

    // Visual progress while we build synthetic pose tracks
    for (let p = 0.2; p <= 0.9; p += 0.15) {
      setProgress(p)
      setMessage(p < 0.5 ? 'Tracing coach skeleton…' : 'Comparing your take…')
      await new Promise((r) => setTimeout(r, 220))
    }

    const result = buildDemoAnalysis(8)
    setAnalysis(result)
    setProgress(1)
    setPhase('review')
  }

  const runUploadAnalysis = async () => {
    if (!coachFile || !studentFile) return
    revokePair(videos)
    setPhase('analyzing')
    setProgress(0)
    setMessage('Loading videos…')

    const coachUrl = URL.createObjectURL(coachFile)
    const studentUrl = URL.createObjectURL(studentFile)
    const pair: VideoPair = {
      coachUrl,
      studentUrl,
      coachName: coachFile.name,
      studentName: studentFile.name,
    }
    setVideos(pair)

    try {
      const coachEl = await loadVideoEl(coachUrl)
      const studentEl = await loadVideoEl(studentUrl)
      await Promise.all([waitForVideoMeta(coachEl), waitForVideoMeta(studentEl)])

      const duration = Math.min(coachEl.duration || 8, studentEl.duration || 8, 30)

      setMessage('Tracing coach pose (on-device)…')
      const coachPoses = await extractPosesFromVideo(coachEl, (p) => {
        setProgress(p * 0.48)
      })

      setMessage('Tracing your pose (on-device)…')
      const studentPoses = await extractPosesFromVideo(studentEl, (p) => {
        setProgress(0.5 + p * 0.45)
      })

      setMessage('Scoring sections…')
      const detected =
        coachPoses.some((f) => f.landmarks.length > 0) &&
        studentPoses.some((f) => f.landmarks.length > 0)

      // If MediaPipe couldn't see a person, fall back to demo poses so the UI still works
      const result = detected
        ? analyzePoses(coachPoses, studentPoses, duration, 'mediapipe')
        : { ...buildDemoAnalysis(Math.max(4, Math.min(duration, 8))), source: 'demo' as const }

      if (!detected) {
        setMessage('No clear person detected — showing demo-style feedback on your clips.')
        await new Promise((r) => setTimeout(r, 600))
      }

      setAnalysis(result)
      setProgress(1)
      setPhase('review')
    } catch (err) {
      console.error(err)
      setMessage('Analysis failed — loading demo feedback instead.')
      setAnalysis(buildDemoAnalysis(8))
      setProgress(1)
      setPhase('review')
    }
  }

  return (
    <main className="app-shell">
      {phase === 'home' && (
        <Home
          coachFile={coachFile}
          studentFile={studentFile}
          onCoach={setCoachFile}
          onStudent={setStudentFile}
          onAnalyze={runUploadAnalysis}
          onDemo={runDemo}
        />
      )}
      {phase === 'analyzing' && <Analyzing progress={progress} message={message} />}
      {phase === 'review' && videos && analysis && (
        <Review
          videos={videos}
          analysis={analysis}
          onPractice={(id) => {
            setActiveMomentId(id)
            setPhase('practice')
          }}
          onFeedback={() => setPhase('feedback')}
          onHome={resetHome}
        />
      )}
      {phase === 'practice' && videos && analysis && activeMoment && (
        <Practice
          videos={videos}
          analysis={analysis}
          moment={activeMoment}
          onBack={() => setPhase('review')}
          onDone={() => {
            setPracticedLabel(activeMoment.label)
            setPhase('feedback')
          }}
        />
      )}
      {phase === 'feedback' && analysis && (
        <Feedback
          analysis={analysis}
          practicedLabel={practicedLabel}
          onAgain={() => {
            setActiveMomentId(analysis.weakMoments[0]?.id ?? null)
            setPhase('practice')
          }}
          onHome={resetHome}
        />
      )}
    </main>
  )
}
