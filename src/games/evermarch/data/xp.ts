/**
 * XP table for skill levelling.
 * Uses a RuneScape-inspired curve — each level requires progressively more XP.
 */

const MAX_LEVEL = 99

/** Pre-computed cumulative XP required for each level (index = level) */
const XP_TABLE: number[] = [0, 0] // level 1 starts at 0 XP

function buildXpTable() {
  for (let level = 2; level <= MAX_LEVEL; level++) {
    // Each level costs roughly: floor(level + 300 * 2^(level/7)) / 4
    const previousLevel = level - 1
    const points = Math.floor((previousLevel + 300 * Math.pow(2, previousLevel / 7)) / 4)
    const prev = XP_TABLE[level - 1] ?? 0
    XP_TABLE.push(prev + points)
  }
}

buildXpTable()

/** Get cumulative XP needed to reach a given level */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0
  if (level > MAX_LEVEL) return XP_TABLE[MAX_LEVEL]!
  return XP_TABLE[level]!
}

/** Get the level for a given total XP amount */
export function levelForXp(xp: number): number {
  for (let i = 1; i <= MAX_LEVEL; i++) {
    if (XP_TABLE[i]! > xp) return i - 1
  }
  return MAX_LEVEL
}

/** XP needed from current total to reach the next level */
export function xpToNextLevel(currentXp: number): number {
  const level = levelForXp(currentXp)
  if (level >= MAX_LEVEL) return 0
  return xpForLevel(level + 1) - currentXp
}

/** Progress fraction (0-1) toward next level */
export function xpProgressFraction(currentXp: number): number {
  const level = levelForXp(currentXp)
  if (level >= MAX_LEVEL) return 1
  const levelStart = xpForLevel(level)
  const levelEnd = xpForLevel(level + 1)
  const range = levelEnd - levelStart
  if (range <= 0) return 1
  return (currentXp - levelStart) / range
}

export { MAX_LEVEL }
