/**
 * Resource definitions: items the player collects.
 */

import type { ResourceId } from './tasks'

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
  return RESOURCES[id] ?? {
    id,
    name: titleFromId(id),
    icon: iconForResource(id),
    category: categoryForResource(id),
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
  if (id.endsWith('_ore') || id === 'coal' || id.includes('stone') || id.includes('crystal') || id.includes('core')) return 'ore'
  if (id.endsWith('_log') || id.includes('timber')) return 'log'
  if (id.startsWith('raw_')) return 'fish'
  if (id.startsWith('cooked_')) return 'food'
  if (id.endsWith('_ash') || id.endsWith('_ember')) return 'ember'
  if (id.includes('fittings') || id.includes('frame') || id.includes('plate') || id.includes('mechanism') || id.includes('crucible')) return 'metalwork'
  if (id.includes('arrow') || id.includes('bow') || id.includes('bolt') || id.includes('crossbow')) return 'fletched'
  if (id.includes('charm') || id.includes('locket') || id.includes('ring') || id.includes('amulet') || id.includes('necklace') || id.includes('relic') || id.includes('idol')) return 'crafted'
  if (id.endsWith('_rune')) return 'rune'
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

function sellValueForResource(id: string): number {
  const category = categoryForResource(id)
  if (category === 'rune') return 6
  if (category === 'crafted' || category === 'metalwork') return 10
  if (category === 'fletched' || category === 'food') return 7
  if (category === 'ore' || category === 'log' || category === 'fish' || category === 'crop') return 4
  return 1
}
