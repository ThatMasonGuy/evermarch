/**
 * Core game state store for Evermarch.
 * Manages skills, inventory, lane assignments, and activity log.
 * Local-first: persisted to localStorage via pinia-plugin-persistedstate.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SkillId, LaneType } from '../data/skills'
import { SKILL_LIST } from '../data/skills'
import { getDefaultTaskIdForLane, getTaskById, normalizeTaskId } from '../data/tasks'
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
  type: 'gain' | 'levelup' | 'system' | 'offline'
  /** For stacking repeated identical messages */
  count: number
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

  function addXp(skillId: SkillId, amount: number) {
    const skill = skills.value.find((s) => s.id === skillId)
    if (!skill) return

    const prevLevel = levelForXp(skill.xp)
    skill.xp += amount
    const newLevel = levelForXp(skill.xp)

    if (newLevel > prevLevel) {
      const skillDef = SKILL_LIST.find((s) => s.id === skillId)
      addLog(
        `${skillDef?.name ?? skillId} level increased to ${newLevel}!`,
        'levelup'
      )
    }
  }

  function addItem(resourceId: string, amount: number) {
    inventory.value[resourceId] = (inventory.value[resourceId] ?? 0) + amount
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

  function addGold(amount: number) {
    gold.value += amount
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
    logCounter = 0
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
    // Save
    serialize,
    deserialize,
    resetToDefaults,
  }
})
