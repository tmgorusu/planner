import type { PlayerStats } from './types'

const KEY = 'taal-player-stats-v1'

export function loadStats(): PlayerStats {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as PlayerStats
  } catch {
    /* ignore */
  }
  return { xp: 0, level: 1, streak: 0, drillsCleared: 0 }
}

export function saveStats(stats: PlayerStats) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(stats))
  } catch {
    /* ignore */
  }
}

export function xpForLevel(level: number) {
  return 100 + (level - 1) * 40
}

export function addXp(stats: PlayerStats, amount: number): PlayerStats {
  let xp = stats.xp + amount
  let level = stats.level
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level)
    level += 1
  }
  return { ...stats, xp, level }
}

export function clearDrill(stats: PlayerStats, xpGain: number): PlayerStats {
  return addXp(
    {
      ...stats,
      streak: stats.streak + 1,
      drillsCleared: stats.drillsCleared + 1,
    },
    xpGain,
  )
}

/** One-line result + next action. */
export function resultLine(score: number): { happened: string; next: string } {
  if (score >= 85) {
    return { happened: 'Strong match to the coach.', next: 'Practice a weak spot to lock it in.' }
  }
  if (score >= 70) {
    return { happened: 'Close match.', next: 'Practice the lowest-scoring section.' }
  }
  if (score >= 55) {
    return { happened: 'Partial match.', next: 'Open a drill and loop the weak spot.' }
  }
  return { happened: 'Low match.', next: 'Slow the drill and match arm height first.' }
}
