<template>
  <div class="passive-panel" :class="'passive-panel-' + laneType">
    <div class="passive-header">
      <div class="passive-label">
        <div class="passive-dot" :class="'passive-dot-' + laneType"></div>
        <span>{{ laneLabel }}: {{ skillDef?.name ?? 'None' }} Lv.{{ skillLevel }}</span>
      </div>
      <span class="passive-rate" v-if="task">
        +{{ task.drops[0]?.amount ?? 1 }} / {{ (task.baseInterval / 1000).toFixed(0) }}s
      </span>
    </div>

    <div class="passive-body" v-if="task">
      <div class="passive-task-info">
        <div class="passive-icon-ring">
          <Pickaxe v-if="task.skillId === 'mining'" :size="20" />
          <TreePine v-else-if="task.skillId === 'woodcutting'" :size="20" />
          <Fish v-else-if="task.skillId === 'fishing'" :size="20" />
          <Sprout v-else-if="task.skillId === 'farming'" :size="20" />
          <FlameKindling v-else-if="task.skillId === 'cooking'" :size="20" />
          <Hammer v-else-if="task.skillId === 'smithing'" :size="20" />
          <Swords v-else :size="20" />
          <span class="passive-icon-level">Lv{{ skillLevel }}</span>
        </div>
        <div class="passive-details">
          <div class="passive-task-name">{{ task.name }}</div>
          <div class="passive-xp-row">
            <span>+{{ task.xpPerAction }} XP / action</span>
          </div>
        </div>
        <div class="passive-progress-pct">{{ Math.floor(progressPct) }}%</div>
      </div>

      <div class="passive-progress-bar">
        <div
          class="passive-progress-fill"
          :class="'passive-fill-' + laneType"
          :style="{ width: progressPct + '%' }"
        ></div>
      </div>

      <div class="passive-xp-bar">
        <div
          class="passive-xp-fill"
          :style="{ width: (skillProgress * 100) + '%' }"
        ></div>
      </div>
    </div>

    <div class="passive-selector" v-if="selectableSkills.length > 0">
      <div class="passive-skill-tabs" :aria-label="`${laneLabel} task type`">
        <button
          v-for="skill in selectableSkills"
          :key="skill.id"
          type="button"
          class="passive-skill-tab"
          :class="{ 'passive-skill-tab-active': skill.id === selectedSkillId }"
          :disabled="!hasUnlockedTasks(skill.id)"
          :title="skillTabTitle(skill.id)"
          :aria-pressed="skill.id === selectedSkillId"
          @click="selectSkill(skill.id)"
        >
          <Pickaxe v-if="skill.icon === 'Pickaxe'" :size="14" />
          <TreePine v-else-if="skill.icon === 'TreePine'" :size="14" />
          <Fish v-else-if="skill.icon === 'Fish'" :size="14" />
          <Sprout v-else-if="skill.icon === 'Sprout'" :size="14" />
          <FlameKindling v-else-if="skill.icon === 'FlameKindling'" :size="14" />
          <Hammer v-else-if="skill.icon === 'Hammer'" :size="14" />
          <Swords v-else :size="14" />
          <span>{{ skill.name }}</span>
          <small>Lv.{{ store.getSkillLevel(skill.id) }}</small>
        </button>
      </div>

      <label class="passive-select-label" :for="taskSelectId">{{ taskSelectLabel }}</label>
      <select
        :id="taskSelectId"
        class="passive-select"
        :value="lane.taskId ?? ''"
        :disabled="tasksForSelectedSkill.length === 0"
        @change="onSelectTask(($event.target as HTMLSelectElement).value)"
      >
        <option value="" disabled>{{ taskSelectPlaceholder }}</option>
        <option
          v-for="t in tasksForSelectedSkill"
          :key="t.id"
          :value="t.id"
          :disabled="store.getSkillLevel(t.skillId) < t.levelRequired"
        >
          {{ taskChoiceLabel(t) }} (Lv.{{ t.levelRequired }})
          {{ store.getSkillLevel(t.skillId) < t.levelRequired ? ' - Locked' : '' }}
        </option>
      </select>
    </div>

    <div v-if="!task" class="passive-empty">
      No task assigned.
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Pickaxe, TreePine, Fish, Sprout, FlameKindling, Hammer, Swords } from 'lucide-vue-next'
import { useGameStore } from '../stores/gameStore'
import { getTaskById, ALL_TASKS, type TaskDefinition } from '../data/tasks'
import { SKILLS, SKILL_LIST, type SkillId } from '../data/skills'

const props = defineProps<{
  laneType: 'idle' | 'background'
}>()

const store = useGameStore()

const laneLabel = computed(() => props.laneType === 'idle' ? 'Routine' : 'Background')

const lane = computed(() => store.lanes[props.laneType])
const task = computed(() => lane.value.taskId ? getTaskById(lane.value.taskId) : null)
const skillDef = computed(() => task.value ? SKILLS[task.value.skillId] : null)
const skillLevel = computed(() => task.value ? store.getSkillLevel(task.value.skillId) : 0)
const skillProgress = computed(() => task.value ? store.getSkillProgress(task.value.skillId) : 0)

const progressPct = computed(() => {
  if (!task.value) return 0
  return Math.min(100, (lane.value.progress / task.value.baseInterval) * 100)
})

const selectableTasks = computed(() => {
  return ALL_TASKS.filter((t) => t.allowedLanes.includes(props.laneType))
})

const selectableSkills = computed(() => {
  const skillIds = new Set(selectableTasks.value.map((t) => t.skillId))
  return SKILL_LIST.filter((skill) => skillIds.has(skill.id))
})

const selectedSkillId = computed<SkillId | null>(() => {
  return task.value?.skillId ?? selectableSkills.value[0]?.id ?? null
})

const tasksForSelectedSkill = computed(() => {
  if (!selectedSkillId.value) return []
  return selectableTasks.value.filter((t) => t.skillId === selectedSkillId.value)
})

const taskSelectId = computed(() => `passive-${props.laneType}-task-select`)
const taskSelectLabel = computed(() =>
  selectedSkillId.value ? taskSelectorLabel(selectedSkillId.value) : 'Task'
)
const taskSelectPlaceholder = computed(() => `Choose ${taskSelectLabel.value.toLowerCase()}...`)

function onSelectTask(taskId: string) {
  if (taskId) {
    store.setLaneTask(props.laneType, taskId)
  }
}

function selectSkill(skillId: SkillId) {
  if (selectedSkillId.value === skillId && lane.value.taskId) return

  const nextTask = firstUnlockedTask(skillId)
  if (nextTask) {
    store.setLaneTask(props.laneType, nextTask.id)
  }
}

function firstUnlockedTask(skillId: SkillId): TaskDefinition | null {
  return tasksForSkill(skillId).find((t) => store.getSkillLevel(t.skillId) >= t.levelRequired) ?? null
}

function hasUnlockedTasks(skillId: SkillId): boolean {
  return firstUnlockedTask(skillId) !== null
}

function tasksForSkill(skillId: SkillId): TaskDefinition[] {
  return selectableTasks.value.filter((t) => t.skillId === skillId)
}

function skillTabTitle(skillId: SkillId): string {
  const firstLockedTask = tasksForSkill(skillId)[0]
  if (hasUnlockedTasks(skillId) || !firstLockedTask) return `Choose ${SKILLS[skillId].name}`
  return `${SKILLS[skillId].name} unlocks at level ${firstLockedTask.levelRequired}`
}

function taskSelectorLabel(skillId: SkillId): string {
  switch (skillId) {
    case 'mining': return 'Ore'
    case 'woodcutting': return 'Tree'
    case 'fishing': return 'Fishing spot'
    case 'farming': return 'Crop'
    case 'cooking': return 'Recipe'
    case 'smithing': return 'Project'
    case 'combat': return 'Target'
    default: return 'Task'
  }
}

function taskChoiceLabel(taskDef: TaskDefinition): string {
  switch (taskDef.id) {
    case 'mine_copper': return 'Copper'
    case 'mine_tin': return 'Tin'
    case 'mine_iron': return 'Iron'
    case 'mine_coal': return 'Coal'
    case 'chop_oak': return 'Oak'
    case 'chop_willow': return 'Willow'
    case 'chop_maple': return 'Maple'
    case 'fish_shrimp': return 'Shallow Coast'
    case 'fish_trout': return 'Cold Stream'
    case 'fish_salmon': return 'River Bend'
    case 'grow_potato': return 'Potato Patch'
    case 'grow_onion': return 'Onion Plot'
    case 'grow_tomato': return 'Tomato Bed'
    case 'grow_wheat': return 'Wheat Field'
    default: return taskDef.name
  }
}
</script>

<style scoped>
.passive-panel {
  padding: 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all var(--transition-fast);
}
.passive-panel:hover {
  border-color: var(--color-border-hover);
}

.passive-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.passive-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.passive-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.passive-dot-idle {
  background: #fbbf24;
  box-shadow: 0 0 6px rgba(251, 191, 36, 0.4);
}
.passive-dot-background {
  background: #a78bfa;
  box-shadow: 0 0 6px rgba(167, 139, 250, 0.4);
}

.passive-rate {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.passive-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.passive-task-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.passive-icon-ring {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid var(--color-border-hover);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--color-accent);
  position: relative;
}

.passive-icon-level {
  font-size: 8px;
  font-weight: 700;
  color: var(--color-text-muted);
  position: absolute;
  bottom: -2px;
  background: var(--color-bg-card);
  padding: 0 3px;
  border-radius: 2px;
}

.passive-details {
  flex: 1;
  min-width: 0;
}

.passive-task-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.passive-xp-row {
  font-size: 11px;
  color: var(--color-text-muted);
}

.passive-progress-pct {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
  min-width: 36px;
  text-align: right;
}

.passive-progress-bar {
  height: 6px;
  background: var(--color-bg-elevated);
  border-radius: 3px;
  overflow: hidden;
}

.passive-progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.1s linear;
}
.passive-fill-idle {
  background: linear-gradient(90deg, #d97706, #fbbf24);
}
.passive-fill-background {
  background: linear-gradient(90deg, #7c3aed, #a78bfa);
}

.passive-xp-bar {
  height: 3px;
  background: var(--color-bg-elevated);
  border-radius: 2px;
  overflow: hidden;
}
.passive-xp-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.passive-selector {
  padding-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.passive-skill-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.passive-skill-tab {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 9px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-surface);
  color: var(--color-text-secondary);
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.passive-skill-tab:hover:not(:disabled) {
  border-color: var(--color-border-hover);
  color: var(--color-text-primary);
  background: var(--color-bg-card-hover);
}
.passive-skill-tab:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.passive-skill-tab-active {
  border-color: var(--color-accent);
  color: var(--color-accent-light);
  background: var(--color-accent-glow);
}
.passive-skill-tab small {
  color: var(--color-text-muted);
  font-size: 10px;
}

.passive-select-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.passive-select {
  width: 100%;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-surface);
  color: var(--color-text-secondary);
  font-family: var(--font-body);
  font-size: 12px;
  outline: none;
  cursor: pointer;
}
.passive-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.passive-select:focus {
  border-color: var(--color-accent);
}
.passive-select option {
  background: var(--color-bg-surface);
  color: var(--color-text-secondary);
}

.passive-empty {
  font-size: 12px;
  color: var(--color-text-muted);
  text-align: center;
  padding: 8px;
}
</style>
