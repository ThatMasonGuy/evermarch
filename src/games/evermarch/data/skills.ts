/**
 * Static skill definitions for Evermarch.
 * All game data lives in bundled TypeScript, no network calls needed.
 */

export type SkillId =
  | 'woodcutting'
  | 'fishing'
  | 'firemaking'
  | 'cooking'
  | 'mining'
  | 'smithing'
  | 'farming'
  | 'fletching'
  | 'crafting'
  | 'runecrafting'

export type LaneType = 'active' | 'idle' | 'background'

export interface SkillDefinition {
  id: SkillId
  name: string
  description: string
  /** Which lanes this skill can be assigned to */
  allowedLanes: LaneType[]
  /** Lucide icon name, resolved at component level */
  icon: string
  /** Base color for skill identity */
  color: string
}

export const SKILLS: Record<SkillId, SkillDefinition> = {
  woodcutting: {
    id: 'woodcutting',
    name: 'Woodcutting',
    description: 'Fell trees and gather lumber from old forests.',
    allowedLanes: ['active', 'idle'],
    icon: 'TreePine',
    color: '#4ade80',
  },
  fishing: {
    id: 'fishing',
    name: 'Fishing',
    description: 'Cast your line across coasts, rivers, and deep water.',
    allowedLanes: ['active', 'idle'],
    icon: 'Fish',
    color: '#60a5fa',
  },
  firemaking: {
    id: 'firemaking',
    name: 'Firemaking',
    description: 'Kindle campfires, beacon flames, and ritual pyres.',
    allowedLanes: ['active', 'idle'],
    icon: 'FlameKindling',
    color: '#fb923c',
  },
  cooking: {
    id: 'cooking',
    name: 'Cooking',
    description: 'Prepare travel meals, feasts, and preserved rations.',
    allowedLanes: ['active', 'idle'],
    icon: 'FlameKindling',
    color: '#f97316',
  },
  mining: {
    id: 'mining',
    name: 'Mining',
    description: 'Extract ores, coal, gems, and ancient crystals.',
    allowedLanes: ['active', 'idle'],
    icon: 'Pickaxe',
    color: '#a3785f',
  },
  smithing: {
    id: 'smithing',
    name: 'Smithing',
    description: 'Forge bars, tools, fittings, and masterwork frames.',
    allowedLanes: ['active', 'idle'],
    icon: 'Hammer',
    color: '#ef4444',
  },
  farming: {
    id: 'farming',
    name: 'Farming',
    description: 'Tend crops that grow in the background while you adventure.',
    allowedLanes: ['background'],
    icon: 'Sprout',
    color: '#a3e635',
  },
  fletching: {
    id: 'fletching',
    name: 'Fletching',
    description: 'Shape bows, arrows, and precise ranged components.',
    allowedLanes: ['active', 'idle'],
    icon: 'Hammer',
    color: '#facc15',
  },
  crafting: {
    id: 'crafting',
    name: 'Crafting',
    description: 'Cut gems, set trinkets, and assemble trade goods.',
    allowedLanes: ['active', 'idle'],
    icon: 'Hammer',
    color: '#ec4899',
  },
  runecrafting: {
    id: 'runecrafting',
    name: 'Runecrafting',
    description: 'Shape essence into runes for future magic systems.',
    allowedLanes: ['active', 'idle'],
    icon: 'BookOpen',
    color: '#a78bfa',
  },
}

export const SKILL_LIST: SkillDefinition[] = Object.values(SKILLS)
