/**
 * Resource definitions — items the player collects.
 */

import type { ResourceId } from './tasks'

export interface ResourceDefinition {
  id: ResourceId
  name: string
  icon: string
  category: 'ore' | 'log' | 'fish' | 'crop' | 'currency'
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

export function getResourceName(id: ResourceId): string {
  return RESOURCES[id]?.name ?? id
}
