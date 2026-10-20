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

export function rankTitle(level: number): string {
  if (level >= 8) return 'Floor legend'
  if (level >= 5) return 'Combo hunter'
  if (level >= 3) return 'Beat runner'
  return 'Warm-up crew'
}

export function vibeLine(score: number): string {
  if (score >= 85) return 'Clean hit — coach energy unlocked.'
  if (score >= 70) return 'Solid groove. One more drill and you’re flying.'
  if (score >= 55) return 'You’re in the pocket — polish the focus beats.'
  return 'Rough cut, good instincts. Slow it down and stack a streak.'
}
