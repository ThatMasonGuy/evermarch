<template>
  <div class="active-mining-panel" :class="{ 'active-mining-panel-blasting': blastPhase === 'blast' }">
    <header class="active-mining-top">
      <div class="active-mining-brand">
        <span class="active-mining-brand-icon">
          <img v-if="pickaxeSprite" :src="pickaxeSprite" alt="" />
          <Pickaxe v-else :size="22" />
        </span>
        <span class="active-mining-brand-copy">
          <span>Mining</span>
          <strong>{{ taskChoiceLabel }}</strong>
        </span>
      </div>

      <div class="active-mining-depth-plaque">
        <Ruler :size="18" />
        <strong>{{ mining.depthMeters }}m</strong>
        <span>Deep</span>
      </div>

      <div class="active-mining-record">
        <span>Best</span>
        <strong>{{ mining.bestDepthMeters }}m</strong>
      </div>
    </header>

    <div class="active-mining-stage">
      <aside class="active-mining-depth-rail" aria-label="Mining depth">
        <div class="active-mining-depth-scale">
          <span
            v-for="tick in depthTicks"
            :key="tick"
            class="active-mining-depth-tick"
            :style="{ top: depthTickTop(tick) }"
          >
            {{ tick }}m
          </span>
          <div class="active-mining-depth-column">
            <span
              v-for="index in 12"
              :key="index"
              class="active-mining-depth-segment"
            ></span>
          </div>
          <span class="active-mining-depth-marker" :style="{ top: depthMarkerTop }">
            <strong>{{ mining.depthMeters }}m</strong>
          </span>
        </div>
      </aside>

      <section class="active-mining-window" :aria-label="mineWindowLabel">
        <div class="active-mining-surface" aria-hidden="true">
          <span
            v-for="index in 14"
            :key="index"
            class="active-mining-surface-block"
          ></span>
        </div>

        <div ref="mineBoardFrame" class="active-mining-board-frame">
          <div
            class="active-mining-board"
            :style="boardStyle"
          >
            <button
              v-for="block in mining.blocks"
              :key="block.id"
              type="button"
              class="active-mine-block"
              :class="blockClass(block)"
              :style="blockStyle(block)"
              :disabled="block.broken"
              :data-block-id="block.id"
              :aria-label="blockAriaLabel(block)"
              @pointerdown="beginMining(block.id, $event)"
              @pointerenter="continueMining(block.id)"
            >
              <span class="active-mine-block-texture"></span>
              <span v-if="block.kind !== 'stone' && block.kind !== 'gravel'" class="active-mine-ore">
                <span v-for="index in 5" :key="index"></span>
              </span>
              <img
                v-if="blockSprite(block)"
                :src="blockSprite(block) ?? ''"
                alt=""
                class="active-mine-block-sprite"
              />
              <span
                v-if="!block.broken && blockProgress(block) > 0"
                class="active-mine-cracks"
                :class="[crackStageClass(block), crackVariantClass(block)]"
                :style="{ opacity: crackOpacity(block) }"
              >
                <i v-for="index in 9" :key="index" class="active-mine-damage-chip"></i>
              </span>
              <span
                v-if="!block.broken && blockProgress(block) > 0"
                class="active-mine-durability"
                aria-hidden="true"
              >
                <span :style="{ width: durabilityWidth(block) }"></span>
              </span>
              <span v-if="block.broken && block.containsChest" class="active-mine-chest-found">CHEST</span>
              <span v-if="block.broken" class="active-mine-rubble" aria-hidden="true">
                <i v-for="index in 6" :key="index"></i>
              </span>
            </button>
          </div>
        </div>

        <Transition name="active-mining-blast">
          <div v-if="blastPhase" class="active-mining-blast-overlay" :class="`active-mining-blast-${blastPhase}`" aria-live="polite">
            <div v-if="blastPhase === 'fuse'" class="active-mining-blast-charge">
              <img :src="tntSprite" alt="" />
              <span class="active-mining-blast-fuse-spark" aria-hidden="true"></span>
              <small>Fuse lit</small>
            </div>
            <div v-else class="active-mining-blast-impact">
              <span class="active-mining-blast-flash" aria-hidden="true"></span>
              <span class="active-mining-blast-shockwave" aria-hidden="true"></span>
              <img :src="blastSprite" alt="" />
              <span class="active-mining-blast-debris" aria-hidden="true">
                <i v-for="index in 12" :key="index"></i>
              </span>
              <strong>Mine face cleared</strong>
            </div>
          </div>
        </Transition>
      </section>
    </div>

    <footer class="active-mining-belt">
      <div class="active-mining-tool active-mining-tool-primary">
        <span class="active-mining-tool-icon">
          <img v-if="pickaxeSprite" :src="pickaxeSprite" alt="" />
          <Pickaxe v-else :size="18" />
        </span>
        <span>
          <small>Pickaxe</small>
          <strong>Manual</strong>
        </span>
      </div>

      <button
        type="button"
        class="active-mining-tool active-mining-tnt-tool"
        :disabled="!canUseTnt"
        title="Blast every block in the current mine face"
        @click="useTnt"
      >
        <span class="active-mining-tnt-icon"><img :src="tntSprite" alt="" /></span>
        <span>
          <small>TNT</small>
          <strong>{{ store.getItemCount('tnt') }}</strong>
        </span>
      </button>

      <div class="active-mining-tool">
        <span class="active-mining-tool-icon">
          <img v-if="targetSprite" :src="targetSprite" alt="" />
          <Gem v-else :size="18" />
        </span>
        <span>
          <small>Target</small>
          <strong>{{ targetLabel }}</strong>
        </span>
      </div>

      <div class="active-mining-tool">
        <Trophy :size="18" />
        <span>
          <small>Mastery</small>
          <strong>{{ masteryLabel }}</strong>
        </span>
      </div>

      <div class="active-mining-progress-card">
        <div class="active-mining-progress-row">
          <span>Skill</span>
          <strong>{{ skillProgressLabel }}</strong>
        </div>
        <div class="active-mining-progress-track">
          <span :style="{ width: skillProgressWidth }"></span>
        </div>
      </div>

    </footer>
  </div>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Gem, Pickaxe, Ruler, Trophy } from 'lucide-vue-next'
import { useGameStore } from '../stores/gameStore'
import type { TaskDefinition } from '../data/tasks'
import { getResourceDefinition } from '../data/resources'
import { detonateActiveMiningTnt, performActiveMiningBlock } from '../engine/gameEngine'
import { getActiveMiningBlockProgress, type ActiveMiningBlockState } from '../engine/activeMining'
import { EFFECT_SPRITES, TILE_SPRITES, spriteForResource, spriteForSkill } from '../assets/visualAssets'

const props = defineProps<{
  task: TaskDefinition
  skillLevel: number
  skillProgress: number
  xpToNext: number
  masteryLevel: number
  isTaskMastered: boolean
}>()

const store = useGameStore()
let holdTimer: ReturnType<typeof setInterval> | null = null
let blastTimer: ReturnType<typeof setTimeout> | null = null
let activePointerId: number | null = null
const heldBlockId = ref<string | null>(null)
const blastPhase = ref<'fuse' | 'blast' | null>(null)
const mineBoardFrame = ref<HTMLElement | null>(null)

const mining = computed(() => store.activeMining)
const pickaxeSprite = computed(() => spriteForSkill('mining'))
const tntSprite = spriteForResource('tnt', 'misc') ?? ''
const blastSprite = EFFECT_SPRITES.miningBlast
const targetResourceId = computed(() => props.task.drops[0]?.resourceId ?? null)
const targetResource = computed(() => targetResourceId.value ? getResourceDefinition(targetResourceId.value) : null)
const targetSprite = computed(() =>
  targetResourceId.value ? spriteForResource(targetResourceId.value, targetResource.value?.category) : null
)
const targetLabel = computed(() => targetResource.value?.name ?? 'Ore')
const taskChoiceLabel = computed(() =>
  props.task.name.replace(/^(Mine)\s+/, '')
)
const boardStyle = computed<CSSProperties>(() => ({
  gridTemplateColumns: `repeat(${mining.value.gridWidth}, minmax(0, 1fr))`,
}))
const mineWindowLabel = computed(() =>
  `${taskChoiceLabel.value} mine face at ${mining.value.depthMeters} meters deep`
)
const skillProgressWidth = computed(() => `${Math.round(props.skillProgress * 100)}%`)
const skillProgressLabel = computed(() => `${Math.round(props.skillProgress * 100)}%`)
const masteryLabel = computed(() => props.isTaskMastered ? 'Mastered' : `Lv.${props.masteryLevel}`)
const canUseTnt = computed(() => store.getItemCount('tnt') > 0)
const depthWindowMax = computed(() => Math.max(50, Math.ceil((mining.value.depthMeters + 10) / 10) * 10))
const depthTicks = computed(() => {
  const step = depthWindowMax.value / 5
  return Array.from({ length: 6 }, (_, index) => Math.round(step * index))
})
const depthMarkerTop = computed(() =>
  `${Math.max(3, Math.min(94, (mining.value.depthMeters / depthWindowMax.value) * 100))}%`
)

watch(
  () => props.task.id,
  (taskId) => {
    store.ensureActiveMiningState(taskId)
  },
  { immediate: true },
)

watch(() => store.activeMiningBlastNonce, () => {
  blastPhase.value = 'fuse'
  if (blastTimer) clearTimeout(blastTimer)
  blastTimer = setTimeout(() => {
    blastPhase.value = 'blast'
    blastTimer = setTimeout(() => {
      blastPhase.value = null
      blastTimer = null
    }, 800)
  }, 360)
})

onBeforeUnmount(() => {
  endMining()
  window.removeEventListener('pointermove', continueMiningAtPointer)
  window.removeEventListener('pointerup', endMiningAtPointer)
  window.removeEventListener('pointercancel', endMiningAtPointer)
  if (blastTimer) clearTimeout(blastTimer)
})

onMounted(() => {
  window.addEventListener('pointermove', continueMiningAtPointer)
  window.addEventListener('pointerup', endMiningAtPointer)
  window.addEventListener('pointercancel', endMiningAtPointer)
})

function beginMining(blockId: string, event: PointerEvent) {
  event.preventDefault()

  endMining()
  activePointerId = event.pointerId
  heldBlockId.value = blockId
  mineBlock(blockId)

  if (heldBlockId.value) {
    holdTimer = setInterval(() => {
      if (heldBlockId.value) {
        mineBlock(heldBlockId.value)
      }
    }, 170)
  }
}

function continueMining(blockId: string) {
  if (!heldBlockId.value || heldBlockId.value === blockId) return
  heldBlockId.value = blockId
  mineBlock(blockId)
}

function continueMiningAtPointer(event: PointerEvent) {
  if (!heldBlockId.value || event.pointerId !== activePointerId) return
  event.preventDefault()
  const boardBounds = mineBoardFrame.value?.getBoundingClientRect()
  if (!boardBounds
    || event.clientX < boardBounds.left
    || event.clientX > boardBounds.right
    || event.clientY < boardBounds.top
    || event.clientY > boardBounds.bottom
  ) {
    endMining()
    return
  }
  const block = document
    .elementFromPoint(event.clientX, event.clientY)
    ?.closest<HTMLButtonElement>('.active-mine-block:not(:disabled)')
  if (block?.dataset.blockId) continueMining(block.dataset.blockId)
}

function endMiningAtPointer(event: PointerEvent) {
  if (event.pointerId === activePointerId) endMining()
}

function endMining() {
  if (holdTimer) {
    clearInterval(holdTimer)
    holdTimer = null
  }
  heldBlockId.value = null
  activePointerId = null
}

function mineBlock(blockId: string) {
  performActiveMiningBlock(blockId)
}

function useTnt() {
  detonateActiveMiningTnt()
}

function blockProgress(block: ActiveMiningBlockState): number {
  return getActiveMiningBlockProgress(block)
}

function durabilityWidth(block: ActiveMiningBlockState): string {
  return `${Math.round(blockProgress(block) * 100)}%`
}

function crackOpacity(block: ActiveMiningBlockState): string {
  return String(Math.max(0.22, Math.min(0.88, blockProgress(block) + 0.14)))
}

function crackStageClass(block: ActiveMiningBlockState): string {
  return `active-mine-cracks-stage-${Math.min(3, Math.max(1, Math.ceil(blockProgress(block) * 3)))}`
}

function crackVariantClass(block: ActiveMiningBlockState): string {
  return `active-mine-cracks-variant-${block.variant % 3}`
}

function blockSprite(block: ActiveMiningBlockState): string | null {
  if (block.kind === 'stone' || block.kind === 'gravel') return null
  return spriteForResource(block.resourceId, getResourceDefinition(block.resourceId).category)
}

function blockClass(block: ActiveMiningBlockState): Record<string, boolean> {
  return {
    [`active-mine-block-${block.kind}`]: true,
    'active-mine-block-broken': block.broken,
    'active-mine-block-damaged': blockProgress(block) > 0 && !block.broken,
    'active-mine-block-held': heldBlockId.value === block.id,
  }
}

function blockStyle(block: ActiveMiningBlockState): CSSProperties {
  return {
    '--active-mine-block-texture': `url(${tileForBlock(block)})`,
    '--active-mine-block-tint': block.tint,
    '--active-mine-block-offset': `${block.variant * 9}px`,
  } as CSSProperties
}

function tileForBlock(block: ActiveMiningBlockState): string {
  if (block.kind === 'coal' || block.resourceId === 'coal') return TILE_SPRITES.stoneCoal
  return TILE_SPRITES.stone
}

function blockAriaLabel(block: ActiveMiningBlockState): string {
  const percent = Math.round(blockProgress(block) * 100)
  if (block.broken) return block.containsChest ? "Miner's chest found" : `${block.label} broken`
  return `${block.label}, ${percent}% broken`
}

function depthTickTop(tick: number): string {
  return `${Math.max(0, Math.min(100, (tick / depthWindowMax.value) * 100))}%`
}
</script>

<style scoped>
.active-mining-panel {
  width: 100%;
  height: 100%;
  min-height: 0;
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-lg);
  background:
    linear-gradient(180deg, rgba(142, 202, 230, 0.12) 0 42px, transparent 43px),
    linear-gradient(180deg, rgba(139, 207, 75, 0.16) 0 52px, rgba(146, 123, 82, 0.18) 53px 84px, transparent 85px),
    radial-gradient(circle at 18% 38%, rgba(246, 211, 107, 0.06), transparent 26%),
    #171916;
  color: var(--color-text-primary);
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.active-mining-top {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(92px, auto);
  align-items: center;
  gap: 10px;
}

.active-mining-brand,
.active-mining-depth-plaque,
.active-mining-record {
  min-width: 0;
  min-height: 54px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 2px solid var(--em-block-border);
  border-radius: var(--radius-md);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(0, 0, 0, 0.16)),
    var(--color-bg-card);
  box-shadow:
    inset 0 2px 0 var(--em-block-highlight),
    0 4px 0 var(--em-block-shadow);
}

.active-mining-brand {
  padding: 8px 10px;
}

.active-mining-brand-icon,
.active-mining-tool-icon {
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-sm);
  background: rgba(0, 0, 0, 0.18);
  color: var(--color-accent-light);
}

.active-mining-brand-icon img,
.active-mining-tool-icon img {
  width: 30px;
  height: 30px;
  object-fit: contain;
  filter: drop-shadow(0 3px 0 rgba(0, 0, 0, 0.28));
}

.active-mining-brand-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.active-mining-brand-copy span,
.active-mining-record span,
.active-mining-tool small,
.active-mining-progress-row span,
.active-mining-progress-card small {
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}

.active-mining-brand-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-primary);
  font-size: 16px;
  font-weight: 900;
}

.active-mining-depth-plaque {
  padding: 8px 16px;
  border-color: rgba(246, 211, 107, 0.42);
  color: var(--em-gold);
}

.active-mining-depth-plaque strong {
  color: var(--em-gold);
  font-size: 26px;
  font-weight: 950;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.active-mining-depth-plaque span {
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 900;
  text-transform: uppercase;
}

.active-mining-record {
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 2px;
  padding: 7px 10px;
}

.active-mining-record strong {
  color: var(--color-text-primary);
  font-size: 16px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.active-mining-stage {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 12px;
  overflow: hidden;
}

.active-mining-depth-rail {
  min-height: 0;
  padding: 12px 8px;
  border: 2px solid var(--em-block-border);
  border-radius: var(--radius-md);
  background:
    linear-gradient(90deg, rgba(0, 0, 0, 0.2), transparent 34%, rgba(255, 255, 255, 0.04)),
    #171b16;
  box-shadow:
    inset 0 2px 0 var(--em-block-highlight),
    inset 0 -5px 0 rgba(0, 0, 0, 0.18);
}

.active-mining-depth-scale {
  position: relative;
  height: 100%;
  min-height: 270px;
}

.active-mining-depth-column {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 38px;
  width: 30px;
  display: grid;
  grid-template-rows: repeat(12, minmax(0, 1fr));
  border: 2px solid rgba(218, 217, 178, 0.22);
  background: #222721;
  overflow: hidden;
}

.active-mining-depth-segment {
  border-bottom: 1px solid rgba(0, 0, 0, 0.26);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.07), transparent 42%),
    var(--em-stone);
}

.active-mining-depth-segment:nth-child(1) {
  background:
    linear-gradient(180deg, var(--em-grass) 0 18%, var(--em-dirt) 19% 46%, var(--em-stone) 47%);
}

.active-mining-depth-segment:nth-child(5n) {
  background:
    linear-gradient(135deg, rgba(246, 211, 107, 0.1), transparent 44%),
    #6a5542;
}

.active-mining-depth-tick {
  position: absolute;
  left: 0;
  transform: translateY(-50%);
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.active-mining-depth-tick::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 34px;
  width: 8px;
  height: 1px;
  background: rgba(250, 244, 223, 0.58);
}

.active-mining-depth-marker {
  position: absolute;
  left: 10px;
  transform: translateY(-50%);
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--em-gold);
}

.active-mining-depth-marker::after {
  content: "";
  width: 10px;
  height: 10px;
  border: 2px solid var(--em-gold);
  background: var(--em-gold);
  box-shadow: 0 0 0 2px rgba(246, 211, 107, 0.18);
}

.active-mining-depth-marker strong {
  padding: 3px 6px;
  border: 2px solid var(--em-gold);
  background: rgba(37, 42, 33, 0.94);
  font-size: 13px;
  font-weight: 950;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.active-mining-window {
  position: relative;
  min-width: 0;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--em-block-border);
  border-radius: var(--radius-md);
  background:
    radial-gradient(circle at 20% 34%, rgba(246, 211, 107, 0.08), transparent 2px),
    radial-gradient(circle at 82% 62%, rgba(210, 135, 79, 0.1), transparent 3px),
    linear-gradient(90deg, rgba(0, 0, 0, 0.38), transparent 18%, transparent 82%, rgba(0, 0, 0, 0.42)),
    #11120f;
  box-shadow:
    inset 0 2px 0 var(--em-block-highlight),
    inset 0 -7px 0 rgba(0, 0, 0, 0.28);
  overflow: hidden;
}

.active-mining-window::before,
.active-mining-window::after {
  content: "";
  position: absolute;
  top: 54px;
  bottom: 0;
  width: 52px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.04), transparent 36%),
    var(--em-stone);
  opacity: 0.32;
}

.active-mining-window::before {
  left: 0;
  box-shadow: inset -8px 0 0 rgba(0, 0, 0, 0.18);
}

.active-mining-window::after {
  right: 0;
  box-shadow: inset 8px 0 0 rgba(0, 0, 0, 0.18);
}

.active-mining-surface {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 58px;
  display: grid;
  grid-template-columns: repeat(14, minmax(0, 1fr));
  z-index: 2;
}

.active-mining-surface-block {
  background:
    linear-gradient(180deg, var(--em-grass) 0 18%, var(--em-dirt) 19% 64%, #6d5637 65%);
  border-right: 1px solid rgba(0, 0, 0, 0.2);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.18),
    inset 0 -3px 0 rgba(0, 0, 0, 0.22);
}

.active-mining-surface-block:nth-child(3n) {
  transform: translateY(4px);
}

.active-mining-surface-block:nth-child(4n) {
  transform: translateY(-3px);
}

.active-mining-board-frame {
  position: relative;
  z-index: 4;
  width: min(100%, 560px);
  max-height: calc(100% - 38px);
  aspect-ratio: 1;
  padding: 10px;
  border: 3px solid #2f2b24;
  border-radius: var(--radius-lg);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(0, 0, 0, 0.18)),
    #29261f;
  box-shadow:
    0 12px 0 rgba(0, 0, 0, 0.24),
    0 0 0 4px rgba(83, 93, 72, 0.52);
}

.active-mining-board {
  width: 100%;
  height: 100%;
  display: grid;
  gap: 8px;
  touch-action: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}

.active-mine-block {
  min-width: 0;
  min-height: 0;
  position: relative;
  overflow: hidden;
  border: 2px solid rgba(250, 244, 223, 0.22);
  border-radius: var(--radius-md);
  background: #6f756e;
  cursor: pointer;
  touch-action: none;
  box-shadow:
    inset 0 3px 0 rgba(255, 255, 255, 0.14),
    inset 0 -6px 0 rgba(0, 0, 0, 0.18),
    0 4px 0 rgba(0, 0, 0, 0.34);
  transition:
    transform 90ms ease,
    border-color 150ms ease,
    filter 150ms ease;
  -webkit-tap-highlight-color: transparent;
}

.active-mine-block:hover:not(:disabled),
.active-mine-block-held {
  border-color: rgba(246, 211, 107, 0.64);
  filter: brightness(1.08);
}

.active-mine-block:active:not(:disabled),
.active-mine-block-held {
  transform: translateY(3px);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.1),
    inset 0 -3px 0 rgba(0, 0, 0, 0.22),
    0 1px 0 rgba(0, 0, 0, 0.34);
}

.active-mine-block:disabled {
  cursor: default;
}

.active-mine-block-texture {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.08), transparent 38%),
    var(--active-mine-block-texture);
  background-size: 48px 48px;
  background-position: var(--active-mine-block-offset) var(--active-mine-block-offset);
  image-rendering: auto;
}

.active-mine-block-texture::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
    linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
    color-mix(in srgb, var(--active-mine-block-tint), transparent 78%);
  background-size: 22px 22px;
  mix-blend-mode: screen;
  opacity: 0.62;
}

.active-mine-ore {
  position: absolute;
  inset: 13%;
  pointer-events: none;
}

.active-mine-ore span {
  position: absolute;
  width: 18%;
  height: 18%;
  background: var(--active-mine-block-tint);
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow:
    inset -3px -3px 0 rgba(0, 0, 0, 0.18),
    0 0 12px color-mix(in srgb, var(--active-mine-block-tint), transparent 70%);
}

.active-mine-ore span:nth-child(1) { top: 10%; left: 18%; }
.active-mine-ore span:nth-child(2) { top: 30%; right: 12%; }
.active-mine-ore span:nth-child(3) { bottom: 18%; left: 28%; }
.active-mine-ore span:nth-child(4) { bottom: 12%; right: 24%; }
.active-mine-ore span:nth-child(5) { top: 52%; left: 48%; }

.active-mine-block-sprite {
  position: absolute;
  right: 10%;
  bottom: 10%;
  width: 26%;
  height: 26%;
  object-fit: contain;
  opacity: 0.9;
  filter: drop-shadow(0 3px 0 rgba(0, 0, 0, 0.32));
  pointer-events: none;
}

.active-mine-cracks {
  position: absolute;
  inset: 17%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  pointer-events: none;
}

.active-mine-damage-chip {
  width: 66%;
  height: 66%;
  place-self: center;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(18, 22, 20, 0.82);
  box-shadow: inset -2px -2px 0 rgba(0, 0, 0, 0.34), 1px 2px 0 rgba(255, 255, 255, 0.1);
  animation: active-mine-damage-chip-in 120ms ease-out both;
}

.active-mine-cracks-stage-1 .active-mine-damage-chip:nth-child(n + 4),
.active-mine-cracks-stage-2 .active-mine-damage-chip:nth-child(n + 7) {
  display: none;
}

.active-mine-cracks-variant-0 .active-mine-damage-chip:nth-child(1) { grid-area: 2 / 2; }
.active-mine-cracks-variant-0 .active-mine-damage-chip:nth-child(2) { grid-area: 2 / 3; }
.active-mine-cracks-variant-0 .active-mine-damage-chip:nth-child(3) { grid-area: 3 / 2; }
.active-mine-cracks-variant-0 .active-mine-damage-chip:nth-child(4) { grid-area: 1 / 2; }
.active-mine-cracks-variant-0 .active-mine-damage-chip:nth-child(5) { grid-area: 2 / 1; }
.active-mine-cracks-variant-0 .active-mine-damage-chip:nth-child(6) { grid-area: 3 / 3; }
.active-mine-cracks-variant-0 .active-mine-damage-chip:nth-child(7) { grid-area: 1 / 1; }
.active-mine-cracks-variant-0 .active-mine-damage-chip:nth-child(8) { grid-area: 1 / 3; }
.active-mine-cracks-variant-0 .active-mine-damage-chip:nth-child(9) { grid-area: 3 / 1; }

.active-mine-cracks-variant-1 .active-mine-damage-chip:nth-child(1) { grid-area: 2 / 1; }
.active-mine-cracks-variant-1 .active-mine-damage-chip:nth-child(2) { grid-area: 2 / 2; }
.active-mine-cracks-variant-1 .active-mine-damage-chip:nth-child(3) { grid-area: 2 / 3; }
.active-mine-cracks-variant-1 .active-mine-damage-chip:nth-child(4) { grid-area: 1 / 2; }
.active-mine-cracks-variant-1 .active-mine-damage-chip:nth-child(5) { grid-area: 3 / 2; }
.active-mine-cracks-variant-1 .active-mine-damage-chip:nth-child(6) { grid-area: 1 / 1; }
.active-mine-cracks-variant-1 .active-mine-damage-chip:nth-child(7) { grid-area: 1 / 3; }
.active-mine-cracks-variant-1 .active-mine-damage-chip:nth-child(8) { grid-area: 3 / 1; }
.active-mine-cracks-variant-1 .active-mine-damage-chip:nth-child(9) { grid-area: 3 / 3; }

.active-mine-cracks-variant-2 .active-mine-damage-chip:nth-child(1) { grid-area: 1 / 2; }
.active-mine-cracks-variant-2 .active-mine-damage-chip:nth-child(2) { grid-area: 2 / 2; }
.active-mine-cracks-variant-2 .active-mine-damage-chip:nth-child(3) { grid-area: 3 / 2; }
.active-mine-cracks-variant-2 .active-mine-damage-chip:nth-child(4) { grid-area: 2 / 1; }
.active-mine-cracks-variant-2 .active-mine-damage-chip:nth-child(5) { grid-area: 2 / 3; }
.active-mine-cracks-variant-2 .active-mine-damage-chip:nth-child(6) { grid-area: 1 / 1; }
.active-mine-cracks-variant-2 .active-mine-damage-chip:nth-child(7) { grid-area: 1 / 3; }
.active-mine-cracks-variant-2 .active-mine-damage-chip:nth-child(8) { grid-area: 3 / 1; }
.active-mine-cracks-variant-2 .active-mine-damage-chip:nth-child(9) { grid-area: 3 / 3; }

.active-mine-rubble {
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  pointer-events: none;
}

.active-mine-rubble i {
  position: absolute;
  width: 18%;
  height: 18%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: color-mix(in srgb, var(--active-mine-block-tint), #2a2e29 65%);
  box-shadow: 2px 3px 0 rgba(0, 0, 0, 0.3);
  animation: active-mine-rubble-pop 260ms ease-out both;
}

.active-mine-rubble i:nth-child(1) { left: 12%; bottom: 18%; transform: rotate(12deg); }
.active-mine-rubble i:nth-child(2) { left: 36%; bottom: 10%; transform: rotate(-18deg); animation-delay: 30ms; }
.active-mine-rubble i:nth-child(3) { right: 16%; bottom: 22%; transform: rotate(18deg); animation-delay: 50ms; }
.active-mine-rubble i:nth-child(4) { left: 22%; top: 18%; transform: rotate(-10deg); animation-delay: 20ms; }
.active-mine-rubble i:nth-child(5) { right: 24%; top: 25%; transform: rotate(14deg); animation-delay: 70ms; }
.active-mine-rubble i:nth-child(6) { left: 48%; top: 42%; transform: rotate(22deg); animation-delay: 40ms; }

@keyframes active-mine-damage-chip-in {
  from { opacity: 0; transform: scale(0.55); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes active-mine-rubble-pop {
  from { opacity: 0; translate: 0 -14px; }
  to { opacity: 1; translate: 0 0; }
}

.active-mine-durability {
  position: absolute;
  left: 12%;
  right: 12%;
  bottom: 7%;
  height: 9px;
  padding: 2px;
  border: 1px solid rgba(0, 0, 0, 0.56);
  background: rgba(0, 0, 0, 0.42);
}

.active-mine-durability span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--em-gold), #fde68a);
  box-shadow: 0 0 10px rgba(246, 211, 107, 0.24);
}

.active-mine-block-broken {
  border-color: rgba(0, 0, 0, 0.28);
  background: #11120f;
  box-shadow:
    inset 0 0 24px rgba(0, 0, 0, 0.62),
    inset 0 0 0 999px rgba(0, 0, 0, 0.36);
}

.active-mine-block-broken .active-mine-block-texture,
.active-mine-block-broken .active-mine-ore,
.active-mine-block-broken .active-mine-block-sprite {
  opacity: 0.08;
}

.active-mining-belt {
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(96px, auto)) repeat(2, minmax(130px, 1fr)) minmax(180px, 1.2fr);
  gap: 8px;
}

.active-mining-tool,
.active-mining-progress-card {
  min-width: 0;
  min-height: 58px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 2px solid var(--em-block-border);
  border-radius: var(--radius-md);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(0, 0, 0, 0.14)),
    var(--color-bg-card);
  box-shadow:
    inset 0 2px 0 var(--em-block-highlight),
    0 4px 0 var(--em-block-shadow);
}

.active-mining-tool-primary {
  border-color: rgba(246, 211, 107, 0.52);
}

.active-mining-tnt-tool {
  border: 2px solid var(--em-block-border);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.active-mining-tnt-tool:disabled {
  opacity: 0.52;
  cursor: not-allowed;
}

.active-mining-tool span:not(.active-mining-tool-icon):not(.active-mining-tnt-icon) {
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.active-mining-tool strong,
.active-mining-progress-row strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.active-mining-tnt-icon {
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(248, 113, 113, 0.34);
  background: radial-gradient(circle, rgba(127, 29, 29, 0.34), rgba(0, 0, 0, 0.18));
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.08);
}

.active-mining-tnt-icon img {
  width: 32px;
  height: 32px;
  object-fit: contain;
  filter: drop-shadow(0 3px 0 rgba(0, 0, 0, 0.28));
}

.active-mining-progress-card {
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 6px;
}

.active-mining-progress-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.active-mining-progress-track {
  height: 7px;
  border-radius: var(--radius-sm);
  background: rgba(0, 0, 0, 0.38);
  overflow: hidden;
}

.active-mining-progress-track span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--em-grass-dark), var(--em-grass));
  transition: width 180ms ease;
}

.active-mining-progress-track-gold span {
  background: linear-gradient(90deg, #d97706, var(--em-gold));
}

.active-mining-strike-card small {
  color: var(--color-text-muted);
  font-size: 10px;
  line-height: 1.35;
}

.active-mine-chest-found {
  position: absolute;
  inset: auto 4px 4px;
  z-index: 3;
  padding: 2px 3px;
  border: 1px solid #f59e0b;
  border-radius: 3px;
  color: #fff7ed;
  background: #92400e;
  font-size: 8px;
  font-weight: 950;
  letter-spacing: 0.04em;
  text-align: center;
}

.active-mining-blast-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: var(--radius-md);
  pointer-events: none;
}

.active-mining-blast-charge,
.active-mining-blast-impact {
  position: relative;
  display: grid;
  place-items: center;
}

.active-mining-blast-charge img {
  width: clamp(88px, 22vw, 138px);
  height: clamp(88px, 22vw, 138px);
  object-fit: contain;
  filter: drop-shadow(0 10px 0 rgba(0, 0, 0, 0.3));
  animation: active-mining-fuse-pulse 180ms ease-in-out infinite alternate;
}

.active-mining-blast-charge small {
  margin-top: -12px;
  padding: 4px 8px;
  border: 1px solid rgba(251, 191, 36, 0.44);
  border-radius: var(--radius-sm);
  color: #fde68a;
  background: rgba(48, 24, 8, 0.84);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.active-mining-blast-fuse-spark {
  position: absolute;
  top: 5%;
  right: 23%;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff7c2;
  box-shadow: 0 0 0 5px rgba(251, 191, 36, 0.42), 0 0 22px 9px rgba(249, 115, 22, 0.54);
  animation: active-mining-fuse-spark 90ms steps(2, end) infinite;
}

.active-mining-blast-impact {
  width: 100%;
  height: 100%;
}

.active-mining-blast-impact > img {
  width: min(82%, 330px);
  height: min(82%, 330px);
  z-index: 2;
  object-fit: contain;
  filter: drop-shadow(0 0 24px rgba(249, 115, 22, 0.5));
  animation: active-mining-blast-pop 620ms cubic-bezier(0.12, 0.75, 0.18, 1) both;
}

.active-mining-blast-impact strong {
  position: absolute;
  bottom: 8%;
  z-index: 4;
  padding: 6px 11px;
  border: 2px solid #f59e0b;
  border-radius: var(--radius-sm);
  color: #fff7ed;
  background: rgba(69, 26, 3, 0.9);
  box-shadow: 0 4px 0 rgba(67, 20, 7, 0.8);
  font-family: var(--font-display);
  font-size: clamp(13px, 2.8vw, 20px);
  letter-spacing: 0.04em;
}

.active-mining-blast-flash {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.88), rgba(251, 191, 36, 0.38) 24%, transparent 62%);
  animation: active-mining-blast-flash 420ms ease-out both;
}

.active-mining-blast-shockwave {
  position: absolute;
  z-index: 3;
  width: 80px;
  height: 80px;
  border: 8px solid rgba(255, 237, 160, 0.78);
  border-radius: 50%;
  animation: active-mining-shockwave 560ms ease-out both;
}

.active-mining-blast-debris {
  position: absolute;
  inset: 0;
  z-index: 3;
}

.active-mining-blast-debris i {
  position: absolute;
  width: 9px;
  height: 9px;
  background: #6f5b49;
  box-shadow: inset -2px -2px 0 rgba(0, 0, 0, 0.28);
  animation: active-mining-debris 580ms ease-out both;
}

.active-mining-blast-debris i:nth-child(1) { left: 18%; top: 46%; --debris-x: -48px; --debris-y: -12px; }
.active-mining-blast-debris i:nth-child(2) { left: 26%; top: 30%; --debris-x: -34px; --debris-y: -42px; }
.active-mining-blast-debris i:nth-child(3) { left: 42%; top: 24%; --debris-x: -12px; --debris-y: -52px; }
.active-mining-blast-debris i:nth-child(4) { right: 42%; top: 22%; --debris-x: 12px; --debris-y: -54px; }
.active-mining-blast-debris i:nth-child(5) { right: 25%; top: 31%; --debris-x: 38px; --debris-y: -38px; }
.active-mining-blast-debris i:nth-child(6) { right: 17%; top: 48%; --debris-x: 52px; --debris-y: -8px; }
.active-mining-blast-debris i:nth-child(7) { right: 20%; bottom: 29%; --debris-x: 46px; --debris-y: 36px; }
.active-mining-blast-debris i:nth-child(8) { right: 37%; bottom: 20%; --debris-x: 18px; --debris-y: 52px; }
.active-mining-blast-debris i:nth-child(9) { left: 38%; bottom: 19%; --debris-x: -16px; --debris-y: 54px; }
.active-mining-blast-debris i:nth-child(10) { left: 21%; bottom: 28%; --debris-x: -44px; --debris-y: 38px; }
.active-mining-blast-debris i:nth-child(11) { left: 32%; top: 42%; --debris-x: -28px; --debris-y: -8px; }
.active-mining-blast-debris i:nth-child(12) { right: 32%; top: 43%; --debris-x: 30px; --debris-y: -6px; }

.active-mining-panel-blasting .active-mining-board-frame {
  animation: active-mining-board-shake 440ms ease-out both;
}

.active-mining-blast-enter-active { transition: opacity 120ms ease-out; }
.active-mining-blast-leave-active { transition: opacity 220ms ease-in; }
.active-mining-blast-enter-from,
.active-mining-blast-leave-to { opacity: 0; }

@keyframes active-mining-fuse-pulse { from { transform: scale(0.97) rotate(-1deg); } to { transform: scale(1.02) rotate(1deg); } }
@keyframes active-mining-fuse-spark { from { opacity: 0.65; transform: scale(0.72); } to { opacity: 1; transform: scale(1.18); } }
@keyframes active-mining-blast-pop { 0% { opacity: 0; transform: scale(0.12) rotate(-8deg); } 24% { opacity: 1; transform: scale(1.12) rotate(2deg); } 76% { opacity: 1; transform: scale(1.18) rotate(0); } 100% { opacity: 0.28; transform: scale(1.32) rotate(0); } }
@keyframes active-mining-blast-flash { from { opacity: 1; } to { opacity: 0; } }
@keyframes active-mining-shockwave { from { opacity: 0.9; transform: scale(0.35); } to { opacity: 0; transform: scale(5.4); } }
@keyframes active-mining-debris { from { opacity: 1; transform: translate(0, 0) rotate(0); } to { opacity: 0; transform: translate(var(--debris-x), var(--debris-y)) rotate(150deg); } }
@keyframes active-mining-board-shake {
  0%, 100% { transform: translate(0, 0); }
  15% { transform: translate(-5px, 3px); }
  30% { transform: translate(5px, -3px); }
  48% { transform: translate(-3px, -2px); }
  66% { transform: translate(3px, 2px); }
  82% { transform: translate(-1px, 1px); }
}

@media (prefers-reduced-motion: reduce) {
  .active-mining-panel-blasting .active-mining-board-frame,
  .active-mining-blast-charge img,
  .active-mining-blast-fuse-spark,
  .active-mining-blast-impact > img,
  .active-mining-blast-flash,
  .active-mining-blast-shockwave,
  .active-mining-blast-debris i { animation: none; }
}

@media (max-width: 1180px) {
  .active-mining-belt {
    grid-template-columns: repeat(4, minmax(96px, 1fr));
  }

  .active-mining-progress-card,
  .active-mining-progress-card-wide {
    grid-column: span 2;
  }
}

@media (max-width: 760px) {
  .active-mining-panel {
    height: auto;
    min-height: 0;
    grid-template-rows: auto auto auto;
    padding: 10px;
  }

  .active-mining-top {
    grid-template-columns: minmax(0, 1fr);
    gap: 6px;
  }

  .active-mining-record {
    display: none;
  }

  .active-mining-brand-copy strong {
    font-size: 14px;
  }

  .active-mining-depth-plaque {
    display: none;
  }

  .active-mining-stage {
    grid-template-columns: 58px minmax(0, 1fr);
    min-height: 0;
    gap: 6px;
  }

  .active-mining-depth-rail {
    padding: 6px 3px;
  }

  .active-mining-depth-scale {
    min-height: 0;
  }

  .active-mining-depth-column {
    left: 34px;
    width: 14px;
  }

  .active-mining-depth-marker {
    left: 37px;
  }

  .active-mining-depth-marker strong {
    display: none;
  }

  .active-mining-depth-tick {
    left: 1px;
    display: block;
    font-size: 9px;
  }

  .active-mining-depth-tick::after {
    left: 30px;
    width: 4px;
  }

  .active-mining-board-frame {
    width: 100%;
    max-width: none;
    max-height: none;
    box-sizing: border-box;
    padding: 8px;
  }

  .active-mining-window {
    aspect-ratio: 1;
    justify-content: center;
    padding: 0;
  }

  .active-mining-board {
    gap: 6px;
  }

  .active-mining-belt {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .active-mining-progress-card,
  .active-mining-progress-card-wide {
    grid-column: span 2;
  }
}

@media (max-width: 480px) {
  .active-mining-panel {
    min-height: 0;
  }

  .active-mining-brand-icon,
  .active-mining-tool-icon,
  .active-mining-tnt-icon {
    width: 32px;
    height: 32px;
  }

  .active-mining-brand-icon img,
  .active-mining-tool-icon img {
    width: 26px;
    height: 26px;
  }

  .active-mining-stage {
    grid-template-columns: 52px minmax(0, 1fr);
    min-height: 0;
    gap: 5px;
  }

  .active-mining-depth-column { left: 30px; }
  .active-mining-depth-marker { left: 33px; }
  .active-mining-depth-tick { font-size: 8px; }
  .active-mining-depth-tick::after { left: 27px; width: 3px; }

  .active-mining-window::before,
  .active-mining-window::after {
    width: 28px;
  }

  .active-mining-surface {
    height: 42px;
  }

  .active-mining-tool,
  .active-mining-progress-card {
    min-height: 52px;
  }
}
</style>
