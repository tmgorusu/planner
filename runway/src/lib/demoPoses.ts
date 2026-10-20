import type { AnalysisResult, Point, PoseFrame } from './types'
import { KEY_LANDMARKS } from './poseConnections'

/**
 * Keyframed Mahal — classic Bhangra bounce with high arm pumps.
 * Cycle reads as: deep bounce + fists at temple → spring up + arms high
 * → alternate weight → settle. Intentionally readable as that step.
 */
function emptyPose(): Point[] {
  return Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.15 }))
}

function set(pts: Point[], i: number, x: number, y: number, v = 0.97) {
  pts[i] = { x, y, visibility: v }
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function smoothstep(t: number) {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/** One Mahal bounce cycle in [0,1]. */
function mahalKey(u: number, side: 1 | -1 = 1): Point[] {
  const pts = emptyPose()
  // 0–0.5 downbeat crouch + arm pump up; 0.5–1 spring + open
  const down = u < 0.5 ? smoothstep(u * 2) : smoothstep(2 - u * 2)
  const bounceY = lerp(0.02, 0.07, down)
  const kneeBend = lerp(0.02, 0.1, down)
  const armPump = u < 0.5 ? smoothstep(u * 2) : smoothstep((u - 0.5) * 2)
  // Arms stay elevated (Mahal signature): temple line → above head
  const wristY = lerp(0.2, 0.05, armPump)
  const elbowY = lerp(0.28, 0.14, armPump)
  const wristSpread = lerp(0.14, 0.22, armPump)
  const shoulderLift = lerp(0, 0.025, armPump)
  const sway = side * lerp(-0.02, 0.035, Math.sin(u * Math.PI))
  const chest = 0.5 + sway * 0.4

  // Face / head
  set(pts, KEY_LANDMARKS.nose, chest, 0.16 - bounceY + shoulderLift * 0.3)
  set(pts, 1, chest - 0.02, 0.18 - bounceY)
  set(pts, 2, chest - 0.03, 0.18 - bounceY)
  set(pts, 3, chest - 0.05, 0.19 - bounceY)
  set(pts, 4, chest + 0.02, 0.18 - bounceY)
  set(pts, 5, chest + 0.03, 0.18 - bounceY)
  set(pts, 6, chest + 0.05, 0.19 - bounceY)
  set(pts, 7, chest - 0.06, 0.2 - bounceY)
  set(pts, 8, chest + 0.06, 0.2 - bounceY)
  set(pts, 9, chest - 0.02, 0.22 - bounceY)
  set(pts, 10, chest + 0.02, 0.22 - bounceY)

  // Torso — proud upright Mahal carriage
  set(pts, KEY_LANDMARKS.leftShoulder, chest - 0.1, 0.28 - bounceY - shoulderLift)
  set(pts, KEY_LANDMARKS.rightShoulder, chest + 0.1, 0.28 - bounceY - shoulderLift)

  // High bent elbows, fists pumping near / above head
  set(pts, KEY_LANDMARKS.leftElbow, chest - 0.16 - wristSpread * 0.15, elbowY - bounceY)
  set(pts, KEY_LANDMARKS.rightElbow, chest + 0.16 + wristSpread * 0.15, elbowY - bounceY)
  set(pts, KEY_LANDMARKS.leftWrist, chest - wristSpread, wristY - bounceY)
  set(pts, KEY_LANDMARKS.rightWrist, chest + wristSpread, wristY - bounceY)

  // Hands
  set(pts, 17, chest - wristSpread - 0.01, wristY - bounceY - 0.01)
  set(pts, 18, chest + wristSpread + 0.01, wristY - bounceY - 0.01)
  set(pts, 19, chest - wristSpread, wristY - bounceY + 0.01)
  set(pts, 20, chest + wristSpread, wristY - bounceY + 0.01)
  set(pts, 21, chest - wristSpread + 0.01, wristY - bounceY)
  set(pts, 22, chest + wristSpread - 0.01, wristY - bounceY)

  // Hips & bouncing knees (in-place Mahal hop)
  set(pts, KEY_LANDMARKS.leftHip, chest - 0.06, 0.5 - bounceY * 0.4)
  set(pts, KEY_LANDMARKS.rightHip, chest + 0.06, 0.5 - bounceY * 0.4)

  const leftLead = side < 0 ? 1.15 : 0.85
  const rightLead = side > 0 ? 1.15 : 0.85
  set(pts, KEY_LANDMARKS.leftKnee, chest - 0.07 + sway * 0.2, 0.68 + kneeBend * leftLead - bounceY * 0.2)
  set(pts, KEY_LANDMARKS.rightKnee, chest + 0.07 + sway * 0.2, 0.68 + kneeBend * rightLead - bounceY * 0.2)
  set(pts, KEY_LANDMARKS.leftAnkle, chest - 0.08 + sway * 0.15, 0.9 - bounceY * 0.15)
  set(pts, KEY_LANDMARKS.rightAnkle, chest + 0.08 + sway * 0.15, 0.9 - bounceY * 0.15)
  set(pts, 29, chest - 0.09, 0.93)
  set(pts, 30, chest + 0.09, 0.93)
  set(pts, 31, chest - 0.06, 0.94)
  set(pts, 32, chest + 0.06, 0.94)

  return pts
}

/** Coach Mahal at ~96 BPM (bounce every beat). */
export function mahalPoseAt(t: number): Point[] {
  const bpm = 96
  const beats = (t * bpm) / 60
  const u = beats % 1
  const side: 1 | -1 = Math.floor(beats) % 2 === 0 ? 1 : -1
  return mahalKey(u, side)
}

function studentMahalAt(t: number): Point[] {
  // Challenge windows: late pump, shallow bounce, collapsed arms
  let lag = 0.06
  let armScale = 1
  let bounceScale = 1

  if (t >= 2.2 && t < 3.5) {
    // Arms don’t reach full Mahal height
    lag = 0.18
    armScale = 0.55
  } else if (t >= 4.3 && t < 5.5) {
    // Bounce timing late / shallow
    lag = 0.28
    bounceScale = 0.45
  } else if (t >= 6.0 && t < 7.1) {
    // Finish: arms drop, posture soft
    lag = 0.12
    armScale = 0.4
    bounceScale = 0.7
  }

  const coach = mahalPoseAt(Math.max(0, t - lag))
  const pts = coach.map((p) => ({ ...p }))

  // Pull wrists/elbows down when armScale < 1
  const pull = 1 - armScale
  for (const i of [
    KEY_LANDMARKS.leftWrist,
    KEY_LANDMARKS.rightWrist,
    KEY_LANDMARKS.leftElbow,
    KEY_LANDMARKS.rightElbow,
    17,
    18,
    19,
    20,
    21,
    22,
  ]) {
    pts[i] = {
      ...pts[i],
      y: pts[i].y + pull * 0.14,
      x: lerp(pts[i].x, 0.5, pull * 0.15),
    }
  }

  // Flatten bounce
  const flatten = 1 - bounceScale
  for (const i of [
    KEY_LANDMARKS.leftKnee,
    KEY_LANDMARKS.rightKnee,
    KEY_LANDMARKS.leftHip,
    KEY_LANDMARKS.rightHip,
    KEY_LANDMARKS.nose,
  ]) {
    pts[i] = {
      ...pts[i],
      y: pts[i].y - flatten * 0.03,
    }
  }

  return pts
}

export function buildDemoAnalysis(duration = 8): AnalysisResult {
  const fps = 15
  const coachPoses: PoseFrame[] = []
  const studentPoses: PoseFrame[] = []

  for (let i = 0; i <= duration * fps; i++) {
    const t = i / fps
    coachPoses.push({ t, landmarks: mahalPoseAt(t) })
    studentPoses.push({ t, landmarks: studentMahalAt(t) })
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
    syncOffset: 0.1,
    routineName: 'Mahal',
    sectionScores: [
      { id: 'lift', label: 'Lift-off', score: 88, start: 0, end: 2.2 },
      { id: 'pump', label: 'Arm pump', score: 58, start: 2.2, end: 4.3 },
      { id: 'bounce', label: 'Bounce timing', score: 49, start: 4.3, end: 6.0 },
      { id: 'hold', label: 'Finish hold', score: 52, start: 6.0, end: 8.0 },
    ],
    weakMoments: [
      {
        id: 'w1',
        label: 'High pump',
        challenge: 'Reach temple height',
        start: 2.3,
        end: 3.4,
        tip: 'Raise both fists to temple height on the upbeat.',
        score: 46,
        xp: 40,
      },
      {
        id: 'w2',
        label: 'Bounce timing',
        challenge: 'Land with the coach',
        start: 4.4,
        end: 5.4,
        tip: 'Land the bounce with the coach’s downbeat.',
        score: 38,
        xp: 50,
      },
      {
        id: 'w3',
        label: 'Finish hold',
        challenge: 'Hold the last beat',
        start: 6.1,
        end: 7.0,
        tip: 'Keep arms high, then hold the last frame for one beat.',
        score: 42,
        xp: 45,
      },
    ],
    overallScore: 62,
    source: 'demo',
  }
}
