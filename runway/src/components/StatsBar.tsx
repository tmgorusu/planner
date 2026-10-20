import { rankTitle, xpForLevel } from '../lib/game'
import type { PlayerStats } from '../lib/types'

type Props = {
  stats: PlayerStats
  compact?: boolean
}

export function StatsBar({ stats, compact }: Props) {
  const need = xpForLevel(stats.level)
  const pct = Math.min(100, Math.round((stats.xp / need) * 100))

  return (
    <div className="stats-strip">
      <span className="stat-pill level">
        Lv {stats.level}
        {!compact && ` · ${rankTitle(stats.level)}`}
      </span>
      <span className="stat-pill streak">🔥 {stats.streak} streak</span>
      <span className="stat-pill xp">
        {stats.xp}/{need} XP
        {!compact && (
          <span className="xp-track" style={{ width: 48, display: 'inline-block', margin: 0 }}>
            <i style={{ width: `${pct}%` }} />
          </span>
        )}
      </span>
    </div>
  )
}
