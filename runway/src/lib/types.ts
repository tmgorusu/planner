export type Point = { x: number; y: number; z?: number; visibility?: number }

export type PoseFrame = {
  t: number
  landmarks: Point[]
}

export type WeakMoment = {
  id: string
  label: string
  start: number
  end: number
  tip: string
  score: number
  xp: number
  challenge: string
}

export type SectionScore = {
  id: string
  label: string
  score: number
  start: number
  end: number
}

export type AnalysisResult = {
  duration: number
  coachPoses: PoseFrame[]
  studentPoses: PoseFrame[]
  beatTimes: number[]
  syncOffset: number
  sectionScores: SectionScore[]
  weakMoments: WeakMoment[]
  overallScore: number
  source: 'mediapipe' | 'demo'
  routineName?: string
}

export type AppPhase =
  | 'home'
  | 'analyzing'
  | 'review'
  | 'practice'
  | 'feedback'

export type VideoPair = {
  coachUrl: string
  studentUrl: string
  coachName: string
  studentName: string
  poseOnly?: boolean
}

export type PlayerStats = {
  xp: number
  level: number
  streak: number
  drillsCleared: number
}
