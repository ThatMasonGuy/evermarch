<template>
  <div class="active-page">
    <div class="active-skill-selector" v-if="selectableSkills.length > 0">
      <SkillSelectorRail
        :items="activeSkillSelectorItems"
        ariaLabel="Active skill"
        @select="selectSkill"
      />
    </div>

    <div class="active-workbench">
      <section class="active-core" :class="{ 'active-core-mining': task?.skillId === 'mining' }">
        <ActiveMiningPanel
          v-if="task && task.skillId === 'mining'"
          :task="task"
          :skill-level="skillLevel"
          :skill-progress="skillProgress"
          :xp-to-next="xpToNext"
          :mastery-level="masteryLevel"
          :is-task-mastered="isTaskMastered"
          :active-pace-label="activePaceLabel"
          :active-pace-percent="activePacePercent"
          :active-progress-label="activeProgressLabel"
          :active-target-label="activeTargetLabel"
        />

        <template v-else>
        <div class="active-header">
          <h2 class="active-title" v-if="task">{{ task.name }}</h2>
          <h2 class="active-title active-title-empty" v-else>No Active Task</h2>
        </div>

        <div v-if="task" class="active-voxel-scene" :class="`active-voxel-scene-${task.skillId}`">
          <div class="active-voxel-sky">
            <span class="active-voxel-sun"></span>
            <span class="active-voxel-cloud active-voxel-cloud-a"></span>
            <span class="active-voxel-cloud active-voxel-cloud-b"></span>
          </div>
          <div class="active-voxel-focus">
            <img v-if="materialSprite" :src="materialSprite" alt="" class="active-voxel-material" />
            <img v-if="actionSprite" :src="actionSprite" alt="" class="active-voxel-tool" />
          </div>
          <div class="active-voxel-ground" aria-hidden="true">
            <span
              v-for="index in 8"
              :key="index"
              class="active-voxel-block"
              :style="{ backgroundImage: `url(${sceneTileSprite})` }"
            ></span>
          </div>
        </div>

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
          <span v-if="actionSprite" class="active-action-sprite">
            <img :src="actionSprite" alt="" />
          </span>
          <template v-else>
            <Pickaxe v-if="task.skillId === 'mining'" :size="20" />
            <TreePine v-else-if="task.skillId === 'woodcutting'" :size="20" />
            <Fish v-else-if="task.skillId === 'fishing'" :size="20" />
            <FlameKindling v-else-if="task.skillId === 'firemaking' || task.skillId === 'cooking'" :size="20" />
            <Hammer v-else-if="task.skillId === 'smithing' || task.skillId === 'fletching' || task.skillId === 'crafting'" :size="20" />
            <BookOpen v-else-if="task.skillId === 'runecrafting'" :size="20" />
            <Sprout v-else :size="20" />
          </template>
          <span>{{ actionLabel }}</span>
        </button>
        <p class="active-blocked-hint" v-if="hasCostBlockers">
          Waiting for {{ missingCostLabel }}.
        </p>

        <div v-if="!task" class="active-empty">
          <p>Select an unlocked active skill to begin.</p>
        </div>
        </template>
      </section>

      <aside class="active-task-select" v-if="selectableSkills.length > 0">
        <div class="active-task-select-top">
          <div>
            <span class="active-task-select-label">Skill options</span>
            <h3 class="active-task-select-title">{{ taskSelectLabel }}</h3>
          </div>
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
        <span class="active-task-count">
          {{ unlockedTasksForSelectedSkill.length }} / {{ tasksForSelectedSkill.length }} unlocked
        </span>
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
              <span v-if="t.id === lane.taskId" class="active-task-option-current-label">Current</span>
            </span>
            <span class="active-task-option-meta">
              <span class="active-task-option-requirement">
                <Lock v-if="!canUseTask(t)" :size="11" />
                Lv.{{ t.levelRequired }}
              </span>
              <span :class="{ 'active-task-option-mastered': store.isTaskMastered(t.id) }">
                {{ taskMasteryLabel(t) }}
              </span>
            </span>
            <span class="active-task-mastery-bar" :title="`${Math.round(store.getTaskMasteryProgress(t.id) * 100)}% through this mastery level`">
              <span
                class="active-task-mastery-fill"
                :style="{ width: masteryProgressWidth(t.id) }"
              ></span>
            </span>
          </button>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ArrowUpRight, BookOpen, FlameKindling, Fish, Hammer, Lock, Pickaxe, Sprout, TreePine, Trophy } from 'lucide-vue-next'
import ActiveMiningPanel from './ActiveMiningPanel.vue'
import SkillSelectorRail from './SkillSelectorRail.vue'
import { useGameStore } from '../stores/gameStore'
import { ALL_TASKS, getTaskById, type TaskDefinition } from '../data/tasks'
import { SKILLS, SKILL_LIST, type SkillId } from '../data/skills'
import { getResourceDefinition } from '../data/resources'
import {
  ACTIVE_ONE_X_MIN_CLICKS_PER_SECOND,
  ACTIVE_PEAK_CLICKS_PER_SECOND,
  ACTIVE_TWO_X_MIN_CLICKS_PER_SECOND,
  activeSpeedMultiplierForClickGap,
  MAX_ACTIVE_SPEED_MULTIPLIER,
  performActiveAction,
} from '../engine/gameEngine'
import { formatCostReadiness, getCostReadiness, hasMissingCosts } from '../utils/taskCosts'
import { TILE_SPRITES, spriteForResource, spriteForSkill } from '../assets/visualAssets'

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
const actionSprite = computed(() => task.value ? spriteForSkill(task.value.skillId) : null)
const materialSprite = computed(() => {
  const drop = task.value?.drops[0]
  return drop ? spriteForResource(drop.resourceId, getResourceDefinition(drop.resourceId).category) : null
})
const sceneTileSprite = computed(() => {
  switch (task.value?.skillId) {
    case 'mining':
    case 'smithing':
    case 'runecrafting':
      return TILE_SPRITES.stoneCoal
    case 'woodcutting':
    case 'firemaking':
    case 'fletching':
      return TILE_SPRITES.trunkSide
    case 'fishing':
      return TILE_SPRITES.water
    case 'farming':
      return TILE_SPRITES.grassTop
    case 'cooking':
    case 'crafting':
      return TILE_SPRITES.wood
    default:
      return TILE_SPRITES.dirtGrass
  }
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

const activeSkillSelectorItems = computed(() =>
  selectableSkills.value.map((skill) => ({
    id: skill.id,
    name: skill.name,
    level: store.getSkillLevel(skill.id),
    progress: store.getSkillProgress(skill.id),
    color: skill.color,
    icon: skill.icon,
    sprite: spriteForSkill(skill.id),
    disabled: !hasUnlockedTasks(skill.id),
    selected: skill.id === selectedSkillId.value,
    title: skillTabTitle(skill.id),
  }))
)

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

function masteryProgressWidth(taskId: string): string {
  if (store.isTaskMastered(taskId)) return '100%'
  return `${Math.round(store.getTaskMasteryProgress(taskId) * 100)}%`
}

function formatNumber(value: number): string {
  return Math.floor(value).toLocaleString()
}

function formatRate(value: number): string {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)
}

</script>

<style scoped>
.active-page {
  --active-page-shell-offset: 82px;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
  min-height: 0;
  height: calc(100dvh - var(--active-page-shell-offset));
}

.active-skill-selector {
  min-width: 0;
}

.active-workbench {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(230px, 280px);
  gap: 14px;
  height: 100%;
  min-height: 0;
}

.active-core {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 18px;
  border-radius: var(--radius-lg);
  border: 2px solid var(--em-block-border);
  background:
    linear-gradient(180deg, rgba(142, 202, 230, 0.08), transparent 52%),
    rgba(0, 0, 0, 0.12);
  box-shadow:
    inset 0 2px 0 var(--em-block-highlight),
    inset 0 -5px 0 rgba(0, 0, 0, 0.16);
  overflow: hidden;
}

.active-core-mining {
  align-items: stretch;
  justify-content: stretch;
  gap: 0;
  padding: 0;
  background: rgba(0, 0, 0, 0.16);
}

.active-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.active-title {
  font-family: var(--font-display);
  font-size: clamp(22px, 3vw, 34px);
  font-weight: 700;
  color: var(--color-text-primary);
  text-align: center;
  overflow-wrap: anywhere;
}

.active-title-empty {
  color: var(--color-text-muted);
}

.active-voxel-scene {
  width: min(100%, 620px);
  height: clamp(180px, 28vh, 300px);
  position: relative;
  overflow: hidden;
  border: 2px solid var(--em-block-border);
  border-radius: var(--radius-md);
  background: linear-gradient(180deg, var(--em-sky) 0%, var(--em-sky-light) 68%, var(--em-dirt) 69%);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.28),
    inset 0 -4px 0 rgba(0, 0, 0, 0.18);
}

.active-voxel-scene-mining,
.active-voxel-scene-smithing,
.active-voxel-scene-runecrafting {
  background: linear-gradient(180deg, #5f7180 0%, #91a5ae 56%, #3f4642 57%);
}

.active-voxel-scene-fishing {
  background: linear-gradient(180deg, var(--em-sky) 0%, var(--em-sky-light) 48%, var(--em-water) 49%);
}

.active-voxel-sky {
  position: absolute;
  inset: 0 0 46px;
}

.active-voxel-sun {
  position: absolute;
  top: 18px;
  right: 34px;
  width: 28px;
  height: 28px;
  background: #f6d36b;
  border: 2px solid rgba(104, 76, 18, 0.28);
  box-shadow: inset -3px -3px 0 rgba(125, 87, 20, 0.18);
}

.active-voxel-cloud {
  position: absolute;
  height: 12px;
  background: rgba(255, 255, 255, 0.74);
  box-shadow:
    12px 0 0 rgba(255, 255, 255, 0.74),
    24px 0 0 rgba(255, 255, 255, 0.74),
    12px -8px 0 rgba(255, 255, 255, 0.68);
}

.active-voxel-cloud-a {
  top: 42px;
  left: 38px;
  width: 12px;
}

.active-voxel-cloud-b {
  top: 26px;
  left: 188px;
  width: 10px;
  opacity: 0.58;
}

.active-voxel-focus {
  position: absolute;
  left: 50%;
  bottom: 42px;
  width: 190px;
  height: 120px;
  transform: translateX(-50%);
}

.active-voxel-material,
.active-voxel-tool {
  position: absolute;
  object-fit: contain;
  filter: drop-shadow(0 5px 0 rgba(0, 0, 0, 0.24));
}

.active-voxel-material {
  left: 5px;
  bottom: 0;
  width: 92px;
  height: 92px;
}

.active-voxel-tool {
  right: 4px;
  top: 3px;
  width: 92px;
  height: 92px;
  transform: rotate(-16deg);
}

.active-voxel-ground {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  height: 46px;
}

.active-voxel-block {
  min-width: 0;
  background-repeat: repeat;
  background-size: 46px 46px;
  border-top: 2px solid rgba(255, 255, 255, 0.16);
}

.active-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 560px;
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
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.active-xp-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--em-grass-dark), var(--em-grass));
  border-radius: var(--radius-sm);
  transition: width 0.3s ease;
}

.active-xp-text {
  font-size: 11px;
  color: var(--color-text-muted);
  text-align: center;
}

.active-rates {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
  gap: 6px;
  width: 100%;
  max-width: 560px;
}

.active-rate {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  min-height: 34px;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: rgba(0, 0, 0, 0.12);
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
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: rgba(0, 0, 0, 0.12);
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
  border-radius: var(--radius-sm);
  background: var(--color-bg-elevated);
  overflow: hidden;
}

.active-pace-fill {
  height: 100%;
  border-radius: var(--radius-sm);
  background: linear-gradient(90deg, var(--em-gold), var(--em-grass));
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
  width: min(100%, 420px);
  min-height: 58px;
  padding: 12px 24px;
  border-radius: var(--radius-md);
  border: 2px solid var(--em-block-border);
  background: linear-gradient(
    180deg,
    rgba(139, 195, 74, 0.22) 0%,
    rgba(79, 159, 69, 0.18) 100%
  );
  color: var(--color-text-primary);
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.15s ease;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  box-shadow: 0 5px 0 var(--em-block-shadow);
}

.active-action-btn:hover {
  background: linear-gradient(
    180deg,
    rgba(139, 195, 74, 0.32) 0%,
    rgba(79, 159, 69, 0.22) 100%
  );
  box-shadow: 0 5px 0 var(--em-block-shadow), 0 0 0 2px rgba(246, 211, 107, 0.12);
}

.active-action-btn:active,
.active-action-btn-pressed {
  transform: translateY(3px);
  background: linear-gradient(
    180deg,
    rgba(139, 195, 74, 0.38) 0%,
    rgba(79, 159, 69, 0.26) 100%
  );
  box-shadow: 0 2px 0 var(--em-block-shadow);
}

.active-action-sprite {
  width: 25px;
  height: 25px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.active-action-sprite img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
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
  gap: 10px;
  width: 100%;
  min-width: 0;
  min-height: 0;
  height: 100%;
  max-height: 100%;
  padding: 12px;
  border: 2px solid var(--em-block-border);
  border-radius: var(--radius-lg);
  background: rgba(0, 0, 0, 0.14);
  box-shadow:
    inset 0 2px 0 var(--em-block-highlight),
    inset 0 -5px 0 rgba(0, 0, 0, 0.14);
  overflow: hidden;
}

.active-task-select-label {
  font-size: 11px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0;
}

.active-current-summary {
  color: var(--color-accent-light);
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.active-task-select-title {
  margin-top: 2px;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.active-task-select-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  flex-shrink: 0;
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
  line-height: 1.3;
  flex-shrink: 0;
}

.active-task-upgrade {
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-hover);
  background: var(--color-bg-surface);
  color: var(--color-accent-light);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.active-task-upgrade:hover {
  border-color: var(--color-accent);
  background: var(--color-accent-glow);
}

.active-task-options {
  display: grid;
  grid-template-columns: 1fr;
  align-content: start;
  gap: 8px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 2px 4px 2px 0;
}

.active-task-option {
  min-height: 58px;
  padding: 9px 10px 13px;
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
  position: relative;
  overflow: hidden;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
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
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.active-task-option-current-label {
  flex-shrink: 0;
  padding: 1px 5px;
  border-radius: var(--radius-sm);
  background: var(--color-accent-glow);
  color: var(--color-accent-light);
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
}

.active-task-option-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 10px;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.active-task-option-requirement {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.active-task-option-mastered {
  color: #fde68a;
}

.active-task-mastery-bar {
  position: absolute;
  left: -1px;
  right: -1px;
  bottom: -1px;
  height: 5px;
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
  background: rgba(0, 0, 0, 0.42);
  overflow: hidden;
}

.active-task-mastery-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #d97706, #fbbf24, #fde68a);
  box-shadow: 0 -1px 8px rgba(253, 230, 138, 0.42);
  transition: width 0.3s ease;
}

.active-empty {
  padding: 20px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 14px;
}

@media (max-width: 900px) {
  .active-page {
    display: flex;
    flex-direction: column;
    height: auto;
    min-height: 0;
  }

  .active-workbench {
    grid-template-columns: 1fr;
    min-height: 0;
    height: auto;
  }

  .active-task-select {
    max-height: 320px;
  }

}

@media (max-width: 560px) {
  .active-core {
    padding: 14px 10px;
  }

  .active-voxel-scene {
    height: 178px;
  }

  .active-rates {
    grid-template-columns: 1fr;
  }

  .active-task-select-top {
    align-items: flex-start;
    flex-direction: column;
  }

  .active-task-upgrade {
    width: 100%;
  }

  .active-task-option {
    min-height: 56px;
  }
}
</style>
