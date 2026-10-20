import { useEffect, useRef, type RefObject } from 'react'
import { drawPose, nearestLandmarks } from '../lib/drawPose'
import type { PoseFrame } from '../lib/types'

type Props = {
  src: string
  label: string
  color: string
  poses: PoseFrame[]
  currentTime: number
  mirrored?: boolean
  videoRef?: RefObject<HTMLVideoElement | null>
  muted?: boolean
  playbackRate?: number
  onTimeUpdate?: (t: number) => void
  onLoadedMeta?: (duration: number) => void
}

export function VideoPane({
  src,
  label,
  color,
  poses,
  currentTime,
  mirrored = false,
  videoRef: externalRef,
  muted = true,
  playbackRate = 1,
  onTimeUpdate,
  onLoadedMeta,
}: Props) {
  const localRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = externalRef ?? localRef

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = playbackRate
  }, [playbackRate, videoRef])

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    let raf = 0
    const paint = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (w && h && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w
        canvas.height = h
      }
      const ctx = canvas.getContext('2d')
      if (ctx && canvas.width && canvas.height) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const t = video.currentTime || currentTime
        const lm = nearestLandmarks(poses, t)
        drawPose(ctx, lm, canvas.width, canvas.height, color, mirrored)
      }
      raf = requestAnimationFrame(paint)
    }
    raf = requestAnimationFrame(paint)
    return () => cancelAnimationFrame(raf)
  }, [poses, color, mirrored, currentTime, videoRef])

  return (
    <div className={`video-pane${mirrored ? ' mirrored' : ''}`}>
      <span className="tag">{label}</span>
      <video
        ref={videoRef}
        src={src}
        playsInline
        muted={muted}
        preload="auto"
        onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => onLoadedMeta?.(e.currentTarget.duration)}
      />
      <canvas ref={canvasRef} />
    </div>
  )
}
