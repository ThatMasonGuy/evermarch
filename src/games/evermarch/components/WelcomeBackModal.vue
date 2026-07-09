<template>
  <Teleport to="body">
    <Transition name="welcome-modal">
      <div
        v-if="summary"
        class="welcome-backdrop"
        data-theme="evermarch"
        @click.self="close"
      >
        <section class="welcome-modal" aria-modal="true" role="dialog" aria-labelledby="welcome-title">
          <header class="welcome-header">
            <div class="welcome-title-wrap">
              <Clock3 :size="18" />
              <h2 id="welcome-title">Welcome Back</h2>
            </div>
            <button class="welcome-icon-btn" type="button" title="Close" @click="close">
              <X :size="16" />
            </button>
          </header>

          <div class="welcome-stats">
            <div class="welcome-stat">
              <span>Away</span>
              <strong>{{ formatDuration(summary.elapsedMs) }}</strong>
            </div>
            <div class="welcome-stat">
              <span>Credited</span>
              <strong>{{ formatDuration(summary.processedMs) }}</strong>
            </div>
            <div class="welcome-stat">
              <span>Total XP</span>
              <strong>+{{ formatNumber(summary.totalXp) }}</strong>
            </div>
          </div>

          <div v-if="summary.capped" class="welcome-cap">
            <Hourglass :size="14" />
            <span>Offline gains capped at 24h.</span>
          </div>

          <section v-if="summary.resources.length > 0" class="welcome-section">
            <h3 class="welcome-section-title">
              <Package :size="14" />
              <span>Items</span>
            </h3>
            <div class="welcome-grid">
              <div
                v-for="resource in summary.resources"
                :key="resource.resourceId"
                class="welcome-gain-row"
              >
                <component :is="iconFor(resource.icon)" :size="15" class="welcome-gain-icon" />
                <span class="welcome-gain-name">{{ resource.name }}</span>
                <strong class="welcome-gain-amount">+{{ formatNumber(resource.amount) }}</strong>
                <span class="welcome-gain-total">({{ formatNumber(resource.total) }})</span>
              </div>
            </div>
          </section>

          <section v-if="summary.skills.length > 0" class="welcome-section">
            <h3 class="welcome-section-title">
              <Star :size="14" />
              <span>Skills</span>
            </h3>
            <div class="welcome-grid">
              <div
                v-for="skill in summary.skills"
                :key="skill.skillId"
                class="welcome-gain-row"
              >
                <component :is="iconFor(skill.icon)" :size="15" class="welcome-gain-icon" />
                <span class="welcome-gain-name">{{ skill.name }}</span>
                <strong class="welcome-gain-amount">+{{ formatNumber(skill.xp) }} XP</strong>
                <span
                  v-if="skill.levelAfter > skill.levelBefore"
                  class="welcome-level-pill"
                >
                  Lv. {{ skill.levelAfter }}
                </span>
              </div>
            </div>
          </section>

          <section v-if="summary.taskMastery.length > 0" class="welcome-section">
            <h3 class="welcome-section-title">
              <Trophy :size="14" />
              <span>Task Mastery</span>
            </h3>
            <div class="welcome-grid">
              <div
                v-for="mastery in summary.taskMastery"
                :key="mastery.taskId"
                class="welcome-gain-row"
              >
                <Trophy :size="15" class="welcome-gain-icon" />
                <span class="welcome-gain-name">{{ mastery.taskName }}</span>
                <strong class="welcome-gain-amount">+{{ formatNumber(mastery.xp) }} XP</strong>
                <span
                  v-if="mastery.levelAfter > mastery.levelBefore"
                  class="welcome-level-pill"
                >
                  Lv. {{ mastery.levelAfter }}
                </span>
              </div>
            </div>
          </section>

          <section v-if="summary.lanes.length > 0" class="welcome-section">
            <h3 class="welcome-section-title">
              <Zap :size="14" />
              <span>Lanes</span>
            </h3>
            <div class="welcome-lanes">
              <div
                v-for="lane in summary.lanes"
                :key="lane.laneType + lane.taskId"
                class="welcome-lane"
              >
                <span class="welcome-lane-label">{{ lane.label }}</span>
                <span class="welcome-lane-task">{{ lane.taskName }}</span>
                <span class="welcome-lane-meta">
                  {{ formatNumber(lane.actions) }} actions
                  <template v-if="lane.xp > 0"> - +{{ formatNumber(lane.xp) }} XP</template>
                </span>
              </div>
            </div>
          </section>

          <button class="welcome-close" type="button" @click="close">
            <Check :size="15" />
            <span>Continue</span>
          </button>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  BookOpen,
  Check,
  Clock3,
  Fish,
  FlameKindling,
  Gem,
  Hammer,
  Hourglass,
  Package,
  Sprout,
  Star,
  TreePine,
  Trophy,
  Wheat,
  X,
  Zap,
} from 'lucide-vue-next'
import type { OfflineProgressSummary } from '../engine/gameEngine'

const props = defineProps<{
  summary: OfflineProgressSummary | null
}>()

const emit = defineEmits<{
  close: []
}>()

const summary = computed(() => props.summary)

const iconMap = {
  BookOpen,
  Fish,
  FlameKindling,
  Gem,
  Hammer,
  Package,
  Sprout,
  Star,
  TreePine,
  Wheat,
}

function iconFor(icon: string) {
  return iconMap[icon as keyof typeof iconMap] ?? Package
}

function close() {
  emit('close')
}

function formatNumber(value: number): string {
  return Math.floor(value).toLocaleString()
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h`
  if (minutes > 0) return `${minutes}m`
  return '<1m'
}
</script>

<style scoped>
.welcome-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.68);
  backdrop-filter: blur(4px);
}

.welcome-modal {
  width: min(620px, 100%);
  max-height: min(720px, 92vh);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 22px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-hover);
  background: var(--color-bg-surface);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.42);
}

.welcome-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.welcome-title-wrap {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-accent-light);
}

.welcome-title-wrap h2 {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.welcome-icon-btn {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.welcome-icon-btn:hover {
  border-color: var(--color-border-hover);
  color: var(--color-text-primary);
  background: var(--color-bg-card);
}

.welcome-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.welcome-stat {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-card);
}

.welcome-stat span {
  color: var(--color-text-muted);
  font-size: 11px;
}

.welcome-stat strong {
  color: var(--color-text-primary);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.welcome-cap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 9px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(251, 191, 36, 0.35);
  background: rgba(251, 191, 36, 0.08);
  color: #fde68a;
  font-size: 12px;
  font-weight: 600;
}

.welcome-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.welcome-section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 700;
}

.welcome-section-title svg {
  color: var(--color-accent-light);
}

.welcome-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 6px;
}

.welcome-gain-row {
  min-height: 38px;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 7px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
}

.welcome-gain-icon {
  color: var(--color-accent-light);
}

.welcome-gain-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.welcome-gain-amount {
  color: var(--color-accent-light);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.welcome-gain-total {
  color: var(--color-text-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.welcome-level-pill {
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  background: rgba(253, 230, 138, 0.12);
  color: #fde68a;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.welcome-lanes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 6px;
}

.welcome-lane {
  min-width: 0;
  display: grid;
  gap: 3px;
  padding: 9px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
}

.welcome-lane-label {
  color: var(--color-accent-light);
  font-size: 11px;
  font-weight: 700;
}

.welcome-lane-task {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-primary);
  font-size: 12px;
  font-weight: 700;
}

.welcome-lane-meta {
  color: var(--color-text-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.welcome-close {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-accent);
  background: var(--color-accent-glow);
  color: var(--color-accent-light);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.welcome-close:hover {
  background: var(--color-accent-glow);
}

.welcome-modal-enter-active,
.welcome-modal-leave-active {
  transition: opacity 0.2s ease;
}

.welcome-modal-enter-from,
.welcome-modal-leave-to {
  opacity: 0;
}

.welcome-modal-enter-active .welcome-modal {
  transition: transform 0.2s ease;
}

.welcome-modal-enter-from .welcome-modal {
  transform: scale(0.97) translateY(8px);
}

@media (max-width: 560px) {
  .welcome-backdrop {
    padding: 10px;
  }

  .welcome-modal {
    padding: 16px;
    gap: 12px;
  }

  .welcome-stats {
    grid-template-columns: 1fr;
  }

  .welcome-grid,
  .welcome-lanes {
    grid-template-columns: 1fr;
  }
}
</style>
