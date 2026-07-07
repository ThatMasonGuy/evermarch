<template>
  <div class="world-panel">
    <div class="world-header">
      <div>
        <h2 class="world-title">World</h2>
        <span class="world-sub">Training routes across Evermarch</span>
      </div>
      <div class="world-total">
        <MapPin :size="16" />
        <span>{{ store.totalLevel }} total levels</span>
      </div>
    </div>

    <section class="world-section">
      <div class="world-section-heading">
        <h3>Current Routes</h3>
      </div>
      <div class="world-lane-grid">
        <article
          v-for="lane in laneSummaries"
          :key="lane.id"
          class="world-lane-card"
          :class="`world-lane-card-${lane.id}`"
        >
          <div class="world-card-top">
            <div class="world-icon-pill">
              <component :is="iconComponent(lane.icon)" :size="16" />
            </div>
            <div>
              <div class="world-card-label">{{ lane.label }}</div>
              <div class="world-card-title">{{ lane.taskName }}</div>
            </div>
          </div>
          <div class="world-card-meta">
            <span>{{ lane.skillName }} Lv.{{ lane.skillLevel }}</span>
            <span>{{ lane.cadenceLabel }}</span>
          </div>
          <div class="world-output">{{ lane.outputLabel }}</div>
          <div
            v-if="lane.costLabel"
            class="world-cost"
            :class="{ 'world-cost-blocked': lane.hasCostBlockers }"
          >
            {{ lane.hasCostBlockers ? 'Needs' : 'Ready' }} {{ lane.costLabel }}
          </div>
          <div v-if="lane.id !== 'active'" class="world-route-bar">
            <div class="world-route-fill" :style="{ width: lane.progressPct + '%' }"></div>
          </div>
        </article>
      </div>
    </section>

    <section class="world-section">
      <div class="world-section-heading">
        <h3>Next Unlocks</h3>
      </div>
      <div class="world-unlock-grid">
        <article
          v-for="unlock in skillUnlocks"
          :key="unlock.id"
          class="world-unlock-card"
        >
          <div class="world-unlock-top">
            <div class="world-skill-icon" :style="{ color: unlock.color, background: unlock.color + '18' }">
              <component :is="iconComponent(unlock.icon)" :size="15" />
            </div>
            <div class="world-unlock-main">
              <div class="world-unlock-name">{{ unlock.name }}</div>
              <div class="world-unlock-level">Lv.{{ unlock.level }}</div>
            </div>
          </div>
          <div class="world-unlock-task">{{ unlock.nextTaskLabel }}</div>
          <div class="world-route-bar">
            <div class="world-route-fill" :style="{ width: unlock.progressPct + '%' }"></div>
          </div>
          <div class="world-unlock-xp">{{ unlock.xpLabel }}</div>
        </article>
      </div>
    </section>

    <section class="world-section">
      <div class="world-section-heading">
        <h3>Material Routes</h3>
      </div>
      <div class="world-chain-list">
        <article
          v-for="route in productionRoutes"
          :key="route.id"
          class="world-chain-row"
        >
          <div class="world-chain-skill" :style="{ borderColor: route.color }">
            <component :is="iconComponent(route.icon)" :size="16" />
            <span>{{ route.skillName }}</span>
          </div>
          <div class="world-chain-body">
            <div class="world-chain-title">{{ route.taskName }}</div>
            <div class="world-chain-output">
              <component :is="iconComponent(route.outputIcon)" :size="14" />
              <span>{{ route.outputLabel }}</span>
            </div>
            <div class="world-chain-inputs" v-if="route.inputs.length > 0">
              <div
                v-for="input in route.inputs"
                :key="input.resourceId"
                class="world-chain-input"
                :class="{ 'world-chain-input-blocked': !input.ready }"
              >
                <span>{{ input.needed }} {{ input.name }}</span>
                <small>{{ input.owned }} held - {{ input.sourceLabel }}</small>
              </div>
            </div>
            <div class="world-chain-inputs" v-else>
              <div class="world-chain-input world-chain-input-free">
                <span>No input materials</span>
                <small>Pure gathering route</small>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { computed } from 'vue'
import {
  BookOpen,
  Clock,
  Fish,
  FlameKindling,
  Gem,
  Hammer,
  MapPin,
  MousePointerClick,
  Package,
  Pickaxe,
  Sprout,
  TreePine,
} from 'lucide-vue-next'
import { useGameStore } from '../stores/gameStore'
import { ALL_TASKS, getTaskById, getTasksForSkill, type ResourceDrop, type TaskDefinition } from '../data/tasks'
import { SKILLS, SKILL_LIST, type LaneType, type SkillId } from '../data/skills'
import { getResourceDefinition, getResourceName } from '../data/resources'
import { xpForLevel } from '../data/xp'
import { formatCostReadiness, getCostReadiness, hasMissingCosts } from '../utils/taskCosts'

const store = useGameStore()

const ICONS: Record<string, Component> = {
  BookOpen,
  Clock,
  Fish,
  FlameKindling,
  Gem,
  Hammer,
  MapPin,
  MousePointerClick,
  Package,
  Pickaxe,
  Sprout,
  TreePine,
}

const LANE_CONFIG: Array<{ id: LaneType; label: string; icon: string }> = [
  { id: 'active', label: 'Active', icon: 'MousePointerClick' },
  { id: 'idle', label: 'Routine', icon: 'Clock' },
  { id: 'background', label: 'Background', icon: 'Sprout' },
]

const PRODUCTION_SKILLS: SkillId[] = [
  'firemaking',
  'cooking',
  'smithing',
  'fletching',
  'crafting',
  'runecrafting',
]

const laneSummaries = computed(() =>
  LANE_CONFIG.map((config) => {
    const lane = store.lanes[config.id]
    const task = lane.taskId ? getTaskById(lane.taskId) : undefined
    const multiplier = task && config.id === 'active' ? task.activeBoostMultiplier : 1
    const costs = task ? getCostReadiness(task.costs, store.getItemCount, multiplier) : []
    const skillDef = task ? SKILLS[task.skillId] : null
    const progressPct = task && config.id !== 'active'
      ? Math.min(100, Math.floor((lane.progress / task.baseInterval) * 100))
      : 0

    return {
      id: config.id,
      label: config.label,
      icon: config.icon,
      taskName: task?.name ?? 'No task selected',
      skillName: skillDef?.name ?? 'None',
      skillLevel: task ? store.getSkillLevel(task.skillId) : 0,
      cadenceLabel: task ? cadenceLabel(config.id, task) : 'Idle',
      outputLabel: task ? formatDrops(task.drops, multiplier) : 'No output',
      costLabel: formatCostReadiness(costs),
      hasCostBlockers: hasMissingCosts(costs),
      progressPct,
    }
  }),
)

const skillUnlocks = computed(() =>
  SKILL_LIST.map((skill) => {
    const level = store.getSkillLevel(skill.id)
    const xp = store.getSkill(skill.id).xp
    const tasks = getTasksForSkill(skill.id)
    const nextTask = tasks.find((task) => level < task.levelRequired) ?? null
    const currentLevelStart = xpForLevel(level)
    const nextTargetXp = nextTask ? xpForLevel(nextTask.levelRequired) : xpForLevel(99)
    const xpRemaining = Math.max(0, nextTargetXp - xp)
    const progressRange = Math.max(1, nextTargetXp - currentLevelStart)
    const progressPct = nextTask
      ? Math.min(100, Math.floor(((xp - currentLevelStart) / progressRange) * 100))
      : 100

    return {
      id: skill.id,
      name: skill.name,
      icon: skill.icon,
      color: skill.color,
      level,
      nextTaskLabel: nextTask ? `${taskChoiceLabel(nextTask)} at Lv.${nextTask.levelRequired}` : 'All tasks unlocked',
      xpLabel: nextTask ? `${xpRemaining.toLocaleString()} XP to unlock` : 'Level 99 route complete',
      progressPct,
    }
  }),
)

const productionRoutes = computed(() =>
  PRODUCTION_SKILLS.map((skillId) => {
    const skillDef = SKILLS[skillId]
    const task = currentUnlockedTask(skillId)
    const costs = task ? getCostReadiness(task.costs, store.getItemCount) : []
    const outputDrop = task?.drops[0]
    const outputIcon = outputDrop ? getResourceDefinition(outputDrop.resourceId).icon : 'Package'

    return {
      id: skillId,
      skillName: skillDef.name,
      icon: skillDef.icon,
      color: skillDef.color,
      taskName: task?.name ?? 'No route',
      outputIcon,
      outputLabel: task ? formatDrops(task.drops) : 'No output',
      inputs: costs.map((cost) => ({
        ...cost,
        sourceLabel: sourceLabelForResource(cost.resourceId),
      })),
    }
  }),
)

function iconComponent(name: string): Component {
  return ICONS[name] ?? Package
}

function cadenceLabel(laneType: LaneType, task: TaskDefinition): string {
  if (laneType === 'active') return 'Per click'
  return `${(task.baseInterval / 1000).toFixed(1)}s cycle`
}

function formatDrops(drops: ResourceDrop[], multiplier = 1): string {
  return drops
    .map((drop) => `+${(drop.amount * multiplier).toLocaleString()} ${getResourceName(drop.resourceId)}`)
    .join(', ')
}

function currentUnlockedTask(skillId: SkillId): TaskDefinition | null {
  const level = store.getSkillLevel(skillId)
  const unlocked = getTasksForSkill(skillId).filter((task) => level >= task.levelRequired)
  return unlocked[unlocked.length - 1] ?? null
}

function sourceLabelForResource(resourceId: string): string {
  const producer = ALL_TASKS.find((task) =>
    task.drops.some((drop) => drop.resourceId === resourceId)
  )

  if (!producer) return 'Inventory'
  return `${SKILLS[producer.skillId].name}: ${taskChoiceLabel(producer)}`
}

function taskChoiceLabel(taskDef: TaskDefinition): string {
  return taskDef.name.replace(/^(Mine|Chop|Fish|Kindle|Cook|Forge|Shape|Craft|Bind|Grow)\s+/, '')
}
</script>

<style scoped>
.world-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.world-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.world-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
}

.world-sub {
  color: var(--color-text-muted);
  font-size: 13px;
}

.world-total {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  color: var(--color-accent-light);
  background: var(--color-bg-card);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.world-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.world-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.world-section-heading h3 {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.world-lane-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.world-lane-card,
.world-unlock-card,
.world-chain-row {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
}

.world-lane-card {
  display: flex;
  flex-direction: column;
  gap: 9px;
  min-height: 150px;
  padding: 12px;
}

.world-lane-card-active {
  border-color: rgba(52, 211, 153, 0.55);
}

.world-lane-card-idle {
  border-color: rgba(251, 191, 36, 0.45);
}

.world-lane-card-background {
  border-color: rgba(167, 139, 250, 0.45);
}

.world-card-top,
.world-unlock-top {
  display: flex;
  align-items: center;
  gap: 9px;
}

.world-icon-pill,
.world-skill-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--color-accent-light);
  background: var(--color-accent-glow);
}

.world-card-label {
  color: var(--color-text-muted);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

.world-card-title,
.world-chain-title {
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.world-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  color: var(--color-text-muted);
  font-size: 11px;
}

.world-output,
.world-chain-output {
  color: var(--color-accent-light);
  font-size: 12px;
  font-weight: 700;
}

.world-cost {
  color: #86efac;
  font-size: 11px;
  line-height: 1.35;
}

.world-cost-blocked {
  color: #fecaca;
}

.world-route-bar {
  height: 4px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--color-bg-elevated);
}

.world-route-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--color-accent-dim), var(--color-accent));
}

.world-unlock-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
}

.world-unlock-card {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-height: 132px;
  padding: 10px;
}

.world-unlock-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.world-unlock-name {
  color: var(--color-text-primary);
  font-size: 12px;
  font-weight: 700;
}

.world-unlock-level,
.world-unlock-xp {
  color: var(--color-text-muted);
  font-size: 11px;
  white-space: nowrap;
}

.world-unlock-task {
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.35;
  min-height: 32px;
}

.world-chain-list {
  display: grid;
  gap: 8px;
}

.world-chain-row {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 12px;
  padding: 10px;
}

.world-chain-skill {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  align-self: start;
  padding: 7px 9px;
  border-left: 3px solid var(--color-accent);
  color: var(--color-text-primary);
  font-size: 12px;
  font-weight: 700;
  background: var(--color-bg-surface);
  border-radius: var(--radius-sm);
}

.world-chain-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.world-chain-output {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.world-chain-inputs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.world-chain-input {
  min-height: 34px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 5px 7px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(134, 239, 172, 0.28);
  color: #bbf7d0;
  background: rgba(34, 197, 94, 0.08);
}

.world-chain-input span {
  font-size: 11px;
  font-weight: 700;
}

.world-chain-input small {
  color: var(--color-text-muted);
  font-size: 10px;
}

.world-chain-input-blocked {
  border-color: rgba(248, 113, 113, 0.38);
  color: #fecaca;
  background: rgba(248, 113, 113, 0.08);
}

.world-chain-input-free {
  border-color: var(--color-border);
  color: var(--color-text-secondary);
  background: var(--color-bg-surface);
}

@media (max-width: 1024px) {
  .world-lane-grid {
    grid-template-columns: 1fr;
  }

  .world-chain-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .world-header {
    flex-direction: column;
  }

  .world-total {
    width: 100%;
    justify-content: center;
  }
}
</style>
