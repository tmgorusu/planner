import { POSE_CONNECTIONS } from './poseConnections'
import type { Point } from './types'

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
  ctx.lineWidth = Math.max(2, width * 0.006)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

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

  for (const p of landmarks) {
    if ((p.visibility ?? 1) < 0.35) continue
    ctx.beginPath()
    ctx.arc(mapX(p.x), mapY(p.y), Math.max(2.5, width * 0.008), 0, Math.PI * 2)
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
