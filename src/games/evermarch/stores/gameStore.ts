/**
 * Core game state store for Evermarch.
 * Manages skills, inventory, lane assignments, and activity log.
 * Local-first: persisted to localStorage via pinia-plugin-persistedstate.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SkillId, LaneType } from '../data/skills'
import { SKILL_LIST } from '../data/skills'
import { ALL_TASKS, getDefaultTaskIdForLane, getTaskById, getTasksForSkill, normalizeTaskId, type TaskDefinition } from '../data/tasks'
import { getResourceDefinition, getResourceName } from '../data/resources'
import { MAX_LEVEL, levelForXp, xpProgressFraction, xpToNextLevel } from '../data/xp'
import {
  TASK_MASTERY_MAX_XP,
  clampTaskMasteryXp,
  taskMasteryLevelForXp,
  taskMasteryProgressFraction,
  taskMasteryXpToNextLevel,
} from '../data/taskMastery'
import {
  cloneActiveMiningState,
  createDefaultActiveMiningState,
  damageActiveMiningBlockState,
  ensureActiveMiningState as ensureActiveMiningLayerState,
  normalizeActiveMiningState,
  type ActiveMiningDamageResult,
  type ActiveMiningState,
} from '../engine/activeMining'

// ─── Types ─────────────────────────────────────────────────────

export interface SkillState {
  id: SkillId
  xp: number
}

export interface TaskMasteryState {
  taskId: string
  xp: number
}

export interface SkillMasterySummary {
  skillId: SkillId
  masteredTasks: number
  totalTasks: number
  percent: number
  averageLevel: number
  allTasksMastered: boolean
  trueMastery: boolean
}

export interface LaneState {
  type: LaneType
  taskId: string | null
  /** Accumulated progress toward next action (ms) */
  progress: number
}

export interface FarmingPlotState {
  id: string
  taskId: string | null
  plantedAt: number | null
  readyAt: number | null
  notifiedAt: number | null
  lastCollectedAt: number | null
}

export interface LogEntry {
  id: number
  time: string
  message: string
  type: 'gain' | 'levelup' | 'unlock' | 'system' | 'offline'
  /** For stacking repeated identical messages */
  count: number
}

export type GainToastKind = 'item' | 'xp' | 'gold' | 'level'

export interface GainToast {
  id: number
  key: string
  kind: GainToastKind
  label: string
  amount: number | null
  total: number | null
  icon: string
  createdAt: number
  updatedAt: number
}

export interface ActiveCadenceState {
  multiplier: number
  ratio: number
  progressMs: number
  clickGapMs: number | null
  lastClickAt: number | null
}

export interface ItemStats {
  acquired: number
  acquisitionEvents: number
  consumed: number
  sold: number
  saleEvents: number
  goldEarned: number
  firstAcquiredAt: number | null
  lastAcquiredAt: number | null
}

export interface TaskStats {
  actions: number
  activeActions: number
  idleActions: number
  backgroundActions: number
  offlineActions: number
  activeClicks: number
  xp: number
  timeMs: number
  activeWorkMs: number
  activeSavedMs: number
  idleWorkMs: number
  backgroundWorkMs: number
  offlineWorkMs: number
  firstWorkedAt: number | null
  lastWorkedAt: number | null
}

export interface SkillStats {
  actions: number
  activeActions: number
  idleActions: number
  backgroundActions: number
  offlineActions: number
  activeClicks: number
  xp: number
  timeMs: number
  activeWorkMs: number
  activeSavedMs: number
  idleWorkMs: number
  backgroundWorkMs: number
  offlineWorkMs: number
  firstWorkedAt: number | null
  lastWorkedAt: number | null
}

export interface AccountStats {
  onlinePlayMs: number
  activeWorkMs: number
  activeSavedMs: number
  idleWorkMs: number
  backgroundWorkMs: number
  offlineCreditedMs: number
  offlineMissedMs: number
  activeClickCount: number
  totalGoldEarned: number
  totalItemsAcquired: number
  totalItemsSold: number
}

export interface GameStats {
  version: number
  items: Record<string, ItemStats>
  tasks: Record<string, TaskStats>
  skills: Partial<Record<SkillId, SkillStats>>
  account: AccountStats
}

export interface CompletionProgress {
  overallPercent: number
  items: {
    collected: number
    total: number
    percent: number
    missing: string[]
  }
  skills: {
    completed: number
    total: number
    percent: number
    completedSkillIds: SkillId[]
    remainingSkillIds: SkillId[]
  }
  tasks: {
    worked: number
    workedPercent: number
    mastered: number
    total: number
    percent: number
    masteredTaskIds: string[]
    unmasteredTaskIds: string[]
    unworkedTaskIds: string[]
  }
  trueMastery: {
    readySkills: number
    total: number
    percent: number
    readySkillIds: SkillId[]
    remainingSkillIds: SkillId[]
  }
}

export interface GameSaveData {
  version: number
  saveName: string
  createdAt: number
  lastSavedAt: number
  lastCloudSyncedAt?: number | null
  playtime: number
  skills: SkillState[]
  taskMastery?: Record<string, TaskMasteryState>
  inventory: Record<string, number>
  gold: number
  activeMining?: ActiveMiningState
  lanes: {
    active: { taskId: string | null }
    idle: { taskId: string | null; progress: number }
    background: { taskId: string | null; progress: number }
  }
  farmingPlots?: FarmingPlotState[]
  stats?: GameStats
}

type StatActionSource = LaneType | 'offline'

interface TaskActionStatsInput {
  taskId: string
  skillId: SkillId
  source: StatActionSource
  laneType: LaneType
  xp: number
  activeClicks?: number
  activeSavedMs?: number
}

const SAVE_VERSION = 6
const STATS_VERSION = 3
const ACTIVE_CLICK_SESSION_GAP_MS = 2_000
const ACTIVE_SAVED_TIME_CAP_MULTIPLIER = 2
const TOAST_DURATION_MS = 3_200
const TOAST_MERGE_WINDOW_MS = 1_200
const MAX_GAIN_TOASTS = 6
const FARMING_PLOT_UNLOCK_LEVELS = [1, 10, 25, 45, 70, 90]
const FARMING_MIN_GROWTH_MS = 6 * 60 * 60 * 1000
const FARMING_MAX_GROWTH_MS = 12 * 60 * 60 * 1000
const COLLECTIBLE_RESOURCE_IDS = Array.from(new Set(
  ALL_TASKS.flatMap((task) => task.drops.map((drop) => drop.resourceId))
)).sort((a, b) => getResourceDefinition(a).name.localeCompare(getResourceDefinition(b).name))

// ─── Store ─────────────────────────────────────────────────────

export const useGameStore = defineStore('evermarch-game', () => {
  // ── Core State ──

  const saveName = ref('New Adventure')
  const createdAt = ref(Date.now())
  const lastSavedAt = ref(Date.now())
  const lastCloudSyncedAt = ref<number | null>(null)
  const playtime = ref(0)

  const skills = ref<SkillState[]>(
    SKILL_LIST.map((s) => ({ id: s.id, xp: 0 }))
  )
  const taskMastery = ref<Record<string, TaskMasteryState>>({})

  const inventory = ref<Record<string, number>>({})
  const gold = ref(0)
  const stats = ref<GameStats>(createDefaultStats())
  const activeMining = ref<ActiveMiningState>(createDefaultActiveMiningState())

  const lanes = ref<Record<LaneType, LaneState>>({
    active: { type: 'active', taskId: getDefaultTaskIdForLane('active'), progress: 0 },
    idle: { type: 'idle', taskId: getDefaultTaskIdForLane('idle'), progress: 0 },
    background: { type: 'background', taskId: getDefaultTaskIdForLane('background'), progress: 0 },
  })
  const farmingPlots = ref<FarmingPlotState[]>(createDefaultFarmingPlots())

  const activityLog = ref<LogEntry[]>([])
  let logCounter = 0
  const gainToasts = ref<GainToast[]>([])
  const activeCadence = ref<ActiveCadenceState>(createActiveCadenceState())
  let toastCounter = 0
  const toastTimers = new Map<number, ReturnType<typeof setTimeout>>()

  const gameLoaded = ref(false)
  let lastActiveClickAt: number | null = null

  // ── Computed ──

  function getSkill(id: SkillId): SkillState {
    return skills.value.find((s) => s.id === id) ?? { id, xp: 0 }
  }

  function getSkillLevel(id: SkillId): number {
    return levelForXp(getSkill(id).xp)
  }

  function getSkillProgress(id: SkillId): number {
    return xpProgressFraction(getSkill(id).xp)
  }

  function getSkillXpToNext(id: SkillId): number {
    return xpToNextLevel(getSkill(id).xp)
  }

  const totalLevel = computed(() =>
    skills.value.reduce((sum, s) => sum + levelForXp(s.xp), 0)
  )

  const totalXp = computed(() =>
    skills.value.reduce((sum, s) => sum + s.xp, 0)
  )

  const accountAgeMs = computed(() => Math.max(0, Date.now() - createdAt.value))

  const inventoryValue = computed(() =>
    Object.entries(inventory.value).reduce((sum, [resourceId, count]) => {
      if (count <= 0) return sum
      return sum + getResourceDefinition(resourceId).sellValue * count
    }, 0)
  )

  const unlockedFarmingPlotCount = computed(() =>
    farmingPlotUnlockCountForLevel(getSkillLevel('farming'))
  )

  const plantedFarmingPlotCount = computed(() =>
    farmingPlots.value.filter((plot) => !!plot.taskId).length
  )

  const readyFarmingPlotCount = computed(() => {
    const now = Date.now()
    return farmingPlots.value.filter((plot) => isFarmingPlotReady(plot, now)).length
  })

  const unlockedFarmingTasks = computed(() =>
    getTasksForSkill('farming').filter((task) => getSkillLevel('farming') >= task.levelRequired)
  )

  const completionProgress = computed<CompletionProgress>(() => {
    const collectedResourceIds = COLLECTIBLE_RESOURCE_IDS.filter((resourceId) =>
      getItemStats(resourceId).acquired > 0
    )
    const completedSkillIds = SKILL_LIST
      .filter((skill) => getSkillLevel(skill.id) >= MAX_LEVEL)
      .map((skill) => skill.id)
    const completedSkillSet = new Set<SkillId>(completedSkillIds)
    const workedTaskIds = ALL_TASKS
      .filter((task) => getTaskStats(task.id).actions > 0)
      .map((task) => task.id)
    const workedTaskSet = new Set(workedTaskIds)
    const masteredTaskIds = ALL_TASKS
      .filter((task) => getTaskMasteryLevel(task.id) >= MAX_LEVEL)
      .map((task) => task.id)
    const masteredTaskSet = new Set(masteredTaskIds)
    const taskMasteryPercent = percentFromRatio(
      ALL_TASKS.reduce((sum, task) => sum + getTaskMasteryXp(task.id), 0),
      ALL_TASKS.length * TASK_MASTERY_MAX_XP,
    )
    const masteryReadySkillIds = SKILL_LIST
      .filter((skill) =>
        completedSkillSet.has(skill.id)
        && getTasksForSkill(skill.id).every((task) => masteredTaskSet.has(task.id))
      )
      .map((skill) => skill.id)

    const itemPercent = percent(collectedResourceIds.length, COLLECTIBLE_RESOURCE_IDS.length)
    const skillPercent = percent(completedSkillIds.length, SKILL_LIST.length)
    const taskWorkedPercent = percent(workedTaskIds.length, ALL_TASKS.length)

    return {
      overallPercent: Math.round((itemPercent + skillPercent + taskMasteryPercent) / 3),
      items: {
        collected: collectedResourceIds.length,
        total: COLLECTIBLE_RESOURCE_IDS.length,
        percent: itemPercent,
        missing: COLLECTIBLE_RESOURCE_IDS.filter((resourceId) => !collectedResourceIds.includes(resourceId)),
      },
      skills: {
        completed: completedSkillIds.length,
        total: SKILL_LIST.length,
        percent: skillPercent,
        completedSkillIds,
        remainingSkillIds: SKILL_LIST
          .filter((skill) => !completedSkillSet.has(skill.id))
          .map((skill) => skill.id),
      },
      tasks: {
        worked: workedTaskIds.length,
        workedPercent: taskWorkedPercent,
        mastered: masteredTaskIds.length,
        total: ALL_TASKS.length,
        percent: taskMasteryPercent,
        masteredTaskIds,
        unmasteredTaskIds: ALL_TASKS
          .filter((task) => !masteredTaskSet.has(task.id))
          .map((task) => task.id),
        unworkedTaskIds: ALL_TASKS
          .filter((task) => !workedTaskSet.has(task.id))
          .map((task) => task.id),
      },
      trueMastery: {
        readySkills: masteryReadySkillIds.length,
        total: SKILL_LIST.length,
        percent: percent(masteryReadySkillIds.length, SKILL_LIST.length),
        readySkillIds: masteryReadySkillIds,
        remainingSkillIds: SKILL_LIST
          .filter((skill) => !masteryReadySkillIds.includes(skill.id))
          .map((skill) => skill.id),
      },
    }
  })

  function getItemCount(resourceId: string): number {
    return inventory.value[resourceId] ?? 0
  }

  function getItemStats(resourceId: string): ItemStats {
    return stats.value.items[resourceId] ?? createItemStats()
  }

  function getTaskStats(taskId: string): TaskStats {
    return stats.value.tasks[taskId] ?? createTaskStats()
  }

  function getSkillStats(skillId: SkillId): SkillStats {
    return stats.value.skills[skillId] ?? createSkillStats()
  }

  function getTaskMastery(taskId: string): TaskMasteryState {
    return taskMastery.value[taskId] ?? { taskId, xp: 0 }
  }

  function getTaskMasteryXp(taskId: string): number {
    return getTaskMastery(taskId).xp
  }

  function getTaskMasteryLevel(taskId: string): number {
    return taskMasteryLevelForXp(getTaskMasteryXp(taskId))
  }

  function getTaskMasteryProgress(taskId: string): number {
    return taskMasteryProgressFraction(getTaskMasteryXp(taskId))
  }

  function getTaskMasteryXpToNext(taskId: string): number {
    return taskMasteryXpToNextLevel(getTaskMasteryXp(taskId))
  }

  function isTaskMastered(taskId: string): boolean {
    return getTaskMasteryLevel(taskId) >= MAX_LEVEL
  }

  function getSkillMasterySummary(skillId: SkillId): SkillMasterySummary {
    const tasks = getTasksForSkill(skillId)
    const masteredTasks = tasks.filter((task) => isTaskMastered(task.id)).length
    const totalLevelForTasks = tasks.reduce((sum, task) => sum + getTaskMasteryLevel(task.id), 0)
    const totalXpForTasks = tasks.reduce((sum, task) => sum + getTaskMasteryXp(task.id), 0)
    const totalTaskXp = tasks.length * TASK_MASTERY_MAX_XP
    const allTasksMastered = masteredTasks === tasks.length && tasks.length > 0

    return {
      skillId,
      masteredTasks,
      totalTasks: tasks.length,
      percent: percentFromRatio(totalXpForTasks, totalTaskXp),
      averageLevel: tasks.length > 0 ? Math.floor(totalLevelForTasks / tasks.length) : 0,
      allTasksMastered,
      trueMastery: getSkillLevel(skillId) >= MAX_LEVEL && allTasksMastered,
    }
  }

  // ── Mutations ──

  function addXp(skillId: SkillId, amount: number, options: { toast?: boolean } = {}) {
    const skill = skills.value.find((s) => s.id === skillId)
    if (!skill) return

    const shouldToast = options.toast !== false
    const prevLevel = levelForXp(skill.xp)
    skill.xp += amount
    const newLevel = levelForXp(skill.xp)
    const skillDef = SKILL_LIST.find((s) => s.id === skillId)
    const skillName = skillDef?.name ?? skillId

    if (shouldToast && amount > 0) {
      pushGainToast({
        key: `xp:${skillId}`,
        kind: 'xp',
        label: `${skillName} XP`,
        amount,
        total: skill.xp,
        icon: 'Star',
      })
    }

    if (newLevel > prevLevel) {
      addLog(
        `${skillName} level increased to ${newLevel}!`,
        'levelup'
      )
      if (shouldToast) {
        pushGainToast({
          key: `level:${skillId}:${newLevel}`,
          kind: 'level',
          label: `${skillName} Lv. ${newLevel}`,
          amount: null,
          total: null,
          icon: 'Sparkles',
        })
      }
      logTaskUnlocks(skillId, skillName, prevLevel, newLevel)
    }
  }

  function addTaskMasteryXp(taskId: string, amount: number, options: { toast?: boolean } = {}) {
    if (amount <= 0) return 0

    const task = getTaskById(taskId)
    if (!task) return 0

    const mastery = ensureTaskMastery(taskId)
    const prevXp = mastery.xp
    if (prevXp >= TASK_MASTERY_MAX_XP) return 0

    const prevLevel = taskMasteryLevelForXp(prevXp)
    mastery.xp = clampTaskMasteryXp(prevXp + amount)
    const gained = mastery.xp - prevXp
    const newLevel = taskMasteryLevelForXp(mastery.xp)
    const shouldToast = options.toast !== false

    if (newLevel > prevLevel) {
      const taskLabel = taskChoiceLabel(task.name)
      addLog(`${taskLabel} mastery increased to ${newLevel}!`, 'levelup')
      if (shouldToast) {
        pushGainToast({
          key: `task-mastery:${taskId}:${newLevel}`,
          kind: 'level',
          label: `${taskLabel} Mastery Lv. ${newLevel}`,
          amount: null,
          total: null,
          icon: 'Sparkles',
        })
      }
    }

    return gained
  }

  function logTaskUnlocks(skillId: SkillId, skillName: string, previousLevel: number, newLevel: number) {
    const unlockedTasks = getTasksForSkill(skillId)
      .filter((task) => task.levelRequired > previousLevel && task.levelRequired <= newLevel)
      .sort((a, b) => a.levelRequired - b.levelRequired || a.name.localeCompare(b.name))

    if (unlockedTasks.length === 0) return

    const taskNames = unlockedTasks.map((task) => taskChoiceLabel(task.name))
    addLog(`Unlocked ${skillName}: ${formatList(taskNames)}`, 'unlock')
  }

  function addItem(resourceId: string, amount: number, options: { toast?: boolean } = {}) {
    const next = (inventory.value[resourceId] ?? 0) + amount
    inventory.value[resourceId] = next
    if (amount > 0) {
      recordItemAcquired(resourceId, amount)
    }

    if (options.toast !== false && amount > 0) {
      const resource = getResourceDefinition(resourceId)
      pushGainToast({
        key: `item:${resourceId}`,
        kind: 'item',
        label: resource.name,
        amount,
        total: next,
        icon: resource.icon,
      })
    }
  }

  function removeItem(resourceId: string, amount: number): boolean {
    const current = inventory.value[resourceId] ?? 0
    if (current < amount) return false

    const next = current - amount
    if (next > 0) {
      inventory.value[resourceId] = next
    } else {
      delete inventory.value[resourceId]
    }

    return true
  }

  function addGold(amount: number, options: { toast?: boolean } = {}) {
    gold.value += amount
    if (amount > 0) {
      stats.value.account.totalGoldEarned += amount
    }
    if (options.toast !== false && amount > 0) {
      pushGainToast({
        key: 'gold',
        kind: 'gold',
        label: 'Gold',
        amount,
        total: gold.value,
        icon: 'Coins',
      })
    }
  }

  function sellItem(resourceId: string, amount: number): number {
    const quantity = Math.floor(amount)
    if (quantity <= 0) return 0

    const resource = getResourceDefinition(resourceId)
    if (resource.sellValue <= 0) return 0

    const sold = Math.min(quantity, getItemCount(resourceId))
    if (sold <= 0) return 0

    if (!removeItem(resourceId, sold)) return 0

    const goldGained = resource.sellValue * sold
    addGold(goldGained)
    recordItemSold(resourceId, sold, goldGained)
    addLog(
      `Sold ${sold.toLocaleString()} ${resource.name} for ${goldGained.toLocaleString()} gold`,
      'system'
    )

    return goldGained
  }

  function recordOnlineTime(deltaMs: number) {
    if (deltaMs <= 0) return
    playtime.value += deltaMs / 1000
    stats.value.account.onlinePlayMs += deltaMs
  }

  function recordLaneWork(taskId: string, laneType: LaneType, workMs: number, source: StatActionSource = laneType) {
    if (workMs <= 0) return

    const task = getTaskById(taskId)
    if (!task) return

    const now = Date.now()
    const taskStats = ensureTaskStats(task.id)
    const skillStats = ensureSkillStats(task.skillId)

    applyWorkTime(taskStats, laneType, source, workMs, now)
    applyWorkTime(skillStats, laneType, source, workMs, now)
    applyAccountWorkTime(laneType, workMs)
  }

  function recordTaskAction(input: TaskActionStatsInput) {
    const taskStats = ensureTaskStats(input.taskId)
    const skillStats = ensureSkillStats(input.skillId)
    const now = Date.now()
    const activeClicks = input.activeClicks ?? 0
    const activeSavedMs = input.activeSavedMs ?? 0
    const activeEngagedMs = activeClicks > 0 ? activeClickEngagementMs(now) : 0

    applyActionStats(taskStats, input, activeClicks, activeSavedMs, now)
    applyActionStats(skillStats, input, activeClicks, activeSavedMs, now)

    if (activeEngagedMs > 0) {
      applyWorkTime(taskStats, 'active', 'active', activeEngagedMs, now)
      applyWorkTime(skillStats, 'active', 'active', activeEngagedMs, now)
      applyAccountWorkTime('active', activeEngagedMs)
    }

    if (activeClicks > 0) {
      stats.value.account.activeClickCount += activeClicks
    }

    if (activeSavedMs > 0) {
      stats.value.account.activeSavedMs += activeSavedMs
    }
  }

  function recordActiveClick(taskId: string, skillId: SkillId, activeWorkMs: number) {
    const taskStats = ensureTaskStats(taskId)
    const skillStats = ensureSkillStats(skillId)
    const now = Date.now()
    const safeActiveWorkMs = Math.max(0, activeWorkMs)

    applyActiveClickStats(taskStats, now)
    applyActiveClickStats(skillStats, now)
    stats.value.account.activeClickCount++

    if (safeActiveWorkMs > 0) {
      applyWorkTime(taskStats, 'active', 'active', safeActiveWorkMs, now)
      applyWorkTime(skillStats, 'active', 'active', safeActiveWorkMs, now)
      applyAccountWorkTime('active', safeActiveWorkMs)
    }
  }

  function recordActiveCadence(input: Omit<ActiveCadenceState, 'lastClickAt'>) {
    activeCadence.value = {
      multiplier: Math.max(0, input.multiplier),
      ratio: Math.max(0, Math.min(1, input.ratio)),
      progressMs: Math.max(0, input.progressMs),
      clickGapMs: input.clickGapMs,
      lastClickAt: Date.now(),
    }
  }

  function resetActiveCadence() {
    activeCadence.value = createActiveCadenceState()
  }

  function ensureActiveMiningState(taskId: string | null | undefined = lanes.value.active.taskId): ActiveMiningState {
    const task = taskId ? getTaskById(taskId) : null
    if (!task || task.skillId !== 'mining') return activeMining.value

    activeMining.value = ensureActiveMiningLayerState(
      activeMining.value,
      task,
      getSkillLevel('mining'),
    )

    return activeMining.value
  }

  function damageActiveMiningBlock(
    taskId: string,
    blockId: string,
    damageMs: number,
  ): ActiveMiningDamageResult {
    const task = getTaskById(taskId)
    if (!task || task.skillId !== 'mining') {
      return {
        state: activeMining.value,
        brokenBlock: null,
        layerCleared: false,
        previousDepthMeters: activeMining.value.depthMeters,
        nextDepthMeters: activeMining.value.depthMeters,
        damageAppliedMs: 0,
      }
    }

    const result = damageActiveMiningBlockState(
      activeMining.value,
      task,
      getSkillLevel('mining'),
      blockId,
      damageMs,
    )
    activeMining.value = result.state
    return result
  }

  function recordItemConsumed(resourceId: string, amount: number) {
    if (amount <= 0) return
    ensureItemStats(resourceId).consumed += amount
  }

  function recordOfflinePeriod(elapsedMs: number, creditedMs: number) {
    if (elapsedMs <= 0) return
    const safeCredited = Math.max(0, Math.min(elapsedMs, creditedMs))
    stats.value.account.offlineCreditedMs += safeCredited
    stats.value.account.offlineMissedMs += Math.max(0, elapsedMs - safeCredited)
  }

  function recordItemAcquired(resourceId: string, amount: number) {
    const itemStats = ensureItemStats(resourceId)
    const now = Date.now()

    itemStats.acquired += amount
    itemStats.acquisitionEvents++
    itemStats.lastAcquiredAt = now
    if (itemStats.firstAcquiredAt === null) {
      itemStats.firstAcquiredAt = now
    }

    stats.value.account.totalItemsAcquired += amount
  }

  function recordItemSold(resourceId: string, amount: number, goldEarned: number) {
    const itemStats = ensureItemStats(resourceId)

    itemStats.sold += amount
    itemStats.saleEvents++
    itemStats.goldEarned += goldEarned
    stats.value.account.totalItemsSold += amount
  }

  function ensureItemStats(resourceId: string): ItemStats {
    stats.value.items[resourceId] ??= createItemStats()
    return stats.value.items[resourceId]!
  }

  function ensureTaskStats(taskId: string): TaskStats {
    stats.value.tasks[taskId] ??= createTaskStats()
    return stats.value.tasks[taskId]!
  }

  function ensureSkillStats(skillId: SkillId): SkillStats {
    stats.value.skills[skillId] ??= createSkillStats()
    return stats.value.skills[skillId]!
  }

  function ensureTaskMastery(taskId: string): TaskMasteryState {
    taskMastery.value[taskId] ??= { taskId, xp: 0 }
    return taskMastery.value[taskId]!
  }

  function applyWorkTime(target: TaskStats | SkillStats, laneType: LaneType, source: StatActionSource, workMs: number, timestamp: number) {
    target.timeMs += workMs
    target.lastWorkedAt = timestamp
    if (target.firstWorkedAt === null) {
      target.firstWorkedAt = timestamp
    }

    if (laneType === 'active') {
      target.activeWorkMs += workMs
    } else if (laneType === 'idle') {
      target.idleWorkMs += workMs
    } else {
      target.backgroundWorkMs += workMs
    }

    if (source === 'offline') {
      target.offlineWorkMs += workMs
    }
  }

  function activeClickEngagementMs(timestamp: number): number {
    const previousClickAt = lastActiveClickAt
    lastActiveClickAt = timestamp

    if (previousClickAt === null) return 0

    const gapMs = timestamp - previousClickAt
    if (gapMs <= 0 || gapMs > ACTIVE_CLICK_SESSION_GAP_MS) return 0
    return gapMs
  }

  function applyActionStats(
    target: TaskStats | SkillStats,
    input: TaskActionStatsInput,
    activeClicks: number,
    activeSavedMs: number,
    timestamp: number
  ) {
    target.actions++
    target.xp += input.xp
    target.activeSavedMs += activeSavedMs
    target.lastWorkedAt = timestamp
    if (target.firstWorkedAt === null) {
      target.firstWorkedAt = timestamp
    }

    if (input.source === 'offline') {
      target.offlineActions++
    } else if (input.source === 'active') {
      target.activeActions++
    } else if (input.source === 'idle') {
      target.idleActions++
    } else {
      target.backgroundActions++
    }

    if (activeClicks > 0) {
      target.activeClicks += activeClicks
    }
  }

  function applyActiveClickStats(target: TaskStats | SkillStats, timestamp: number) {
    target.activeClicks++
    target.lastWorkedAt = timestamp
    if (target.firstWorkedAt === null) {
      target.firstWorkedAt = timestamp
    }
  }

  function applyAccountWorkTime(laneType: LaneType, workMs: number) {
    if (laneType === 'active') {
      stats.value.account.activeWorkMs += workMs
    } else if (laneType === 'idle') {
      stats.value.account.idleWorkMs += workMs
    } else {
      stats.value.account.backgroundWorkMs += workMs
    }
  }

  function setLaneTask(laneType: LaneType, taskId: string | null) {
    const lane = lanes.value[laneType]
    lane.taskId = normalizeTaskId(taskId, laneType)
    lane.progress = 0
    if (laneType === 'active') {
      lastActiveClickAt = null
      resetActiveCadence()
    }

    const task = getTaskById(lane.taskId)
    if (laneType === 'active' && task?.skillId === 'mining') {
      ensureActiveMiningState(task.id)
    }
    addLog(`Started ${task?.name ?? lane.taskId} (${laneType})`, 'system')
  }

  function plantFarmingPlot(plotId: string, taskId: string): boolean {
    const plot = farmingPlots.value.find((candidate) => candidate.id === plotId)
    const plotIndex = plot ? farmingPlots.value.indexOf(plot) : -1
    const task = getTaskById(taskId)

    if (!plot || plotIndex < 0) return false
    if (!isFarmingPlotUnlockedAtIndex(plotIndex)) {
      addLog(`Field ${plotIndex + 1} unlocks at Farming Lv.${farmingPlotUnlockLevel(plotIndex)}.`, 'system')
      return false
    }
    if (!task || task.skillId !== 'farming') {
      addLog('Choose a crop before planting.', 'system')
      return false
    }
    if (getSkillLevel('farming') < task.levelRequired) {
      addLog(`${taskChoiceLabel(task.name)} unlocks at Farming Lv.${task.levelRequired}.`, 'system')
      return false
    }
    if (plot.taskId) {
      addLog(`Field ${plotIndex + 1} is already planted.`, 'system')
      return false
    }

    const now = Date.now()
    plot.taskId = task.id
    plot.plantedAt = now
    plot.readyAt = now + getFarmingGrowthDurationMs(task)
    plot.notifiedAt = null
    addLog(`Planted ${taskChoiceLabel(task.name)} in Field ${plotIndex + 1}.`, 'system')
    return true
  }

  function collectFarmingPlot(plotId: string): boolean {
    return harvestFarmingPlot(plotId, false)
  }

  function collectAndReplantFarmingPlot(plotId: string): boolean {
    return harvestFarmingPlot(plotId, true)
  }

  function harvestFarmingPlot(plotId: string, replant: boolean): boolean {
    const plot = farmingPlots.value.find((candidate) => candidate.id === plotId)
    const plotIndex = plot ? farmingPlots.value.indexOf(plot) : -1
    const task = plot?.taskId ? getTaskById(plot.taskId) : null

    if (!plot || plotIndex < 0) return false
    if (!task || task.skillId !== 'farming') {
      addLog(`Field ${plotIndex + 1} is empty.`, 'system')
      return false
    }

    const now = Date.now()
    if (!isFarmingPlotReady(plot, now)) {
      addLog(`${taskChoiceLabel(task.name)} is still growing in Field ${plotIndex + 1}.`, 'system')
      return false
    }

    const growthMs = Math.max(0, (plot.readyAt ?? now) - (plot.plantedAt ?? now))
    const yieldMultiplier = getFarmingYieldAmount(task)
    const xp = getFarmingHarvestXp(task, yieldMultiplier)
    const taskLabel = taskChoiceLabel(task.name)
    const previousTaskId = task.id
    const gainedDrops = task.drops.map((drop) => ({
      resourceId: drop.resourceId,
      amount: drop.amount * yieldMultiplier,
    }))

    recordLaneWork(task.id, 'background', growthMs)
    addXp('farming', xp)
    addTaskMasteryXp(task.id, xp)
    recordTaskAction({
      taskId: task.id,
      skillId: 'farming',
      source: 'background',
      laneType: 'background',
      xp,
    })

    for (const drop of gainedDrops) {
      addItem(drop.resourceId, drop.amount)
    }

    const harvestLabel = gainedDrops
      .map((drop) => `${drop.amount.toLocaleString()} ${getResourceName(drop.resourceId)}`)
      .join(', ')
    addLog(`Harvested ${harvestLabel} from Field ${plotIndex + 1}.`, 'gain')

    plot.taskId = null
    plot.plantedAt = null
    plot.readyAt = null
    plot.notifiedAt = null
    plot.lastCollectedAt = now

    if (replant) {
      const planted = plantFarmingPlot(plot.id, previousTaskId)
      if (planted) {
        addLog(`Replanted ${taskLabel} in Field ${plotIndex + 1}.`, 'system')
      }
      return planted
    }

    return true
  }

  function processFarmingNotifications(timestamp = Date.now()) {
    for (const [index, plot] of farmingPlots.value.entries()) {
      if (plot.notifiedAt || !isFarmingPlotReady(plot, timestamp)) continue

      const task = plot.taskId ? getTaskById(plot.taskId) : null
      if (!task) continue

      plot.notifiedAt = timestamp
      addLog(`Field ${index + 1} is ready: ${taskChoiceLabel(task.name)} can be harvested.`, 'system')
    }
  }

  function getFarmingGrowthDurationMs(taskOrId: TaskDefinition | string): number {
    const task = typeof taskOrId === 'string' ? getTaskById(taskOrId) : taskOrId
    if (!task || task.skillId !== 'farming') return FARMING_MIN_GROWTH_MS

    const levelRatio = Math.max(0, Math.min(1, (task.levelRequired - 1) / 98))
    return Math.round(FARMING_MIN_GROWTH_MS + (FARMING_MAX_GROWTH_MS - FARMING_MIN_GROWTH_MS) * levelRatio)
  }

  function getFarmingYieldAmount(taskOrId: TaskDefinition | string): number {
    const task = typeof taskOrId === 'string' ? getTaskById(taskOrId) : taskOrId
    if (!task || task.skillId !== 'farming') return 0

    const growthHours = getFarmingGrowthDurationMs(task) / (60 * 60 * 1000)
    return Math.max(12, Math.round(18 + task.levelRequired * 2.2 + growthHours))
  }

  function getFarmingPlotUnlockLevel(index: number): number {
    return farmingPlotUnlockLevel(index)
  }

  function isFarmingPlotUnlocked(plotId: string): boolean {
    const index = farmingPlots.value.findIndex((plot) => plot.id === plotId)
    return index >= 0 && isFarmingPlotUnlockedAtIndex(index)
  }

  function isFarmingPlotUnlockedAtIndex(index: number): boolean {
    return getSkillLevel('farming') >= farmingPlotUnlockLevel(index)
  }

  function taskChoiceLabel(taskName: string): string {
    return taskName.replace(/^(Mine|Chop|Fish|Kindle|Cook|Forge|Shape|Craft|Bind|Grow)\s+/, '')
  }

  function formatList(values: string[]): string {
    if (values.length <= 2) return values.join(', ')
    return `${values.slice(0, 2).join(', ')}, and ${values.length - 2} more`
  }

  // ── Activity Log ──

  function addLog(message: string, type: LogEntry['type'] = 'gain') {
    const now = new Date()
    const time = now.toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })

    // Stack identical consecutive messages
    if (activityLog.value.length > 0) {
      const last = activityLog.value[0]!
      if (last.message === message && last.type === type) {
        last.count++
        last.time = time
        return
      }
    }

    logCounter++
    activityLog.value.unshift({
      id: logCounter,
      time,
      message,
      type,
      count: 1,
    })

    // Cap log at 100 entries
    if (activityLog.value.length > 100) {
      activityLog.value.length = 100
    }
  }

  // ── Save / Load ──

  // Gain Toasts

  function pushGainToast(input: Omit<GainToast, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = Date.now()
    const mergeTarget = gainToasts.value.find((toast) =>
      toast.key === input.key
      && toast.kind === input.kind
      && input.amount !== null
      && toast.amount !== null
      && now - toast.updatedAt <= TOAST_MERGE_WINDOW_MS
    )

    if (mergeTarget && mergeTarget.amount !== null && input.amount !== null) {
      mergeTarget.amount += input.amount
      mergeTarget.total = input.total
      mergeTarget.updatedAt = now
      scheduleToastRemoval(mergeTarget.id)
      return
    }

    toastCounter++
    const toast: GainToast = {
      ...input,
      id: toastCounter,
      createdAt: now,
      updatedAt: now,
    }

    gainToasts.value.push(toast)
    while (gainToasts.value.length > MAX_GAIN_TOASTS) {
      const removed = gainToasts.value.shift()
      if (removed) clearToastTimer(removed.id)
    }

    scheduleToastRemoval(toast.id)
  }

  function scheduleToastRemoval(toastId: number) {
    clearToastTimer(toastId)
    toastTimers.set(toastId, setTimeout(() => {
      dismissGainToast(toastId)
    }, TOAST_DURATION_MS))
  }

  function dismissGainToast(toastId: number) {
    clearToastTimer(toastId)
    const index = gainToasts.value.findIndex((toast) => toast.id === toastId)
    if (index >= 0) {
      gainToasts.value.splice(index, 1)
    }
  }

  function clearToastTimer(toastId: number) {
    const timer = toastTimers.get(toastId)
    if (timer) {
      clearTimeout(timer)
      toastTimers.delete(toastId)
    }
  }

  function clearGainToasts() {
    for (const toastId of Array.from(toastTimers.keys())) {
      clearToastTimer(toastId)
    }
    gainToasts.value = []
  }

  function serialize(): GameSaveData {
    return {
      version: SAVE_VERSION,
      saveName: saveName.value,
      createdAt: createdAt.value,
      lastSavedAt: Date.now(),
      lastCloudSyncedAt: lastCloudSyncedAt.value,
      playtime: playtime.value,
      skills: skills.value.map((s) => ({ ...s })),
      taskMastery: cloneTaskMastery(taskMastery.value),
      inventory: { ...inventory.value },
      gold: gold.value,
      activeMining: cloneActiveMiningState(activeMining.value),
      lanes: {
        active: { taskId: lanes.value.active.taskId },
        idle: { taskId: lanes.value.idle.taskId, progress: lanes.value.idle.progress },
        background: { taskId: lanes.value.background.taskId, progress: lanes.value.background.progress },
      },
      farmingPlots: cloneFarmingPlots(farmingPlots.value),
      stats: cloneStats(stats.value),
    }
  }

  function deserialize(data: GameSaveData) {
    clearGainToasts()
    saveName.value = data.saveName ?? 'Adventure'
    createdAt.value = data.createdAt ?? Date.now()
    lastSavedAt.value = data.lastSavedAt ?? Date.now()
    lastCloudSyncedAt.value = normalizeTimestamp(data.lastCloudSyncedAt)
    playtime.value = data.playtime ?? 0
    gold.value = data.gold ?? 0
    inventory.value = data.inventory ?? {}
    stats.value = normalizeStats(data.stats, inventory.value, playtime.value, gold.value)
    taskMastery.value = normalizeTaskMastery(data.taskMastery, stats.value)
    farmingPlots.value = normalizeFarmingPlots(data.farmingPlots)
    activeMining.value = normalizeActiveMiningState(data.activeMining)
    lastActiveClickAt = null
    resetActiveCadence()

    // Merge skill data — preserve any new skills added after save
    for (const saved of data.skills ?? []) {
      const existing = skills.value.find((s) => s.id === saved.id)
      if (existing) {
        existing.xp = saved.xp
      }
    }

    // Restore lanes
    if (data.lanes) {
      if (data.lanes.active) {
        lanes.value.active.taskId = normalizeTaskId(data.lanes.active.taskId, 'active')
        lanes.value.active.progress = 0 // active doesn't persist progress
      }
      if (data.lanes.idle) {
        const taskId = normalizeTaskId(data.lanes.idle.taskId, 'idle')
        lanes.value.idle.taskId = taskId
        lanes.value.idle.progress = taskId === data.lanes.idle.taskId ? (data.lanes.idle.progress ?? 0) : 0
      }
      if (data.lanes.background) {
        const taskId = normalizeTaskId(data.lanes.background.taskId, 'background')
        lanes.value.background.taskId = taskId
        lanes.value.background.progress = taskId === data.lanes.background.taskId ? (data.lanes.background.progress ?? 0) : 0
      }
    }

    if (lanes.value.active.taskId) {
      const activeTask = getTaskById(lanes.value.active.taskId)
      if (activeTask?.skillId === 'mining') {
        ensureActiveMiningState(activeTask.id)
      }
    }

    gameLoaded.value = true
  }

  function resetToDefaults(name: string = 'New Adventure') {
    saveName.value = name
    createdAt.value = Date.now()
    lastSavedAt.value = Date.now()
    lastCloudSyncedAt.value = null
    playtime.value = 0
    gold.value = 0
    inventory.value = {}
    stats.value = createDefaultStats()
    taskMastery.value = {}
    activeMining.value = createDefaultActiveMiningState()
    skills.value = SKILL_LIST.map((s) => ({ id: s.id, xp: 0 }))
    lanes.value = {
      active: { type: 'active', taskId: getDefaultTaskIdForLane('active'), progress: 0 },
      idle: { type: 'idle', taskId: getDefaultTaskIdForLane('idle'), progress: 0 },
      background: { type: 'background', taskId: getDefaultTaskIdForLane('background'), progress: 0 },
    }
    farmingPlots.value = createDefaultFarmingPlots()
    activityLog.value = []
    clearGainToasts()
    logCounter = 0
    toastCounter = 0
    lastActiveClickAt = null
    resetActiveCadence()
    ensureActiveMiningState(lanes.value.active.taskId)
    gameLoaded.value = true
  }

  return {
    // State
    saveName,
    createdAt,
    lastSavedAt,
    lastCloudSyncedAt,
    playtime,
    skills,
    taskMastery,
    inventory,
    gold,
    stats,
    activeMining,
    lanes,
    farmingPlots,
    activityLog,
    gainToasts,
    activeCadence,
    gameLoaded,
    // Computed
    totalLevel,
    totalXp,
    accountAgeMs,
    inventoryValue,
    unlockedFarmingPlotCount,
    plantedFarmingPlotCount,
    readyFarmingPlotCount,
    unlockedFarmingTasks,
    completionProgress,
    // Getters
    getSkill,
    getSkillLevel,
    getSkillProgress,
    getSkillXpToNext,
    getItemCount,
    getItemStats,
    getTaskStats,
    getSkillStats,
    getTaskMastery,
    getTaskMasteryXp,
    getTaskMasteryLevel,
    getTaskMasteryProgress,
    getTaskMasteryXpToNext,
    isTaskMastered,
    getSkillMasterySummary,
    // Mutations
    recordOnlineTime,
    recordLaneWork,
    recordTaskAction,
    recordActiveClick,
    recordActiveCadence,
    recordItemConsumed,
    recordOfflinePeriod,
    addXp,
    addTaskMasteryXp,
    addItem,
    removeItem,
    addGold,
    sellItem,
    ensureActiveMiningState,
    damageActiveMiningBlock,
    setLaneTask,
    plantFarmingPlot,
    collectFarmingPlot,
    collectAndReplantFarmingPlot,
    processFarmingNotifications,
    getFarmingGrowthDurationMs,
    getFarmingYieldAmount,
    getFarmingPlotUnlockLevel,
    isFarmingPlotUnlocked,
    addLog,
    dismissGainToast,
    resetActiveCadence,
    // Save
    serialize,
    deserialize,
    resetToDefaults,
  }
})

function createDefaultStats(): GameStats {
  const skillStats: Partial<Record<SkillId, SkillStats>> = {}
  for (const skill of SKILL_LIST) {
    skillStats[skill.id] = createSkillStats()
  }

  return {
    version: STATS_VERSION,
    items: {},
    tasks: {},
    skills: skillStats,
    account: createAccountStats(),
  }
}

function createActiveCadenceState(): ActiveCadenceState {
  return {
    multiplier: 0,
    ratio: 0,
    progressMs: 0,
    clickGapMs: null,
    lastClickAt: null,
  }
}

function createDefaultFarmingPlots(): FarmingPlotState[] {
  return FARMING_PLOT_UNLOCK_LEVELS.map((_, index) => createFarmingPlot(index))
}

function createFarmingPlot(index: number): FarmingPlotState {
  return {
    id: `field-${index + 1}`,
    taskId: null,
    plantedAt: null,
    readyAt: null,
    notifiedAt: null,
    lastCollectedAt: null,
  }
}

function isFarmingPlotReady(plot: FarmingPlotState, timestamp = Date.now()): boolean {
  return !!plot.taskId
    && typeof plot.readyAt === 'number'
    && Number.isFinite(plot.readyAt)
    && timestamp >= plot.readyAt
}

function farmingPlotUnlockCountForLevel(level: number): number {
  return FARMING_PLOT_UNLOCK_LEVELS.filter((unlockLevel) => level >= unlockLevel).length
}

function farmingPlotUnlockLevel(index: number): number {
  return FARMING_PLOT_UNLOCK_LEVELS[index] ?? FARMING_PLOT_UNLOCK_LEVELS[FARMING_PLOT_UNLOCK_LEVELS.length - 1]!
}

function getFarmingHarvestXp(task: TaskDefinition, yieldAmount: number): number {
  return Math.max(task.xpPerAction, Math.round(task.xpPerAction * yieldAmount))
}

function createItemStats(): ItemStats {
  return {
    acquired: 0,
    acquisitionEvents: 0,
    consumed: 0,
    sold: 0,
    saleEvents: 0,
    goldEarned: 0,
    firstAcquiredAt: null,
    lastAcquiredAt: null,
  }
}

function createTaskStats(): TaskStats {
  return {
    actions: 0,
    activeActions: 0,
    idleActions: 0,
    backgroundActions: 0,
    offlineActions: 0,
    activeClicks: 0,
    xp: 0,
    timeMs: 0,
    activeWorkMs: 0,
    activeSavedMs: 0,
    idleWorkMs: 0,
    backgroundWorkMs: 0,
    offlineWorkMs: 0,
    firstWorkedAt: null,
    lastWorkedAt: null,
  }
}

function createSkillStats(): SkillStats {
  return {
    actions: 0,
    activeActions: 0,
    idleActions: 0,
    backgroundActions: 0,
    offlineActions: 0,
    activeClicks: 0,
    xp: 0,
    timeMs: 0,
    activeWorkMs: 0,
    activeSavedMs: 0,
    idleWorkMs: 0,
    backgroundWorkMs: 0,
    offlineWorkMs: 0,
    firstWorkedAt: null,
    lastWorkedAt: null,
  }
}

function createAccountStats(): AccountStats {
  return {
    onlinePlayMs: 0,
    activeWorkMs: 0,
    activeSavedMs: 0,
    idleWorkMs: 0,
    backgroundWorkMs: 0,
    offlineCreditedMs: 0,
    offlineMissedMs: 0,
    activeClickCount: 0,
    totalGoldEarned: 0,
    totalItemsAcquired: 0,
    totalItemsSold: 0,
  }
}

function normalizeStats(
  saved: GameStats | undefined,
  inventorySnapshot: Record<string, number>,
  playtimeSeconds: number,
  currentGold: number,
): GameStats {
  const normalized = createDefaultStats()
  const savedStatsVersion = saved?.version ?? 0

  if (saved) {
    normalized.items = normalizeItemStatsMap(saved.items)
    normalized.tasks = normalizeTaskStatsMap(saved.tasks, savedStatsVersion)
    normalized.skills = normalizeSkillStatsMap(saved.skills, savedStatsVersion)
    normalized.account = normalizeAccountStats(saved.account, savedStatsVersion)
  }

  seedStatsFromCurrentInventory(normalized, inventorySnapshot)

  normalized.account.onlinePlayMs = Math.max(
    normalized.account.onlinePlayMs,
    Math.floor(playtimeSeconds * 1000),
  )
  normalized.account.totalGoldEarned = Math.max(normalized.account.totalGoldEarned, currentGold)
  normalized.account.totalItemsAcquired = Math.max(
    normalized.account.totalItemsAcquired,
    Object.values(normalized.items).reduce((sum, item) => sum + item.acquired, 0),
  )
  normalized.account.totalItemsSold = Math.max(
    normalized.account.totalItemsSold,
    Object.values(normalized.items).reduce((sum, item) => sum + item.sold, 0),
  )

  return normalized
}

function normalizeItemStatsMap(saved: GameStats['items'] | undefined): GameStats['items'] {
  const normalized: GameStats['items'] = {}
  for (const [resourceId, item] of Object.entries(saved ?? {})) {
    normalized[resourceId] = {
      ...createItemStats(),
      ...pickNumericItemStats(item),
      firstAcquiredAt: normalizeTimestamp(item.firstAcquiredAt),
      lastAcquiredAt: normalizeTimestamp(item.lastAcquiredAt),
    }
  }
  return normalized
}

function normalizeTaskStatsMap(saved: GameStats['tasks'] | undefined, savedStatsVersion: number): GameStats['tasks'] {
  const normalized: GameStats['tasks'] = {}
  for (const [taskId, task] of Object.entries(saved ?? {})) {
    normalized[taskId] = normalizeTaskStats(task, savedStatsVersion)
  }
  return normalized
}

function normalizeSkillStatsMap(saved: GameStats['skills'] | undefined, savedStatsVersion: number): GameStats['skills'] {
  const normalized: GameStats['skills'] = {}
  for (const skill of SKILL_LIST) {
    normalized[skill.id] = normalizeTaskStats(saved?.[skill.id], savedStatsVersion)
  }
  return normalized
}

function normalizeTaskStats(saved: TaskStats | SkillStats | undefined, savedStatsVersion: number): TaskStats {
  const numeric = pickNumericTaskStats(saved)
  if (savedStatsVersion < 2) {
    numeric.timeMs = Math.max(0, numeric.timeMs - numeric.activeWorkMs)
    numeric.activeSavedMs = Math.max(numeric.activeSavedMs, numeric.activeWorkMs)
    numeric.activeWorkMs = 0
  }
  if (savedStatsVersion < 3) {
    numeric.activeSavedMs = Math.min(
      numeric.activeSavedMs,
      numeric.activeWorkMs * ACTIVE_SAVED_TIME_CAP_MULTIPLIER,
    )
  }

  return {
    ...createTaskStats(),
    ...numeric,
    firstWorkedAt: normalizeTimestamp(saved?.firstWorkedAt),
    lastWorkedAt: normalizeTimestamp(saved?.lastWorkedAt),
  }
}

function normalizeAccountStats(saved: AccountStats | undefined, savedStatsVersion: number): AccountStats {
  const normalized = {
    ...createAccountStats(),
    onlinePlayMs: nonNegative(saved?.onlinePlayMs),
    activeWorkMs: nonNegative(saved?.activeWorkMs),
    activeSavedMs: nonNegative(saved?.activeSavedMs),
    idleWorkMs: nonNegative(saved?.idleWorkMs),
    backgroundWorkMs: nonNegative(saved?.backgroundWorkMs),
    offlineCreditedMs: nonNegative(saved?.offlineCreditedMs),
    offlineMissedMs: nonNegative(saved?.offlineMissedMs),
    activeClickCount: nonNegative(saved?.activeClickCount),
    totalGoldEarned: nonNegative(saved?.totalGoldEarned),
    totalItemsAcquired: nonNegative(saved?.totalItemsAcquired),
    totalItemsSold: nonNegative(saved?.totalItemsSold),
  }

  if (savedStatsVersion < 2) {
    normalized.activeSavedMs = Math.max(normalized.activeSavedMs, normalized.activeWorkMs)
    normalized.activeWorkMs = 0
  }
  if (savedStatsVersion < 3) {
    normalized.activeSavedMs = Math.min(
      normalized.activeSavedMs,
      normalized.activeWorkMs * ACTIVE_SAVED_TIME_CAP_MULTIPLIER,
    )
  }

  return normalized
}

function seedStatsFromCurrentInventory(stats: GameStats, inventorySnapshot: Record<string, number>) {
  for (const [resourceId, count] of Object.entries(inventorySnapshot)) {
    if (count <= 0) continue
    stats.items[resourceId] ??= createItemStats()
    stats.items[resourceId]!.acquired = Math.max(stats.items[resourceId]!.acquired, count)
  }
}

function cloneStats(stats: GameStats): GameStats {
  return {
    version: STATS_VERSION,
    items: Object.fromEntries(
      Object.entries(stats.items).map(([resourceId, item]) => [resourceId, { ...item }]),
    ),
    tasks: Object.fromEntries(
      Object.entries(stats.tasks).map(([taskId, task]) => [taskId, { ...task }]),
    ),
    skills: Object.fromEntries(
      Object.entries(stats.skills).map(([skillId, skill]) => [skillId, { ...skill }]),
    ) as Partial<Record<SkillId, SkillStats>>,
    account: { ...stats.account },
  }
}

function normalizeTaskMastery(
  saved: Record<string, TaskMasteryState> | undefined,
  stats: GameStats,
): Record<string, TaskMasteryState> {
  const normalized: Record<string, TaskMasteryState> = {}

  for (const task of ALL_TASKS) {
    const savedXp = saved?.[task.id]?.xp
    const seededXp = savedXp ?? stats.tasks[task.id]?.xp ?? 0
    const xp = clampTaskMasteryXp(seededXp)
    if (xp > 0) {
      normalized[task.id] = { taskId: task.id, xp }
    }
  }

  return normalized
}

function cloneTaskMastery(taskMastery: Record<string, TaskMasteryState>): Record<string, TaskMasteryState> {
  return Object.fromEntries(
    Object.entries(taskMastery)
      .filter(([, mastery]) => mastery.xp > 0)
      .map(([taskId, mastery]) => [taskId, {
        taskId,
        xp: clampTaskMasteryXp(mastery.xp),
      }]),
  )
}

function normalizeFarmingPlots(saved: FarmingPlotState[] | undefined): FarmingPlotState[] {
  const normalized = createDefaultFarmingPlots()
  if (!Array.isArray(saved)) return normalized

  for (const savedPlot of saved) {
    if (!savedPlot?.id) continue

    const index = normalized.findIndex((plot) => plot.id === savedPlot.id)
    if (index < 0) continue

    const task = savedPlot.taskId ? getTaskById(savedPlot.taskId) : null
    const taskId = task?.skillId === 'farming' ? task.id : null
    const plantedAt = normalizeTimestamp(savedPlot.plantedAt)
    const readyAt = normalizeTimestamp(savedPlot.readyAt)
    const fallbackReadyAt = task && plantedAt ? plantedAt + Math.round(
      FARMING_MIN_GROWTH_MS + (FARMING_MAX_GROWTH_MS - FARMING_MIN_GROWTH_MS) * Math.max(0, Math.min(1, (task.levelRequired - 1) / 98))
    ) : null

    normalized[index] = {
      id: normalized[index]!.id,
      taskId,
      plantedAt: taskId ? plantedAt : null,
      readyAt: taskId ? (readyAt ?? fallbackReadyAt) : null,
      notifiedAt: taskId ? normalizeTimestamp(savedPlot.notifiedAt) : null,
      lastCollectedAt: normalizeTimestamp(savedPlot.lastCollectedAt),
    }
  }

  return normalized
}

function cloneFarmingPlots(plots: FarmingPlotState[]): FarmingPlotState[] {
  return plots.map((plot) => ({ ...plot }))
}

function pickNumericItemStats(item: ItemStats): Omit<ItemStats, 'firstAcquiredAt' | 'lastAcquiredAt'> {
  return {
    acquired: nonNegative(item?.acquired),
    acquisitionEvents: nonNegative(item?.acquisitionEvents),
    consumed: nonNegative(item?.consumed),
    sold: nonNegative(item?.sold),
    saleEvents: nonNegative(item?.saleEvents),
    goldEarned: nonNegative(item?.goldEarned),
  }
}

function pickNumericTaskStats(saved: TaskStats | SkillStats | undefined): Omit<TaskStats, 'firstWorkedAt' | 'lastWorkedAt'> {
  return {
    actions: nonNegative(saved?.actions),
    activeActions: nonNegative(saved?.activeActions),
    idleActions: nonNegative(saved?.idleActions),
    backgroundActions: nonNegative(saved?.backgroundActions),
    offlineActions: nonNegative(saved?.offlineActions),
    activeClicks: nonNegative(saved?.activeClicks),
    xp: nonNegative(saved?.xp),
    timeMs: nonNegative(saved?.timeMs),
    activeWorkMs: nonNegative(saved?.activeWorkMs),
    activeSavedMs: nonNegative(saved?.activeSavedMs),
    idleWorkMs: nonNegative(saved?.idleWorkMs),
    backgroundWorkMs: nonNegative(saved?.backgroundWorkMs),
    offlineWorkMs: nonNegative(saved?.offlineWorkMs),
  }
}

function normalizeTimestamp(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

function nonNegative(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

function percent(value: number, total: number): number {
  if (total <= 0) return 100
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)))
}

function percentFromRatio(value: number, total: number): number {
  if (total <= 0) return 100
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)))
}
