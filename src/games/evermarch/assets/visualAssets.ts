import appleSprite from './vendor/kenney-voxel/items/apple.png'
import arrowSprite from './vendor/kenney-voxel/items/arrow.png'
import axeIronSprite from './vendor/kenney-voxel/items/axe_iron.png'
import bowSprite from './vendor/kenney-voxel/items/bow.png'
import bowlSprite from './vendor/kenney-voxel/items/bowl.png'
import fishSprite from './vendor/kenney-voxel/items/fish.png'
import fishingPoleSprite from './vendor/kenney-voxel/items/fishingPole.png'
import fishCookedSprite from './vendor/kenney-voxel/items/fish_cooked.png'
import hammerIronSprite from './vendor/kenney-voxel/items/hammer_iron.png'
import hoeIronSprite from './vendor/kenney-voxel/items/hoe_iron.png'
import oreCoalSprite from './vendor/kenney-voxel/items/ore_coal.png'
import oreEmeraldSprite from './vendor/kenney-voxel/items/ore_emerald.png'
import oreGoldSprite from './vendor/kenney-voxel/items/ore_gold.png'
import oreIronSprite from './vendor/kenney-voxel/items/ore_iron.png'
import oreSilverSprite from './vendor/kenney-voxel/items/ore_silver.png'
import pickIronSprite from './vendor/kenney-voxel/items/pick_iron.png'
import seedSprite from './vendor/kenney-voxel/items/seed.png'
import wheatSprite from './vendor/kenney-voxel/items/wheat.png'
import tntChargeSprite from './generated/tnt/tnt-charge.png'
import miningBlastSprite from './generated/tnt/mining-blast.png'
import minersChestClosedSprite from './generated/miners-chest-closed.png'
import minersChestOpenSprite from './generated/miners-chest-open.png'
import dirtGrassTile from './vendor/kenney-voxel/tiles/dirt_grass.png'
import grassTopTile from './vendor/kenney-voxel/tiles/grass_top.png'
import leavesTile from './vendor/kenney-voxel/tiles/leaves.png'
import stoneTile from './vendor/kenney-voxel/tiles/stone.png'
import stoneCoalTile from './vendor/kenney-voxel/tiles/stone_coal.png'
import trunkSideTile from './vendor/kenney-voxel/tiles/trunk_side.png'
import waterTile from './vendor/kenney-voxel/tiles/water.png'
import woodTile from './vendor/kenney-voxel/tiles/wood.png'
import type { SkillId } from '../data/skills'

export const TILE_SPRITES = {
  dirtGrass: dirtGrassTile,
  grassTop: grassTopTile,
  leaves: leavesTile,
  stone: stoneTile,
  stoneCoal: stoneCoalTile,
  trunkSide: trunkSideTile,
  water: waterTile,
  wood: woodTile,
} as const

export const EFFECT_SPRITES = {
  miningBlast: miningBlastSprite,
} as const

export const SPECIAL_ITEM_SPRITES = {
  minersChestClosed: minersChestClosedSprite,
  minersChestOpen: minersChestOpenSprite,
} as const

const skillSprites: Record<SkillId, string> = {
  woodcutting: axeIronSprite,
  fishing: fishingPoleSprite,
  firemaking: woodTile,
  cooking: bowlSprite,
  mining: pickIronSprite,
  smithing: hammerIronSprite,
  farming: hoeIronSprite,
  fletching: bowSprite,
  crafting: hammerIronSprite,
  runecrafting: oreEmeraldSprite,
}

const exactResourceSprites: Record<string, string> = {
  tnt: tntChargeSprite,
  chest: minersChestClosedSprite,
  stone: stoneTile,
  gravel: dirtGrassTile,
  coal: oreCoalSprite,
  copper_ore: oreIronSprite,
  tin_ore: oreSilverSprite,
  iron_ore: oreIronSprite,
  silver_ore: oreSilverSprite,
  gold_ore: oreGoldSprite,
  mithril_ore: oreEmeraldSprite,
  adamantite_ore: oreEmeraldSprite,
  runite_ore: oreEmeraldSprite,
  starmetal_ore: oreEmeraldSprite,
  oak_log: trunkSideTile,
  willow_log: trunkSideTile,
  maple_log: trunkSideTile,
  wheat: wheatSprite,
  potato: seedSprite,
  onion: seedSprite,
  tomato: appleSprite,
  raw_shrimp: fishSprite,
  raw_trout: fishSprite,
  raw_salmon: fishSprite,
  cooked_shrimp: fishCookedSprite,
  cooked_trout: fishCookedSprite,
  cooked_salmon: fishCookedSprite,
}

export function spriteForSkill(skillId: SkillId | null | undefined): string | null {
  if (!skillId) return null
  return skillSprites[skillId] ?? null
}

export function spriteForResource(resourceId: string | null | undefined, category?: string): string | null {
  if (!resourceId) return null

  const exact = exactResourceSprites[resourceId]
  if (exact) return exact

  if (resourceId.endsWith('_ore') || resourceId.includes('stone') || resourceId.includes('crystal') || resourceId.includes('core')) {
    return oreEmeraldSprite
  }
  if (resourceId.endsWith('_log') || resourceId.includes('timber')) {
    return trunkSideTile
  }
  if (resourceId.startsWith('raw_')) {
    return fishSprite
  }
  if (resourceId.startsWith('cooked_') || category === 'food') {
    return fishCookedSprite
  }
  if (category === 'crop') {
    return resourceId.includes('wheat') ? wheatSprite : seedSprite
  }
  if (category === 'ember') {
    return woodTile
  }
  if (category === 'metalwork') {
    return hammerIronSprite
  }
  if (category === 'fletched') {
    return resourceId.includes('arrow') ? arrowSprite : bowSprite
  }
  if (category === 'crafted') {
    return oreGoldSprite
  }
  if (category === 'rune') {
    return oreEmeraldSprite
  }

  return category === 'ore' ? oreIronSprite : null
}

export function spriteAlt(label: string): string {
  return `${label} voxel sprite`
}
