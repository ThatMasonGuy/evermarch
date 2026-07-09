<template>
  <div class="farming-panel">
    <div class="farming-header">
      <div>
        <h2 class="farming-title">Farming</h2>
        <span class="farming-sub">Crop fields grow while you adventure.</span>
      </div>
      <div class="farming-summary">
        <div class="farming-pill">
          <Sprout :size="15" />
          <span>Lv.{{ farmingLevel }}</span>
        </div>
        <div class="farming-pill">
          <Rows3 :size="15" />
          <span>{{ store.unlockedFarmingPlotCount }}/{{ store.farmingPlots.length }} fields</span>
        </div>
        <div class="farming-pill farming-pill-ready" :class="{ 'farming-pill-lit': store.readyFarmingPlotCount > 0 }">
          <Bell :size="15" />
          <span>{{ store.readyFarmingPlotCount }} ready</span>
        </div>
      </div>
    </div>

    <section class="field-grid" aria-label="Farming fields">
      <article
        v-for="field in fieldViews"
        :key="field.plot.id"
        class="field-card"
        :class="{
          'field-card-locked': !field.unlocked,
          'field-card-planted': !!field.task,
          'field-card-ready': field.ready,
        }"
      >
        <div class="field-top">
          <div>
            <div class="field-label">Field {{ field.index + 1 }}</div>
            <div class="field-title">{{ field.title }}</div>
          </div>
          <div class="field-status" :class="{ 'field-status-ready': field.ready }">
            {{ field.status }}
          </div>
        </div>

        <div v-if="!field.unlocked" class="field-locked">
          <Lock :size="18" />
          <span>Unlocks at Farming Lv.{{ field.unlockLevel }}</span>
        </div>

        <template v-else-if="field.task">
          <div class="field-crop">
            <div class="crop-plot">
              <img v-if="field.sprite" :src="field.sprite" alt="" class="crop-sprite" />
              <Wheat v-else-if="field.resourceIcon === 'Wheat'" :size="26" />
              <Sprout v-else :size="26" />
            </div>
            <div class="crop-details">
              <div class="crop-name">{{ field.cropName }}</div>
              <div class="crop-meta">
                <span>{{ field.yieldLabel }}</span>
                <span>{{ field.timeLabel }}</span>
              </div>
            </div>
          </div>

          <div class="field-progress">
            <div class="field-progress-fill" :style="{ width: field.progressPct + '%' }"></div>
          </div>

          <div class="field-actions">
            <button
              type="button"
              class="field-action field-action-primary"
              :disabled="!field.ready"
              @click="store.collectFarmingPlot(field.plot.id)"
            >
              <PackageCheck :size="14" />
              <span>Collect</span>
            </button>
            <button
              type="button"
              class="field-action"
              :disabled="!field.ready"
              @click="store.collectAndReplantFarmingPlot(field.plot.id)"
            >
              <Repeat2 :size="14" />
              <span>Replant</span>
            </button>
          </div>
        </template>

        <div v-else class="crop-picker">
          <button
            v-for="crop in unlockedCropOptions"
            :key="crop.task.id"
            type="button"
            class="crop-option"
            @click="store.plantFarmingPlot(field.plot.id, crop.task.id)"
          >
            <img v-if="crop.sprite" :src="crop.sprite" alt="" class="crop-option-sprite" />
            <Sprout v-else :size="16" />
            <span>{{ crop.label }}</span>
            <small>{{ crop.durationLabel }}</small>
          </button>
        </div>
      </article>
    </section>

    <section class="crop-book">
      <div class="crop-book-heading">
        <h3>Crops</h3>
        <span>{{ unlockedCropOptions.length }} / {{ cropOptions.length }} unlocked</span>
      </div>
      <div class="crop-book-grid">
        <article
          v-for="crop in cropOptions"
          :key="crop.task.id"
          class="crop-card"
          :class="{ 'crop-card-locked': crop.locked }"
        >
          <div class="crop-card-icon">
            <img v-if="crop.sprite" :src="crop.sprite" alt="" class="crop-option-sprite" />
            <Sprout v-else :size="17" />
          </div>
          <div class="crop-card-main">
            <div class="crop-card-name">{{ crop.label }}</div>
            <div class="crop-card-meta">
              <span>Lv.{{ crop.task.levelRequired }}</span>
              <span>{{ crop.durationLabel }}</span>
              <span>{{ crop.yieldLabel }}</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Bell, Lock, PackageCheck, Repeat2, Rows3, Sprout, Wheat } from 'lucide-vue-next'
import { useGameStore, type FarmingPlotState } from '../stores/gameStore'
import { getTasksForSkill, getTaskById, type TaskDefinition } from '../data/tasks'
import { getResourceDefinition } from '../data/resources'
import { spriteForResource } from '../assets/visualAssets'

const store = useGameStore()
const nowMs = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(() => {
    nowMs.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})

const farmingLevel = computed(() => store.getSkillLevel('farming'))

const cropOptions = computed(() =>
  getTasksForSkill('farming').map((task) => {
    const resource = primaryResource(task)
    const durationMs = store.getFarmingGrowthDurationMs(task)
    const yieldAmount = store.getFarmingYieldAmount(task)

    return {
      task,
      resource,
      label: taskChoiceLabel(task),
      durationLabel: formatDuration(durationMs),
      yieldLabel: `${yieldAmount.toLocaleString()} ${resource.name}`,
      sprite: spriteForResource(resource.id, resource.category),
      locked: farmingLevel.value < task.levelRequired,
    }
  })
)

const unlockedCropOptions = computed(() => cropOptions.value.filter((crop) => !crop.locked))

const fieldViews = computed(() =>
  store.farmingPlots.map((plot, index) => buildFieldView(plot, index))
)

function buildFieldView(plot: FarmingPlotState, index: number) {
  const task = plot.taskId ? getTaskById(plot.taskId) ?? null : null
  const unlockLevel = store.getFarmingPlotUnlockLevel(index)
  const unlocked = store.isFarmingPlotUnlocked(plot.id)
  const ready = isReady(plot)
  const durationMs = task ? store.getFarmingGrowthDurationMs(task) : 0
  const elapsedMs = task && plot.plantedAt ? Math.max(0, nowMs.value - plot.plantedAt) : 0
  const remainingMs = task && plot.readyAt ? Math.max(0, plot.readyAt - nowMs.value) : 0
  const progressPct = task ? Math.min(100, Math.floor((elapsedMs / Math.max(1, durationMs)) * 100)) : 0
  const resource = task ? primaryResource(task) : null
  const yieldAmount = task ? store.getFarmingYieldAmount(task) : 0

  return {
    plot,
    index,
    task,
    unlocked,
    unlockLevel,
    ready,
    title: unlocked ? taskChoiceLabel(task) : 'Locked',
    status: fieldStatusLabel(unlocked, task, ready, remainingMs),
    cropName: task ? taskChoiceLabel(task) : '',
    yieldLabel: resource ? `${yieldAmount.toLocaleString()} ${resource.name}` : '',
    timeLabel: ready ? 'Ready now' : formatDuration(remainingMs),
    progressPct,
    sprite: resource ? spriteForResource(resource.id, resource.category) : null,
    resourceIcon: resource?.icon ?? 'Sprout',
  }
}

function isReady(plot: FarmingPlotState): boolean {
  return !!plot.taskId && typeof plot.readyAt === 'number' && nowMs.value >= plot.readyAt
}

function fieldStatusLabel(unlocked: boolean, task: TaskDefinition | null, ready: boolean, remainingMs: number): string {
  if (!unlocked) return 'Locked'
  if (!task) return 'Empty'
  if (ready) return 'Ready'
  return formatDuration(remainingMs)
}

function primaryResource(task: TaskDefinition) {
  return getResourceDefinition(task.drops[0]?.resourceId ?? 'potato')
}

function taskChoiceLabel(task: TaskDefinition | null): string {
  if (!task) return 'Open soil'
  return task.name.replace(/^(Grow)\s+/, '')
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '0m'

  const totalMinutes = Math.ceil(ms / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h`
  return `${minutes}m`
}
</script>

<style scoped>
.farming-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.farming-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.farming-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
}

.farming-sub {
  color: var(--color-text-muted);
  font-size: 13px;
}

.farming-summary {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 7px;
}

.farming-pill {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 9px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  background: var(--color-bg-card);
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.farming-pill-ready {
  color: #fde68a;
}

.farming-pill-lit {
  border-color: rgba(246, 211, 107, 0.7);
  background: rgba(246, 211, 107, 0.12);
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 10px;
}

.field-card {
  min-height: 236px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border: 2px solid var(--em-block-border);
  border-radius: var(--radius-md);
  background:
    linear-gradient(180deg, rgba(139, 92, 43, 0.22), transparent 56px),
    linear-gradient(90deg, rgba(196, 122, 60, 0.08) 1px, transparent 1px),
    linear-gradient(rgba(196, 122, 60, 0.08) 1px, transparent 1px),
    var(--color-bg-card);
  background-size: auto, 28px 28px, 28px 28px, auto;
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.06), inset 0 -3px 0 rgba(0, 0, 0, 0.22);
}

.field-card-ready {
  border-color: rgba(246, 211, 107, 0.82);
}

.field-card-locked {
  opacity: 0.78;
  background:
    linear-gradient(90deg, rgba(111, 118, 112, 0.12) 1px, transparent 1px),
    linear-gradient(rgba(111, 118, 112, 0.12) 1px, transparent 1px),
    var(--color-bg-surface);
  background-size: 24px 24px;
}

.field-top,
.field-actions,
.crop-card {
  display: flex;
  align-items: center;
}

.field-top {
  justify-content: space-between;
  gap: 12px;
}

.field-label {
  color: var(--color-text-muted);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
}

.field-title {
  color: var(--color-text-primary);
  font-size: 15px;
  font-weight: 800;
  line-height: 1.25;
}

.field-status {
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  padding: 5px 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  background: var(--color-bg-surface);
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

.field-status-ready {
  border-color: rgba(246, 211, 107, 0.72);
  color: #fde68a;
  background: rgba(246, 211, 107, 0.12);
}

.field-locked {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 130px;
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 700;
}

.field-crop {
  display: grid;
  grid-template-columns: 82px 1fr;
  align-items: center;
  gap: 12px;
}

.crop-plot {
  width: 82px;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(83, 50, 26, 0.86);
  border-radius: var(--radius-sm);
  color: #a3e635;
  background:
    linear-gradient(180deg, rgba(79, 159, 69, 0.5) 0 16px, transparent 16px),
    linear-gradient(90deg, rgba(83, 50, 26, 0.28) 1px, transparent 1px),
    linear-gradient(rgba(83, 50, 26, 0.28) 1px, transparent 1px),
    #6f4324;
  background-size: auto, 18px 18px, 18px 18px, auto;
  box-shadow: inset 0 3px 0 rgba(255, 255, 255, 0.1), inset 0 -4px 0 rgba(0, 0, 0, 0.2);
}

.crop-sprite {
  width: 46px;
  height: 46px;
  object-fit: contain;
  filter: drop-shadow(0 4px 0 rgba(0, 0, 0, 0.28));
}

.crop-details {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.crop-name {
  color: var(--color-text-primary);
  font-size: 17px;
  font-weight: 900;
  overflow-wrap: anywhere;
}

.crop-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.crop-meta span,
.crop-card-meta span {
  min-height: 22px;
  display: inline-flex;
  align-items: center;
  padding: 3px 6px;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  background: var(--color-bg-surface);
  font-size: 11px;
  font-weight: 800;
}

.field-progress {
  height: 8px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.22);
  border-radius: var(--radius-sm);
  background: var(--color-bg-elevated);
}

.field-progress-fill {
  height: 100%;
  border-radius: var(--radius-sm);
  background: linear-gradient(90deg, var(--em-grass-dark), var(--em-grass), var(--em-gold));
  transition: width 0.3s ease;
}

.field-actions {
  gap: 8px;
  margin-top: auto;
}

.field-action {
  flex: 1;
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  background: var(--color-bg-surface);
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}

.field-action-primary {
  border-color: rgba(246, 211, 107, 0.54);
  color: #fde68a;
  background: rgba(246, 211, 107, 0.1);
}

.field-action:hover:not(:disabled) {
  transform: translateY(1px);
  border-color: var(--color-border-hover);
  background: var(--color-bg-card-hover);
}

.field-action:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.crop-picker {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
  gap: 7px;
  margin-top: auto;
}

.crop-option {
  min-height: 54px;
  display: grid;
  grid-template-columns: 22px 1fr;
  grid-template-areas:
    "icon name"
    "icon time";
  align-items: center;
  column-gap: 7px;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  background: var(--color-bg-surface);
  font-family: var(--font-body);
  text-align: left;
  cursor: pointer;
}

.crop-option:hover {
  border-color: var(--color-border-hover);
  color: var(--color-text-primary);
  background: var(--color-bg-card-hover);
}

.crop-option span {
  grid-area: name;
  font-size: 12px;
  font-weight: 900;
  overflow-wrap: anywhere;
}

.crop-option small {
  grid-area: time;
  color: var(--color-text-muted);
  font-size: 10px;
  font-weight: 800;
}

.crop-option-sprite {
  grid-area: icon;
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.crop-book {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.crop-book-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.crop-book-heading h3 {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 800;
}

.crop-book-heading span {
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 800;
}

.crop-book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 8px;
}

.crop-card {
  gap: 9px;
  min-height: 74px;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-card);
}

.crop-card-locked {
  opacity: 0.56;
}

.crop-card-icon {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  color: #a3e635;
  background: rgba(79, 159, 69, 0.14);
}

.crop-card-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.crop-card-name {
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 900;
}

.crop-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

@media (max-width: 680px) {
  .farming-header {
    flex-direction: column;
  }

  .farming-summary {
    width: 100%;
    justify-content: flex-start;
  }

  .field-crop {
    grid-template-columns: 70px 1fr;
  }

  .crop-plot {
    width: 70px;
  }
}
</style>
