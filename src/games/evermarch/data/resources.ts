/**
 * Resource definitions: items the player collects.
 */

import { ALL_TASKS, type ResourceId, type TaskDefinition } from './tasks'

export interface ResourceDefinition {
  id: ResourceId
  name: string
  icon: string
  category: string
  /** Gold value if sold */
  sellValue: number
}

export const RESOURCES: Record<ResourceId, ResourceDefinition> = {
  copper_ore: { id: 'copper_ore', name: 'Copper Ore', icon: 'Gem', category: 'ore', sellValue: 2 },
  tin_ore: { id: 'tin_ore', name: 'Tin Ore', icon: 'Gem', category: 'ore', sellValue: 4 },
  iron_ore: { id: 'iron_ore', name: 'Iron Ore', icon: 'Gem', category: 'ore', sellValue: 10 },
  coal: { id: 'coal', name: 'Coal', icon: 'Gem', category: 'ore', sellValue: 14 },
  oak_log: { id: 'oak_log', name: 'Oak Log', icon: 'TreePine', category: 'log', sellValue: 2 },
  willow_log: { id: 'willow_log', name: 'Willow Log', icon: 'TreePine', category: 'log', sellValue: 6 },
  maple_log: { id: 'maple_log', name: 'Maple Log', icon: 'TreePine', category: 'log', sellValue: 12 },
  raw_shrimp: { id: 'raw_shrimp', name: 'Raw Shrimp', icon: 'Fish', category: 'fish', sellValue: 1 },
  raw_trout: { id: 'raw_trout', name: 'Raw Trout', icon: 'Fish', category: 'fish', sellValue: 5 },
  raw_salmon: { id: 'raw_salmon', name: 'Raw Salmon', icon: 'Fish', category: 'fish', sellValue: 10 },
  potato: { id: 'potato', name: 'Potato', icon: 'Sprout', category: 'crop', sellValue: 3 },
  onion: { id: 'onion', name: 'Onion', icon: 'Sprout', category: 'crop', sellValue: 5 },
  tomato: { id: 'tomato', name: 'Tomato', icon: 'Sprout', category: 'crop', sellValue: 8 },
  wheat: { id: 'wheat', name: 'Wheat', icon: 'Wheat', category: 'crop', sellValue: 6 },
  gold: { id: 'gold', name: 'Gold', icon: 'Coins', category: 'currency', sellValue: 0 },
}

export function getResourceDefinition(id: ResourceId): ResourceDefinition {
  const defined = RESOURCES[id]

  return {
    id,
    name: defined?.name ?? titleFromId(id),
    icon: defined?.icon ?? iconForResource(id),
    category: defined?.category ?? categoryForResource(id),
    sellValue: sellValueForResource(id),
  }
}

export function getResourceName(id: ResourceId): string {
  return getResourceDefinition(id).name
}

function titleFromId(id: string): string {
  return id
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function categoryForResource(id: string): string {
  if (id === 'masterwork_core') return 'metalwork'
  if (id.includes('fittings') || id.includes('frame') || id.includes('plate') || id.includes('mechanism') || id.includes('crucible') || id.includes('bracing') || id.includes('filigree') || id.includes('setting') || id.includes('assembly') || id.includes('inlay')) return 'metalwork'
  if (id.includes('arrow') || id.includes('bow') || id.includes('bolt') || id.includes('crossbow')) return 'fletched'
  if (id.includes('charm') || id.includes('locket') || id.includes('ring') || id.includes('amulet') || id.includes('necklace') || id.includes('brooch') || id.includes('clasp') || id.includes('siglet') || id.includes('compass') || id.includes('relic') || id.includes('prism') || id.includes('totem') || id.includes('idol')) return 'crafted'
  if (id.endsWith('_ore') || id === 'coal' || id.includes('stone') || id.includes('crystal') || id.includes('core')) return 'ore'
  if (id.endsWith('_log') || id.includes('timber')) return 'log'
  if (id.startsWith('raw_')) return 'fish'
  if (id.startsWith('cooked_')) return 'food'
  if (id.endsWith('_ash') || id.endsWith('_ember')) return 'ember'
  if (id === 'rune_essence' || id.endsWith('_rune')) return 'rune'
  if (['barley', 'sunleaf', 'mooncap', 'silverthorn', 'starflower', 'everroot', 'worldseed'].includes(id)) return 'crop'
  return 'misc'
}

function iconForResource(id: string): string {
  const category = categoryForResource(id)
  switch (category) {
    case 'ore': return 'Gem'
    case 'log': return 'TreePine'
    case 'fish': return 'Fish'
    case 'food': return 'FlameKindling'
    case 'crop': return 'Sprout'
    case 'ember': return 'FlameKindling'
    case 'metalwork': return 'Hammer'
    case 'fletched': return 'Hammer'
    case 'crafted': return 'Gem'
    case 'rune': return 'BookOpen'
    default: return 'Package'
  }
}

const CATEGORY_BASE_VALUES: Record<string, number> = {
  ore: 4,
  log: 3,
  fish: 3,
  food: 5,
  crop: 3,
  ember: 5,
  metalwork: 8,
  fletched: 6,
  crafted: 8,
  rune: 4,
  misc: 1,
}

const sellValueCache = new Map<string, number>()

function sellValueForResource(id: string, seen: Set<string> = new Set()): number {
  if (id === 'gold') return 0

  const cached = sellValueCache.get(id)
  if (cached !== undefined) return cached

  const category = categoryForResource(id)
  if (seen.has(id)) {
    return categoryBaseValue(category)
  }

  const producer = getPrimaryProducer(id)
  if (!producer) {
    const fallback = categoryBaseValue(category)
    sellValueCache.set(id, fallback)
    return fallback
  }

  seen.add(id)
  const drop = producer.drops.find((candidate) => candidate.resourceId === id)
  const outputAmount = Math.max(1, drop?.amount ?? 1)
  const inputValue = (producer.costs ?? []).reduce(
    (sum, cost) => sum + sellValueForResource(cost.resourceId, seen) * cost.amount,
    0,
  )
  seen.delete(id)

  const value = Math.max(
    1,
    Math.ceil((inputValue + valuePremiumForLevel(category, producer.levelRequired)) / outputAmount),
  )
  sellValueCache.set(id, value)
  return value
}

function getPrimaryProducer(resourceId: string): TaskDefinition | null {
  return ALL_TASKS
    .filter((task) => task.drops.some((drop) => drop.resourceId === resourceId))
    .sort((a, b) => a.levelRequired - b.levelRequired || a.id.localeCompare(b.id))[0] ?? null
}

function valuePremiumForLevel(category: string, level: number): number {
  const base = categoryBaseValue(category)
  return Math.round(base + level * base * 0.65 + Math.pow(level, 1.45) * base * 0.2)
}

function categoryBaseValue(category: string): number {
  return CATEGORY_BASE_VALUES[category] ?? 1
}
