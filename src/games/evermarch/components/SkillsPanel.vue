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
            <div class="skill-level">Lv. {{ skill.level }}</div>
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
import { Pickaxe, TreePine, Fish, Sprout, FlameKindling, Hammer, Swords, BookOpen } from 'lucide-vue-next'
import { useGameStore } from '../stores/gameStore'
import { SKILL_LIST, type SkillId } from '../data/skills'
import { getTaskById, getTasksForSkill, type TaskDefinition } from '../data/tasks'

const store = useGameStore()

const skillData = computed(() =>
  SKILL_LIST.map((def) => {
    const level = store.getSkillLevel(def.id)
    const tasks = getTasksForSkill(def.id)
    const unlockedTasks = tasks.filter((task) => level >= task.levelRequired)
    const currentTask = unlockedTasks[unlockedTasks.length - 1] ?? null
    const nextTask = tasks.find((task) => level < task.levelRequired) ?? null

    return {
      id: def.id,
      def,
      level,
      progress: store.getSkillProgress(def.id),
      currentTaskLabel: currentTask ? `Current: ${taskChoiceLabel(currentTask)}` : 'No task unlocked',
      nextTaskLabel: nextTask ? `Next: ${taskChoiceLabel(nextTask)} at Lv. ${nextTask.levelRequired}` : 'All tasks unlocked',
      unlockedTaskCount: unlockedTasks.length,
      totalTaskCount: tasks.length,
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

.skill-level {
  font-size: 11px;
  color: var(--color-text-muted);
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
