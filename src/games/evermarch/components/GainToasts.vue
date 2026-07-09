<template>
  <div class="gain-toasts" aria-live="polite" aria-atomic="false">
    <TransitionGroup name="gain-toast" tag="div" class="gain-toast-stack">
      <div
        v-for="toast in store.gainToasts"
        :key="toast.id"
        class="gain-toast"
        :class="'gain-toast-' + toast.kind"
      >
        <component :is="toastIcon(toast.icon)" :size="14" class="gain-toast-icon" />
        <span class="gain-toast-label">{{ toast.label }}</span>
        <template v-if="toast.amount !== null">
          <span class="gain-toast-amount">+{{ formatNumber(toast.amount) }}</span>
          <span v-if="toast.total !== null" class="gain-toast-total">
            ({{ formatNumber(toast.total) }})
          </span>
        </template>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import {
  BookOpen,
  Coins,
  Fish,
  FlameKindling,
  Gem,
  Hammer,
  Package,
  Sparkles,
  Sprout,
  Star,
  TreePine,
  Wheat,
} from 'lucide-vue-next'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()

const iconMap = {
  BookOpen,
  Coins,
  Fish,
  FlameKindling,
  Gem,
  Hammer,
  Package,
  Sparkles,
  Sprout,
  Star,
  TreePine,
  Wheat,
}

function toastIcon(icon: string) {
  return iconMap[icon as keyof typeof iconMap] ?? Package
}

function formatNumber(value: number): string {
  return Math.floor(value).toLocaleString()
}
</script>

<style scoped>
.gain-toasts {
  position: fixed;
  right: 68px;
  bottom: 14px;
  z-index: 160;
  pointer-events: none;
}

.gain-toast-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.gain-toast {
  min-height: 28px;
  max-width: min(320px, calc(100vw - 32px));
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-hover);
  background: rgba(6, 13, 10, 0.9);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  backdrop-filter: blur(8px);
}

.gain-toast-icon {
  flex: 0 0 auto;
  color: var(--color-accent-light);
}

.gain-toast-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gain-toast-amount {
  color: var(--color-accent-light);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.gain-toast-total {
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.gain-toast-xp {
  border-color: rgba(96, 165, 250, 0.38);
}

.gain-toast-xp .gain-toast-icon,
.gain-toast-xp .gain-toast-amount {
  color: #93c5fd;
}

.gain-toast-gold {
  border-color: rgba(251, 191, 36, 0.42);
}

.gain-toast-gold .gain-toast-icon,
.gain-toast-gold .gain-toast-amount {
  color: #fde68a;
}

.gain-toast-level {
  border-color: rgba(253, 230, 138, 0.48);
}

.gain-toast-level .gain-toast-icon,
.gain-toast-level .gain-toast-label {
  color: #fde68a;
}

.gain-toast-enter-active,
.gain-toast-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.gain-toast-enter-from,
.gain-toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.gain-toast-move {
  transition: transform 0.18s ease;
}

@media (max-width: 1024px) {
  .gain-toasts {
    right: 68px;
  }
}

@media (max-width: 768px) {
  .gain-toasts {
    right: 12px;
    bottom: 12px;
    width: calc(100vw - 24px);
  }

  .gain-toast-stack {
    align-items: flex-end;
  }

  .gain-toast {
    max-width: 100%;
  }
}
</style>
