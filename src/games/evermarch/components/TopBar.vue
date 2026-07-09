<template>
  <header class="em-topbar">
    <div class="em-topbar-left">
      <RouterLink to="/" class="em-topbar-back" title="Exit Game">
        <ArrowLeft :size="14" />
      </RouterLink>
      <div class="em-topbar-brand">
        <Compass :size="16" />
        <span class="em-topbar-title">Evermarch</span>
      </div>
      <div class="em-topbar-save" v-if="store.saveName">
        <span>{{ store.saveName }}</span>
      </div>
    </div>

    <div class="em-topbar-resources">
      <div class="em-resource" title="Gold">
        <Coins :size="14" />
        <span>{{ store.gold.toLocaleString() }}</span>
      </div>
      <div class="em-resource" title="Total XP">
        <Star :size="14" />
        <span>{{ store.totalXp.toLocaleString() }} XP</span>
      </div>
      <div class="em-resource" title="Total Level">
        <Zap :size="14" />
        <span>Lv. {{ store.totalLevel }}</span>
      </div>
    </div>

    <div class="em-topbar-right">
      <button
        class="em-topbar-btn em-cloud-sync-btn"
        :class="{
          'em-cloud-sync-btn-busy': props.cloudBusy,
          'em-cloud-sync-btn-stale': props.cloudSyncStale,
        }"
        :title="props.cloudSyncTitle"
        :disabled="props.cloudSyncDisabled"
        @click="$emit('backup')"
      >
        <CloudUpload :size="15" />
        <span class="em-cloud-sync-text">{{ props.cloudSyncLabel }}</span>
      </button>
      <button class="em-topbar-btn" title="Settings" @click="$emit('settings')">
        <Settings :size="15" />
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowLeft, Compass, Coins, Star, Zap, Settings, CloudUpload } from 'lucide-vue-next'
import { useGameStore } from '../stores/gameStore'

const props = withDefaults(defineProps<{
  cloudSyncLabel?: string
  cloudSyncTitle?: string
  cloudSyncDisabled?: boolean
  cloudBusy?: boolean
  cloudSyncStale?: boolean
}>(), {
  cloudSyncLabel: 'No sync',
  cloudSyncTitle: 'Save to Cloud',
  cloudSyncDisabled: false,
  cloudBusy: false,
  cloudSyncStale: false,
})

defineEmits<{
  backup: []
  settings: []
}>()

const store = useGameStore()
</script>

<style scoped>
.em-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: linear-gradient(180deg, var(--color-bg-elevated), var(--color-bg-surface));
  border-bottom: 2px solid var(--em-block-border);
  z-index: 100;
  gap: 12px;
  flex-shrink: 0;
}

.em-topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.em-topbar-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  color: var(--color-text-muted);
  text-decoration: none;
  transition: all var(--transition-fast);
}
.em-topbar-back:hover {
  color: var(--color-accent-light);
  background: var(--color-bg-card);
  border-color: var(--color-border);
}

.em-topbar-brand {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-accent-light);
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
}

.em-topbar-save {
  font-size: 12px;
  color: var(--color-text-muted);
  padding-left: 8px;
  border-left: 1px solid var(--color-border);
}

.em-topbar-resources {
  display: flex;
  align-items: center;
  gap: 16px;
}

.em-resource {
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 28px;
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: rgba(0, 0, 0, 0.12);
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
}
.em-resource svg { color: var(--color-accent); }

.em-topbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.em-topbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: rgba(0, 0, 0, 0.08);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.em-topbar-btn:hover {
  color: var(--color-accent-light);
  background: var(--color-bg-card);
  border-color: var(--color-border-hover);
}
.em-topbar-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.em-topbar-btn:disabled:hover {
  color: var(--color-text-muted);
  background: none;
}

.em-cloud-sync-btn {
  width: auto;
  min-width: 78px;
  padding: 0 8px;
  gap: 5px;
}

.em-cloud-sync-btn-busy {
  color: var(--color-accent-light);
}

.em-cloud-sync-btn-stale:not(:disabled),
.em-cloud-sync-btn-stale:disabled {
  border-color: rgba(248, 113, 113, 0.72);
  color: #fecaca;
  background: rgba(127, 29, 29, 0.2);
}

.em-cloud-sync-text {
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .em-topbar-resources { display: none; }
  .em-topbar-save { display: none; }
}
</style>
