import { POSE_CONNECTIONS } from './poseConnections'
import type { Point } from './types'

export function drawStageBackdrop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  tint: string,
) {
  const g = ctx.createLinearGradient(0, 0, 0, height)
  g.addColorStop(0, '#12151f')
  g.addColorStop(0.55, '#0c0e16')
  g.addColorStop(1, '#07080d')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, width, height)

  // Soft spotlight
  const spot = ctx.createRadialGradient(
    width * 0.5,
    height * 0.28,
    width * 0.05,
    width * 0.5,
    height * 0.35,
    width * 0.55,
  )
  spot.addColorStop(0, tint)
  spot.addColorStop(1, 'transparent')
  ctx.fillStyle = spot
  ctx.fillRect(0, 0, width, height)

  // Floor grid
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 1
  const horizon = height * 0.62
  for (let i = 0; i < 8; i++) {
    const y = horizon + ((height - horizon) * i) / 7
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
  for (let i = -4; i <= 4; i++) {
    ctx.beginPath()
    ctx.moveTo(width * 0.5 + i * width * 0.08, horizon)
    ctx.lineTo(width * 0.5 + i * width * 0.22, height)
    ctx.stroke()
  }
}

export function drawPose(
  ctx: CanvasRenderingContext2D,
  landmarks: Point[],
  width: number,
  height: number,
  color: string,
  mirror = false,
) {
  if (!landmarks.length) return

  ctx.save()
  ctx.lineWidth = Math.max(2.5, width * 0.007)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.shadowColor = color
  ctx.shadowBlur = 10

  const mapX = (x: number) => (mirror ? 1 - x : x) * width
  const mapY = (y: number) => y * height

  for (const [a, b] of POSE_CONNECTIONS) {
    const pa = landmarks[a]
    const pb = landmarks[b]
    if (!pa || !pb) continue
    if ((pa.visibility ?? 1) < 0.35 || (pb.visibility ?? 1) < 0.35) continue
    ctx.beginPath()
    ctx.moveTo(mapX(pa.x), mapY(pa.y))
    ctx.lineTo(mapX(pb.x), mapY(pb.y))
    ctx.stroke()
  }

  ctx.shadowBlur = 0
  for (const p of landmarks) {
    if ((p.visibility ?? 1) < 0.35) continue
    ctx.beginPath()
    ctx.arc(mapX(p.x), mapY(p.y), Math.max(2.8, width * 0.009), 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

export function nearestLandmarks(
  frames: { t: number; landmarks: Point[] }[],
  t: number,
): Point[] {
  if (!frames.length) return []
  let best = frames[0]
  let bestD = Math.abs(best.t - t)
  for (const f of frames) {
    const d = Math.abs(f.t - t)
    if (d < bestD) {
      best = f
      bestD = d
    }
  }
  return best.landmarks
}
