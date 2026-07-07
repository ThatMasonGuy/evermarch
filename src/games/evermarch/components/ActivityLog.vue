<template>
  <aside class="em-log">
    <div class="em-log-header">
      <ScrollText :size="14" />
      <span>Activity Log</span>
    </div>
    <div class="em-log-entries">
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
  </aside>
</template>

<script setup lang="ts">
import { ScrollText } from 'lucide-vue-next'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()
</script>

<style scoped>
.em-log {
  background: var(--color-bg-surface);
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.em-log-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  letter-spacing: 0.5px;
  text-transform: uppercase;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.em-log-entries {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex: 1;
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

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
