<template>
  <div class="active-panel">
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
      <div class="active-skill-badge">
        <span class="active-skill-name">{{ skillDef.name }} Lv.{{ skillLevel }}</span>
      </div>
      <div class="active-xp-bar-container">
        <div class="active-xp-bar">
          <div
            class="active-xp-bar-fill"
            :style="{ width: (skillProgress * 100) + '%' }"
          ></div>
        </div>
        <span class="active-xp-text">{{ xpToNext.toLocaleString() }} XP to next</span>
      </div>
    </div>

    <!-- Rates Display -->
    <div class="active-rates" v-if="task">
      <div class="active-rate">
        <span class="active-rate-label">Idle Rate:</span>
        <span class="active-rate-value">+{{ task.drops[0]?.amount ?? 1 }} / {{ (task.baseInterval / 1000).toFixed(0) }}s</span>
      </div>
      <div class="active-rate active-rate-boosted">
        <span class="active-rate-label">Active Rate:</span>
        <span class="active-rate-value">+{{ (task.drops[0]?.amount ?? 1) * task.activeBoostMultiplier }} / click</span>
      </div>
      <div class="active-boost">
        Active boost: <strong>{{ task.activeBoostMultiplier }}x!</strong>
      </div>
    </div>

    <!-- Action Button -->
    <button
      v-if="task"
      class="active-action-btn"
      :class="{ 'active-action-btn-pressed': isPressed }"
      @mousedown="onPress"
      @mouseup="isPressed = false"
      @mouseleave="isPressed = false"
      @click="onAction"
    >
      <Pickaxe v-if="task.skillId === 'mining'" :size="20" />
      <TreePine v-else-if="task.skillId === 'woodcutting'" :size="20" />
      <Fish v-else-if="task.skillId === 'fishing'" :size="20" />
      <Swords v-else :size="20" />
      <span>{{ actionLabel }}</span>
    </button>

    <!-- Task Selector -->
    <div class="active-task-select" v-if="availableTasks.length > 1">
      <span class="active-task-select-label">Change task:</span>
      <div class="active-task-options">
        <button
          v-for="t in availableTasks"
          :key="t.id"
          class="active-task-option"
          :class="{ 'active-task-option-current': t.id === lane.taskId }"
          @click="selectTask(t.id)"
        >
          {{ t.name }}
          <span class="active-task-option-level">Lv.{{ t.levelRequired }}</span>
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
import { computed, ref } from 'vue'
import { Pickaxe, TreePine, Fish, Swords } from 'lucide-vue-next'
import { useGameStore } from '../stores/gameStore'
import { getTaskById, getAvailableTasks } from '../data/tasks'
import { SKILLS } from '../data/skills'
import { performActiveAction } from '../engine/gameEngine'

const store = useGameStore()
const isPressed = ref(false)

const lane = computed(() => store.lanes.active)
const task = computed(() => lane.value.taskId ? getTaskById(lane.value.taskId) : null)
const skillDef = computed(() => task.value ? SKILLS[task.value.skillId] : null)
const skillLevel = computed(() => task.value ? store.getSkillLevel(task.value.skillId) : 0)
const skillProgress = computed(() => task.value ? store.getSkillProgress(task.value.skillId) : 0)
const xpToNext = computed(() => task.value ? store.getSkillXpToNext(task.value.skillId) : 0)

const availableTasks = computed(() => {
  if (!task.value) return []
  const level = store.getSkillLevel(task.value.skillId)
  // Show all tasks for the same skill that can be active
  return getAvailableTasks(task.value.skillId, level)
    .filter((t) => t.allowedLanes.includes('active'))
})

const actionLabel = computed(() => {
  if (!task.value) return 'Action'
  switch (task.value.skillId) {
    case 'mining': return 'Mine'
    case 'woodcutting': return 'Chop'
    case 'fishing': return 'Fish'
    case 'combat': return 'Attack'
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
</script>

<style scoped>
.active-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 32px 24px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-accent);
  background: linear-gradient(
    180deg,
    rgba(52, 211, 153, 0.06) 0%,
    var(--color-bg-card) 40%,
    var(--color-bg-card) 100%
  );
  box-shadow:
    0 0 30px rgba(52, 211, 153, 0.08),
    inset 0 1px 0 rgba(52, 211, 153, 0.1);
  position: relative;
  overflow: hidden;
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
  gap: 8px;
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
  letter-spacing: 1.5px;
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
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  text-align: center;
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
  max-width: 360px;
}

.active-skill-badge {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-accent-light);
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
  align-items: center;
  gap: 6px;
}

.active-rate {
  display: flex;
  gap: 8px;
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

.active-boost {
  font-size: 14px;
  color: var(--color-accent-light);
  margin-top: 4px;
}
.active-boost strong {
  font-size: 18px;
  font-family: var(--font-display);
}

/* Action Button */
.active-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 48px;
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
  letter-spacing: 1px;
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

/* Task Selector */
.active-task-select {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 400px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.active-task-select-label {
  font-size: 11px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.active-task-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

.active-task-option {
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  gap: 6px;
}
.active-task-option:hover {
  border-color: var(--color-border-hover);
  color: var(--color-text-primary);
}
.active-task-option-current {
  border-color: var(--color-accent);
  background: var(--color-accent-glow);
  color: var(--color-accent-light);
}
.active-task-option-level {
  font-size: 10px;
  color: var(--color-text-muted);
}

.active-empty {
  padding: 20px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 14px;
}
</style>
