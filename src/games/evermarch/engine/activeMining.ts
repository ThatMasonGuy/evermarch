import type { ResourceDrop, TaskDefinition } from '../data/tasks'

export type ActiveMiningBlockKind = 'stone' | 'gravel' | 'coal' | 'off_ore' | 'target_ore'

export interface ActiveMiningBlockState {
  id: string
  kind: ActiveMiningBlockKind
  resourceId: string
  label: string
  hardnessMs: number
  remainingMs: number
  drops: ResourceDrop[]
  variant: number
  tint: string
  broken: boolean
  containsChest: boolean
}

export interface ActiveMiningState {
  version: number
  taskId: string | null
  depthMeters: number
  bestDepthMeters: number
  totalMetersDug: number
  layerSeed: string
  layerIndex: number
  gridWidth: number
  gridHeight: number
  blocks: ActiveMiningBlockState[]
  tntCharges: number
  activeVein: null
  updatedAt: number
}

export interface ActiveMiningDamageResult {
  state: ActiveMiningState
  brokenBlock: ActiveMiningBlockState | null
  layerCleared: boolean
  previousDepthMeters: number
  nextDepthMeters: number
  damageAppliedMs: number
}

export interface ActiveMiningCadenceInput {
  progressMs: number
  multiplier: number
}

const ACTIVE_MINING_VERSION = 1
const CHEST_CHANCE_PER_BLOCK = 0.05

const ORE_POOL = [
  { resourceId: 'copper_ore', level: 5 },
  { resourceId: 'tin_ore', level: 10 },
  { resourceId: 'iron_ore', level: 15 },
  { resourceId: 'coal', level: 20 },
  { resourceId: 'silver_ore', level: 30 },
  { resourceId: 'gold_ore', level: 40 },
  { resourceId: 'mithril_ore', level: 50 },
  { resourceId: 'adamantite_ore', level: 60 },
  { resourceId: 'runite_ore', level: 70 },
]

const BLOCK_TINTS: Record<ActiveMiningBlockKind, string> = {
  stone: '#8d9287',
  gravel: '#a18f78',
  coal: '#2f312f',
  off_ore: '#c8874f',
  target_ore: '#f0c66b',
}

export function createDefaultActiveMiningState(): ActiveMiningState {
  return {
    version: ACTIVE_MINING_VERSION,
    taskId: null,
    depthMeters: 0,
    bestDepthMeters: 0,
    totalMetersDug: 0,
    layerSeed: createLayerSeed(),
    layerIndex: 0,
    gridWidth: 2,
    gridHeight: 2,
    blocks: [],
    tntCharges: 0,
    activeVein: null,
    updatedAt: Date.now(),
  }
}

export function normalizeActiveMiningState(saved: ActiveMiningState | undefined): ActiveMiningState {
  const fallback = createDefaultActiveMiningState()
  if (!saved || typeof saved !== 'object') return fallback

  return {
    version: ACTIVE_MINING_VERSION,
    taskId: typeof saved.taskId === 'string' ? saved.taskId : null,
    depthMeters: nonNegativeInteger(saved.depthMeters),
    bestDepthMeters: nonNegativeInteger(saved.bestDepthMeters),
    totalMetersDug: nonNegativeInteger(saved.totalMetersDug),
    layerSeed: typeof saved.layerSeed === 'string' && saved.layerSeed.length > 0 ? saved.layerSeed : fallback.layerSeed,
    layerIndex: nonNegativeInteger(saved.layerIndex),
    gridWidth: clampGridSize(saved.gridWidth),
    gridHeight: clampGridSize(saved.gridHeight),
    blocks: normalizeBlocks(saved.blocks),
    tntCharges: nonNegativeInteger(saved.tntCharges),
    activeVein: null,
    updatedAt: normalizeTimestamp(saved.updatedAt) ?? fallback.updatedAt,
  }
}

export function cloneActiveMiningState(state: ActiveMiningState): ActiveMiningState {
  return {
    ...state,
    blocks: state.blocks.map((block) => ({
      ...block,
      drops: block.drops.map((drop) => ({ ...drop })),
    })),
  }
}

export function ensureActiveMiningState(
  state: ActiveMiningState,
  task: TaskDefinition,
  skillLevel: number,
): ActiveMiningState {
  const normalized = normalizeActiveMiningState(state)
  const taskChanged = normalized.taskId !== task.id
  const expectedGridSize = gridSizeForMiningLayer(task, normalized.depthMeters, skillLevel)
  const gridChanged = normalized.gridWidth !== expectedGridSize || normalized.gridHeight !== expectedGridSize
  const needsLayer = taskChanged
    || gridChanged
    || normalized.blocks.length !== normalized.gridWidth * normalized.gridHeight
    || normalized.blocks.every((block) => block.broken)

  if (!needsLayer) return normalized

  const nextLayerIndex = taskChanged ? normalized.layerIndex + 1 : normalized.layerIndex

  return generateActiveMiningLayer({
    ...normalized,
    taskId: task.id,
    layerIndex: nextLayerIndex,
    gridWidth: expectedGridSize,
    gridHeight: expectedGridSize,
    blocks: [],
    updatedAt: Date.now(),
  }, task, skillLevel)
}

export function damageActiveMiningBlockState(
  state: ActiveMiningState,
  task: TaskDefinition,
  skillLevel: number,
  blockId: string,
  damageMs: number,
): ActiveMiningDamageResult {
  const ensured = ensureActiveMiningState(state, task, skillLevel)
  const targetBlock = ensured.blocks.find((block) => block.id === blockId)
  const previousDepthMeters = ensured.depthMeters
  const safeDamageMs = Math.max(0, Math.round(damageMs))

  if (!targetBlock || targetBlock.broken || safeDamageMs <= 0) {
    return {
      state: ensured,
      brokenBlock: null,
      layerCleared: false,
      previousDepthMeters,
      nextDepthMeters: previousDepthMeters,
      damageAppliedMs: 0,
    }
  }

  let brokenBlock: ActiveMiningBlockState | null = null
  const blocks = ensured.blocks.map((block) => {
    if (block.id !== blockId) return block

    const remainingMs = Math.max(0, block.remainingMs - safeDamageMs)
    const nextBlock = {
      ...block,
      remainingMs,
      broken: remainingMs <= 0,
    }
    if (!block.broken && nextBlock.broken) {
      brokenBlock = nextBlock
    }
    return nextBlock
  })

  const damagedState: ActiveMiningState = {
    ...ensured,
    blocks,
    updatedAt: Date.now(),
  }

  const layerCleared = blocks.every((block) => block.broken)
  if (!layerCleared) {
    return {
      state: damagedState,
      brokenBlock,
      layerCleared: false,
      previousDepthMeters,
      nextDepthMeters: previousDepthMeters,
      damageAppliedMs: Math.min(safeDamageMs, targetBlock.remainingMs),
    }
  }

  const nextDepthMeters = previousDepthMeters + 1
  const advancedState = generateActiveMiningLayer({
    ...damagedState,
    depthMeters: nextDepthMeters,
    bestDepthMeters: Math.max(damagedState.bestDepthMeters, nextDepthMeters),
    totalMetersDug: damagedState.totalMetersDug + 1,
    layerIndex: damagedState.layerIndex + 1,
    blocks: [],
    updatedAt: Date.now(),
  }, task, skillLevel)

  return {
    state: advancedState,
    brokenBlock,
    layerCleared: true,
    previousDepthMeters,
    nextDepthMeters,
    damageAppliedMs: Math.min(safeDamageMs, targetBlock.remainingMs),
  }
}

export function getActiveMiningClickDamageMs(
  task: TaskDefinition,
  cadence: ActiveMiningCadenceInput,
): number {
  const baselineTapMs = Math.max(280, Math.round(task.baseInterval / 8))
  const cadenceDamageMs = Math.round(cadence.progressMs)
  const speedBonusMs = cadence.multiplier > 1 ? Math.round(baselineTapMs * (cadence.multiplier - 1) * 0.12) : 0

  return Math.max(baselineTapMs, cadenceDamageMs + speedBonusMs)
}

export function getActiveMiningBlockProgress(block: ActiveMiningBlockState): number {
  if (block.hardnessMs <= 0) return 1
  return Math.max(0, Math.min(1, 1 - block.remainingMs / block.hardnessMs))
}

function generateActiveMiningLayer(
  state: ActiveMiningState,
  task: TaskDefinition,
  skillLevel: number,
): ActiveMiningState {
  const gridSize = gridSizeForMiningLayer(task, state.depthMeters, skillLevel)
  const blockCount = gridSize * gridSize
  const blocks: ActiveMiningBlockState[] = []
  let targetBlockCount = 0

  for (let index = 0; index < blockCount; index++) {
    const block = createBlockForIndex(state, task, skillLevel, index)
    if (block.kind === 'target_ore') targetBlockCount++
    blocks.push(block)
  }

  if (targetBlockCount === 0 && blocks.length > 0) {
    const replaceIndex = Math.floor(randomFor(state, 'target-fallback') * blocks.length)
    blocks[replaceIndex] = createTargetBlock(state, task, skillLevel, replaceIndex)
  }

  return {
    ...state,
    taskId: task.id,
    gridWidth: gridSize,
    gridHeight: gridSize,
    blocks,
    updatedAt: Date.now(),
  }
}

function createBlockForIndex(
  state: ActiveMiningState,
  task: TaskDefinition,
  skillLevel: number,
  index: number,
): ActiveMiningBlockState {
  const roll = randomFor(state, `kind-${index}`)
  const depthBonus = Math.min(0.16, state.depthMeters * 0.002)
  const targetChance = 0.24 + depthBonus
  const coalChance = task.drops[0]?.resourceId === 'coal' ? 0.03 : 0.08
  const offOreChance = 0.12
  const gravelChance = 0.14

  if (roll < targetChance) return createTargetBlock(state, task, skillLevel, index)
  if (roll < targetChance + coalChance) return createResourceBlock(state, task, skillLevel, index, 'coal', 'coal')
  if (roll < targetChance + coalChance + offOreChance) {
    const offTargetResourceId = chooseOffTargetOre(state, task, skillLevel, index)
    return createResourceBlock(state, task, skillLevel, index, 'off_ore', offTargetResourceId)
  }
  if (roll < targetChance + coalChance + offOreChance + gravelChance) {
    return createResourceBlock(state, task, skillLevel, index, 'gravel', 'gravel')
  }

  return createResourceBlock(state, task, skillLevel, index, 'stone', 'stone')
}

function createTargetBlock(
  state: ActiveMiningState,
  task: TaskDefinition,
  skillLevel: number,
  index: number,
): ActiveMiningBlockState {
  const primaryDrop = task.drops[0] ?? { resourceId: 'stone', amount: 1 }
  return createResourceBlock(state, task, skillLevel, index, 'target_ore', primaryDrop.resourceId, primaryDrop.amount)
}

function createResourceBlock(
  state: ActiveMiningState,
  task: TaskDefinition,
  skillLevel: number,
  index: number,
  kind: ActiveMiningBlockKind,
  resourceId: string,
  amount = 1,
): ActiveMiningBlockState {
  const hardnessMs = hardnessForBlock(kind, task, state.depthMeters, skillLevel)
  const variant = Math.floor(randomFor(state, `variant-${index}`) * 6)

  return {
    id: `layer-${state.layerIndex}-block-${index}`,
    kind,
    resourceId,
    label: titleFromId(resourceId),
    hardnessMs,
    remainingMs: hardnessMs,
    drops: [{ resourceId, amount }],
    variant,
    tint: tintForBlock(kind, resourceId),
    broken: false,
    containsChest: randomForChest(state, index) < CHEST_CHANCE_PER_BLOCK,
  }
}

function gridSizeForMiningLayer(task: TaskDefinition, depthMeters: number, skillLevel: number): number {
  if (task.levelRequired >= 10 || skillLevel >= 15 || depthMeters >= 24) return 3
  return 2
}

function hardnessForBlock(
  kind: ActiveMiningBlockKind,
  task: TaskDefinition,
  depthMeters: number,
  skillLevel: number,
): number {
  const levelPressure = Math.max(1, task.levelRequired) * 15
  const depthPressure = Math.floor(depthMeters / 8) * 28
  const skillRelief = Math.max(0, skillLevel - task.levelRequired) * 4
  const base = task.baseInterval

  const hardness = (() => {
    switch (kind) {
      case 'gravel':
        return base * 0.12 + depthPressure * 0.7
      case 'stone':
        return base * 0.16 + depthPressure
      case 'coal':
        return base * 0.2 + levelPressure * 0.7 + depthPressure
      case 'off_ore':
        return base * 0.22 + levelPressure + depthPressure
      case 'target_ore':
        return base * 0.27 + levelPressure * 1.15 + depthPressure
      default:
        return base * 0.16
    }
  })()

  return Math.max(260, Math.round(hardness - skillRelief))
}

function chooseOffTargetOre(
  state: ActiveMiningState,
  task: TaskDefinition,
  skillLevel: number,
  index: number,
): string {
  const targetResourceId = task.drops[0]?.resourceId
  const eligible = ORE_POOL
    .filter((ore) => ore.resourceId !== targetResourceId && ore.level <= Math.max(skillLevel, task.levelRequired, 10))
    .map((ore) => ore.resourceId)

  if (eligible.length === 0) return targetResourceId === 'copper_ore' ? 'tin_ore' : 'copper_ore'

  const selectedIndex = Math.floor(randomFor(state, `off-ore-${index}`) * eligible.length)
  return eligible[selectedIndex] ?? eligible[0]!
}

function tintForBlock(kind: ActiveMiningBlockKind, resourceId: string): string {
  if (kind === 'target_ore' || kind === 'off_ore') {
    if (resourceId.includes('copper')) return '#d2874f'
    if (resourceId.includes('tin') || resourceId.includes('silver')) return '#c9d2d1'
    if (resourceId.includes('iron')) return '#b77b58'
    if (resourceId.includes('gold') || resourceId.includes('sun')) return '#f3c85f'
    if (resourceId.includes('coal')) return '#2f312f'
    if (resourceId.includes('rune') || resourceId.includes('moon') || resourceId.includes('ever')) return '#a78bfa'
    if (resourceId.includes('starmetal') || resourceId.includes('mithril') || resourceId.includes('adamantite')) return '#72d3b2'
  }

  return BLOCK_TINTS[kind]
}

function randomFor(state: ActiveMiningState, key: string): number {
  const input = `${state.layerSeed}:${state.taskId ?? 'mine'}:${state.layerIndex}:${state.depthMeters}:${key}`
  let hash = 2166136261

  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0) / 4294967295
}

function randomForChest(state: ActiveMiningState, index: number): number {
  const input = `${state.layerSeed}:${state.taskId ?? 'mine'}:${state.layerIndex}:${state.depthMeters}:chest-v2-${index}`
  let hash = 2166136261

  for (let inputIndex = 0; inputIndex < input.length; inputIndex++) {
    hash ^= input.charCodeAt(inputIndex)
    hash = Math.imul(hash, 16777619)
  }

  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x85ebca6b)
  hash ^= hash >>> 13
  hash = Math.imul(hash, 0xc2b2ae35)
  hash ^= hash >>> 16

  return (hash >>> 0) / 4294967296
}

function normalizeBlocks(blocks: ActiveMiningBlockState[] | undefined): ActiveMiningBlockState[] {
  if (!Array.isArray(blocks)) return []

  return blocks
    .filter((block) => block && typeof block.id === 'string' && typeof block.resourceId === 'string')
    .map((block) => {
      const hardnessMs = Math.max(1, nonNegativeInteger(block.hardnessMs))
      const remainingMs = Math.min(hardnessMs, nonNegativeInteger(block.remainingMs))
      const kind = isActiveMiningBlockKind(block.kind) ? block.kind : 'stone'

      return {
        id: block.id,
        kind,
        resourceId: block.resourceId,
        label: typeof block.label === 'string' && block.label.length > 0 ? block.label : titleFromId(block.resourceId),
        hardnessMs,
        remainingMs,
        drops: normalizeDrops(block.drops, block.resourceId),
        variant: nonNegativeInteger(block.variant),
        tint: typeof block.tint === 'string' && block.tint.length > 0 ? block.tint : tintForBlock(kind, block.resourceId),
        broken: Boolean(block.broken) || remainingMs <= 0,
        containsChest: Boolean(block.containsChest),
      }
    })
}

function normalizeDrops(drops: ResourceDrop[] | undefined, fallbackResourceId: string): ResourceDrop[] {
  if (!Array.isArray(drops) || drops.length === 0) {
    return [{ resourceId: fallbackResourceId, amount: 1 }]
  }

  return drops
    .filter((drop) => drop && typeof drop.resourceId === 'string')
    .map((drop) => ({
      resourceId: drop.resourceId,
      amount: Math.max(1, nonNegativeInteger(drop.amount)),
    }))
}

function isActiveMiningBlockKind(value: string): value is ActiveMiningBlockKind {
  return value === 'stone'
    || value === 'gravel'
    || value === 'coal'
    || value === 'off_ore'
    || value === 'target_ore'
}

function clampGridSize(value: number): number {
  if (!Number.isFinite(value)) return 2
  return Math.max(2, Math.min(4, Math.floor(value)))
}

function nonNegativeInteger(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

function normalizeTimestamp(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

function createLayerSeed(): string {
  return `mine-${Date.now().toString(36)}-${Math.floor(Math.random() * 1_000_000).toString(36)}`
}

function titleFromId(id: string): string {
  return id
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
