import type { WeakMoment } from '../lib/types'

type Props = {
  duration: number
  currentTime: number
  beatTimes: number[]
  weakMoments: WeakMoment[]
  syncOffset: number
  onSeek: (t: number) => void
}

export function Timeline({
  duration,
  currentTime,
  beatTimes,
  weakMoments,
  syncOffset,
  onSeek,
}: Props) {
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0

  const seekFromEvent = (clientX: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect()
    const x = Math.min(Math.max(0, clientX - rect.left), rect.width)
    onSeek((x / rect.width) * duration)
  }

  return (
    <div
      className="timeline"
      role="slider"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={currentTime}
      aria-label="Routine timeline"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        seekFromEvent(e.clientX, e.currentTarget)
      }}
      onPointerMove={(e) => {
        if (e.buttons !== 1) return
        seekFromEvent(e.clientX, e.currentTarget)
      }}
    >
      <div className="timeline-track">
        {beatTimes.map((t, i) => (
          <i
            key={`b-${t}`}
            className="beat-mark"
            style={{
              left: `${(t / duration) * 100}%`,
              animationDelay: `${(i % 4) * 0.08 + syncOffset}s`,
            }}
          />
        ))}
        {weakMoments.map((w) => (
          <button
            key={w.id}
            type="button"
            className="weak-mark"
            title={w.label}
            style={{
              left: `${(w.start / duration) * 100}%`,
              width: `${((w.end - w.start) / duration) * 100}%`,
            }}
            onClick={(e) => {
              e.stopPropagation()
              onSeek(w.start)
            }}
          />
        ))}
        <i className="playhead" style={{ left: `${pct}%` }} />
      </div>
    </div>
  )
}
