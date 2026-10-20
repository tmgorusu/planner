import { xpForLevel } from '../lib/game'
import type { PlayerStats } from '../lib/types'

type Props = {
  stats: PlayerStats
}

export function StatsBar({ stats }: Props) {
  const need = xpForLevel(stats.level)

  return (
    <div className="stats-strip" aria-label="Progress">
      <span className="stat-pill">
        Level <strong>{stats.level}</strong>
      </span>
      <span className="stat-pill">
        Streak <strong>{stats.streak}</strong>
      </span>
      <span className="stat-pill">
        XP <strong>{stats.xp}/{need}</strong>
      </span>
    </div>
  )
}
