/**
 * Task mastery uses the same level cap as skills, but each individual task
 * has a smaller XP curve so completion rewards breadth across the game.
 */

import { MAX_LEVEL, xpForLevel } from './xp'

export const TASK_MASTERY_XP_SCALE = 0.2

const TASK_MASTERY_XP_TABLE: number[] = [0, 0]

for (let level = 2; level <= MAX_LEVEL; level++) {
  TASK_MASTERY_XP_TABLE[level] = Math.round(xpForLevel(level) * TASK_MASTERY_XP_SCALE)
}

export const TASK_MASTERY_MAX_XP = TASK_MASTERY_XP_TABLE[MAX_LEVEL] ?? 0

export function taskMasteryXpForLevel(level: number): number {
  if (level <= 1) return 0
  if (level >= MAX_LEVEL) return TASK_MASTERY_MAX_XP
  return TASK_MASTERY_XP_TABLE[level] ?? 0
}

export function taskMasteryLevelForXp(xp: number): number {
  const safeXp = Math.max(0, Math.min(TASK_MASTERY_MAX_XP, Math.floor(xp)))

  for (let level = 1; level <= MAX_LEVEL; level++) {
    if ((TASK_MASTERY_XP_TABLE[level] ?? 0) > safeXp) return level - 1
  }

  return MAX_LEVEL
}

export function taskMasteryXpToNextLevel(currentXp: number): number {
  const level = taskMasteryLevelForXp(currentXp)
  if (level >= MAX_LEVEL) return 0
  return Math.max(0, taskMasteryXpForLevel(level + 1) - currentXp)
}

export function taskMasteryProgressFraction(currentXp: number): number {
  const level = taskMasteryLevelForXp(currentXp)
  if (level >= MAX_LEVEL) return 1

  const levelStart = taskMasteryXpForLevel(level)
  const levelEnd = taskMasteryXpForLevel(level + 1)
  const range = levelEnd - levelStart
  if (range <= 0) return 1

  return Math.max(0, Math.min(1, (currentXp - levelStart) / range))
}

export function clampTaskMasteryXp(xp: number): number {
  return Math.max(0, Math.min(TASK_MASTERY_MAX_XP, Math.floor(xp)))
}
