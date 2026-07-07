/**
 * Static skill definitions for Evermarch.
 * All game data lives in bundled TypeScript — no network calls needed.
 */

export type SkillId =
  | 'mining'
  | 'woodcutting'
  | 'fishing'
  | 'farming'
  | 'cooking'
  | 'smithing'
  | 'combat'

export type LaneType = 'active' | 'idle' | 'background'

export interface SkillDefinition {
  id: SkillId
  name: string
  description: string
  /** Which lanes this skill can be assigned to */
  allowedLanes: LaneType[]
  /** Lucide icon name (resolved at component level) */
  icon: string
  /** Base color for skill identity */
  color: string
}

export const SKILLS: Record<SkillId, SkillDefinition> = {
  mining: {
    id: 'mining',
    name: 'Mining',
    description: 'Extract ores and gems from the earth.',
    allowedLanes: ['active', 'idle'],
    icon: 'Pickaxe',
    color: '#a3785f',
  },
  woodcutting: {
    id: 'woodcutting',
    name: 'Woodcutting',
    description: 'Fell trees and gather lumber.',
    allowedLanes: ['active', 'idle'],
    icon: 'TreePine',
    color: '#4ade80',
  },
  fishing: {
    id: 'fishing',
    name: 'Fishing',
    description: 'Cast your line and reel in the catch.',
    allowedLanes: ['active', 'idle'],
    icon: 'Fish',
    color: '#60a5fa',
  },
  farming: {
    id: 'farming',
    name: 'Farming',
    description: 'Tend crops that grow even while you sleep.',
    allowedLanes: ['background'],
    icon: 'Sprout',
    color: '#a3e635',
  },
  cooking: {
    id: 'cooking',
    name: 'Cooking',
    description: 'Prepare food from raw ingredients.',
    allowedLanes: ['idle'],
    icon: 'FlameKindling',
    color: '#f97316',
  },
  smithing: {
    id: 'smithing',
    name: 'Smithing',
    description: 'Forge metal into weapons and armour.',
    allowedLanes: ['idle'],
    icon: 'Hammer',
    color: '#ef4444',
  },
  combat: {
    id: 'combat',
    name: 'Combat',
    description: 'Train your strength and fight enemies.',
    allowedLanes: ['active'],
    icon: 'Swords',
    color: '#ef4444',
  },
}

export const SKILL_LIST: SkillDefinition[] = Object.values(SKILLS)
