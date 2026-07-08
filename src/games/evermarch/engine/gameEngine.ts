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
import { getTaskById, type ResourceDrop, type TaskDefinition } from '../data/tasks'
import { getResourceDefinition, getResourceName } from '../data/resources'
import { saveLocal } from './saveSystem'
import { SKILLS, type LaneType, type SkillId } from '../data/skills'

const TICK_INTERVAL = 100 // ms — game ticks 10 times per second
const AUTO_SAVE_INTERVAL = 30_000 // auto-save every 30 seconds
const MAX_OFFLINE_MS = 24 * 60 * 60 * 1000

let tickHandle: ReturnType<typeof setInterval> | null = null
let lastTickTime = 0
let lastAutoSave = 0

export type PassiveLaneType = Extract<LaneType, 'idle' | 'background'>
type ActionSource = 'active' | PassiveLaneType | 'offline'

interface ActionResult {
  xp: number
  drops: ResourceDrop[]
}

export interface OfflineResourceGain {
  resourceId: string
  name: string
  icon: string
  amount: number
  total: number
}

export interface OfflineSkillGain {
  skillId: SkillId
  name: string
  icon: string
  xp: number
  levelBefore: number
  levelAfter: number
}

export interface OfflineLaneGain {
  laneType: PassiveLaneType
  label: string
  taskId: string
  taskName: string
  actions: number
  xp: number
  blocked: boolean
}

export interface OfflineProgressSummary {
  elapsedMs: number
  processedMs: number
  capped: boolean
  totalXp: number
  resources: OfflineResourceGain[]
  skills: OfflineSkillGain[]
  lanes: OfflineLaneGain[]
}

const PASSIVE_LANE_LABELS: Record<PassiveLaneType, string> = {
  idle: 'Routine',
  background: 'Background',
}

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
  laneType: PassiveLaneType,
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
    const result = completeAction(task, store, laneType)
    if (!result) {
      lane.progress = 0
      break
    }
  }
}

/**
 * Complete one action cycle for a task — grant XP + drops.
 */
function completeAction(
  task: TaskDefinition,
  store: ReturnType<typeof useGameStore>,
  source: ActionSource,
  silent = false,
  multiplier = 1
): ActionResult | null {
  if (!canPayCosts(task, store, multiplier)) {
    if (!silent) {
      store.addLog(`${missingCostPrefix(source)} ${formatCosts(task.costs ?? [], multiplier)} for ${task.name}`, 'system')
    }
    return null
  }

  spendTaskCosts(task, store, multiplier)

  const xp = task.xpPerAction * multiplier
  store.addXp(task.skillId, xp, { toast: !silent })
  const gainedDrops = task.drops.map((drop) => ({
    resourceId: drop.resourceId,
    amount: drop.amount * multiplier,
  }))

  for (const drop of gainedDrops) {
    store.addItem(drop.resourceId, drop.amount, { toast: !silent })

    if (!silent) {
      const label = source === 'active' ? '' : source === 'idle' ? 'Routine: ' : 'Background: '
      store.addLog(
        `${label}+${drop.amount} ${getResourceName(drop.resourceId)}`,
        'gain'
      )
    }
  }

  return { xp, drops: gainedDrops }
}

function canPayCosts(
  task: TaskDefinition,
  store: ReturnType<typeof useGameStore>,
  multiplier: number
): boolean {
  return (task.costs ?? []).every((cost) =>
    store.getItemCount(cost.resourceId) >= cost.amount * multiplier
  )
}

function spendTaskCosts(
  task: TaskDefinition,
  store: ReturnType<typeof useGameStore>,
  multiplier: number
) {
  for (const cost of task.costs ?? []) {
    store.removeItem(cost.resourceId, cost.amount * multiplier)
  }
}

function formatCosts(costs: ResourceDrop[], multiplier: number): string {
  return costs
    .map((cost) => `${cost.amount * multiplier} ${getResourceName(cost.resourceId)}`)
    .join(', ')
}

function missingCostPrefix(source: ActionSource): string {
  if (source === 'idle') return 'Routine needs'
  if (source === 'background') return 'Background needs'
  return 'Need'
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

  completeAction(task, store, 'active', false, task.activeBoostMultiplier)
}

/**
 * Calculate and apply offline progress for idle + background lanes.
 * Active lane does NOT progress offline.
 */
export function processOfflineProgress(lastSavedAt: number): OfflineProgressSummary | null {
  const store = useGameStore()
  const now = Date.now()
  const elapsed = now - lastSavedAt

  if (elapsed < 1000) return null // Less than 1 second, skip

  const offlineMs = Math.min(elapsed, MAX_OFFLINE_MS)
  const summary: OfflineProgressSummary = {
    elapsedMs: elapsed,
    processedMs: offlineMs,
    capped: elapsed > MAX_OFFLINE_MS,
    totalXp: 0,
    resources: [],
    skills: [],
    lanes: [],
  }

  // Process idle lane
  processLaneOffline('idle', offlineMs, store, summary)

  // Process background lane
  processLaneOffline('background', offlineMs, store, summary)

  // Log offline gains
  if (summary.totalXp > 0) {
    store.addLog(`Offline progress: +${summary.totalXp.toLocaleString()} XP`, 'offline')
  }

  for (const resource of summary.resources) {
    store.addLog(
      `Offline progress: +${resource.amount.toLocaleString()} ${resource.name}`,
      'offline'
    )
  }

  const minutes = Math.floor(offlineMs / 60_000)
  if (minutes >= 1) {
    store.addLog(
      `Welcome back! You were away for ${formatDuration(offlineMs)}.${summary.capped ? ' Offline gains capped at 24h.' : ''}`,
      'system'
    )
  }

  return hasOfflineGains(summary) ? summary : null
}

function processLaneOffline(
  laneType: PassiveLaneType,
  offlineMs: number,
  store: ReturnType<typeof useGameStore>,
  summary: OfflineProgressSummary
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

  const laneSummary = getOfflineLaneSummary(summary, laneType, task)

  // Replay every completed action so future random drops resolve the same way offline.
  for (let index = 0; index < actionCount; index++) {
    const levelBefore = store.getSkillLevel(task.skillId)
    const result = completeAction(task, store, 'offline', true)
    if (!result) {
      lane.progress = 0
      laneSummary.blocked = true
      break
    }

    const levelAfter = store.getSkillLevel(task.skillId)
    summary.totalXp += result.xp
    laneSummary.actions++
    laneSummary.xp += result.xp
    addOfflineSkillGain(summary, task.skillId, result.xp, levelBefore, levelAfter)

    for (const drop of result.drops) {
      addOfflineResourceGain(summary, drop.resourceId, drop.amount, store.getItemCount(drop.resourceId))
    }
  }
}

function getOfflineLaneSummary(
  summary: OfflineProgressSummary,
  laneType: PassiveLaneType,
  task: TaskDefinition
): OfflineLaneGain {
  let entry = summary.lanes.find((lane) => lane.laneType === laneType && lane.taskId === task.id)
  if (!entry) {
    entry = {
      laneType,
      label: PASSIVE_LANE_LABELS[laneType],
      taskId: task.id,
      taskName: task.name,
      actions: 0,
      xp: 0,
      blocked: false,
    }
    summary.lanes.push(entry)
  }
  return entry
}

function addOfflineSkillGain(
  summary: OfflineProgressSummary,
  skillId: SkillId,
  xp: number,
  levelBefore: number,
  levelAfter: number
) {
  const skill = SKILLS[skillId]
  let entry = summary.skills.find((gain) => gain.skillId === skillId)
  if (!entry) {
    entry = {
      skillId,
      name: skill.name,
      icon: skill.icon,
      xp: 0,
      levelBefore,
      levelAfter,
    }
    summary.skills.push(entry)
  }

  entry.xp += xp
  entry.levelAfter = Math.max(entry.levelAfter, levelAfter)
}

function addOfflineResourceGain(
  summary: OfflineProgressSummary,
  resourceId: string,
  amount: number,
  total: number
) {
  const resource = getResourceDefinition(resourceId)
  let entry = summary.resources.find((gain) => gain.resourceId === resourceId)
  if (!entry) {
    entry = {
      resourceId,
      name: resource.name,
      icon: resource.icon,
      amount: 0,
      total,
    }
    summary.resources.push(entry)
  }

  entry.amount += amount
  entry.total = total
}

function hasOfflineGains(summary: OfflineProgressSummary): boolean {
  return summary.totalXp > 0 || summary.resources.some((resource) => resource.amount > 0)
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}
