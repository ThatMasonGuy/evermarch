<template>
  <div class="skill-selector-rail" :aria-label="ariaLabel">
    <button
      v-for="skill in items"
      :key="skill.id"
      type="button"
      class="skill-selector-card"
      :class="{ 'skill-selector-card-current': skill.selected }"
      :disabled="skill.disabled"
      :aria-pressed="skill.selected"
      :title="skill.title"
      @click="$emit('select', skill.id)"
    >
      <div class="skill-selector-icon" :style="{ background: skill.color + '18', color: skill.color }">
        <img v-if="skill.sprite" :src="skill.sprite" alt="" class="skill-selector-sprite" />
        <template v-else>
          <Pickaxe v-if="skill.icon === 'Pickaxe'" :size="18" />
          <TreePine v-else-if="skill.icon === 'TreePine'" :size="18" />
          <Fish v-else-if="skill.icon === 'Fish'" :size="18" />
          <Sprout v-else-if="skill.icon === 'Sprout'" :size="18" />
          <FlameKindling v-else-if="skill.icon === 'FlameKindling'" :size="18" />
          <Hammer v-else-if="skill.icon === 'Hammer'" :size="18" />
          <BookOpen v-else-if="skill.icon === 'BookOpen'" :size="18" />
          <BookOpen v-else :size="18" />
        </template>
      </div>
      <div class="skill-selector-info">
        <div class="skill-selector-title-row">
          <div class="skill-selector-name">{{ skill.name }}</div>
          <div class="skill-selector-level">Lv. {{ skill.level }}</div>
        </div>
        <div class="skill-selector-bar">
          <div
            class="skill-selector-bar-fill"
            :style="{ width: (skill.progress * 100) + '%', background: skill.color }"
          ></div>
        </div>
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
import { BookOpen, Fish, FlameKindling, Hammer, Pickaxe, Sprout, TreePine } from 'lucide-vue-next'
import type { SkillId } from '../data/skills'

interface SkillSelectorRailItem {
  id: SkillId
  name: string
  level: number
  progress: number
  color: string
  icon: string
  sprite: string | null
  disabled?: boolean
  selected?: boolean
  title?: string
}

defineProps<{
  items: SkillSelectorRailItem[]
  ariaLabel: string
}>()

defineEmits<{
  select: [id: SkillId]
}>()
</script>

<style scoped>
.skill-selector-rail {
  min-width: 0;
  max-width: 100%;
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 4px;
  scrollbar-gutter: stable;
}

.skill-selector-card {
  flex: 0 0 auto;
  width: max-content;
  min-height: 68px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: var(--radius-md);
  border: 2px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 700;
  text-align: left;
  transition: all var(--transition-fast);
  position: relative;
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}

.skill-selector-card:hover:not(:disabled) {
  border-color: var(--color-border-hover);
  color: var(--color-text-primary);
  background: var(--color-bg-card-hover);
}

.skill-selector-card-current {
  border-color: var(--color-accent);
  background: linear-gradient(180deg, rgba(251, 191, 36, 0.08), var(--color-bg-card));
  box-shadow: inset 0 0 0 1px rgba(251, 191, 36, 0.16);
}

.skill-selector-card:disabled {
  cursor: not-allowed;
  opacity: 0.52;
}

.skill-selector-icon {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.skill-selector-sprite {
  width: 28px;
  height: 28px;
  object-fit: contain;
  filter: drop-shadow(0 3px 0 rgba(0, 0, 0, 0.22));
}

.skill-selector-info {
  flex: 1 0 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.skill-selector-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.skill-selector-name {
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
}

.skill-selector-level {
  flex-shrink: 0;
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.skill-selector-bar {
  height: 6px;
  background: var(--color-bg-elevated);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.skill-selector-bar-fill {
  height: 100%;
  border-radius: var(--radius-sm);
  transition: width 0.3s ease;
}

@media (max-width: 900px) {
  .skill-selector-rail {
    padding-bottom: 2px;
  }
}
</style>
