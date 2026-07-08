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
          <FlameKindling v-else-if="task.skillId === 'firemaking' || task.skillId === 'cooking'" :size="20" />
          <Hammer v-else-if="task.skillId === 'smithing' || task.skillId === 'fletching' || task.skillId === 'crafting'" :size="20" />
          <BookOpen v-else-if="task.skillId === 'runecrafting'" :size="20" />
          <Hammer v-else :size="20" />
          <span class="passive-icon-level">Lv{{ skillLevel }}</span>
        </div>
        <div class="passive-details">
          <div class="passive-task-name">{{ task.name }}</div>
          <div class="passive-xp-row">
            <span>+{{ task.xpPerAction }} XP / action</span>
            <span
              class="passive-mastery-chip"
              :class="{ 'passive-mastery-chip-complete': isTaskMastered }"
            >
              <Trophy :size="10" />
              Mastery Lv.{{ masteryLevel }}
            </span>
          </div>
          <div
            class="passive-cost-row"
            :class="{
              'passive-cost-row-ready': costReadiness.length > 0 && !hasCostBlockers,
              'passive-cost-row-blocked': hasCostBlockers,
            }"
            v-if="costLabel"
          >
            {{ costStatusLabel }} {{ costLabel }} / action
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
          <BookOpen v-else-if="skill.icon === 'BookOpen'" :size="14" />
          <Hammer v-else :size="14" />
          <span>{{ skill.name }}</span>
          <small>Lv.{{ store.getSkillLevel(skill.id) }}</small>
        </button>
      </div>

      <div class="passive-select-row">
        <span class="passive-select-label">{{ taskSelectLabel }}</span>
        <span class="passive-task-count">{{ unlockedTasksForSelectedSkill.length }} / {{ tasksForSelectedSkill.length }} unlocked</span>
        <button
          v-if="canUpgradeTask"
          type="button"
          class="passive-task-upgrade"
          :title="upgradeTaskTitle"
          @click="selectBestTask"
        >
          <ArrowUpRight :size="12" />
          <span>Use {{ upgradeTaskLabel }}</span>
        </button>
      </div>
      <div class="passive-task-options" role="listbox" :aria-label="taskSelectLabel">
        <button
          v-for="t in tasksForSelectedSkill"
          :key="t.id"
          type="button"
          class="passive-task-option"
          :class="{
            'passive-task-option-current': t.id === lane.taskId,
            'passive-task-option-locked': !canUseTask(t),
          }"
          :aria-selected="t.id === lane.taskId"
          :disabled="!canUseTask(t)"
          @click="selectTask(t.id)"
        >
          <span class="passive-task-option-name">{{ taskChoiceLabel(t) }}</span>
          <span class="passive-task-option-meta">
            <span>Lv.{{ t.levelRequired }}</span>
            <span :class="{ 'passive-task-option-mastered': store.isTaskMastered(t.id) }">
              {{ taskMasteryLabel(t) }}
            </span>
            <Lock v-if="!canUseTask(t)" :size="11" />
            <span v-else-if="t.id === lane.taskId">Current</span>
          </span>
        </button>
      </div>
    </div>

    <div v-if="!task" class="passive-empty">
      No task assigned.
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUpRight, BookOpen, Pickaxe, TreePine, Fish, Sprout, FlameKindling, Hammer, Lock, Trophy } from 'lucide-vue-next'
import { useGameStore } from '../stores/gameStore'
import { getTaskById, ALL_TASKS, type TaskDefinition } from '../data/tasks'
import { SKILLS, SKILL_LIST, type SkillId } from '../data/skills'
import { formatCostReadiness, getCostReadiness, hasMissingCosts } from '../utils/taskCosts'

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
const masteryLevel = computed(() => task.value ? store.getTaskMasteryLevel(task.value.id) : 1)
const isTaskMastered = computed(() => task.value ? store.isTaskMastered(task.value.id) : false)
const costReadiness = computed(() => {
  if (!task.value?.costs?.length) return []
  return getCostReadiness(task.value.costs, store.getItemCount)
})
const costLabel = computed(() => formatCostReadiness(costReadiness.value))
const hasCostBlockers = computed(() => hasMissingCosts(costReadiness.value))
const costStatusLabel = computed(() => hasCostBlockers.value ? 'Waiting for' : 'Ready with')

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
const unlockedTasksForSelectedSkill = computed(() => tasksForSelectedSkill.value.filter(canUseTask))
const bestUnlockedTask = computed(() => {
  if (!selectedSkillId.value) return null
  return bestUnlockedTaskForSkill(selectedSkillId.value)
})
const canUpgradeTask = computed(() => {
  return !!bestUnlockedTask.value && bestUnlockedTask.value.id !== lane.value.taskId
})
const upgradeTaskLabel = computed(() => bestUnlockedTask.value ? taskChoiceLabel(bestUnlockedTask.value) : '')
const upgradeTaskTitle = computed(() => upgradeTaskLabel.value ? `Use best unlocked task: ${upgradeTaskLabel.value}` : '')

const taskSelectLabel = computed(() =>
  selectedSkillId.value ? taskSelectorLabel(selectedSkillId.value) : 'Task'
)

function selectTask(taskId: string) {
  store.setLaneTask(props.laneType, taskId)
}

function canUseTask(taskDef: TaskDefinition): boolean {
  return store.getSkillLevel(taskDef.skillId) >= taskDef.levelRequired
}

function selectBestTask() {
  if (bestUnlockedTask.value) {
    store.setLaneTask(props.laneType, bestUnlockedTask.value.id)
  }
}

function selectSkill(skillId: SkillId) {
  if (selectedSkillId.value === skillId && lane.value.taskId) return

  const nextTask = bestUnlockedTaskForSkill(skillId)
  if (nextTask) {
    store.setLaneTask(props.laneType, nextTask.id)
  }
}

function bestUnlockedTaskForSkill(skillId: SkillId): TaskDefinition | null {
  const unlockedTasks = tasksForSkill(skillId).filter((t) => store.getSkillLevel(t.skillId) >= t.levelRequired)
  return unlockedTasks[unlockedTasks.length - 1] ?? null
}

function hasUnlockedTasks(skillId: SkillId): boolean {
  return bestUnlockedTaskForSkill(skillId) !== null
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
    case 'firemaking': return 'Fire'
    case 'farming': return 'Crop'
    case 'cooking': return 'Recipe'
    case 'smithing': return 'Project'
    case 'fletching': return 'Fletching project'
    case 'crafting': return 'Craft'
    case 'runecrafting': return 'Rune'
    default: return 'Task'
  }
}

function taskChoiceLabel(taskDef: TaskDefinition): string {
  return taskDef.name.replace(/^(Mine|Chop|Fish|Kindle|Cook|Forge|Shape|Craft|Bind|Grow)\s+/, '')
}

function taskMasteryLabel(taskDef: TaskDefinition): string {
  return store.isTaskMastered(taskDef.id)
    ? 'Mastered'
    : `M.${store.getTaskMasteryLevel(taskDef.id)}`
}

</script>

<style scoped>
.passive-panel {
  min-width: 0;
  padding: 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all var(--transition-fast);
}
.passive-panel:hover {
  border-color: var(--color-border-hover);
}

.passive-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.passive-label {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.passive-label span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  width: 38px;
  height: 38px;
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.passive-xp-row {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  font-size: 11px;
  color: var(--color-text-muted);
}

.passive-mastery-chip {
  min-height: 18px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 5px;
  border-radius: var(--radius-sm);
  background: rgba(253, 230, 138, 0.08);
  color: #fde68a;
  font-size: 10px;
  font-weight: 700;
}

.passive-mastery-chip-complete {
  background: rgba(253, 230, 138, 0.14);
}

.passive-cost-row {
  font-size: 11px;
  color: var(--color-text-muted);
}
.passive-cost-row-ready {
  color: #86efac;
}
.passive-cost-row-blocked {
  color: #fca5a5;
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
  height: 5px;
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
  padding-top: 2px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.passive-skill-tabs {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.passive-skill-tab {
  flex: 0 0 auto;
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
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
  letter-spacing: 0;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.passive-select-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  flex-wrap: wrap;
}

.passive-task-count {
  color: var(--color-text-muted);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  margin-right: auto;
}

.passive-task-upgrade {
  min-height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 3px 7px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(52, 211, 153, 0.4);
  background: rgba(52, 211, 153, 0.08);
  color: var(--color-accent-light);
  font-family: var(--font-body);
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.passive-task-upgrade:hover {
  border-color: var(--color-accent);
  background: var(--color-accent-glow);
}

.passive-task-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(116px, 1fr));
  gap: 6px;
  max-height: 94px;
  overflow-y: auto;
  padding-right: 3px;
}

.passive-task-option {
  min-height: 44px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: space-between;
  gap: 4px;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-surface);
  color: var(--color-text-secondary);
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.passive-task-option:hover:not(:disabled) {
  border-color: var(--color-border-hover);
  color: var(--color-text-primary);
  background: var(--color-bg-card-hover);
}

.passive-task-option:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.passive-task-option-current {
  border-color: var(--color-accent);
  color: var(--color-accent-light);
  background: var(--color-accent-glow);
}

.passive-task-option-locked {
  background: var(--color-bg-elevated);
}

.passive-task-option-name {
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.25;
}

.passive-task-option-meta {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  color: var(--color-text-muted);
  font-size: 10px;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.passive-task-option-mastered {
  color: #fde68a;
}

.passive-empty {
  font-size: 12px;
  color: var(--color-text-muted);
  text-align: center;
  padding: 8px;
}
</style>
