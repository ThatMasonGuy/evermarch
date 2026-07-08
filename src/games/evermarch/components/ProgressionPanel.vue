<template>
  <div class="progression-panel">
    <div class="progression-header">
      <div>
        <h2 class="progression-title">Progression</h2>
        <span class="progression-sub">Lifetime stats and completion</span>
      </div>
      <div class="progression-total">
        <Trophy :size="16" />
        <span>{{ progress.overallPercent }}% complete</span>
      </div>
    </div>

    <section class="progression-overview">
      <article
        v-for="metric in overviewMetrics"
        :key="metric.id"
        class="progression-metric"
      >
        <div class="progression-metric-top">
          <component :is="metric.icon" :size="15" />
          <span>{{ metric.label }}</span>
        </div>
        <strong>{{ metric.value }}</strong>
        <div class="progression-bar">
          <div class="progression-fill" :style="{ width: metric.percent + '%' }"></div>
        </div>
      </article>
    </section>

    <section class="progression-section">
      <div class="progression-section-heading">
        <h3>Time</h3>
      </div>
      <div class="progression-stat-grid">
        <div
          v-for="stat in timeStats"
          :key="stat.label"
          class="progression-stat-row"
          :class="{ 'progression-stat-row-tooltip': stat.tooltip }"
          :title="stat.tooltip"
          :tabindex="stat.tooltip ? 0 : undefined"
          :aria-label="stat.tooltip ? `${stat.label}: ${stat.value}. ${stat.tooltip}` : undefined"
        >
          <span>
            {{ stat.label }}
            <Info v-if="stat.tooltip" :size="12" />
          </span>
          <strong>{{ stat.value }}</strong>
          <span v-if="stat.tooltip" class="progression-tooltip">{{ stat.tooltip }}</span>
        </div>
      </div>
    </section>

    <section class="progression-section">
      <div class="progression-section-heading">
        <h3>Economy</h3>
      </div>
      <div class="progression-stat-grid">
        <div v-for="stat in economyStats" :key="stat.label" class="progression-stat-row">
          <span>{{ stat.label }}</span>
          <strong>{{ stat.value }}</strong>
        </div>
      </div>
    </section>

    <section class="progression-section">
      <div class="progression-section-heading">
        <h3>Skills</h3>
      </div>
      <div class="progression-skill-list">
        <article
          v-for="skill in skillRows"
          :key="skill.id"
          class="progression-skill-row"
        >
          <div class="progression-skill-icon" :style="{ color: skill.color, background: skill.color + '18' }">
            <component :is="iconComponent(skill.icon)" :size="15" />
          </div>
          <div class="progression-skill-main">
            <div class="progression-row-title">{{ skill.name }}</div>
            <div class="progression-row-meta">
              Lv. {{ skill.level }} - {{ skill.actions }} actions - {{ skill.time }}
            </div>
          </div>
          <div class="progression-skill-detail">
            <span>{{ skill.masteredTasks }}/{{ skill.totalTasks }} mastered</span>
            <small>{{ skill.masteryPercent }}% - Avg M.{{ skill.averageMasteryLevel }}</small>
          </div>
          <div
            class="progression-skill-detail"
            :class="{ 'progression-skill-detail-complete': skill.trueMastery }"
          >
            <span>{{ skill.tasksWorked }}/{{ skill.totalTasks }} worked</span>
            <small>{{ skill.xp }} XP</small>
          </div>
        </article>
      </div>
    </section>

    <section class="progression-columns">
      <div class="progression-section">
        <div class="progression-section-heading">
          <h3>Recent Finds</h3>
        </div>
        <div v-if="recentItems.length > 0" class="progression-item-list">
          <article
            v-for="item in recentItems"
            :key="item.id"
            class="progression-item-row"
          >
            <component :is="iconComponent(item.icon)" :size="14" />
            <div class="progression-item-main">
              <span>{{ item.name }}</span>
              <small>{{ item.firstLabel }} - {{ item.lastLabel }}</small>
            </div>
            <strong>{{ item.acquired }}</strong>
          </article>
        </div>
        <div v-else class="progression-empty">No items acquired yet.</div>
      </div>

      <div class="progression-section">
        <div class="progression-section-heading">
          <h3>Missing Items</h3>
          <span>{{ progress.items.missing.length }} left</span>
        </div>
        <div v-if="missingItems.length > 0" class="progression-chip-list">
          <span
            v-for="item in missingItems"
            :key="item.id"
            class="progression-chip"
          >
            {{ item.name }}
          </span>
        </div>
        <div v-else class="progression-empty">Every known item has been collected.</div>
      </div>
    </section>

    <section class="progression-section">
      <div class="progression-section-heading">
        <h3>Task Mastery</h3>
        <span>{{ progress.tasks.mastered }}/{{ progress.tasks.total }} mastered, {{ progress.tasks.unworkedTaskIds.length }} untouched</span>
      </div>
      <div v-if="taskRows.length > 0" class="progression-task-list">
        <article
          v-for="task in taskRows"
          :key="task.id"
          class="progression-task-row"
        >
          <div>
            <div class="progression-row-title">{{ task.name }}</div>
            <div class="progression-row-meta">{{ task.skillName }} - {{ task.time }}</div>
          </div>
          <div class="progression-task-mastery">
            <div class="progression-task-mastery-top">
              <strong>M.{{ task.masteryLevel }}</strong>
              <span>{{ task.masteryPercent }}%</span>
            </div>
            <div class="progression-task-mastery-bar">
              <div
                class="progression-task-mastery-fill"
                :style="{ width: task.masteryPercent + '%' }"
              ></div>
            </div>
          </div>
          <div class="progression-task-detail">
            <strong>{{ task.actions }}</strong>
            <span>actions</span>
          </div>
          <div class="progression-task-detail">
            <strong>{{ task.isMastered ? 'Done' : task.masteryXpToNext }}</strong>
            <span>{{ task.isMastered ? 'mastered' : 'XP next' }}</span>
          </div>
        </article>
      </div>
      <div v-else class="progression-empty">No task mastery yet.</div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { computed, markRaw } from 'vue'
import {
  BarChart3,
  BookOpen,
  Fish,
  FlameKindling,
  Gem,
  Hammer,
  Info,
  ListChecks,
  Package,
  Pickaxe,
  Sprout,
  Star,
  TreePine,
  Trophy,
} from 'lucide-vue-next'
import { useGameStore } from '../stores/gameStore'
import { SKILLS, SKILL_LIST } from '../data/skills'
import { ALL_TASKS, getTasksForSkill } from '../data/tasks'
import { getResourceDefinition } from '../data/resources'

const store = useGameStore()

const ICONS: Record<string, Component> = {
  BookOpen,
  Fish,
  FlameKindling,
  Gem,
  Hammer,
  Package,
  Pickaxe,
  Sprout,
  Star,
  TreePine,
}

const progress = computed(() => store.completionProgress)
const account = computed(() => store.stats.account)

const overviewMetrics = computed(() => [
  {
    id: 'overall',
    label: 'Overall',
    value: `${progress.value.overallPercent}%`,
    percent: progress.value.overallPercent,
    icon: markRaw(BarChart3),
  },
  {
    id: 'items',
    label: 'Items',
    value: `${progress.value.items.collected}/${progress.value.items.total}`,
    percent: progress.value.items.percent,
    icon: markRaw(Package),
  },
  {
    id: 'skills',
    label: 'Skills 99',
    value: `${progress.value.skills.completed}/${progress.value.skills.total}`,
    percent: progress.value.skills.percent,
    icon: markRaw(Star),
  },
  {
    id: 'tasks',
    label: 'Task Mastery',
    value: `${progress.value.tasks.mastered}/${progress.value.tasks.total}`,
    percent: progress.value.tasks.percent,
    icon: markRaw(ListChecks),
  },
  {
    id: 'mastery',
    label: 'True Mastery',
    value: `${progress.value.trueMastery.readySkills}/${progress.value.trueMastery.total}`,
    percent: progress.value.trueMastery.percent,
    icon: markRaw(Trophy),
  },
  {
    id: 'worked',
    label: 'Tasks Worked',
    value: `${progress.value.tasks.worked}/${progress.value.tasks.total}`,
    percent: progress.value.tasks.workedPercent,
    icon: markRaw(Pickaxe),
  },
])

const timeStats = computed(() => [
  { label: 'Account Age', value: formatDuration(store.accountAgeMs) },
  { label: 'Online Play', value: formatDuration(account.value.onlinePlayMs) },
  {
    label: 'Active Work',
    value: `${formatDuration(account.value.activeWorkMs)} (${formatNumber(account.value.activeClickCount)} clicks)`,
    tooltip: `Based on ${formatNumber(account.value.activeClickCount)} active clicks, active play saved about ${formatDuration(account.value.activeSavedMs)} beyond routine pace.`,
  },
  { label: 'Routine Work', value: formatDuration(account.value.idleWorkMs) },
  { label: 'Background Work', value: formatDuration(account.value.backgroundWorkMs) },
  { label: 'Offline Credited', value: formatDuration(account.value.offlineCreditedMs) },
  { label: 'Offline Missed', value: formatDuration(account.value.offlineMissedMs) },
])

const economyStats = computed(() => [
  { label: 'Current Gold', value: `${formatNumber(store.gold)} gold` },
  { label: 'Total Gold Earned', value: `${formatNumber(account.value.totalGoldEarned)} gold` },
  { label: 'Inventory Value', value: `${formatNumber(store.inventoryValue)} gold` },
  { label: 'Items Acquired', value: formatNumber(account.value.totalItemsAcquired) },
  { label: 'Items Sold', value: formatNumber(account.value.totalItemsSold) },
])

const skillRows = computed(() =>
  SKILL_LIST.map((skill) => {
    const stats = store.getSkillStats(skill.id)
    const taskCount = getTasksForSkill(skill.id).length
    const tasksWorked = getTasksForSkill(skill.id).filter((task) => store.getTaskStats(task.id).actions > 0).length
    const mastery = store.getSkillMasterySummary(skill.id)

    return {
      id: skill.id,
      name: skill.name,
      icon: skill.icon,
      color: skill.color,
      level: store.getSkillLevel(skill.id),
      xp: formatNumber(store.getSkill(skill.id).xp),
      actions: formatNumber(stats.actions),
      time: formatDuration(stats.timeMs),
      tasksWorked,
      totalTasks: taskCount,
      masteredTasks: mastery.masteredTasks,
      masteryPercent: mastery.percent,
      averageMasteryLevel: mastery.averageLevel,
      trueMastery: mastery.trueMastery,
    }
  }),
)

const recentItems = computed(() =>
  Object.entries(store.stats.items)
    .filter(([, stats]) => stats.acquired > 0)
    .map(([resourceId, stats]) => {
      const resource = getResourceDefinition(resourceId)
      return {
        id: resourceId,
        name: resource.name,
        icon: resource.icon,
        acquired: formatNumber(stats.acquired),
        firstLabel: `First ${formatDate(stats.firstAcquiredAt)}`,
        lastLabel: `Last ${formatDate(stats.lastAcquiredAt)}`,
        sortAt: stats.lastAcquiredAt ?? 0,
      }
    })
    .sort((a, b) => b.sortAt - a.sortAt || a.name.localeCompare(b.name))
    .slice(0, 8),
)

const missingItems = computed(() =>
  progress.value.items.missing
    .map((resourceId) => {
      const resource = getResourceDefinition(resourceId)
      return { id: resourceId, name: resource.name }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 18),
)

const taskRows = computed(() =>
  ALL_TASKS
    .map((task) => {
      const stats = store.getTaskStats(task.id)
      const masteryXp = store.getTaskMasteryXp(task.id)
      const masteryProgress = store.getTaskMasteryProgress(task.id)
      return {
        id: task.id,
        name: task.name,
        skillName: SKILLS[task.skillId].name,
        actionsRaw: stats.actions,
        masteryXpRaw: masteryXp,
        masteryLevelRaw: store.getTaskMasteryLevel(task.id),
        actions: formatNumber(stats.actions),
        time: formatDuration(stats.timeMs),
        masteryLevel: store.getTaskMasteryLevel(task.id),
        masteryPercent: Math.round(masteryProgress * 100),
        masteryXpToNext: formatNumber(store.getTaskMasteryXpToNext(task.id)),
        isMastered: store.isTaskMastered(task.id),
      }
    })
    .filter((task) => task.actionsRaw > 0 || task.masteryXpRaw > 0)
    .sort((a, b) =>
      b.masteryXpRaw - a.masteryXpRaw
      || b.actionsRaw - a.actionsRaw
      || a.name.localeCompare(b.name)
    )
    .slice(0, 12),
)

function iconComponent(name: string): Component {
  return ICONS[name] ?? Package
}

function formatNumber(value: number): string {
  return Math.floor(value).toLocaleString()
}

function formatDate(value: number | null): string {
  if (!value) return 'unknown'
  return new Date(value).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
  })
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '0m'

  const totalSeconds = Math.floor(ms / 1000)
  const totalMinutes = Math.floor(totalSeconds / 60)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  const seconds = totalSeconds % 60

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
  return `${Math.max(1, seconds)}s`
}
</script>

<style scoped>
.progression-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.progression-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.progression-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
}

.progression-sub {
  color: var(--color-text-muted);
  font-size: 13px;
}

.progression-total {
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

.progression-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 8px;
}

.progression-metric,
.progression-section,
.progression-skill-row,
.progression-item-row,
.progression-task-row {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
}

.progression-metric {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 11px;
}

.progression-metric-top {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 700;
}

.progression-metric-top svg {
  color: var(--color-accent-light);
}

.progression-metric strong {
  color: var(--color-text-primary);
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}

.progression-bar {
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--color-bg-elevated);
}

.progression-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--color-accent-dim), var(--color-accent));
}

.progression-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}

.progression-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.progression-section-heading h3 {
  font-family: var(--font-display);
  color: var(--color-text-primary);
  font-size: 15px;
  font-weight: 700;
}

.progression-section-heading span {
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 700;
}

.progression-stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 7px;
}

.progression-stat-row {
  position: relative;
  min-height: 34px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 9px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-surface);
}

.progression-stat-row span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-text-muted);
  font-size: 11px;
}

.progression-stat-row strong {
  color: var(--color-text-primary);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.progression-stat-row-tooltip {
  cursor: help;
}

.progression-stat-row-tooltip:hover .progression-tooltip,
.progression-stat-row-tooltip:focus-within .progression-tooltip {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.progression-tooltip {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: calc(100% + 6px);
  z-index: 5;
  display: block;
  padding: 7px 8px;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-sm);
  background: var(--color-bg-elevated);
  color: var(--color-text-secondary);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.34);
  font-size: 11px;
  line-height: 1.35;
  opacity: 0;
  transform: translateY(4px);
  pointer-events: none;
  transition: opacity var(--transition-fast), transform var(--transition-fast);
}

.progression-skill-list,
.progression-item-list,
.progression-task-list {
  display: grid;
  gap: 7px;
}

.progression-skill-row,
.progression-task-row {
  min-width: 0;
  display: grid;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
}

.progression-skill-row {
  grid-template-columns: 32px minmax(0, 1fr) auto auto;
}

.progression-task-row {
  grid-template-columns: minmax(0, 1fr) minmax(104px, 150px) auto auto;
}

.progression-skill-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
}

.progression-skill-main,
.progression-item-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.progression-row-title,
.progression-item-main span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-primary);
  font-size: 12px;
  font-weight: 700;
}

.progression-row-meta,
.progression-item-main small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-muted);
  font-size: 11px;
}

.progression-skill-detail,
.progression-task-detail {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  color: var(--color-text-muted);
  font-size: 11px;
  white-space: nowrap;
}

.progression-skill-detail span,
.progression-task-detail strong {
  color: var(--color-accent-light);
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.progression-skill-detail-complete span {
  color: #fde68a;
}

.progression-skill-detail small,
.progression-task-detail span {
  color: var(--color-text-muted);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.progression-task-mastery {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progression-task-mastery-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--color-text-muted);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.progression-task-mastery-top strong {
  color: #fde68a;
  font-size: 12px;
}

.progression-task-mastery-bar {
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--color-bg-elevated);
}

.progression-task-mastery-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #d97706, #fde68a);
}

.progression-columns {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 10px;
}

.progression-item-row {
  min-width: 0;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 8px 9px;
}

.progression-item-row svg {
  color: var(--color-accent-light);
}

.progression-item-row strong {
  color: var(--color-accent-light);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.progression-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.progression-chip {
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  padding: 4px 7px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-surface);
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 700;
}

.progression-empty {
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-size: 12px;
  text-align: center;
}

@media (max-width: 1180px) {
  .progression-skill-row {
    grid-template-columns: 32px minmax(0, 1fr) auto;
  }

  .progression-skill-detail-complete {
    grid-column: 2 / -1;
    align-items: flex-start;
  }
}

@media (max-width: 820px) {
  .progression-overview,
  .progression-columns {
    grid-template-columns: 1fr;
  }

  .progression-header {
    flex-direction: column;
  }

  .progression-total {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 560px) {
  .progression-skill-row,
  .progression-task-row {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .progression-skill-icon {
    display: none;
  }

  .progression-skill-detail,
  .progression-task-detail {
    align-items: flex-start;
  }
}
</style>
