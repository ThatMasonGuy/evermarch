/**
 * Core game state store for Evermarch.
 * Manages skills, inventory, lane assignments, and activity log.
 * Local-first: persisted to localStorage via pinia-plugin-persistedstate.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SkillId, LaneType } from '../data/skills'
import { SKILL_LIST } from '../data/skills'
import { ALL_TASKS, getDefaultTaskIdForLane, getTaskById, getTasksForSkill, normalizeTaskId } from '../data/tasks'
import { getResourceDefinition } from '../data/resources'
import { MAX_LEVEL, levelForXp, xpProgressFraction, xpToNextLevel } from '../data/xp'

// ─── Types ─────────────────────────────────────────────────────

export interface SkillState {
  id: SkillId
  xp: number
}

export interface LaneState {
  type: LaneType
  taskId: string | null
  /** Accumulated progress toward next action (ms) */
  progress: number
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
    total: number
    percent: number
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
  playtime: number
  skills: SkillState[]
  inventory: Record<string, number>
  gold: number
  lanes: {
    active: { taskId: string | null }
    idle: { taskId: string | null; progress: number }
    background: { taskId: string | null; progress: number }
  }
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

const SAVE_VERSION = 2
const STATS_VERSION = 2
const ACTIVE_CLICK_SESSION_GAP_MS = 2_000
const TOAST_DURATION_MS = 3_200
const TOAST_MERGE_WINDOW_MS = 1_200
const MAX_GAIN_TOASTS = 6
const COLLECTIBLE_RESOURCE_IDS = Array.from(new Set(
  ALL_TASKS.flatMap((task) => task.drops.map((drop) => drop.resourceId))
)).sort((a, b) => getResourceDefinition(a).name.localeCompare(getResourceDefinition(b).name))

// ─── Store ─────────────────────────────────────────────────────

export const useGameStore = defineStore('evermarch-game', () => {
  // ── Core State ──

  const saveName = ref('New Adventure')
  const createdAt = ref(Date.now())
  const lastSavedAt = ref(Date.now())
  const playtime = ref(0)

  const skills = ref<SkillState[]>(
    SKILL_LIST.map((s) => ({ id: s.id, xp: 0 }))
  )

  const inventory = ref<Record<string, number>>({})
  const gold = ref(0)
  const stats = ref<GameStats>(createDefaultStats())

  const lanes = ref<Record<LaneType, LaneState>>({
    active: { type: 'active', taskId: getDefaultTaskIdForLane('active'), progress: 0 },
    idle: { type: 'idle', taskId: getDefaultTaskIdForLane('idle'), progress: 0 },
    background: { type: 'background', taskId: getDefaultTaskIdForLane('background'), progress: 0 },
  })

  const activityLog = ref<LogEntry[]>([])
  let logCounter = 0
  const gainToasts = ref<GainToast[]>([])
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
    const masteryReadySkillIds = SKILL_LIST
      .filter((skill) =>
        completedSkillSet.has(skill.id)
        && getTasksForSkill(skill.id).every((task) => workedTaskSet.has(task.id))
      )
      .map((skill) => skill.id)

    const itemPercent = percent(collectedResourceIds.length, COLLECTIBLE_RESOURCE_IDS.length)
    const skillPercent = percent(completedSkillIds.length, SKILL_LIST.length)
    const taskPercent = percent(workedTaskIds.length, ALL_TASKS.length)

    return {
      overallPercent: Math.round((itemPercent + skillPercent + taskPercent) / 3),
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
        total: ALL_TASKS.length,
        percent: taskPercent,
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
      stats.value.account.activeSavedMs += activeSavedMs
    }
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

    const task = getTaskById(lane.taskId)
    addLog(`Started ${task?.name ?? lane.taskId} (${laneType})`, 'system')
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
      playtime: playtime.value,
      skills: skills.value.map((s) => ({ ...s })),
      inventory: { ...inventory.value },
      gold: gold.value,
      lanes: {
        active: { taskId: lanes.value.active.taskId },
        idle: { taskId: lanes.value.idle.taskId, progress: lanes.value.idle.progress },
        background: { taskId: lanes.value.background.taskId, progress: lanes.value.background.progress },
      },
      stats: cloneStats(stats.value),
    }
  }

  function deserialize(data: GameSaveData) {
    clearGainToasts()
    saveName.value = data.saveName ?? 'Adventure'
    createdAt.value = data.createdAt ?? Date.now()
    lastSavedAt.value = data.lastSavedAt ?? Date.now()
    playtime.value = data.playtime ?? 0
    gold.value = data.gold ?? 0
    inventory.value = data.inventory ?? {}
    stats.value = normalizeStats(data.stats, inventory.value, playtime.value, gold.value)
    lastActiveClickAt = null

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

    gameLoaded.value = true
  }

  function resetToDefaults(name: string = 'New Adventure') {
    saveName.value = name
    createdAt.value = Date.now()
    lastSavedAt.value = Date.now()
    playtime.value = 0
    gold.value = 0
    inventory.value = {}
    stats.value = createDefaultStats()
    skills.value = SKILL_LIST.map((s) => ({ id: s.id, xp: 0 }))
    lanes.value = {
      active: { type: 'active', taskId: getDefaultTaskIdForLane('active'), progress: 0 },
      idle: { type: 'idle', taskId: getDefaultTaskIdForLane('idle'), progress: 0 },
      background: { type: 'background', taskId: getDefaultTaskIdForLane('background'), progress: 0 },
    }
    activityLog.value = []
    clearGainToasts()
    logCounter = 0
    toastCounter = 0
    lastActiveClickAt = null
    gameLoaded.value = true
  }

  return {
    // State
    saveName,
    createdAt,
    lastSavedAt,
    playtime,
    skills,
    inventory,
    gold,
    stats,
    lanes,
    activityLog,
    gainToasts,
    gameLoaded,
    // Computed
    totalLevel,
    totalXp,
    accountAgeMs,
    inventoryValue,
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
    // Mutations
    recordOnlineTime,
    recordLaneWork,
    recordTaskAction,
    recordItemConsumed,
    recordOfflinePeriod,
    addXp,
    addItem,
    removeItem,
    addGold,
    sellItem,
    setLaneTask,
    addLog,
    dismissGainToast,
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
