/**
 * Game Engine — the master tick that drives all Evermarch gameplay.
 *
 * - Single setInterval drives the entire game (no per-skill timers)
 * - Advances the routine lane on each tick
 * - Checks timestamp-based farming plots for readiness
 * - Active lane only progresses via explicit player clicks
 * - Handles offline catch-up on load
 * - Auto-saves locally on interval
 */

import { useGameStore } from '../stores/gameStore'
import { getTaskById, type ResourceDrop, type TaskDefinition } from '../data/tasks'
import { getResourceDefinition, getResourceName } from '../data/resources'
import { saveLocal } from './saveSystem'
import { SKILLS, type LaneType, type SkillId } from '../data/skills'
import { syncGlobalStatsForCurrentUser } from './globalStats'
import type { ActiveMiningBlockState } from './activeMining'

const TICK_INTERVAL = 100 // ms — game ticks 10 times per second
const AUTO_SAVE_INTERVAL = 30_000 // auto-save every 30 seconds
const MAX_OFFLINE_MS = 24 * 60 * 60 * 1000
export const ACTIVE_ONE_X_MIN_CLICKS_PER_SECOND = 0.5
export const ACTIVE_TWO_X_MIN_CLICKS_PER_SECOND = 2
export const ACTIVE_PEAK_CLICKS_PER_SECOND = 3
export const ACTIVE_STOP_CLICK_INTERVAL_MS = 2000
export const ACTIVE_TARGET_CLICK_INTERVAL_MS = Math.round(1000 / ACTIVE_PEAK_CLICKS_PER_SECOND)
export const ACTIVE_MAX_CLICK_INTERVAL_MS = ACTIVE_STOP_CLICK_INTERVAL_MS
export const MAX_ACTIVE_SPEED_MULTIPLIER = 3
export const ACTIVE_MINING_TARGET_XP_MULTIPLIER = 2.5
export const ACTIVE_MINING_STRIKE_INTERVAL_MS = 170

const MIN_ACTIVE_CLICK_INTERVAL_MS = 50

let tickHandle: ReturnType<typeof setInterval> | null = null
let lastTickTime = 0
let lastAutoSave = 0
let lastActiveClickAt: number | null = null
let lastActiveTaskId: string | null = null
let activeSavedProgressMs = 0
let lastActiveMiningStrikeAt = 0
let activeMiningXpCarry = 0

export type PassiveLaneType = Extract<LaneType, 'idle'>
type ActionSource = 'active' | PassiveLaneType | 'offline'

interface ActionResult {
  xp: number
  masteryXp: number
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

export interface OfflineTaskMasteryGain {
  taskId: string
  taskName: string
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
  taskMastery: OfflineTaskMasteryGain[]
  lanes: OfflineLaneGain[]
}

const PASSIVE_LANE_LABELS: Record<PassiveLaneType, string> = {
  idle: 'Routine',
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
      void syncGlobalStatsForCurrentUser()
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
  void syncGlobalStatsForCurrentUser({ force: true })
}

/**
 * Core tick function — advances passive lanes by the given time delta.
 * Active lane is NOT advanced here; it's driven by player clicks.
 */
function tick(deltaMs: number) {
  const store = useGameStore()
  const now = Date.now()

  // Track playtime
  store.recordOnlineTime(deltaMs)

  // Advance routine lane
  advanceLane('idle', deltaMs, store)

  // Notify once when a planted crop has finished growing.
  store.processFarmingNotifications(now)
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

  store.recordLaneWork(task.id, laneType, deltaMs)
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
  multiplier = 1,
  statsLaneType?: LaneType,
  activeSavedMs = source === 'active' ? task.baseInterval * multiplier : 0,
  activeClicks = source === 'active' ? 1 : 0
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
  const masteryXp = store.addTaskMasteryXp(task.id, xp, { toast: !silent })
  const laneType = statsLaneType ?? (source === 'offline' ? 'idle' : source)
  store.recordTaskAction({
    taskId: task.id,
    skillId: task.skillId,
    source,
    laneType,
    xp,
    activeClicks,
    activeSavedMs,
  })
  const gainedDrops = task.drops.map((drop) => ({
    resourceId: drop.resourceId,
    amount: drop.amount * multiplier,
  }))

  for (const drop of gainedDrops) {
    store.addItem(drop.resourceId, drop.amount, { toast: !silent })

    if (!silent) {
      const label = source === 'active' ? '' : source === 'idle' ? 'Routine: ' : ''
      store.addLog(
        `${label}+${drop.amount} ${getResourceName(drop.resourceId)}`,
        'gain'
      )
    }
  }

  return { xp, masteryXp, drops: gainedDrops }
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
    const amount = cost.amount * multiplier
    store.removeItem(cost.resourceId, amount)
    store.recordItemConsumed(cost.resourceId, amount)
  }
}

function formatCosts(costs: ResourceDrop[], multiplier: number): string {
  return costs
    .map((cost) => `${cost.amount * multiplier} ${getResourceName(cost.resourceId)}`)
    .join(', ')
}

function missingCostPrefix(source: ActionSource): string {
  if (source === 'idle') return 'Routine needs'
  return 'Need'
}

/**
 * Called when the player clicks the active action button.
 * Clicks build active-lane progress from real cadence, capped at 3x routine pace.
 */
export function performActiveAction() {
  const store = useGameStore()
  const lane = store.lanes.active
  if (!lane.taskId) return

  const task = getTaskById(lane.taskId)
  if (!task) return

  const skillLevel = store.getSkillLevel(task.skillId)
  if (skillLevel < task.levelRequired) return

  const cadence = getActiveClickCadence(task.id, Date.now())
  store.recordActiveCadence({
    multiplier: cadence.multiplier,
    ratio: cadence.multiplier / MAX_ACTIVE_SPEED_MULTIPLIER,
    progressMs: cadence.progressMs,
    clickGapMs: cadence.clickGapMs,
  })
  store.recordActiveClick(task.id, task.skillId, cadence.activeWorkMs)

  if (cadence.progressMs <= 0) return

  if (!canPayCosts(task, store, 1)) {
    store.addLog(`Need ${formatCosts(task.costs ?? [], 1)} for ${task.name}`, 'system')
    return
  }

  lane.progress += cadence.progressMs
  activeSavedProgressMs += cadence.savedMs

  while (lane.progress >= task.baseInterval) {
    const savedForAction = consumeActiveSavedProgress(lane.progress, task.baseInterval)
    lane.progress -= task.baseInterval
    const result = completeAction(task, store, 'active', false, 1, 'active', savedForAction, 0)
    if (!result) {
      lane.progress = 0
      activeSavedProgressMs = 0
      break
    }
  }
}

export function performActiveMiningBlock(blockId: string) {
  const store = useGameStore()
  const lane = store.lanes.active
  if (!lane.taskId) return

  const task = getTaskById(lane.taskId)
  if (!task || task.skillId !== 'mining') {
    performActiveAction()
    return
  }

  const skillLevel = store.getSkillLevel(task.skillId)
  if (skillLevel < task.levelRequired) return

  const now = Date.now()
  if (now - lastActiveMiningStrikeAt < ACTIVE_MINING_STRIKE_INTERVAL_MS) return
  lastActiveMiningStrikeAt = now

  store.ensureActiveMiningState(task.id)

  // Active mining is block-driven. Each pointer action applies one fixed
  // manual strike; mining no longer uses the generic 1x/2x/3x cadence meter.
  const damageMs = Math.max(280, Math.round(task.baseInterval / 8))
  store.recordActiveClick(task.id, task.skillId, 0)

  if (!canPayCosts(task, store, 1)) {
    store.addLog(`Need ${formatCosts(task.costs ?? [], 1)} for ${task.name}`, 'system')
    return
  }

  const result = store.damageActiveMiningBlock(task.id, blockId, damageMs)
  grantActiveMiningStrikeXp(task, store, result.damageAppliedMs)

  if (!result.brokenBlock) return

  grantActiveMiningBlockReward(
    store,
    result.brokenBlock,
    result.layerCleared,
    result.nextDepthMeters,
  )
}

export interface ActiveMiningBlastResult {
  completed: boolean
  blocksBroken: number
  chestsFound: number
}

/** Break every visible block with one TNT charge. */
export function detonateActiveMiningTnt(): ActiveMiningBlastResult {
  const store = useGameStore()
  const lane = store.lanes.active
  const task = lane.taskId ? getTaskById(lane.taskId) : null

  if (!task || task.skillId !== 'mining') {
    store.addLog('TNT can only be used while active mining is selected.', 'system')
    return { completed: false, blocksBroken: 0, chestsFound: 0 }
  }

  if (!store.removeItem('tnt', 1)) {
    store.addLog('You do not have any TNT to use.', 'system')
    return { completed: false, blocksBroken: 0, chestsFound: 0 }
  }

  store.recordItemConsumed('tnt', 1)
  store.ensureActiveMiningState(task.id)
  const blockIds = store.activeMining.blocks.filter((block) => !block.broken).map((block) => block.id)
  let blocksBroken = 0
  let chestsFound = 0

  for (const blockId of blockIds) {
    const result = store.damageActiveMiningBlock(task.id, blockId, Number.MAX_SAFE_INTEGER)
    if (!result.brokenBlock) continue

    blocksBroken++
    grantActiveMiningBlockReward(store, result.brokenBlock, result.layerCleared, result.nextDepthMeters)
    if (result.brokenBlock.containsChest) chestsFound++
  }

  store.triggerActiveMiningBlast()
  const chestText = chestsFound > 0 ? ` and found ${chestsFound} chest${chestsFound === 1 ? '' : 's'}` : ''
  store.addLog(`TNT blasted ${blocksBroken} blocks${chestText}.`, 'gain')
  return { completed: blocksBroken > 0, blocksBroken, chestsFound }
}

function grantActiveMiningBlockReward(
  store: ReturnType<typeof useGameStore>,
  block: ActiveMiningBlockState,
  layerCleared: boolean,
  nextDepthMeters: number,
) {
  for (const drop of block.drops) {
    store.addItem(drop.resourceId, drop.amount)
  }

  if (block.containsChest) {
    store.addItem('chest', 1)
    store.addLog('A miner\'s chest was opened!', 'gain')
  }

  if (block.kind !== 'stone' && block.kind !== 'gravel') {
    const dropLabel = block.drops
      .map((drop) => `+${drop.amount} ${getResourceName(drop.resourceId)}`)
      .join(', ')
    store.addLog(`Mining: ${dropLabel}`, 'gain')
  }

  if (layerCleared) {
    store.addLog(`Mined down to ${nextDepthMeters}m.`, 'gain')
  }
}

function grantActiveMiningStrikeXp(
  task: TaskDefinition,
  store: ReturnType<typeof useGameStore>,
  damageAppliedMs: number,
) {
  const rawXp = task.xpPerAction
    * ACTIVE_MINING_TARGET_XP_MULTIPLIER
    * (damageAppliedMs / task.baseInterval)
  activeMiningXpCarry += rawXp
  const xp = Math.floor(activeMiningXpCarry)
  if (xp < 1) return

  activeMiningXpCarry -= xp
  store.addXp(task.skillId, xp)
  store.addTaskMasteryXp(task.id, xp)
  store.recordTaskAction({
    taskId: task.id,
    skillId: task.skillId,
    source: 'active',
    laneType: 'active',
    xp,
    activeSavedMs: 0,
  })
}

function getActiveClickCadence(taskId: string, timestamp: number) {
  if (lastActiveTaskId !== taskId) {
    lastActiveTaskId = taskId
    lastActiveClickAt = null
    activeSavedProgressMs = 0
  }

  const previousClickAt = lastActiveClickAt
  lastActiveClickAt = timestamp

  if (previousClickAt === null) {
    return {
      clickGapMs: null,
      activeWorkMs: 0,
      progressMs: 0,
      savedMs: 0,
      multiplier: 0,
    }
  }

  const clickGapMs = Math.max(MIN_ACTIVE_CLICK_INTERVAL_MS, timestamp - previousClickAt)
  const multiplier = activeSpeedMultiplierForClickGap(clickGapMs)
  if (multiplier <= 0) {
    activeSavedProgressMs = 0
    return {
      clickGapMs,
      activeWorkMs: 0,
      progressMs: 0,
      savedMs: 0,
      multiplier,
    }
  }

  const progressMs = clickGapMs * multiplier

  return {
    clickGapMs,
    activeWorkMs: clickGapMs,
    progressMs,
    savedMs: Math.max(0, progressMs - clickGapMs),
    multiplier,
  }
}

export function activeSpeedMultiplierForClickGap(clickGapMs: number | null): number {
  if (clickGapMs === null || !Number.isFinite(clickGapMs) || clickGapMs <= 0) return 0
  if (clickGapMs > ACTIVE_STOP_CLICK_INTERVAL_MS) return 0

  const clicksPerSecond = 1000 / Math.max(MIN_ACTIVE_CLICK_INTERVAL_MS, clickGapMs)
  if (clicksPerSecond >= ACTIVE_PEAK_CLICKS_PER_SECOND) return 3
  if (clicksPerSecond >= ACTIVE_TWO_X_MIN_CLICKS_PER_SECOND) return 2
  if (clicksPerSecond >= ACTIVE_ONE_X_MIN_CLICKS_PER_SECOND) return 1
  return 0
}

function consumeActiveSavedProgress(currentProgressMs: number, actionProgressMs: number): number {
  if (activeSavedProgressMs <= 0 || currentProgressMs <= 0) return 0

  const savedRatio = Math.min(1, activeSavedProgressMs / currentProgressMs)
  const savedForAction = Math.min(activeSavedProgressMs, actionProgressMs * savedRatio)
  activeSavedProgressMs = Math.max(0, activeSavedProgressMs - savedForAction)
  return savedForAction
}

/**
 * Calculate and apply offline progress for the routine lane.
 * Farming growth is timestamp-based and harvested by the player when they return.
 * Active lane does NOT progress offline.
 */
export function processOfflineProgress(lastSavedAt: number): OfflineProgressSummary | null {
  const store = useGameStore()
  const now = Date.now()
  const elapsed = now - lastSavedAt

  if (elapsed < 1000) return null // Less than 1 second, skip

  const offlineMs = Math.min(elapsed, MAX_OFFLINE_MS)
  store.recordOfflinePeriod(elapsed, offlineMs)
  const summary: OfflineProgressSummary = {
    elapsedMs: elapsed,
    processedMs: offlineMs,
    capped: elapsed > MAX_OFFLINE_MS,
    totalXp: 0,
    resources: [],
    skills: [],
    taskMastery: [],
    lanes: [],
  }

  // Process routine lane
  processLaneOffline('idle', offlineMs, store, summary)

  store.processFarmingNotifications(now)

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

  store.recordLaneWork(task.id, laneType, offlineMs, 'offline')
  const totalProgress = lane.progress + offlineMs
  const actionCount = Math.floor(totalProgress / task.baseInterval)
  lane.progress = totalProgress % task.baseInterval

  if (actionCount <= 0) return

  const laneSummary = getOfflineLaneSummary(summary, laneType, task)

  // Replay every completed action so future random drops resolve the same way offline.
  for (let index = 0; index < actionCount; index++) {
    const levelBefore = store.getSkillLevel(task.skillId)
    const masteryLevelBefore = store.getTaskMasteryLevel(task.id)
    const result = completeAction(task, store, 'offline', true, 1, laneType)
    if (!result) {
      lane.progress = 0
      laneSummary.blocked = true
      break
    }

    const levelAfter = store.getSkillLevel(task.skillId)
    const masteryLevelAfter = store.getTaskMasteryLevel(task.id)
    summary.totalXp += result.xp
    laneSummary.actions++
    laneSummary.xp += result.xp
    addOfflineSkillGain(summary, task.skillId, result.xp, levelBefore, levelAfter)
    addOfflineTaskMasteryGain(summary, task, result.masteryXp, masteryLevelBefore, masteryLevelAfter)

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

function addOfflineTaskMasteryGain(
  summary: OfflineProgressSummary,
  task: TaskDefinition,
  xp: number,
  levelBefore: number,
  levelAfter: number
) {
  if (xp <= 0 && levelAfter <= levelBefore) return

  let entry = summary.taskMastery.find((gain) => gain.taskId === task.id)
  if (!entry) {
    entry = {
      taskId: task.id,
      taskName: task.name,
      xp: 0,
      levelBefore,
      levelAfter,
    }
    summary.taskMastery.push(entry)
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
  return summary.totalXp > 0
    || summary.resources.some((resource) => resource.amount > 0)
    || summary.taskMastery.some((mastery) => mastery.xp > 0 || mastery.levelAfter > mastery.levelBefore)
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}
