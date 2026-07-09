<template>
  <div class="routine-panel" :class="routineThemeClass">
    <section class="routine-skills">
      <SkillsPanel :show-header="false" />
    </section>

    <div class="routine-mood-strip" aria-hidden="true">
      <span v-for="tile in moodTiles" :key="tile" class="routine-mood-tile">{{ tile }}</span>
    </div>

    <div class="routine-workbench">
      <section class="routine-play-panel">
        <PassiveLanePanel lane-type="idle" :show-selector="false" />
      </section>

      <aside class="routine-options-panel">
        <div class="routine-options-head">
          <div>
            <span class="routine-options-label">Routine options</span>
            <h3>{{ routineOptionTitle }}</h3>
          </div>
          <button
            v-if="canUpgradeRoutineTask"
            type="button"
            class="routine-task-upgrade"
            :title="routineUpgradeTitle"
            @click="selectBestRoutineTask"
          >
            <ArrowUpRight :size="12" />
            <span>Use {{ routineUpgradeLabel }}</span>
          </button>
        </div>
        <span class="routine-task-count">
          {{ unlockedRoutineTasks.length }} / {{ routineTasksForSelectedSkill.length }} unlocked
        </span>
        <div class="routine-task-options" role="listbox" :aria-label="routineOptionTitle">
          <button
            v-for="taskOption in routineTasksForSelectedSkill"
            :key="taskOption.id"
            type="button"
            class="routine-task-option"
            :class="{
              'routine-task-option-current': taskOption.id === store.lanes.idle.taskId,
              'routine-task-option-locked': !canUseRoutineTask(taskOption),
            }"
            :aria-selected="taskOption.id === store.lanes.idle.taskId"
            :disabled="!canUseRoutineTask(taskOption)"
            @click="selectRoutineTask(taskOption.id)"
          >
            <span class="routine-task-option-main">
              <span class="routine-task-option-name">{{ taskChoiceLabel(taskOption) }}</span>
              <span v-if="taskOption.id === store.lanes.idle.taskId" class="routine-task-option-current-label">Current</span>
            </span>
            <span class="routine-task-option-meta">
              <span class="routine-task-option-requirement">
                <Lock v-if="!canUseRoutineTask(taskOption)" :size="11" />
                Lv.{{ taskOption.levelRequired }}
              </span>
              <span :class="{ 'routine-task-option-mastered': store.isTaskMastered(taskOption.id) }">
                {{ taskMasteryLabel(taskOption) }}
              </span>
            </span>
            <span class="routine-task-mastery-bar" :title="`${Math.round(store.getTaskMasteryProgress(taskOption.id) * 100)}% through this mastery level`">
              <span
                class="routine-task-mastery-fill"
                :style="{ width: masteryProgressWidth(taskOption.id) }"
              ></span>
            </span>
          </button>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUpRight, Lock } from 'lucide-vue-next'
import PassiveLanePanel from './PassiveLanePanel.vue'
import SkillsPanel from './SkillsPanel.vue'
import { useGameStore } from '../stores/gameStore'
import { ALL_TASKS, getTaskById, type TaskDefinition } from '../data/tasks'
import type { SkillId } from '../data/skills'

const store = useGameStore()

const routineTask = computed(() => {
  const taskId = store.lanes.idle.taskId
  return taskId ? getTaskById(taskId) ?? null : null
})

const routineSkillId = computed<SkillId>(() => {
  return routineTask.value?.skillId ?? 'woodcutting'
})

const routineThemeClass = computed(() => `routine-theme-${routineSkillId.value}`)
const routineOptionTitle = computed(() => taskSelectorLabel(routineSkillId.value))
const routineTasksForSelectedSkill = computed(() =>
  ALL_TASKS.filter((taskOption) =>
    taskOption.skillId === routineSkillId.value && taskOption.allowedLanes.includes('idle')
  )
)
const unlockedRoutineTasks = computed(() => routineTasksForSelectedSkill.value.filter(canUseRoutineTask))
const bestRoutineTask = computed(() => unlockedRoutineTasks.value[unlockedRoutineTasks.value.length - 1] ?? null)
const canUpgradeRoutineTask = computed(() =>
  !!bestRoutineTask.value && bestRoutineTask.value.id !== store.lanes.idle.taskId
)
const routineUpgradeLabel = computed(() => bestRoutineTask.value ? taskChoiceLabel(bestRoutineTask.value) : '')
const routineUpgradeTitle = computed(() =>
  routineUpgradeLabel.value ? `Use best unlocked routine: ${routineUpgradeLabel.value}` : ''
)

const moodTiles = computed(() => {
  switch (routineSkillId.value) {
    case 'woodcutting': return ['tree', 'log', 'leaf', 'tree', 'log']
    case 'fishing': return ['water', 'fish', 'reed', 'water', 'fish']
    case 'mining': return ['stone', 'ore', 'coal', 'stone', 'ore']
    case 'firemaking': return ['log', 'ember', 'ash', 'log', 'ember']
    case 'cooking': return ['hearth', 'fish', 'bowl', 'hearth', 'steam']
    case 'smithing': return ['anvil', 'ore', 'bar', 'coal', 'anvil']
    case 'fletching': return ['log', 'bow', 'arrow', 'feather', 'bow']
    case 'crafting': return ['gem', 'ring', 'tool', 'gem', 'charm']
    case 'runecrafting': return ['rune', 'essence', 'glyph', 'rune', 'spark']
    default: return ['route', 'work', 'skill', 'route', 'work']
  }
})

function canUseRoutineTask(taskOption: TaskDefinition): boolean {
  return store.getSkillLevel(taskOption.skillId) >= taskOption.levelRequired
}

function selectRoutineTask(taskId: string) {
  store.setLaneTask('idle', taskId)
}

function selectBestRoutineTask() {
  if (bestRoutineTask.value) {
    selectRoutineTask(bestRoutineTask.value.id)
  }
}

function taskSelectorLabel(skillId: SkillId): string {
  switch (skillId) {
    case 'mining': return 'Ore'
    case 'woodcutting': return 'Tree'
    case 'fishing': return 'Fishing spot'
    case 'firemaking': return 'Fire'
    case 'cooking': return 'Recipe'
    case 'smithing': return 'Project'
    case 'fletching': return 'Fletching project'
    case 'crafting': return 'Craft'
    case 'runecrafting': return 'Rune'
    case 'farming': return 'Crop'
    default: return 'Task'
  }
}

function taskChoiceLabel(taskOption: TaskDefinition): string {
  return taskOption.name.replace(/^(Mine|Chop|Fish|Kindle|Cook|Forge|Shape|Craft|Bind|Grow)\s+/, '')
}

function taskMasteryLabel(taskOption: TaskDefinition): string {
  return store.isTaskMastered(taskOption.id)
    ? 'Mastered'
    : `M.${store.getTaskMasteryLevel(taskOption.id)}`
}

function masteryProgressWidth(taskId: string): string {
  if (store.isTaskMastered(taskId)) return '100%'
  return `${Math.round(store.getTaskMasteryProgress(taskId) * 100)}%`
}
</script>

<style scoped>
.routine-panel {
  --routine-theme: var(--em-grass);
  --routine-theme-soft: rgba(79, 159, 69, 0.12);
  --routine-page-shell-offset: 82px;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
  min-height: 0;
  height: calc(100dvh - var(--routine-page-shell-offset));
}

.routine-theme-mining {
  --routine-theme: var(--em-stone);
  --routine-theme-soft: rgba(169, 176, 166, 0.13);
}

.routine-theme-woodcutting {
  --routine-theme: var(--em-grass);
  --routine-theme-soft: rgba(79, 159, 69, 0.14);
}

.routine-theme-fishing {
  --routine-theme: var(--em-water);
  --routine-theme-soft: rgba(47, 128, 183, 0.13);
}

.routine-theme-firemaking,
.routine-theme-cooking {
  --routine-theme: #fb923c;
  --routine-theme-soft: rgba(249, 115, 22, 0.13);
}

.routine-theme-smithing {
  --routine-theme: #ef4444;
  --routine-theme-soft: rgba(239, 68, 68, 0.12);
}

.routine-theme-fletching {
  --routine-theme: #facc15;
  --routine-theme-soft: rgba(250, 204, 21, 0.11);
}

.routine-theme-crafting {
  --routine-theme: #ec4899;
  --routine-theme-soft: rgba(236, 72, 153, 0.11);
}

.routine-theme-runecrafting {
  --routine-theme: #a78bfa;
  --routine-theme-soft: rgba(167, 139, 250, 0.12);
}

.routine-mood-strip {
  min-height: 50px;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
  padding: 8px;
  border: 2px solid color-mix(in srgb, var(--routine-theme), var(--em-block-border) 56%);
  border-radius: var(--radius-md);
  background:
    linear-gradient(90deg, var(--routine-theme-soft) 1px, transparent 1px),
    linear-gradient(var(--routine-theme-soft) 1px, transparent 1px),
    var(--color-bg-card);
  background-size: 24px 24px;
}

.routine-mood-tile {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 6px;
  border: 1px solid color-mix(in srgb, var(--routine-theme), var(--color-border) 48%);
  border-radius: var(--radius-sm);
  color: color-mix(in srgb, var(--routine-theme), white 36%);
  background: rgba(0, 0, 0, 0.16);
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
}

.routine-skills {
  min-width: 0;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}

.routine-section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.routine-section-heading h3 {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 800;
}

.routine-workbench {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(230px, 280px);
  gap: 14px;
  align-items: stretch;
  min-width: 0;
  min-height: 0;
  height: 100%;
}

.routine-play-panel,
.routine-options-panel {
  min-width: 0;
  min-height: 0;
  border: 2px solid color-mix(in srgb, var(--routine-theme), var(--em-block-border) 54%);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(180deg, var(--routine-theme-soft), transparent 60%),
    rgba(0, 0, 0, 0.12);
  box-shadow:
    inset 0 2px 0 var(--em-block-highlight),
    inset 0 -5px 0 rgba(0, 0, 0, 0.14);
}

.routine-play-panel {
  display: flex;
  align-items: stretch;
  padding: 12px;
}

.routine-play-panel :deep(.passive-panel) {
  width: 100%;
  min-height: 100%;
  justify-content: center;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
}

.routine-play-panel :deep(.passive-task-info) {
  gap: 16px;
}

.routine-play-panel :deep(.passive-icon-ring) {
  width: 64px;
  height: 64px;
}

.routine-play-panel :deep(.passive-task-name) {
  font-size: 18px;
}

.routine-play-panel :deep(.passive-xp-row),
.routine-play-panel :deep(.passive-cost-row) {
  font-size: 13px;
}

.routine-options-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  padding: 12px;
  overflow: hidden;
  height: 100%;
  max-height: 100%;
}

.routine-options-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  flex-shrink: 0;
}

.routine-options-label {
  font-size: 11px;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.routine-options-head h3 {
  margin-top: 2px;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 800;
}

.routine-task-count {
  color: var(--color-text-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.routine-task-upgrade {
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid color-mix(in srgb, var(--routine-theme), var(--color-border-hover) 42%);
  background: var(--color-bg-surface);
  color: color-mix(in srgb, var(--routine-theme), white 34%);
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.routine-task-upgrade:hover {
  border-color: var(--routine-theme);
  background: var(--routine-theme-soft);
}

.routine-task-options {
  display: grid;
  grid-template-columns: 1fr;
  align-content: start;
  gap: 8px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 2px 4px 2px 0;
}

.routine-task-option {
  min-height: 58px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 6px;
  padding: 9px 10px 13px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all var(--transition-fast);
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}

.routine-task-option:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--routine-theme), var(--color-border-hover) 38%);
  color: var(--color-text-primary);
  background: var(--color-bg-card-hover);
}

.routine-task-option:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.routine-task-option-current {
  border-color: var(--routine-theme);
  color: color-mix(in srgb, var(--routine-theme), white 36%);
  background: var(--routine-theme-soft);
}

.routine-task-option-locked {
  background: var(--color-bg-elevated);
}

.routine-task-option-main,
.routine-task-option-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.routine-task-option-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.routine-task-option-current-label {
  flex-shrink: 0;
  padding: 1px 5px;
  border-radius: var(--radius-sm);
  background: var(--color-accent-glow);
  color: var(--color-accent-light);
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
}

.routine-task-option-meta {
  color: var(--color-text-muted);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.routine-task-option-requirement {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.routine-task-option-mastered {
  color: #fde68a;
}

.routine-task-mastery-bar {
  position: absolute;
  left: -1px;
  right: -1px;
  bottom: -1px;
  height: 5px;
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
  background: rgba(0, 0, 0, 0.42);
  overflow: hidden;
}

.routine-task-mastery-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #d97706, #fbbf24, #fde68a);
  box-shadow: 0 -1px 8px rgba(253, 230, 138, 0.42);
  transition: width 0.3s ease;
}

@media (max-width: 900px) {
  .routine-panel {
    display: flex;
    flex-direction: column;
    height: auto;
    min-height: 0;
  }

  .routine-mood-strip {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .routine-workbench {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 0;
  }

  .routine-options-panel {
    max-height: 320px;
  }

  .routine-options-head {
    flex-direction: column;
  }

  .routine-task-upgrade {
    width: 100%;
  }
}
</style>
