<template>
  <div class="routine-panel" :class="routineThemeClass">
    <div class="routine-header">
      <div>
        <h2 class="routine-title">Routine</h2>
        <span class="routine-sub">Select a skill route and let that routine shape the page.</span>
      </div>
      <div class="routine-summary">
        <div class="routine-pill">
          <Clock :size="15" />
          <span>{{ routineTaskName }}</span>
        </div>
        <div class="routine-pill">
          <Star :size="15" />
          <span>Total Lv. {{ store.totalLevel }}</span>
        </div>
      </div>
    </div>

    <div class="routine-mood-strip" aria-hidden="true">
      <span v-for="tile in moodTiles" :key="tile" class="routine-mood-tile">{{ tile }}</span>
    </div>

    <PassiveLanePanel lane-type="idle" :show-selector="false" />

    <section class="routine-skills">
      <div class="routine-section-heading">
        <div>
          <h3>Skill Routes</h3>
          <span>Select a skill card to set the Routine route.</span>
        </div>
      </div>
      <SkillsPanel :show-header="false" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Clock, Star } from 'lucide-vue-next'
import PassiveLanePanel from './PassiveLanePanel.vue'
import SkillsPanel from './SkillsPanel.vue'
import { useGameStore } from '../stores/gameStore'
import { getTaskById } from '../data/tasks'

const store = useGameStore()

const routineTaskName = computed(() => {
  const taskId = store.lanes.idle.taskId
  return taskId ? getTaskById(taskId)?.name ?? 'No route' : 'No route'
})

const routineSkillId = computed(() => {
  const taskId = store.lanes.idle.taskId
  return taskId ? getTaskById(taskId)?.skillId ?? 'woodcutting' : 'woodcutting'
})

const routineThemeClass = computed(() => `routine-theme-${routineSkillId.value}`)

const moodTiles = computed(() => {
  switch (routineSkillId.value) {
    case 'woodcutting': return ['tree', 'log', 'leaf', 'tree', 'log']
    case 'fishing': return ['water', 'fish', 'reed', 'water', 'fish']
    case 'mining': return ['stone', 'ore', 'coal', 'stone', 'ore']
    case 'firemaking': return ['log', 'ember', 'ash', 'log', 'ember']
    case 'cooking': return ['hearth', 'fish', 'bowl', 'hearth', 'steam']
    case 'smithing': return ['anvil', 'ore', 'bar', 'coal', 'anvil']
    case 'fletching': return ['log', 'bow', 'arrow', 'feather', 'bow']
    case 'crafting': return ['gem', 'ring', 'tool', 'gem', 'charm']
    case 'runecrafting': return ['rune', 'essence', 'glyph', 'rune', 'spark']
    default: return ['route', 'work', 'skill', 'route', 'work']
  }
})
</script>

<style scoped>
.routine-panel {
  --routine-theme: var(--em-grass);
  --routine-theme-soft: rgba(79, 159, 69, 0.12);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.routine-theme-mining {
  --routine-theme: var(--em-stone);
  --routine-theme-soft: rgba(169, 176, 166, 0.13);
}

.routine-theme-woodcutting {
  --routine-theme: var(--em-grass);
  --routine-theme-soft: rgba(79, 159, 69, 0.14);
}

.routine-theme-fishing {
  --routine-theme: var(--em-water);
  --routine-theme-soft: rgba(47, 128, 183, 0.13);
}

.routine-theme-firemaking,
.routine-theme-cooking {
  --routine-theme: #fb923c;
  --routine-theme-soft: rgba(249, 115, 22, 0.13);
}

.routine-theme-smithing {
  --routine-theme: #ef4444;
  --routine-theme-soft: rgba(239, 68, 68, 0.12);
}

.routine-theme-fletching {
  --routine-theme: #facc15;
  --routine-theme-soft: rgba(250, 204, 21, 0.11);
}

.routine-theme-crafting {
  --routine-theme: #ec4899;
  --routine-theme-soft: rgba(236, 72, 153, 0.11);
}

.routine-theme-runecrafting {
  --routine-theme: #a78bfa;
  --routine-theme-soft: rgba(167, 139, 250, 0.12);
}

.routine-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.routine-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
}

.routine-sub,
.routine-section-heading span {
  color: var(--color-text-muted);
  font-size: 13px;
}

.routine-summary {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 7px;
}

.routine-pill {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 9px;
  border: 1px solid color-mix(in srgb, var(--routine-theme), var(--color-border) 52%);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  background: linear-gradient(180deg, var(--routine-theme-soft), var(--color-bg-card));
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.routine-mood-strip {
  min-height: 50px;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
  padding: 8px;
  border: 2px solid color-mix(in srgb, var(--routine-theme), var(--em-block-border) 56%);
  border-radius: var(--radius-md);
  background:
    linear-gradient(90deg, var(--routine-theme-soft) 1px, transparent 1px),
    linear-gradient(var(--routine-theme-soft) 1px, transparent 1px),
    var(--color-bg-card);
  background-size: 24px 24px;
}

.routine-mood-tile {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 6px;
  border: 1px solid color-mix(in srgb, var(--routine-theme), var(--color-border) 48%);
  border-radius: var(--radius-sm);
  color: color-mix(in srgb, var(--routine-theme), white 36%);
  background: rgba(0, 0, 0, 0.16);
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
}

.routine-skills {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.routine-section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.routine-section-heading h3 {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 800;
}

@media (max-width: 680px) {
  .routine-header {
    flex-direction: column;
  }

  .routine-summary {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
