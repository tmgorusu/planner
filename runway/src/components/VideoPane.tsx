import { useEffect, useRef, type RefObject } from 'react'
import { drawPose, drawStageBackdrop, nearestLandmarks } from '../lib/drawPose'
import type { PoseFrame } from '../lib/types'

type Props = {
  src: string
  label: string
  color: string
  poses: PoseFrame[]
  currentTime: number
  mirrored?: boolean
  poseOnly?: boolean
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
  poseOnly = false,
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
    if (!video || poseOnly) return
    video.playbackRate = playbackRate
  }, [playbackRate, videoRef, poseOnly])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const video = videoRef.current

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
        const t = poseOnly ? currentTime : video?.currentTime || currentTime
        if (poseOnly) {
          const tint =
            color === '#ff5a7a'
              ? 'rgba(255,90,122,0.18)'
              : 'rgba(62,224,197,0.16)'
          drawStageBackdrop(ctx, canvas.width, canvas.height, tint)
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
        const lm = nearestLandmarks(poses, t)
        drawPose(ctx, lm, canvas.width, canvas.height, color, mirrored)
      }
      raf = requestAnimationFrame(paint)
    }
    raf = requestAnimationFrame(paint)
    return () => cancelAnimationFrame(raf)
  }, [poses, color, mirrored, currentTime, videoRef, poseOnly])

  return (
    <div className={`video-pane${mirrored ? ' mirrored' : ''}${poseOnly ? ' pose-only' : ''}`}>
      <span className="tag">{label}</span>
      {!poseOnly && (
        <video
          ref={videoRef}
          src={src}
          playsInline
          muted={muted}
          preload="auto"
          onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => onLoadedMeta?.(e.currentTarget.duration)}
        />
      )}
      {/* Hidden clock video for pose-only sync when parent drives time */}
      {poseOnly && (
        <video
          ref={videoRef}
          src={src}
          playsInline
          muted
          preload="auto"
          className="clock-video"
          onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => onLoadedMeta?.(e.currentTarget.duration)}
        />
      )}
      <canvas ref={canvasRef} />
    </div>
  )
}
