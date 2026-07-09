<template>
  <div class="skills-panel">
    <div v-if="showHeader" class="skills-header">
      <h2 class="skills-title">Skills</h2>
      <span class="skills-sub">Total Level: {{ store.totalLevel }}</span>
    </div>

    <SkillSelectorRail
      :items="skillSelectorItems"
      ariaLabel="Routine skill"
      @select="selectRoutineSkillById"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SkillSelectorRail from './SkillSelectorRail.vue'
import { useGameStore } from '../stores/gameStore'
import { SKILL_LIST, type SkillDefinition, type SkillId } from '../data/skills'
import { getTaskById, getTasksForSkill, type TaskDefinition } from '../data/tasks'
import { spriteForSkill } from '../assets/visualAssets'

const store = useGameStore()

withDefaults(defineProps<{
  showHeader?: boolean
}>(), {
  showHeader: true,
})

const skillData = computed(() =>
  SKILL_LIST
  .filter((def) => def.allowedLanes.includes('idle'))
  .map((def) => {
    const level = store.getSkillLevel(def.id)
    const tasks = getTasksForSkill(def.id)
    const unlockedTasks = tasks.filter((task) => level >= task.levelRequired)
    const currentTask = unlockedTasks[unlockedTasks.length - 1] ?? null

    return {
      id: def.id,
      def,
      sprite: spriteForSkill(def.id),
      level,
      progress: store.getSkillProgress(def.id),
      currentTaskId: currentTask?.id ?? null,
      currentTaskName: currentTask ? taskChoiceLabel(currentTask) : null,
    }
  })
)

const skillSelectorItems = computed(() =>
  skillData.value.map((skill) => ({
    id: skill.id,
    name: skill.def.name,
    level: skill.level,
    progress: skill.progress,
    color: skill.def.color,
    icon: skill.def.icon,
    sprite: skill.sprite,
    disabled: !skill.currentTaskId,
    selected: isInIdleLane(skill.id),
    title: routineSelectTitle(skill),
  }))
)

function getIdleSkillId(): SkillId | null {
  const taskId = store.lanes.idle.taskId
  if (!taskId) return null
  return getTaskById(taskId)?.skillId ?? null
}

function isInIdleLane(id: SkillId): boolean { return getIdleSkillId() === id }

function selectRoutineSkill(skill: { currentTaskId: string | null }) {
  if (!skill.currentTaskId) return
  store.setLaneTask('idle', skill.currentTaskId)
}

function selectRoutineSkillById(skillId: SkillId) {
  const skill = skillData.value.find((candidate) => candidate.id === skillId)
  if (skill) selectRoutineSkill(skill)
}

function routineSelectTitle(skill: { def: SkillDefinition; currentTaskName: string | null }): string {
  return skill.currentTaskName
    ? `Set Routine to ${skill.currentTaskName}`
    : `${skill.def.name} has no unlocked routine task`
}

function taskChoiceLabel(taskDef: TaskDefinition): string {
  return taskDef.name.replace(/^(Mine|Chop|Fish|Kindle|Cook|Forge|Shape|Craft|Bind|Grow)\s+/, '')
}
</script>

<style scoped>
.skills-panel {
  min-width: 0;
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

.skill-lane-badge {
  position: absolute;
  top: 4px;
  right: 6px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  background: var(--color-accent-glow);
  color: var(--color-accent-light);
}
</style>
