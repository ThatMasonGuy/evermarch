<template>
  <div class="skills-panel">
    <div class="skills-header">
      <h2 class="skills-title">Skills</h2>
      <span class="skills-sub">Total Level: {{ store.totalLevel }}</span>
    </div>

    <div class="skills-grid">
      <div
        v-for="skill in skillData"
        :key="skill.id"
        class="skill-card"
        :class="{
          'skill-card-active': isInActiveLane(skill.id),
          'skill-card-idle': isInIdleLane(skill.id),
          'skill-card-background': isInBackgroundLane(skill.id),
        }"
      >
        <div class="skill-icon" :style="{ background: skill.def.color + '18', color: skill.def.color }">
          <Pickaxe v-if="skill.def.icon === 'Pickaxe'" :size="18" />
          <TreePine v-else-if="skill.def.icon === 'TreePine'" :size="18" />
          <Fish v-else-if="skill.def.icon === 'Fish'" :size="18" />
          <Sprout v-else-if="skill.def.icon === 'Sprout'" :size="18" />
          <FlameKindling v-else-if="skill.def.icon === 'FlameKindling'" :size="18" />
          <Hammer v-else-if="skill.def.icon === 'Hammer'" :size="18" />
          <Swords v-else-if="skill.def.icon === 'Swords'" :size="18" />
          <BookOpen v-else :size="18" />
        </div>
        <div class="skill-info">
          <div class="skill-title-row">
            <div class="skill-name">{{ skill.def.name }}</div>
            <div class="skill-title-meta">
              <div class="skill-level">Lv. {{ skill.level }}</div>
              <div v-if="skill.trueMastery" class="skill-true-mastery" title="Skill level 99 and every task mastered">
                <Trophy :size="10" />
                <span>True</span>
              </div>
            </div>
          </div>
          <div class="skill-bar">
            <div
              class="skill-bar-fill"
              :style="{ width: (skill.progress * 100) + '%', background: skill.def.color }"
            ></div>
          </div>
          <div class="skill-progression">
            <span class="skill-current">{{ skill.currentTaskLabel }}</span>
            <span class="skill-next">{{ skill.nextTaskLabel }}</span>
          </div>
          <div class="skill-unlocks">
            {{ skill.unlockedTaskCount }} / {{ skill.totalTaskCount }} tasks unlocked
          </div>
          <div class="skill-mastery-row">
            <span>Mastery {{ skill.masteredTaskCount }} / {{ skill.totalTaskCount }}</span>
            <span>Avg Lv. {{ skill.averageMasteryLevel }}</span>
          </div>
          <div class="skill-mastery-bar" :title="`${skill.masteryPercent}% task mastery`">
            <div
              class="skill-mastery-fill"
              :style="{ width: skill.masteryPercent + '%' }"
            ></div>
          </div>
          <div class="skill-actions">
            <button
              v-if="skill.canUseActive"
              type="button"
              class="skill-action-btn skill-action-active"
              :class="{ 'skill-action-current': isInActiveLane(skill.id) }"
              :disabled="!skill.currentTaskId"
              :title="laneActionTitle('Active', skill.currentTaskName)"
              :aria-label="laneActionLabel('Active', skill.def.name, skill.currentTaskName)"
              @click="assignLane('active', skill.currentTaskId)"
            >
              <MousePointerClick :size="12" />
              <span>Active</span>
            </button>
            <button
              v-if="skill.canUseIdle"
              type="button"
              class="skill-action-btn skill-action-idle"
              :class="{ 'skill-action-current': isInIdleLane(skill.id) }"
              :disabled="!skill.currentTaskId"
              :title="laneActionTitle('Routine', skill.currentTaskName)"
              :aria-label="laneActionLabel('Routine', skill.def.name, skill.currentTaskName)"
              @click="assignLane('idle', skill.currentTaskId)"
            >
              <Clock :size="12" />
              <span>Routine</span>
            </button>
            <button
              v-if="skill.canUseBackground"
              type="button"
              class="skill-action-btn skill-action-background"
              :class="{ 'skill-action-current': isInBackgroundLane(skill.id) }"
              :disabled="!skill.currentTaskId"
              :title="laneActionTitle('Background', skill.currentTaskName)"
              :aria-label="laneActionLabel('Background', skill.def.name, skill.currentTaskName)"
              @click="assignLane('background', skill.currentTaskId)"
            >
              <Sprout :size="12" />
              <span>Background</span>
            </button>
          </div>
        </div>
        <div class="skill-lane-badge" v-if="getLaneBadge(skill.id)">
          {{ getLaneBadge(skill.id) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BookOpen, Clock, Fish, FlameKindling, Hammer, MousePointerClick, Pickaxe, Sprout, Swords, TreePine, Trophy } from 'lucide-vue-next'
import { useGameStore } from '../stores/gameStore'
import { SKILL_LIST, type LaneType, type SkillId } from '../data/skills'
import { getTaskById, getTasksForSkill, type TaskDefinition } from '../data/tasks'

const store = useGameStore()

const skillData = computed(() =>
  SKILL_LIST.map((def) => {
    const level = store.getSkillLevel(def.id)
    const tasks = getTasksForSkill(def.id)
    const unlockedTasks = tasks.filter((task) => level >= task.levelRequired)
    const currentTask = unlockedTasks[unlockedTasks.length - 1] ?? null
    const nextTask = tasks.find((task) => level < task.levelRequired) ?? null
    const mastery = store.getSkillMasterySummary(def.id)

    return {
      id: def.id,
      def,
      level,
      progress: store.getSkillProgress(def.id),
      currentTaskLabel: currentTask ? `Current: ${taskChoiceLabel(currentTask)}` : 'No task unlocked',
      nextTaskLabel: nextTask ? `Next: ${taskChoiceLabel(nextTask)} at Lv. ${nextTask.levelRequired}` : 'All tasks unlocked',
      currentTaskId: currentTask?.id ?? null,
      currentTaskName: currentTask ? taskChoiceLabel(currentTask) : null,
      unlockedTaskCount: unlockedTasks.length,
      totalTaskCount: tasks.length,
      masteredTaskCount: mastery.masteredTasks,
      averageMasteryLevel: mastery.averageLevel,
      masteryPercent: mastery.percent,
      trueMastery: mastery.trueMastery,
      canUseActive: def.allowedLanes.includes('active'),
      canUseIdle: def.allowedLanes.includes('idle'),
      canUseBackground: def.allowedLanes.includes('background'),
    }
  })
)

function getActiveSkillId(): SkillId | null {
  const taskId = store.lanes.active.taskId
  if (!taskId) return null
  return getTaskById(taskId)?.skillId ?? null
}

function getIdleSkillId(): SkillId | null {
  const taskId = store.lanes.idle.taskId
  if (!taskId) return null
  return getTaskById(taskId)?.skillId ?? null
}

function getBackgroundSkillId(): SkillId | null {
  const taskId = store.lanes.background.taskId
  if (!taskId) return null
  return getTaskById(taskId)?.skillId ?? null
}

function isInActiveLane(id: SkillId): boolean { return getActiveSkillId() === id }
function isInIdleLane(id: SkillId): boolean { return getIdleSkillId() === id }
function isInBackgroundLane(id: SkillId): boolean { return getBackgroundSkillId() === id }

function getLaneBadge(id: SkillId): string | null {
  if (isInActiveLane(id)) return 'Active'
  if (isInIdleLane(id)) return 'Routine'
  if (isInBackgroundLane(id)) return 'Background'
  return null
}

function assignLane(laneType: LaneType, taskId: string | null) {
  if (!taskId) return
  store.setLaneTask(laneType, taskId)
}

function laneActionTitle(laneLabel: string, taskName: string | null): string {
  return taskName ? `Set ${laneLabel} to ${taskName}` : 'No unlocked task'
}

function laneActionLabel(laneLabel: string, skillName: string, taskName: string | null): string {
  return taskName
    ? `Set ${laneLabel} ${skillName} task to ${taskName}`
    : `${skillName} has no unlocked ${laneLabel} task`
}

function taskChoiceLabel(taskDef: TaskDefinition): string {
  return taskDef.name.replace(/^(Mine|Chop|Fish|Kindle|Cook|Forge|Shape|Craft|Bind|Grow)\s+/, '')
}
</script>

<style scoped>
.skills-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skills-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.skills-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
}

.skills-sub {
  font-size: 13px;
  color: var(--color-text-muted);
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
}

.skill-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  transition: all var(--transition-fast);
  position: relative;
}
.skill-card:hover {
  border-color: var(--color-border-hover);
  background: var(--color-bg-card-hover);
}

.skill-card-active {
  border-color: var(--color-accent);
  box-shadow: 0 0 8px var(--color-accent-glow);
}
.skill-card-idle {
  border-color: rgba(251, 191, 36, 0.3);
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.1);
}
.skill-card-background {
  border-color: rgba(167, 139, 250, 0.3);
  box-shadow: 0 0 8px rgba(167, 139, 250, 0.1);
}

.skill-icon {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.skill-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.skill-title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding-right: 52px;
}

.skill-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  overflow-wrap: anywhere;
}

.skill-title-meta {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  flex-wrap: wrap;
}

.skill-level {
  font-size: 11px;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.skill-true-mastery {
  min-height: 16px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 5px;
  border-radius: var(--radius-sm);
  background: rgba(253, 230, 138, 0.12);
  color: #fde68a;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  white-space: nowrap;
}

.skill-bar {
  height: 3px;
  background: var(--color-bg-elevated);
  border-radius: 2px;
  overflow: hidden;
}

.skill-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.skill-progression {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  line-height: 1.35;
}

.skill-current {
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}

.skill-next {
  color: var(--color-text-muted);
  overflow-wrap: anywhere;
}

.skill-unlocks {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--color-accent-light);
}

.skill-mastery-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--color-text-muted);
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.skill-mastery-row span:last-child {
  color: #fde68a;
  white-space: nowrap;
}

.skill-mastery-bar {
  height: 3px;
  overflow: hidden;
  border-radius: 2px;
  background: var(--color-bg-elevated);
}

.skill-mastery-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, #d97706, #fde68a);
  transition: width 0.3s ease;
}

.skill-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding-top: 3px;
}

.skill-action-btn {
  min-height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 7px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-surface);
  color: var(--color-text-muted);
  font-family: var(--font-body);
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.skill-action-btn:hover:not(:disabled) {
  border-color: var(--color-border-hover);
  color: var(--color-text-primary);
  background: var(--color-bg-card-hover);
}

.skill-action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.skill-action-current {
  border-color: var(--color-accent);
  color: var(--color-accent-light);
  background: var(--color-accent-glow);
}

.skill-action-idle.skill-action-current {
  border-color: rgba(251, 191, 36, 0.75);
  color: #fde68a;
  background: rgba(251, 191, 36, 0.12);
}

.skill-action-background.skill-action-current {
  border-color: rgba(167, 139, 250, 0.75);
  color: #ddd6fe;
  background: rgba(167, 139, 250, 0.12);
}

.skill-lane-badge {
  position: absolute;
  top: 4px;
  right: 6px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--color-accent-glow);
  color: var(--color-accent-light);
}
</style>
