/**
 * Task definitions — the actual activities a player can perform.
 * Each task belongs to a skill, has level requirements, and produces resources.
 */

import type { SkillId, LaneType } from './skills'

export type ResourceId =
  | 'copper_ore'
  | 'tin_ore'
  | 'iron_ore'
  | 'coal'
  | 'oak_log'
  | 'willow_log'
  | 'maple_log'
  | 'raw_shrimp'
  | 'raw_trout'
  | 'raw_salmon'
  | 'potato'
  | 'onion'
  | 'tomato'
  | 'wheat'
  | 'gold'

export interface ResourceDrop {
  resourceId: ResourceId
  amount: number
}

export interface TaskDefinition {
  id: string
  name: string
  skillId: SkillId
  /** Minimum skill level to unlock this task */
  levelRequired: number
  /** Base interval in milliseconds for one action cycle */
  baseInterval: number
  /** XP granted per action */
  xpPerAction: number
  /** Resources produced per action */
  drops: ResourceDrop[]
  /** Multiplier when performed in active lane (click-boosted) */
  activeBoostMultiplier: number
  /** Which lanes this task can run in */
  allowedLanes: LaneType[]
}

// ─── Mining Tasks ──────────────────────────────────────────────

export const MINING_TASKS: TaskDefinition[] = [
  {
    id: 'mine_copper',
    name: 'Mine Copper',
    skillId: 'mining',
    levelRequired: 1,
    baseInterval: 4000,
    xpPerAction: 8,
    drops: [{ resourceId: 'copper_ore', amount: 1 }],
    activeBoostMultiplier: 4,
    allowedLanes: ['active', 'idle'],
  },
  {
    id: 'mine_tin',
    name: 'Mine Tin',
    skillId: 'mining',
    levelRequired: 5,
    baseInterval: 5000,
    xpPerAction: 14,
    drops: [{ resourceId: 'tin_ore', amount: 1 }],
    activeBoostMultiplier: 4,
    allowedLanes: ['active', 'idle'],
  },
  {
    id: 'mine_iron',
    name: 'Mine Iron',
    skillId: 'mining',
    levelRequired: 15,
    baseInterval: 6000,
    xpPerAction: 26,
    drops: [{ resourceId: 'iron_ore', amount: 1 }],
    activeBoostMultiplier: 4,
    allowedLanes: ['active', 'idle'],
  },
  {
    id: 'mine_coal',
    name: 'Mine Coal',
    skillId: 'mining',
    levelRequired: 25,
    baseInterval: 7000,
    xpPerAction: 40,
    drops: [{ resourceId: 'coal', amount: 1 }],
    activeBoostMultiplier: 4,
    allowedLanes: ['active', 'idle'],
  },
]

// ─── Woodcutting Tasks ─────────────────────────────────────────

export const WOODCUTTING_TASKS: TaskDefinition[] = [
  {
    id: 'chop_oak',
    name: 'Chop Oak',
    skillId: 'woodcutting',
    levelRequired: 1,
    baseInterval: 4000,
    xpPerAction: 8,
    drops: [{ resourceId: 'oak_log', amount: 1 }],
    activeBoostMultiplier: 4,
    allowedLanes: ['active', 'idle'],
  },
  {
    id: 'chop_willow',
    name: 'Chop Willow',
    skillId: 'woodcutting',
    levelRequired: 10,
    baseInterval: 5000,
    xpPerAction: 18,
    drops: [{ resourceId: 'willow_log', amount: 1 }],
    activeBoostMultiplier: 4,
    allowedLanes: ['active', 'idle'],
  },
  {
    id: 'chop_maple',
    name: 'Chop Maple',
    skillId: 'woodcutting',
    levelRequired: 25,
    baseInterval: 7000,
    xpPerAction: 36,
    drops: [{ resourceId: 'maple_log', amount: 1 }],
    activeBoostMultiplier: 4,
    allowedLanes: ['active', 'idle'],
  },
]

// ─── Fishing Tasks ─────────────────────────────────────────────

export const FISHING_TASKS: TaskDefinition[] = [
  {
    id: 'fish_shrimp',
    name: 'Fish Shrimp',
    skillId: 'fishing',
    levelRequired: 1,
    baseInterval: 5000,
    xpPerAction: 6,
    drops: [{ resourceId: 'raw_shrimp', amount: 1 }],
    activeBoostMultiplier: 4,
    allowedLanes: ['active', 'idle'],
  },
  {
    id: 'fish_trout',
    name: 'Fish Trout',
    skillId: 'fishing',
    levelRequired: 10,
    baseInterval: 6000,
    xpPerAction: 16,
    drops: [{ resourceId: 'raw_trout', amount: 1 }],
    activeBoostMultiplier: 4,
    allowedLanes: ['active', 'idle'],
  },
  {
    id: 'fish_salmon',
    name: 'Fish Salmon',
    skillId: 'fishing',
    levelRequired: 20,
    baseInterval: 7000,
    xpPerAction: 28,
    drops: [{ resourceId: 'raw_salmon', amount: 1 }],
    activeBoostMultiplier: 4,
    allowedLanes: ['active', 'idle'],
  },
]

// ─── Farming Tasks (Background only) ──────────────────────────

export const FARMING_TASKS: TaskDefinition[] = [
  {
    id: 'grow_potato',
    name: 'Grow Potatoes',
    skillId: 'farming',
    levelRequired: 1,
    baseInterval: 10000,
    xpPerAction: 10,
    drops: [{ resourceId: 'potato', amount: 1 }],
    activeBoostMultiplier: 1,
    allowedLanes: ['background'],
  },
  {
    id: 'grow_onion',
    name: 'Grow Onions',
    skillId: 'farming',
    levelRequired: 5,
    baseInterval: 12000,
    xpPerAction: 18,
    drops: [{ resourceId: 'onion', amount: 1 }],
    activeBoostMultiplier: 1,
    allowedLanes: ['background'],
  },
  {
    id: 'grow_tomato',
    name: 'Grow Tomatoes',
    skillId: 'farming',
    levelRequired: 15,
    baseInterval: 15000,
    xpPerAction: 30,
    drops: [{ resourceId: 'tomato', amount: 1 }],
    activeBoostMultiplier: 1,
    allowedLanes: ['background'],
  },
  {
    id: 'grow_wheat',
    name: 'Grow Wheat',
    skillId: 'farming',
    levelRequired: 10,
    baseInterval: 14000,
    xpPerAction: 24,
    drops: [{ resourceId: 'wheat', amount: 1 }],
    activeBoostMultiplier: 1,
    allowedLanes: ['background'],
  },
]

// ─── All Tasks ─────────────────────────────────────────────────

export const ALL_TASKS: TaskDefinition[] = [
  ...MINING_TASKS,
  ...WOODCUTTING_TASKS,
  ...FISHING_TASKS,
  ...FARMING_TASKS,
]

export function getTaskById(id: string): TaskDefinition | undefined {
  return ALL_TASKS.find((t) => t.id === id)
}

export function getTasksForSkill(skillId: SkillId): TaskDefinition[] {
  return ALL_TASKS.filter((t) => t.skillId === skillId)
}

export function getAvailableTasks(skillId: SkillId, level: number): TaskDefinition[] {
  return getTasksForSkill(skillId).filter((t) => level >= t.levelRequired)
}
