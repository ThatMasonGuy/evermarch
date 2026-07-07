/**
 * Task definitions: the actual activities a player can perform.
 * Each skill has a level-spanning ladder that reaches level 99.
 */

import type { SkillId, LaneType } from './skills'

export type ResourceId = string

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
  /** Multiplier when performed in active lane */
  activeBoostMultiplier: number
  /** Which lanes this task can run in */
  allowedLanes: LaneType[]
}

interface TaskTier {
  id: string
  name: string
  level: number
  resourceId: ResourceId
  amount?: number
}

const GATHERING_LEVELS = [1, 5, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 99]
const ARTISAN_LEVELS = [1, 6, 12, 18, 25, 35, 45, 55, 65, 75, 85, 92, 99]
const FARMING_LEVELS = [1, 7, 15, 24, 35, 47, 59, 70, 80, 90, 99]

function xpForTask(level: number, base: number): number {
  return Math.round(base + level * 3.5 + Math.pow(level, 1.35))
}

function intervalForTask(level: number, baseMs: number): number {
  return Math.round(baseMs + Math.min(6500, level * 55))
}

function makeTasks(
  skillId: SkillId,
  verb: string,
  tiers: TaskTier[],
  allowedLanes: LaneType[],
  baseXp: number,
  baseInterval: number,
  activeBoostMultiplier = 4,
): TaskDefinition[] {
  return tiers.map((tier) => ({
    id: `${verb}_${tier.id}`,
    name: `${titleVerb(verb)} ${tier.name}`,
    skillId,
    levelRequired: tier.level,
    baseInterval: intervalForTask(tier.level, baseInterval),
    xpPerAction: xpForTask(tier.level, baseXp),
    drops: [{ resourceId: tier.resourceId, amount: tier.amount ?? 1 }],
    activeBoostMultiplier,
    allowedLanes,
  }))
}

function titleVerb(verb: string): string {
  return verb
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function tierRows(rows: Array<[string, string, ResourceId]>, levels: number[]): TaskTier[] {
  return rows.map(([id, name, resourceId], index) => ({
    id,
    name,
    resourceId,
    level: levels[index] ?? 99,
  }))
}

function tierRowsWithAmounts(rows: Array<[string, string, ResourceId, number?]>, levels: number[]): TaskTier[] {
  return rows.map(([id, name, resourceId, amount], index) => ({
    id,
    name,
    resourceId,
    amount,
    level: levels[index] ?? 99,
  }))
}

const miningTiers = tierRows([
  ['copper', 'Copper Ore', 'copper_ore'],
  ['tin', 'Tin Ore', 'tin_ore'],
  ['iron', 'Iron Ore', 'iron_ore'],
  ['coal', 'Coal', 'coal'],
  ['silver', 'Silver Ore', 'silver_ore'],
  ['gold', 'Gold Ore', 'gold_ore'],
  ['mithril', 'Mithril Ore', 'mithril_ore'],
  ['adamantite', 'Adamantite Ore', 'adamantite_ore'],
  ['runite', 'Runite Ore', 'runite_ore'],
  ['starmetal', 'Starmetal Ore', 'starmetal_ore'],
  ['moonstone', 'Moonstone', 'moonstone'],
  ['sunshard', 'Sunshard Crystal', 'sunshard_crystal'],
  ['everite', 'Everite Core', 'everite_core'],
], GATHERING_LEVELS)

const woodcuttingTiers = tierRows([
  ['oak', 'Oak', 'oak_log'],
  ['willow', 'Willow', 'willow_log'],
  ['maple', 'Maple', 'maple_log'],
  ['yew', 'Yew', 'yew_log'],
  ['ash', 'Ashwood', 'ashwood_log'],
  ['cedar', 'Storm Cedar', 'storm_cedar_log'],
  ['ironbark', 'Ironbark', 'ironbark_log'],
  ['silverleaf', 'Silverleaf', 'silverleaf_log'],
  ['wyrmwood', 'Wyrmwood', 'wyrmwood_log'],
  ['sunroot', 'Sunroot', 'sunroot_log'],
  ['moonwillow', 'Moonwillow', 'moonwillow_log'],
  ['starfall', 'Starfall Timber', 'starfall_timber'],
  ['everbranch', 'Everbranch', 'everbranch_log'],
], GATHERING_LEVELS)

const fishingTiers = tierRows([
  ['shallow_coast', 'Shallow Coast', 'raw_shrimp'],
  ['kelp_shoals', 'Kelp Shoals', 'raw_sardine'],
  ['cold_stream', 'Cold Stream', 'raw_trout'],
  ['river_bend', 'River Bend', 'raw_salmon'],
  ['reed_marsh', 'Reed Marsh', 'raw_pike'],
  ['mist_lake', 'Mist Lake', 'raw_bass'],
  ['tide_pools', 'Tide Pools', 'raw_lobster'],
  ['coral_shelf', 'Coral Shelf', 'raw_swordfish'],
  ['deep_reef', 'Deep Reef', 'raw_manta'],
  ['storm_sea', 'Storm Sea', 'raw_anglerfish'],
  ['moonlit_bay', 'Moonlit Bay', 'raw_moonfin'],
  ['sunken_trench', 'Sunken Trench', 'raw_abyssal_eel'],
  ['everdeep', 'Everdeep', 'raw_leviathan'],
], GATHERING_LEVELS)

const firemakingTiers = tierRows([
  ['oak', 'Oak Campfire', 'oak_ash'],
  ['willow', 'Willow Campfire', 'willow_ash'],
  ['maple', 'Maple Hearth', 'maple_ash'],
  ['yew', 'Yew Beacon', 'yew_ash'],
  ['ashwood', 'Ashwood Kiln', 'ashwood_ash'],
  ['storm_cedar', 'Storm Cedar Brazier', 'storm_cedar_ember'],
  ['ironbark', 'Ironbark Furnace', 'ironbark_ember'],
  ['silverleaf', 'Silverleaf Lantern', 'silverleaf_ember'],
  ['wyrmwood', 'Wyrmwood Pyre', 'wyrmwood_ember'],
  ['sunroot', 'Sunroot Bonfire', 'sunroot_ember'],
  ['moonwillow', 'Moonwillow Flame', 'moonwillow_ember'],
  ['starfall', 'Starfall Signal', 'starfall_ember'],
  ['everbranch', 'Everbranch Flame', 'everbranch_ember'],
], ARTISAN_LEVELS)

const cookingTiers = tierRows([
  ['shrimp', 'Seared Shrimp', 'cooked_shrimp'],
  ['sardine', 'Salted Sardine', 'cooked_sardine'],
  ['trout', 'River Trout', 'cooked_trout'],
  ['salmon', 'Glazed Salmon', 'cooked_salmon'],
  ['pike', 'Herbed Pike', 'cooked_pike'],
  ['bass', 'Lake Bass', 'cooked_bass'],
  ['lobster', 'Butter Lobster', 'cooked_lobster'],
  ['swordfish', 'Swordfish Steak', 'cooked_swordfish'],
  ['manta', 'Manta Fillet', 'cooked_manta'],
  ['anglerfish', 'Angler Stew', 'cooked_anglerfish'],
  ['moonfin', 'Moonfin Broth', 'cooked_moonfin'],
  ['abyssal_eel', 'Abyssal Eel Roast', 'cooked_abyssal_eel'],
  ['leviathan', 'Leviathan Feast', 'cooked_leviathan'],
], ARTISAN_LEVELS)

const smithingTiers = tierRows([
  ['bronze', 'Bronze Fittings', 'bronze_fittings'],
  ['iron', 'Iron Fittings', 'iron_fittings'],
  ['steel', 'Steel Frame', 'steel_frame'],
  ['silver', 'Silver Filigree', 'silver_filigree'],
  ['gold', 'Gold Setting', 'gold_setting'],
  ['mithril', 'Mithril Bracing', 'mithril_bracing'],
  ['adamantite', 'Adamantite Plate', 'adamantite_plate'],
  ['runite', 'Runite Mechanism', 'runite_mechanism'],
  ['starmetal', 'Starmetal Assembly', 'starmetal_assembly'],
  ['moonstone', 'Moonstone Inlay', 'moonstone_inlay'],
  ['sunshard', 'Sunshard Frame', 'sunshard_frame'],
  ['everite', 'Everite Crucible', 'everite_crucible'],
  ['masterwork', 'Masterwork Core', 'masterwork_core'],
], ARTISAN_LEVELS)

const farmingTiers = tierRows([
  ['potato', 'Potatoes', 'potato'],
  ['onion', 'Onions', 'onion'],
  ['tomato', 'Tomatoes', 'tomato'],
  ['wheat', 'Wheat', 'wheat'],
  ['barley', 'Barley', 'barley'],
  ['sunleaf', 'Sunleaf', 'sunleaf'],
  ['mooncap', 'Mooncap', 'mooncap'],
  ['silverthorn', 'Silverthorn', 'silverthorn'],
  ['starflower', 'Starflower', 'starflower'],
  ['everroot', 'Everroot', 'everroot'],
  ['worldseed', 'Worldseed', 'worldseed'],
], FARMING_LEVELS)

const fletchingTiers = tierRowsWithAmounts([
  ['oak_arrows', 'Oak Arrows', 'oak_arrows', 12],
  ['willow_shortbow', 'Willow Shortbow', 'willow_shortbow'],
  ['maple_longbow', 'Maple Longbow', 'maple_longbow'],
  ['yew_longbow', 'Yew Longbow', 'yew_longbow'],
  ['ashwood_bolts', 'Ashwood Bolts', 'ashwood_bolts', 10],
  ['storm_cedar_bow', 'Storm Cedar Bow', 'storm_cedar_bow'],
  ['ironbark_crossbow', 'Ironbark Crossbow', 'ironbark_crossbow'],
  ['silverleaf_arrows', 'Silverleaf Arrows', 'silverleaf_arrows', 8],
  ['wyrmwood_bow', 'Wyrmwood Bow', 'wyrmwood_bow'],
  ['sunroot_bolts', 'Sunroot Bolts', 'sunroot_bolts', 8],
  ['moonwillow_bow', 'Moonwillow Bow', 'moonwillow_bow'],
  ['starfall_arrows', 'Starfall Arrows', 'starfall_arrows', 6],
  ['everbranch_bow', 'Everbranch Bow', 'everbranch_bow'],
], ARTISAN_LEVELS)

const craftingTiers = tierRows([
  ['copper_charm', 'Copper Charm', 'copper_charm'],
  ['tin_locket', 'Tin Locket', 'tin_locket'],
  ['iron_ring', 'Iron Ring', 'iron_ring'],
  ['silver_amulet', 'Silver Amulet', 'silver_amulet'],
  ['gold_necklace', 'Gold Necklace', 'gold_necklace'],
  ['mithril_brooch', 'Mithril Brooch', 'mithril_brooch'],
  ['adamantite_clasp', 'Adamantite Clasp', 'adamantite_clasp'],
  ['runite_siglet', 'Runite Siglet', 'runite_siglet'],
  ['starmetal_compass', 'Starmetal Compass', 'starmetal_compass'],
  ['moonstone_relic', 'Moonstone Relic', 'moonstone_relic'],
  ['sunshard_prism', 'Sunshard Prism', 'sunshard_prism'],
  ['everite_totem', 'Everite Totem', 'everite_totem'],
  ['masterwork_idol', 'Masterwork Idol', 'masterwork_idol'],
], ARTISAN_LEVELS)

const runecraftingTiers = tierRowsWithAmounts([
  ['air', 'Air Runes', 'air_rune', 8],
  ['mind', 'Mind Runes', 'mind_rune', 8],
  ['water', 'Water Runes', 'water_rune', 7],
  ['earth', 'Earth Runes', 'earth_rune', 7],
  ['fire', 'Fire Runes', 'fire_rune', 6],
  ['body', 'Body Runes', 'body_rune', 6],
  ['cosmic', 'Cosmic Runes', 'cosmic_rune', 5],
  ['chaos', 'Chaos Runes', 'chaos_rune', 5],
  ['nature', 'Nature Runes', 'nature_rune', 4],
  ['law', 'Law Runes', 'law_rune', 4],
  ['death', 'Death Runes', 'death_rune', 3],
  ['blood', 'Blood Runes', 'blood_rune', 3],
  ['astral', 'Astral Runes', 'astral_rune', 2],
], ARTISAN_LEVELS)

export const MINING_TASKS = makeTasks('mining', 'mine', miningTiers, ['active', 'idle'], 8, 3900)
export const WOODCUTTING_TASKS = makeTasks('woodcutting', 'chop', woodcuttingTiers, ['active', 'idle'], 8, 3900)
export const FISHING_TASKS = makeTasks('fishing', 'fish', fishingTiers, ['active', 'idle'], 7, 4300)
export const FIREMAKING_TASKS = makeTasks('firemaking', 'kindle', firemakingTiers, ['active', 'idle'], 9, 3700)
export const COOKING_TASKS = makeTasks('cooking', 'cook', cookingTiers, ['active', 'idle'], 9, 4200)
export const SMITHING_TASKS = makeTasks('smithing', 'forge', smithingTiers, ['active', 'idle'], 11, 4700)
export const FARMING_TASKS = makeTasks('farming', 'grow', farmingTiers, ['background'], 10, 9000, 1)
export const FLETCHING_TASKS = makeTasks('fletching', 'shape', fletchingTiers, ['active', 'idle'], 9, 3900)
export const CRAFTING_TASKS = makeTasks('crafting', 'craft', craftingTiers, ['active', 'idle'], 10, 4300)
export const RUNECRAFTING_TASKS = makeTasks('runecrafting', 'bind', runecraftingTiers, ['active', 'idle'], 12, 5000)

export const ALL_TASKS: TaskDefinition[] = [
  ...WOODCUTTING_TASKS,
  ...FISHING_TASKS,
  ...FIREMAKING_TASKS,
  ...COOKING_TASKS,
  ...MINING_TASKS,
  ...SMITHING_TASKS,
  ...FARMING_TASKS,
  ...FLETCHING_TASKS,
  ...CRAFTING_TASKS,
  ...RUNECRAFTING_TASKS,
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
