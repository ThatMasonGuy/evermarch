<template>
  <aside class="em-log" :class="{ 'em-log-collapsed': collapsed }">
    <button
      type="button"
      class="em-log-header"
      :title="collapsed ? 'Expand activity log' : 'Collapse activity log'"
      :aria-label="collapsed ? 'Expand activity log' : 'Collapse activity log'"
      @click="toggleCollapsed"
    >
      <ScrollText :size="14" />
      <span v-if="!collapsed">Activity Log</span>
      <ChevronRight v-if="!collapsed" :size="14" class="em-log-toggle-icon" />
      <ChevronLeft v-else :size="14" class="em-log-toggle-icon" />
    </button>
    <div v-if="!collapsed" class="em-log-entries">
      <div
        v-for="entry in store.activityLog.slice(0, 50)"
        :key="entry.id"
        class="em-log-entry"
        :class="'em-log-' + entry.type"
      >
        <span class="em-log-time">{{ entry.time }}</span>
        <span class="em-log-msg">
          {{ entry.message }}
          <span v-if="entry.count > 1" class="em-log-count">(x{{ entry.count }})</span>
        </span>
      </div>
      <div v-if="store.activityLog.length === 0" class="em-log-empty">
        No activity yet. Start a task to see progress here.
      </div>
    </div>
    <div v-else class="em-log-rail" aria-hidden="true">
      <span class="em-log-rail-count">{{ logCountLabel }}</span>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight, ScrollText } from 'lucide-vue-next'
import { useGameStore } from '../stores/gameStore'

const props = defineProps<{
  collapsed: boolean
}>()

const emit = defineEmits<{
  'update:collapsed': [value: boolean]
}>()

const store = useGameStore()
const logCountLabel = computed(() => store.activityLog.length > 99 ? '99+' : store.activityLog.length.toString())

function toggleCollapsed() {
  emit('update:collapsed', !props.collapsed)
}
</script>

<style scoped>
.em-log {
  background: var(--color-bg-surface);
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
  min-width: 0;
  min-height: 0;
}

.em-log-header {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 12px 14px;
  border: 0;
  border-bottom: 1px solid var(--color-border);
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  letter-spacing: 0;
  text-transform: uppercase;
  flex-shrink: 0;
  cursor: pointer;
  transition: color var(--transition-fast), background var(--transition-fast);
}

.em-log-header:hover {
  background: var(--color-bg-card);
  color: var(--color-text-primary);
}

.em-log-toggle-icon {
  margin-left: auto;
  color: var(--color-text-muted);
}

.em-log-entries {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.em-log-entry {
  display: flex;
  gap: 8px;
  padding: 7px 14px;
  border-bottom: 1px solid var(--color-border);
  font-size: 11px;
  line-height: 1.5;
  animation: fade-in 0.2s ease;
}

.em-log-time {
  color: var(--color-text-muted);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  min-width: 56px;
}

.em-log-msg {
  color: var(--color-text-secondary);
}

.em-log-count {
  color: var(--color-text-muted);
  font-size: 10px;
}

.em-log-levelup .em-log-msg {
  color: var(--color-accent-light);
  font-weight: 600;
}

.em-log-unlock .em-log-msg {
  color: #fde68a;
  font-weight: 600;
}

.em-log-offline .em-log-msg {
  color: #a78bfa;
}

.em-log-system .em-log-msg {
  color: var(--color-text-muted);
  font-style: italic;
}

.em-log-empty {
  padding: 20px 14px;
  font-size: 12px;
  color: var(--color-text-muted);
  text-align: center;
}

.em-log-collapsed .em-log-header {
  min-height: 74px;
  justify-content: center;
  flex-direction: column;
  padding: 10px 0;
}

.em-log-collapsed .em-log-toggle-icon {
  margin-left: 0;
}

.em-log-rail {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10px;
  min-height: 0;
}

.em-log-rail-count {
  min-width: 26px;
  padding: 3px 4px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
