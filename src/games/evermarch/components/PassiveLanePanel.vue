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

      <!-- Action Progress Bar -->
      <div class="passive-progress-bar">
        <div
          class="passive-progress-fill"
          :class="'passive-fill-' + laneType"
          :style="{ width: progressPct + '%' }"
        ></div>
      </div>

      <!-- Skill XP Bar -->
      <div class="passive-xp-bar">
        <div
          class="passive-xp-fill"
          :style="{ width: (skillProgress * 100) + '%' }"
        ></div>
      </div>
    </div>

    <!-- Task selector -->
    <div class="passive-selector" v-if="selectableTasks.length > 0">
      <select
        class="passive-select"
        :value="lane.taskId ?? ''"
        @change="onSelectTask(($event.target as HTMLSelectElement).value)"
      >
        <option value="" disabled>Choose task...</option>
        <option
          v-for="t in selectableTasks"
          :key="t.id"
          :value="t.id"
          :disabled="store.getSkillLevel(t.skillId) < t.levelRequired"
        >
          {{ t.name }} (Lv.{{ t.levelRequired }})
          {{ store.getSkillLevel(t.skillId) < t.levelRequired ? '🔒' : '' }}
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
import { getTaskById, ALL_TASKS } from '../data/tasks'
import { SKILLS } from '../data/skills'

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

function onSelectTask(taskId: string) {
  if (taskId) {
    store.setLaneTask(props.laneType, taskId)
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
