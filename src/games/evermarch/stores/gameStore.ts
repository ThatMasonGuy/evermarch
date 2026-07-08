/**
 * Core game state store for Evermarch.
 * Manages skills, inventory, lane assignments, and activity log.
 * Local-first: persisted to localStorage via pinia-plugin-persistedstate.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SkillId, LaneType } from '../data/skills'
import { SKILL_LIST } from '../data/skills'
import { getDefaultTaskIdForLane, getTaskById, getTasksForSkill, normalizeTaskId } from '../data/tasks'
import { getResourceDefinition } from '../data/resources'
import { levelForXp, xpProgressFraction, xpToNextLevel } from '../data/xp'

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
}

const SAVE_VERSION = 1
const TOAST_DURATION_MS = 3_200
const TOAST_MERGE_WINDOW_MS = 1_200
const MAX_GAIN_TOASTS = 6

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

  function getItemCount(resourceId: string): number {
    return inventory.value[resourceId] ?? 0
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
    addLog(
      `Sold ${sold.toLocaleString()} ${resource.name} for ${goldGained.toLocaleString()} gold`,
      'system'
    )

    return goldGained
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
    lanes,
    activityLog,
    gainToasts,
    gameLoaded,
    // Computed
    totalLevel,
    totalXp,
    // Getters
    getSkill,
    getSkillLevel,
    getSkillProgress,
    getSkillXpToNext,
    getItemCount,
    // Mutations
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
