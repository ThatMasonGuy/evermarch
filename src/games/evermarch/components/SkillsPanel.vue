<template>
  <div class="skills-panel">
    <div v-if="showHeader" class="skills-header">
      <h2 class="skills-title">Skills</h2>
      <span class="skills-sub">Total Level: {{ store.totalLevel }}</span>
    </div>

    <div class="skills-grid">
      <button
        v-for="skill in skillData"
        :key="skill.id"
        type="button"
        class="skill-card"
        :class="{
          'skill-card-idle': isInIdleLane(skill.id),
        }"
        :disabled="!skill.currentTaskId"
        :aria-pressed="isInIdleLane(skill.id)"
        :title="routineSelectTitle(skill)"
        @click="selectRoutineSkill(skill)"
      >
        <div class="skill-icon" :style="{ background: skill.def.color + '18', color: skill.def.color }">
          <img v-if="skill.sprite" :src="skill.sprite" alt="" class="skill-sprite" />
          <template v-else>
            <Pickaxe v-if="skill.def.icon === 'Pickaxe'" :size="18" />
            <TreePine v-else-if="skill.def.icon === 'TreePine'" :size="18" />
            <Fish v-else-if="skill.def.icon === 'Fish'" :size="18" />
            <Sprout v-else-if="skill.def.icon === 'Sprout'" :size="18" />
            <FlameKindling v-else-if="skill.def.icon === 'FlameKindling'" :size="18" />
            <Hammer v-else-if="skill.def.icon === 'Hammer'" :size="18" />
            <Swords v-else-if="skill.def.icon === 'Swords'" :size="18" />
            <BookOpen v-else :size="18" />
          </template>
        </div>
        <div class="skill-info">
          <div class="skill-title-row">
            <div class="skill-name">{{ skill.def.name }}</div>
            <div class="skill-level">Lv. {{ skill.level }}</div>
          </div>
          <div class="skill-bar">
            <div
              class="skill-bar-fill"
              :style="{ width: (skill.progress * 100) + '%', background: skill.def.color }"
            ></div>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BookOpen, Fish, FlameKindling, Hammer, Pickaxe, Sprout, Swords, TreePine } from 'lucide-vue-next'
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

.skills-grid {
  min-width: 0;
  max-width: 100%;
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 4px;
  scrollbar-gutter: stable;
}

.skill-card {
  flex: 0 0 auto;
  width: max-content;
  min-width: 176px;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 68px;
  padding: 10px;
  border-radius: var(--radius-md);
  border: 2px solid var(--color-border);
  background: var(--color-bg-card);
  color: inherit;
  font-family: var(--font-body);
  text-align: left;
  transition: all var(--transition-fast);
  position: relative;
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}
.skill-card:hover {
  border-color: var(--color-border-hover);
  background: var(--color-bg-card-hover);
}
.skill-card-idle {
  border-color: rgba(251, 191, 36, 0.48);
  background: linear-gradient(180deg, rgba(251, 191, 36, 0.08), var(--color-bg-card));
  box-shadow: inset 0 0 0 1px rgba(251, 191, 36, 0.16);
}

.skill-card:disabled {
  cursor: not-allowed;
  opacity: 0.52;
}
.skill-icon {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.skill-sprite {
  width: 28px;
  height: 28px;
  object-fit: contain;
  filter: drop-shadow(0 3px 0 rgba(0, 0, 0, 0.22));
}

.skill-info {
  flex: 1 0 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.skill-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.skill-name {
  font-size: 13px;
  font-weight: 800;
  color: var(--color-text-primary);
  min-width: 0;
  white-space: nowrap;
}

.skill-level {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 800;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.skill-bar {
  height: 6px;
  background: var(--color-bg-elevated);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.skill-bar-fill {
  height: 100%;
  border-radius: var(--radius-sm);
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
