import type { AnalysisResult, Point, PoseFrame } from './types'
import { KEY_LANDMARKS } from './poseConnections'

function basePose(t: number, energy: number, phase = 0): Point[] {
  const pts: Point[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    visibility: 0.2,
  }))

  const sway = Math.sin(t * Math.PI * 2 * 0.85 + phase) * 0.04 * energy
  const bounce = Math.abs(Math.sin(t * Math.PI * 2 * 0.85 + phase)) * 0.03 * energy
  const arm = Math.sin(t * Math.PI * 2 * 0.85 + phase) * 0.18 * energy
  const knee = Math.abs(Math.sin(t * Math.PI * 2 * 0.85 + phase)) * 0.08 * energy

  const set = (i: number, x: number, y: number, v = 0.95) => {
    pts[i] = { x, y, visibility: v }
  }

  set(KEY_LANDMARKS.nose, 0.5 + sway, 0.18 - bounce)
  set(1, 0.48 + sway, 0.2 - bounce)
  set(2, 0.47 + sway, 0.2 - bounce)
  set(3, 0.45 + sway, 0.21 - bounce)
  set(4, 0.52 + sway, 0.2 - bounce)
  set(5, 0.53 + sway, 0.2 - bounce)
  set(6, 0.55 + sway, 0.21 - bounce)
  set(7, 0.44 + sway, 0.22 - bounce)
  set(8, 0.56 + sway, 0.22 - bounce)
  set(9, 0.48 + sway, 0.24 - bounce)
  set(10, 0.52 + sway, 0.24 - bounce)

  set(KEY_LANDMARKS.leftShoulder, 0.42 + sway, 0.3 - bounce)
  set(KEY_LANDMARKS.rightShoulder, 0.58 + sway, 0.3 - bounce)
  set(KEY_LANDMARKS.leftElbow, 0.32 + sway - arm * 0.3, 0.42 - bounce + Math.abs(arm) * 0.2)
  set(KEY_LANDMARKS.rightElbow, 0.68 + sway + arm * 0.3, 0.42 - bounce + Math.abs(arm) * 0.2)
  set(KEY_LANDMARKS.leftWrist, 0.28 + sway - arm, 0.28 - bounce - arm * 0.4)
  set(KEY_LANDMARKS.rightWrist, 0.72 + sway + arm, 0.28 - bounce - arm * 0.4)

  set(15 + 2, 0.26 + sway - arm, 0.26 - bounce)
  set(16 + 2, 0.74 + sway + arm, 0.26 - bounce)
  set(19, 0.27 + sway - arm, 0.27 - bounce)
  set(20, 0.73 + sway + arm, 0.27 - bounce)
  set(21, 0.29 + sway - arm, 0.29 - bounce)
  set(22, 0.71 + sway + arm, 0.29 - bounce)

  set(KEY_LANDMARKS.leftHip, 0.45 + sway * 0.6, 0.52)
  set(KEY_LANDMARKS.rightHip, 0.55 + sway * 0.6, 0.52)
  set(KEY_LANDMARKS.leftKnee, 0.44 + sway * 0.4, 0.7 + knee)
  set(KEY_LANDMARKS.rightKnee, 0.56 + sway * 0.4, 0.7 + knee * 0.7)
  set(KEY_LANDMARKS.leftAnkle, 0.43 + sway * 0.2, 0.88)
  set(KEY_LANDMARKS.rightAnkle, 0.57 + sway * 0.2, 0.88)
  set(29, 0.42, 0.92)
  set(30, 0.58, 0.92)
  set(31, 0.45, 0.93)
  set(32, 0.55, 0.93)

  return pts
}

function studentDrift(t: number, landmarks: Point[]): Point[] {
  // Intentional weak moments: arms lag mid-routine, feet rush near end, posture dips
  const lag =
    t > 2.2 && t < 3.4
      ? 0.35
      : t > 4.4 && t < 5.4
        ? 0.55
        : t > 6.0 && t < 7.0
          ? 0.4
          : 0.08

  const delayed = basePose(Math.max(0, t - lag * 0.35), 0.85, 0.4)
  return landmarks.map((p, i) => {
    const d = delayed[i]
    const mix = lag
    return {
      x: p.x * (1 - mix) + d.x * mix + (i === KEY_LANDMARKS.nose && t > 4.4 && t < 5.4 ? 0.03 : 0),
      y:
        p.y * (1 - mix) +
        d.y * mix +
        (t > 6.0 && t < 7.0 && (i === KEY_LANDMARKS.leftShoulder || i === KEY_LANDMARKS.rightShoulder)
          ? 0.04
          : 0),
      visibility: Math.min(p.visibility ?? 1, d.visibility ?? 1),
    }
  })
}

export function buildDemoAnalysis(duration = 8): AnalysisResult {
  const fps = 12
  const coachPoses: PoseFrame[] = []
  const studentPoses: PoseFrame[] = []

  for (let i = 0; i <= duration * fps; i++) {
    const t = i / fps
    const coach = basePose(t, 1, 0)
    coachPoses.push({ t, landmarks: coach })
    studentPoses.push({ t, landmarks: studentDrift(t, coach) })
  }

  const bpm = 96
  const beatGap = 60 / bpm
  const beatTimes: number[] = []
  for (let t = 0; t < duration; t += beatGap) beatTimes.push(Number(t.toFixed(3)))

  return {
    duration,
    coachPoses,
    studentPoses,
    beatTimes,
    syncOffset: 0.12,
    sectionScores: [
      { id: 'intro', label: 'Intro bounce', score: 86, start: 0, end: 2.2 },
      { id: 'arms', label: 'Arm swings', score: 62, start: 2.2, end: 4.4 },
      { id: 'jhummar', label: 'Shoulder pulse', score: 54, start: 4.4, end: 6.0 },
      { id: 'finish', label: 'Finish posture', score: 58, start: 6.0, end: 8.0 },
    ],
    weakMoments: [
      {
        id: 'w1',
        label: 'Arm height lag',
        start: 2.4,
        end: 3.3,
        tip: 'Match the coach’s wrist height on the upswing — keep elbows soft, not locked.',
        score: 48,
      },
      {
        id: 'w2',
        label: 'Shoulder pulse',
        start: 4.5,
        end: 5.3,
        tip: 'Pulse from the upper back. Keep the chest lifted while shoulders bounce on the beat.',
        score: 42,
      },
      {
        id: 'w3',
        label: 'Finish stance',
        start: 6.1,
        end: 6.9,
        tip: 'Plant both feet under the hips and hold the final frame for a full beat.',
        score: 45,
      },
    ],
    overallScore: 65,
    source: 'demo',
  }
}
