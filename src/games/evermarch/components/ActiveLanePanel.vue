<template>
  <div class="active-panel">
    <div class="active-core">
      <!-- Header -->
      <div class="active-header">
        <div class="active-label">
          <div class="active-label-dot"></div>
          <span>Active</span>
        </div>
        <h2 class="active-title" v-if="task">{{ task.name }}</h2>
        <h2 class="active-title active-title-empty" v-else>No Active Task</h2>
      </div>

      <!-- Skill Level + XP -->
      <div class="active-meta" v-if="task && skillDef">
        <div class="active-badge-row">
          <div class="active-skill-badge">
            <span class="active-skill-name">{{ skillDef.name }} Lv.{{ skillLevel }}</span>
          </div>
          <div
            class="active-mastery-badge"
            :class="{ 'active-mastery-badge-complete': isTaskMastered }"
          >
            <Trophy :size="12" />
            <span>Mastery Lv.{{ masteryLevel }}</span>
          </div>
        </div>
        <div class="active-xp-bar-container">
          <div class="active-xp-bar">
            <div
              class="active-xp-bar-fill"
              :style="{ width: (skillProgress * 100) + '%' }"
            ></div>
          </div>
          <span class="active-xp-text">Skill: {{ formatNumber(xpToNext) }} XP to next</span>
        </div>
      </div>

      <!-- Rates Display -->
      <div class="active-rates" v-if="task">
        <div class="active-rate">
          <span class="active-rate-label">Routine Rate:</span>
          <span class="active-rate-value">+{{ task.drops[0]?.amount ?? 1 }} / {{ (task.baseInterval / 1000).toFixed(0) }}s</span>
        </div>
        <div class="active-rate active-rate-boosted">
          <span class="active-rate-label">Active Pace:</span>
          <span class="active-rate-value">{{ activePaceLabel }} / {{ maxActiveMultiplier }}x</span>
        </div>
        <div
          class="active-rate active-rate-cost"
          :class="{ 'active-rate-cost-blocked': hasCostBlockers }"
          v-if="costLabel"
        >
          <span class="active-rate-label">Requires:</span>
          <span class="active-rate-value">{{ costLabel }} / action</span>
        </div>
        <div class="active-pace" :title="activePaceTitle">
          <div class="active-pace-top">
            <span>Active rhythm</span>
            <strong>{{ activePacePercent }}%</strong>
          </div>
          <div class="active-pace-bar">
            <div
              class="active-pace-fill"
              :style="{ width: activePacePercent + '%' }"
            ></div>
          </div>
          <div class="active-pace-foot">
            <span>{{ activeProgressLabel }}</span>
            <span>{{ activeTargetLabel }}</span>
          </div>
        </div>
      </div>

      <!-- Action Button -->
      <button
        v-if="task"
        class="active-action-btn"
        :class="{
          'active-action-btn-pressed': isPressed,
          'active-action-btn-blocked': hasCostBlockers,
        }"
        :title="actionButtonTitle"
        @mousedown="onPress"
        @mouseup="isPressed = false"
        @mouseleave="isPressed = false"
        @click="onAction"
      >
        <Pickaxe v-if="task.skillId === 'mining'" :size="20" />
        <TreePine v-else-if="task.skillId === 'woodcutting'" :size="20" />
        <Fish v-else-if="task.skillId === 'fishing'" :size="20" />
        <FlameKindling v-else-if="task.skillId === 'firemaking' || task.skillId === 'cooking'" :size="20" />
        <Hammer v-else-if="task.skillId === 'smithing' || task.skillId === 'fletching' || task.skillId === 'crafting'" :size="20" />
        <BookOpen v-else-if="task.skillId === 'runecrafting'" :size="20" />
        <Sprout v-else :size="20" />
        <span>{{ actionLabel }}</span>
      </button>
      <p class="active-blocked-hint" v-if="hasCostBlockers">
        Waiting for {{ missingCostLabel }}.
      </p>
    </div>

    <!-- Task Selector -->
    <div class="active-task-select" v-if="selectableSkills.length > 0">
      <div class="active-task-select-top">
        <span class="active-task-select-label">Active skill</span>
        <button
          v-if="canUpgradeTask"
          type="button"
          class="active-task-upgrade"
          :title="upgradeTaskTitle"
          @click="selectBestTask"
        >
          <ArrowUpRight :size="12" />
          <span>Use {{ upgradeTaskLabel }}</span>
        </button>
      </div>
      <div class="active-skill-options" aria-label="Active skill">
        <button
          v-for="skill in selectableSkills"
          :key="skill.id"
          type="button"
          class="active-skill-option"
          :class="{ 'active-skill-option-current': skill.id === selectedSkillId }"
          :disabled="!hasUnlockedTasks(skill.id)"
          :title="skillTabTitle(skill.id)"
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
      <div class="active-task-select-row">
        <span class="active-task-select-label">{{ taskSelectLabel }}</span>
        <span class="active-task-count">{{ unlockedTasksForSelectedSkill.length }} / {{ tasksForSelectedSkill.length }} unlocked</span>
      </div>
      <div class="active-task-options" role="listbox" :aria-label="taskSelectLabel">
        <button
          v-for="t in tasksForSelectedSkill"
          :key="t.id"
          class="active-task-option"
          :class="{
            'active-task-option-current': t.id === lane.taskId,
            'active-task-option-locked': !canUseTask(t),
          }"
          :aria-selected="t.id === lane.taskId"
          :disabled="!canUseTask(t)"
          @click="selectTask(t.id)"
        >
          <span class="active-task-option-main">
            <span class="active-task-option-name">{{ taskChoiceLabel(t) }}</span>
            <Lock v-if="!canUseTask(t)" :size="12" />
          </span>
          <span class="active-task-option-meta">
            <span>Lv.{{ t.levelRequired }}</span>
            <span :class="{ 'active-task-option-mastered': store.isTaskMastered(t.id) }">
              {{ taskMasteryLabel(t) }}
            </span>
            <span v-if="t.id === lane.taskId">Current</span>
          </span>
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!task" class="active-empty">
      <p>Select a task from the Skills panel to begin active training.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ArrowUpRight, BookOpen, FlameKindling, Fish, Hammer, Lock, Pickaxe, Sprout, TreePine, Trophy } from 'lucide-vue-next'
import { useGameStore } from '../stores/gameStore'
import { ALL_TASKS, getTaskById, type TaskDefinition } from '../data/tasks'
import { SKILLS, SKILL_LIST, type SkillId } from '../data/skills'
import {
  ACTIVE_ONE_X_MIN_CLICKS_PER_SECOND,
  ACTIVE_PEAK_CLICKS_PER_SECOND,
  ACTIVE_TWO_X_MIN_CLICKS_PER_SECOND,
  activeSpeedMultiplierForClickGap,
  MAX_ACTIVE_SPEED_MULTIPLIER,
  performActiveAction,
} from '../engine/gameEngine'
import { formatCostReadiness, getCostReadiness, hasMissingCosts } from '../utils/taskCosts'

const store = useGameStore()
const isPressed = ref(false)
const nowMs = ref(Date.now())
let paceRefreshHandle: ReturnType<typeof setInterval> | null = null

const lane = computed(() => store.lanes.active)
const task = computed(() => lane.value.taskId ? getTaskById(lane.value.taskId) : null)
const skillDef = computed(() => task.value ? SKILLS[task.value.skillId] : null)
const skillLevel = computed(() => task.value ? store.getSkillLevel(task.value.skillId) : 0)
const skillProgress = computed(() => task.value ? store.getSkillProgress(task.value.skillId) : 0)
const xpToNext = computed(() => task.value ? store.getSkillXpToNext(task.value.skillId) : 0)
const masteryLevel = computed(() => task.value ? store.getTaskMasteryLevel(task.value.id) : 1)
const isTaskMastered = computed(() => task.value ? store.isTaskMastered(task.value.id) : false)
const costReadiness = computed(() => {
  if (!task.value?.costs?.length) return []
  return getCostReadiness(task.value.costs, store.getItemCount)
})
const costLabel = computed(() => formatCostReadiness(costReadiness.value))
const hasCostBlockers = computed(() => hasMissingCosts(costReadiness.value))
const missingCostLabel = computed(() => {
  return formatCostReadiness(costReadiness.value.filter((cost) => !cost.ready))
})
const actionButtonTitle = computed(() => {
  if (!hasCostBlockers.value) return ''
  return `Need ${missingCostLabel.value}`
})
const maxActiveMultiplier = MAX_ACTIVE_SPEED_MULTIPLIER
const activeDisplayGapMs = computed(() => {
  if (store.activeCadence.lastClickAt === null || store.activeCadence.clickGapMs === null) return null
  return Math.max(store.activeCadence.clickGapMs, nowMs.value - store.activeCadence.lastClickAt)
})
const activeDisplayMultiplier = computed(() => activeSpeedMultiplierForClickGap(activeDisplayGapMs.value))
const activePacePercent = computed(() => Math.round((activeDisplayMultiplier.value / MAX_ACTIVE_SPEED_MULTIPLIER) * 100))
const activePaceLabel = computed(() =>
  activeDisplayMultiplier.value > 0 ? `${activeDisplayMultiplier.value}x` : 'Stopped'
)
const activeProgressLabel = computed(() => {
  if (!task.value) return 'Action 0%'
  return `Action ${Math.floor(Math.min(100, (lane.value.progress / task.value.baseInterval) * 100))}%`
})
const activeTargetLabel = computed(() => `${formatRate(ACTIVE_PEAK_CLICKS_PER_SECOND)}+/s peak`)
const activePaceTitle = computed(() =>
  `Stopped below ${formatRate(ACTIVE_ONE_X_MIN_CLICKS_PER_SECOND)}/s. 1x from ${formatRate(ACTIVE_ONE_X_MIN_CLICKS_PER_SECOND)}-${formatRate(ACTIVE_TWO_X_MIN_CLICKS_PER_SECOND - 0.1)}/s, 2x from ${formatRate(ACTIVE_TWO_X_MIN_CLICKS_PER_SECOND)}-${formatRate(ACTIVE_PEAK_CLICKS_PER_SECOND - 0.1)}/s, 3x from ${formatRate(ACTIVE_PEAK_CLICKS_PER_SECOND)}+/s.`
)

onMounted(() => {
  paceRefreshHandle = setInterval(() => {
    nowMs.value = Date.now()
  }, 100)
})

onUnmounted(() => {
  if (paceRefreshHandle) {
    clearInterval(paceRefreshHandle)
    paceRefreshHandle = null
  }
})

const selectableTasks = computed(() => {
  return ALL_TASKS.filter((t) => t.allowedLanes.includes('active'))
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

const actionLabel = computed(() => {
  if (!task.value) return 'Action'
  switch (task.value.skillId) {
    case 'mining': return 'Mine'
    case 'woodcutting': return 'Chop'
    case 'fishing': return 'Fish'
    case 'firemaking': return 'Kindle'
    case 'cooking': return 'Cook'
    case 'smithing': return 'Forge'
    case 'fletching': return 'Shape'
    case 'crafting': return 'Craft'
    case 'runecrafting': return 'Bind'
    default: return 'Action'
  }
})

function onPress() {
  isPressed.value = true
}

function onAction() {
  performActiveAction()
}

function selectTask(taskId: string) {
  store.setLaneTask('active', taskId)
}

function canUseTask(taskDef: TaskDefinition): boolean {
  return store.getSkillLevel(taskDef.skillId) >= taskDef.levelRequired
}

function selectBestTask() {
  if (bestUnlockedTask.value) {
    selectTask(bestUnlockedTask.value.id)
  }
}

function selectSkill(skillId: SkillId) {
  if (selectedSkillId.value === skillId && lane.value.taskId) return

  const nextTask = bestUnlockedTaskForSkill(skillId)
  if (nextTask) {
    store.setLaneTask('active', nextTask.id)
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

function formatNumber(value: number): string {
  return Math.floor(value).toLocaleString()
}

function formatRate(value: number): string {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)
}

</script>

<style scoped>
.active-panel {
  display: grid;
  grid-template-columns: minmax(240px, 0.85fr) minmax(340px, 1.15fr);
  align-items: stretch;
  gap: 14px;
  padding: 14px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-accent);
  background: linear-gradient(
    180deg,
    rgba(52, 211, 153, 0.06) 0%,
    var(--color-bg-card) 40%,
    var(--color-bg-card) 100%
  );
  box-shadow:
    0 0 24px rgba(52, 211, 153, 0.08),
    inset 0 1px 0 rgba(52, 211, 153, 0.1);
  position: relative;
  overflow: hidden;
}

.active-core {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 6px 14px 6px 4px;
}

/* Decorative corner accents */
.active-panel::before,
.active-panel::after {
  content: '';
  position: absolute;
  width: 24px;
  height: 24px;
  border-color: var(--color-accent);
  opacity: 0.3;
}
.active-panel::before {
  top: 8px;
  left: 8px;
  border-top: 2px solid;
  border-left: 2px solid;
}
.active-panel::after {
  bottom: 8px;
  right: 8px;
  border-bottom: 2px solid;
  border-right: 2px solid;
}

.active-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.active-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 12px;
  border-radius: 999px;
  background: rgba(52, 211, 153, 0.12);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
  color: var(--color-accent-light);
}

.active-label-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-accent);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; box-shadow: 0 0 6px var(--color-accent); }
}

.active-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-primary);
  text-align: center;
  overflow-wrap: anywhere;
}

.active-title-empty {
  color: var(--color-text-muted);
}

.active-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 380px;
}

.active-badge-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  flex-wrap: wrap;
}

.active-skill-badge,
.active-mastery-badge {
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
}

.active-skill-badge {
  color: var(--color-accent-light);
}

.active-mastery-badge {
  border: 1px solid rgba(253, 230, 138, 0.24);
  background: rgba(253, 230, 138, 0.08);
  color: #fde68a;
}

.active-mastery-badge-complete {
  border-color: rgba(253, 230, 138, 0.52);
  background: rgba(253, 230, 138, 0.14);
}

.active-xp-bar-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.active-xp-bar {
  height: 6px;
  background: var(--color-bg-elevated);
  border-radius: 3px;
  overflow: hidden;
}

.active-xp-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent-dim), var(--color-accent));
  border-radius: 3px;
  transition: width 0.3s ease;
}

.active-xp-text {
  font-size: 11px;
  color: var(--color-text-muted);
  text-align: center;
}

.active-rates {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  width: 100%;
  max-width: 360px;
}

.active-rate {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  font-size: 13px;
}

.active-rate-label {
  color: var(--color-text-muted);
}

.active-rate-value {
  color: var(--color-text-secondary);
  font-weight: 600;
}

.active-rate-boosted .active-rate-value {
  color: var(--color-accent-light);
}
.active-rate-cost .active-rate-value {
  color: #86efac;
}
.active-rate-cost-blocked .active-rate-value {
  color: #fca5a5;
}

.active-pace {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-top: 2px;
}

.active-pace-top,
.active-pace-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.active-pace-top {
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.active-pace-top strong {
  color: var(--color-accent-light);
  font-size: 12px;
}

.active-pace-bar {
  height: 7px;
  border-radius: 999px;
  background: var(--color-bg-elevated);
  overflow: hidden;
}

.active-pace-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #fbbf24, var(--color-accent));
  transition: width 0.16s ease;
}

.active-pace-foot {
  color: var(--color-text-muted);
  font-size: 11px;
}

/* Action Button */
.active-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: min(100%, 320px);
  min-height: 44px;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-accent);
  background: linear-gradient(
    180deg,
    rgba(52, 211, 153, 0.15) 0%,
    rgba(52, 211, 153, 0.06) 100%
  );
  color: var(--color-accent-light);
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
  -webkit-user-select: none;
}

.active-action-btn:hover {
  background: linear-gradient(
    180deg,
    rgba(52, 211, 153, 0.25) 0%,
    rgba(52, 211, 153, 0.1) 100%
  );
  box-shadow: 0 0 20px rgba(52, 211, 153, 0.2);
}

.active-action-btn:active,
.active-action-btn-pressed {
  transform: scale(0.97);
  background: linear-gradient(
    180deg,
    rgba(52, 211, 153, 0.3) 0%,
    rgba(52, 211, 153, 0.12) 100%
  );
  box-shadow: 0 0 24px rgba(52, 211, 153, 0.3);
}

.active-action-btn-blocked {
  border-color: rgba(248, 113, 113, 0.75);
  color: #fecaca;
  background: linear-gradient(
    180deg,
    rgba(248, 113, 113, 0.16) 0%,
    rgba(248, 113, 113, 0.06) 100%
  );
}

.active-action-btn-blocked:hover {
  background: linear-gradient(
    180deg,
    rgba(248, 113, 113, 0.22) 0%,
    rgba(248, 113, 113, 0.1) 100%
  );
  box-shadow: 0 0 20px rgba(248, 113, 113, 0.18);
}

.active-blocked-hint {
  margin-top: -12px;
  max-width: 360px;
  text-align: center;
  color: #fecaca;
  font-size: 12px;
  line-height: 1.4;
}

/* Task Selector */
.active-task-select {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  width: 100%;
  min-width: 0;
  padding-left: 16px;
  border-left: 1px solid var(--color-border);
}

.active-task-select-label {
  font-size: 11px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0;
}

.active-task-select-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.active-task-select-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.active-task-count {
  color: var(--color-text-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.active-task-upgrade {
  min-height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(52, 211, 153, 0.45);
  background: rgba(52, 211, 153, 0.1);
  color: var(--color-accent-light);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.active-task-upgrade:hover {
  border-color: var(--color-accent);
  background: var(--color-accent-glow);
}

.active-task-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 4px;
  max-height: 140px;
  overflow-y: auto;
  padding-right: 4px;
}

.active-skill-options {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.active-skill-option {
  flex: 0 0 auto;
  min-height: 34px;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  gap: 6px;
}
.active-skill-option:hover:not(:disabled) {
  border-color: var(--color-border-hover);
  color: var(--color-text-primary);
}
.active-skill-option:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.active-skill-option-current {
  border-color: var(--color-accent);
  background: var(--color-accent-glow);
  color: var(--color-accent-light);
}
.active-skill-option small {
  color: var(--color-text-muted);
  font-size: 10px;
}

.active-task-option {
  min-height: 48px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: space-between;
  gap: 6px;
  text-align: left;
  min-width: 0;
}
.active-task-option:hover:not(:disabled) {
  border-color: var(--color-border-hover);
  color: var(--color-text-primary);
}
.active-task-option:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.active-task-option-current {
  border-color: var(--color-accent);
  background: var(--color-accent-glow);
  color: var(--color-accent-light);
}

.active-task-option-locked {
  background: var(--color-bg-surface);
}

.active-task-option-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}

.active-task-option-name {
  overflow-wrap: anywhere;
}

.active-task-option-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 10px;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.active-task-option-mastered {
  color: #fde68a;
}

.active-empty {
  padding: 20px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 14px;
}

@media (max-width: 900px) {
  .active-panel {
    grid-template-columns: 1fr;
  }

  .active-task-select {
    padding-left: 0;
    padding-top: 12px;
    border-left: none;
    border-top: 1px solid var(--color-border);
  }
}
</style>
