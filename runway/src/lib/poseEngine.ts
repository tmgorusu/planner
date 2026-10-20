import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import type { PoseFrame } from './types'

const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

let landmarkerPromise: Promise<PoseLandmarker> | null = null

export function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_ROOT)
      return PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.4,
        minPosePresenceConfidence: 0.4,
        minTrackingConfidence: 0.4,
      })
    })()
  }
  return landmarkerPromise
}

/**
 * Sample poses from a video element at a fixed interval.
 * Footage never leaves the browser.
 */
export async function extractPosesFromVideo(
  video: HTMLVideoElement,
  onProgress?: (p: number) => void,
  sampleFps = 8,
): Promise<PoseFrame[]> {
  const landmarker = await getPoseLandmarker()
  const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0
  if (!duration) return []

  const interval = 1 / sampleFps
  const frames: PoseFrame[] = []
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth || 480
  canvas.height = video.videoHeight || 640
  const ctx = canvas.getContext('2d')
  if (!ctx) return []

  video.pause()

  for (let t = 0, i = 0; t <= duration; t += interval, i++) {
    await seekVideo(video, Math.min(t, duration - 0.01))
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const result = landmarker.detectForVideo(video, performance.now() + i * 40)
    const lm = result.landmarks[0]
    if (lm) {
      frames.push({
        t,
        landmarks: lm.map((p) => ({
          x: p.x,
          y: p.y,
          z: p.z,
          visibility: p.visibility,
        })),
      })
    } else {
      frames.push({ t, landmarks: [] })
    }
    onProgress?.(Math.min(1, t / duration))
  }

  onProgress?.(1)
  return frames
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.02) {
      resolve()
      return
    }
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      resolve()
    }
    video.addEventListener('seeked', onSeeked)
    video.currentTime = time
  })
}

export async function waitForVideoMeta(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 1 && Number.isFinite(video.duration)) return
  await new Promise<void>((resolve, reject) => {
    const onLoaded = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error('Video failed to load'))
    }
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onLoaded)
      video.removeEventListener('error', onError)
    }
    video.addEventListener('loadedmetadata', onLoaded)
    video.addEventListener('error', onError)
  })
}
