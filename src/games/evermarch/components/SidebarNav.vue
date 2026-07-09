<template>
  <aside class="em-sidebar">
    <nav class="em-sidebar-nav">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="em-sidebar-btn"
        :class="{
          'em-sidebar-btn-active': modelValue === tab.id,
          'em-sidebar-btn-themed': !!tab.themeColor,
        }"
        :style="tab.themeColor ? { '--tab-theme-color': tab.themeColor } : undefined"
        :aria-label="tab.label"
        :title="tab.label"
        @click="$emit('update:modelValue', tab.id)"
      >
        <component :is="tab.icon" :size="18" />
        <span>{{ tab.label }}</span>
        <i v-if="tab.themeColor" class="em-sidebar-material" aria-hidden="true"></i>
        <div v-if="tab.indicator" class="em-sidebar-indicator"></div>
      </button>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { computed, markRaw } from 'vue'
import { BarChart3, Clock, ListChecks, MapPin, MousePointerClick, Package, Sprout, Swords } from 'lucide-vue-next'
import { useGameStore } from '../stores/gameStore'
import { getTaskById } from '../data/tasks'
import { SKILLS, type SkillId } from '../data/skills'

defineProps<{
  modelValue: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const store = useGameStore()

const baseTabs = [
  { id: 'active', label: 'Active', icon: markRaw(MousePointerClick), indicator: true },
  { id: 'routine', label: 'Routine', icon: markRaw(Clock), indicator: false },
  { id: 'farming', label: 'Farming', icon: markRaw(Sprout), indicator: false },
  { id: 'quests', label: 'Quests', icon: markRaw(ListChecks), indicator: false },
  { id: 'progression', label: 'Progress', icon: markRaw(BarChart3), indicator: false },
  { id: 'world', label: 'World', icon: markRaw(MapPin), indicator: false },
  { id: 'delve', label: 'Delve', icon: markRaw(Swords), indicator: false },
  { id: 'inventory', label: 'Inventory', icon: markRaw(Package), indicator: false },
]

const activeSkillId = computed(() => skillIdForTask(store.lanes.active.taskId))
const routineSkillId = computed(() => skillIdForTask(store.lanes.idle.taskId))

const tabs = computed(() =>
  baseTabs.map((tab) => ({
    ...tab,
    indicator: tab.id === 'farming' ? store.readyFarmingPlotCount > 0 : tab.indicator,
    themeColor: tab.id === 'active'
      ? colorForSkill(activeSkillId.value)
      : tab.id === 'routine'
        ? colorForSkill(routineSkillId.value)
        : null,
  }))
)

function skillIdForTask(taskId: string | null): SkillId | null {
  if (!taskId) return null
  return getTaskById(taskId)?.skillId ?? null
}

function colorForSkill(skillId: SkillId | null): string | null {
  return skillId ? SKILLS[skillId]?.color ?? null : null
}
</script>

<style scoped>
.em-sidebar {
  background:
    linear-gradient(180deg, rgba(142, 202, 230, 0.04), transparent 130px),
    var(--color-bg-surface);
  border-right: 2px solid var(--em-block-border);
  overflow-y: auto;
  flex-shrink: 0;
}

.em-sidebar-nav {
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 2px;
}

.em-sidebar-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-text-secondary);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
  position: relative;
}
.em-sidebar-btn:hover {
  background: var(--color-bg-card);
  border-color: var(--color-border);
  color: var(--color-text-primary);
}
.em-sidebar-btn-active {
  border-color: var(--color-border-hover);
  background: var(--color-accent-glow);
  color: var(--color-accent-light);
  box-shadow: inset 3px 0 0 var(--color-accent);
}
.em-sidebar-btn-active::before {
  content: none;
}

.em-sidebar-btn-themed {
  border-color: color-mix(in srgb, var(--tab-theme-color), transparent 70%);
}

.em-sidebar-btn-themed.em-sidebar-btn-active {
  color: color-mix(in srgb, var(--tab-theme-color), white 42%);
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--tab-theme-color), transparent 78%), transparent),
    var(--color-bg-card);
  box-shadow: inset 3px 0 0 var(--tab-theme-color);
}

.em-sidebar-material {
  width: 8px;
  height: 8px;
  display: inline-block;
  margin-left: auto;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: var(--tab-theme-color);
  box-shadow: 4px 0 0 color-mix(in srgb, var(--tab-theme-color), black 28%);
}

.em-sidebar-indicator {
  width: 6px;
  height: 6px;
  border-radius: 0;
  background: var(--color-accent);
  margin-left: auto;
  animation: glow-pulse 2s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 4px var(--color-accent-glow); }
  50% { box-shadow: 0 0 8px var(--color-accent-glow-strong); }
}

@media (max-width: 1024px) {
  .em-sidebar-btn span { display: none; }
  .em-sidebar-btn { justify-content: center; padding: 10px; }
  .em-sidebar-indicator { display: none; }
}
</style>
