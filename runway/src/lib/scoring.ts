import type { AnalysisResult, PoseFrame, SectionScore, WeakMoment } from './types'
import { KEY_LANDMARKS } from './poseConnections'

function nearestFrame(frames: PoseFrame[], t: number): PoseFrame | null {
  if (!frames.length) return null
  let best = frames[0]
  let bestD = Math.abs(best.t - t)
  for (const f of frames) {
    const d = Math.abs(f.t - t)
    if (d < bestD) {
      best = f
      bestD = d
    }
  }
  return best
}

function landmarkDistance(a: PoseFrame, b: PoseFrame): number {
  const keys = Object.values(KEY_LANDMARKS)
  let sum = 0
  let n = 0
  for (const i of keys) {
    const pa = a.landmarks[i]
    const pb = b.landmarks[i]
    if (!pa || !pb) continue
    if ((pa.visibility ?? 1) < 0.4 || (pb.visibility ?? 1) < 0.4) continue
    const dx = pa.x - pb.x
    const dy = pa.y - pb.y
    sum += Math.hypot(dx, dy)
    n++
  }
  return n ? sum / n : 1
}

/** Simple similarity score 0–100 from pose distance. */
export function frameScore(coach: PoseFrame, student: PoseFrame): number {
  const d = landmarkDistance(coach, student)
  return Math.max(0, Math.min(100, Math.round(100 - d * 220)))
}

export function buildBeatTimes(duration: number, bpm = 96): number[] {
  const gap = 60 / bpm
  const beats: number[] = []
  for (let t = 0; t < duration; t += gap) beats.push(Number(t.toFixed(3)))
  return beats
}

/**
 * Compare sampled poses, produce section scores + ~3 weakest windows.
 * Beat sync is a light visual offset estimate (not production DTW).
 */
export function analyzePoses(
  coachPoses: PoseFrame[],
  studentPoses: PoseFrame[],
  duration: number,
  source: 'mediapipe' | 'demo',
): AnalysisResult {
  const sampleEvery = 0.12
  const series: { t: number; score: number }[] = []

  for (let t = 0; t <= duration; t += sampleEvery) {
    const c = nearestFrame(coachPoses, t)
    const s = nearestFrame(studentPoses, t)
    if (!c || !s) continue
    series.push({ t, score: frameScore(c, s) })
  }

  const sectionDefs = [
    { id: 'open', label: 'Opening', start: 0, end: duration * 0.25 },
    { id: 'flow', label: 'Mid flow', start: duration * 0.25, end: duration * 0.5 },
    { id: 'peak', label: 'Peak move', start: duration * 0.5, end: duration * 0.75 },
    { id: 'close', label: 'Closeout', start: duration * 0.75, end: duration },
  ]

  const sectionScores: SectionScore[] = sectionDefs.map((sec) => {
    const pts = series.filter((p) => p.t >= sec.start && p.t < sec.end)
    const avg = pts.length ? pts.reduce((a, p) => a + p.score, 0) / pts.length : 70
    return { ...sec, score: Math.round(avg) }
  })

  const win = Math.max(0.7, duration * 0.1)
  const candidates: WeakMoment[] = []
  for (let t = 0; t < duration - win; t += win * 0.45) {
    const pts = series.filter((p) => p.t >= t && p.t <= t + win)
    if (pts.length < 3) continue
    const avg = pts.reduce((a, p) => a + p.score, 0) / pts.length
    candidates.push({
      id: `w-${t.toFixed(1)}`,
      label: avg < 55 ? 'Form drift' : 'Timing gap',
      challenge: avg < 55 ? 'Lock the shape' : 'Snap to the beat',
      start: Number(t.toFixed(2)),
      end: Number((t + win).toFixed(2)),
      tip:
        avg < 50
          ? 'Slow the loop and match shoulder line + wrist height to the coach.'
          : 'Stay on the beat — land each accent with the coach.',
      score: Math.round(avg),
      xp: avg < 50 ? 50 : 40,
    })
  }

  candidates.sort((a, b) => a.score - b.score)
  const weakMoments = candidates.slice(0, 3).sort((a, b) => a.start - b.start)
  const labels = ['Line match', 'Timing snap', 'Finish hold']
  const challenges = ['Copy the coach line', 'Hit the accent', 'Freeze the frame']
  weakMoments.forEach((w, i) => {
    w.id = `w${i + 1}`
    w.label = labels[i] ?? w.label
    w.challenge = challenges[i] ?? w.challenge
    w.xp = 35 + i * 10
  })

  const overallScore = series.length
    ? Math.round(series.reduce((a, p) => a + p.score, 0) / series.length)
    : 70

  const syncOffset = Number(
    (
      series.slice(0, 20).reduce((acc, _, i) => {
        if (i === 0) return acc
        return acc + (series[i].score - series[i - 1].score) * 0.002
      }, 0.08)
    ).toFixed(2),
  )

  const fallback: WeakMoment[] = [
    {
      id: 'w1',
      label: 'Line match',
      challenge: 'Copy the coach line',
      start: duration * 0.3,
      end: duration * 0.4,
      tip: 'Match shoulder line and wrist height to the coach.',
      score: 48,
      xp: 40,
    },
    {
      id: 'w2',
      label: 'Timing snap',
      challenge: 'Hit the accent',
      start: duration * 0.55,
      end: duration * 0.65,
      tip: 'Land the accent with the coach’s downbeat.',
      score: 44,
      xp: 45,
    },
    {
      id: 'w3',
      label: 'Finish hold',
      challenge: 'Freeze the frame',
      start: duration * 0.78,
      end: duration * 0.9,
      tip: 'Plant and hold the final frame for a full beat.',
      score: 46,
      xp: 50,
    },
  ]

  return {
    duration,
    coachPoses,
    studentPoses,
    beatTimes: buildBeatTimes(duration),
    syncOffset: Math.min(0.25, Math.max(0.05, Math.abs(syncOffset))),
    sectionScores,
    weakMoments: weakMoments.length >= 3 ? weakMoments : fallback,
    overallScore,
    source,
  }
}
