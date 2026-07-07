/**
 * Game Engine — the master tick that drives all Evermarch gameplay.
 *
 * - Single setInterval drives the entire game (no per-skill timers)
 * - Advances idle + background lanes on each tick
 * - Active lane only progresses via explicit player clicks
 * - Handles offline catch-up on load
 * - Auto-saves locally on interval
 */

import { useGameStore } from '../stores/gameStore'
import { getTaskById } from '../data/tasks'
import { getResourceName } from '../data/resources'
import { saveLocal } from './saveSystem'
import type { SkillId } from '../data/skills'

const TICK_INTERVAL = 100 // ms — game ticks 10 times per second
const AUTO_SAVE_INTERVAL = 30_000 // auto-save every 30 seconds

let tickHandle: ReturnType<typeof setInterval> | null = null
let lastTickTime = 0
let lastAutoSave = 0

/**
 * Start the game engine tick loop.
 */
export function startEngine() {
  if (tickHandle) return

  lastTickTime = Date.now()
  lastAutoSave = Date.now()

  tickHandle = setInterval(() => {
    const now = Date.now()
    const delta = now - lastTickTime
    lastTickTime = now

    tick(delta)

    // Auto-save
    if (now - lastAutoSave >= AUTO_SAVE_INTERVAL) {
      lastAutoSave = now
      saveLocal()
    }
  }, TICK_INTERVAL)
}

/**
 * Stop the engine tick loop.
 */
export function stopEngine() {
  if (tickHandle) {
    clearInterval(tickHandle)
    tickHandle = null
  }
  saveLocal()
}

/**
 * Core tick function — advances passive lanes by the given time delta.
 * Active lane is NOT advanced here; it's driven by player clicks.
 */
function tick(deltaMs: number) {
  const store = useGameStore()

  // Track playtime
  store.playtime += deltaMs / 1000

  // Advance idle lane
  advanceLane('idle', deltaMs, store)

  // Advance background lane
  advanceLane('background', deltaMs, store)
}

function advanceLane(
  laneType: 'idle' | 'background',
  deltaMs: number,
  store: ReturnType<typeof useGameStore>
) {
  const lane = store.lanes[laneType]
  if (!lane.taskId) return

  const task = getTaskById(lane.taskId)
  if (!task) return

  const skillLevel = store.getSkillLevel(task.skillId)
  if (skillLevel < task.levelRequired) return

  lane.progress += deltaMs

  // Complete actions
  while (lane.progress >= task.baseInterval) {
    lane.progress -= task.baseInterval
    completeAction(task.skillId, task.id, store, laneType)
  }
}

/**
 * Complete one action cycle for a task — grant XP + drops.
 */
function completeAction(
  skillId: SkillId,
  taskId: string,
  store: ReturnType<typeof useGameStore>,
  source: string,
  silent = false
) {
  const task = getTaskById(taskId)
  if (!task) return

  store.addXp(skillId, task.xpPerAction)

  for (const drop of task.drops) {
    store.addItem(drop.resourceId, drop.amount)

    if (!silent) {
      const label = source === 'active' ? '' : source === 'idle' ? 'Routine: ' : 'Background: '
      store.addLog(
        `${label}+${drop.amount} ${getResourceName(drop.resourceId)}`,
        'gain'
      )
    }
  }
}

/**
 * Called when the player clicks the active action button.
 * Each click completes one full action cycle instantly (the "boost").
 */
export function performActiveAction() {
  const store = useGameStore()
  const lane = store.lanes.active
  if (!lane.taskId) return

  const task = getTaskById(lane.taskId)
  if (!task) return

  const skillLevel = store.getSkillLevel(task.skillId)
  if (skillLevel < task.levelRequired) return

  // Grant boosted rewards
  const multiplier = task.activeBoostMultiplier
  store.addXp(task.skillId, task.xpPerAction * multiplier)

  for (const drop of task.drops) {
    const amount = drop.amount * multiplier
    store.addItem(drop.resourceId, amount)
    store.addLog(`+${amount} ${getResourceName(drop.resourceId)}`, 'gain')
  }
}

/**
 * Calculate and apply offline progress for idle + background lanes.
 * Active lane does NOT progress offline.
 */
export function processOfflineProgress(lastSavedAt: number) {
  const store = useGameStore()
  const now = Date.now()
  const elapsed = now - lastSavedAt

  if (elapsed < 1000) return // Less than 1 second, skip

  const maxOffline = 24 * 60 * 60 * 1000 // Cap at 24 hours
  const offlineMs = Math.min(elapsed, maxOffline)

  let totalXpGained = 0
  const resourcesGained: Record<string, number> = {}

  // Process idle lane
  processLaneOffline('idle', offlineMs, store, resourcesGained, (xp) => { totalXpGained += xp })

  // Process background lane
  processLaneOffline('background', offlineMs, store, resourcesGained, (xp) => { totalXpGained += xp })

  // Log offline gains
  if (totalXpGained > 0) {
    store.addLog(`Offline progress: +${totalXpGained.toLocaleString()} XP`, 'offline')
  }

  for (const [resourceId, amount] of Object.entries(resourcesGained)) {
    if (amount > 0) {
      store.addLog(
        `Offline progress: +${amount} ${getResourceName(resourceId as any)}`,
        'offline'
      )
    }
  }

  const minutes = Math.floor(offlineMs / 60_000)
  if (minutes >= 1) {
    store.addLog(
      `Welcome back! You were away for ${formatDuration(offlineMs)}.`,
      'system'
    )
  }
}

function processLaneOffline(
  laneType: 'idle' | 'background',
  offlineMs: number,
  store: ReturnType<typeof useGameStore>,
  resourcesGained: Record<string, number>,
  onXp: (xp: number) => void
) {
  const lane = store.lanes[laneType]
  if (!lane.taskId) return

  const task = getTaskById(lane.taskId)
  if (!task) return

  const skillLevel = store.getSkillLevel(task.skillId)
  if (skillLevel < task.levelRequired) return

  const totalProgress = lane.progress + offlineMs
  const actionCount = Math.floor(totalProgress / task.baseInterval)
  lane.progress = totalProgress % task.baseInterval

  if (actionCount <= 0) return

  // Grant XP
  const xp = task.xpPerAction * actionCount
  store.addXp(task.skillId, xp)
  onXp(xp)

  // Grant drops
  for (const drop of task.drops) {
    const amount = drop.amount * actionCount
    store.addItem(drop.resourceId, amount)
    resourcesGained[drop.resourceId] = (resourcesGained[drop.resourceId] ?? 0) + amount
  }
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}
