<template>
  <div class="quests-panel">
    <div class="quests-header">
      <div>
        <h2 class="quests-title">Quests</h2>
        <span class="quests-sub">Skill goals for the next useful step.</span>
      </div>
      <div class="quests-summary">
        <div class="quests-pill">
          <ListChecks :size="15" />
          <span>{{ completedCount }}/{{ questCards.length }} complete</span>
        </div>
        <div class="quests-pill quests-pill-ready" :class="{ 'quests-pill-lit': readyQuestCount > 0 }">
          <Bell :size="15" />
          <span>{{ readyQuestCount }} ready</span>
        </div>
      </div>
    </div>

    <section class="quest-grid">
      <article
        v-for="quest in questCards"
        :key="quest.id"
        class="quest-card"
        :class="{
          'quest-card-ready': quest.ready,
          'quest-card-complete': quest.complete,
        }"
      >
        <div class="quest-top">
          <div class="quest-icon" :style="{ color: quest.color, background: quest.color + '18' }">
            <component :is="iconComponent(quest.icon)" :size="18" />
          </div>
          <div class="quest-main">
            <div class="quest-skill">{{ quest.skillName }}</div>
            <h3>{{ quest.title }}</h3>
          </div>
          <span class="quest-state">{{ quest.stateLabel }}</span>
        </div>

        <p class="quest-desc">{{ quest.description }}</p>

        <div class="quest-progress-row">
          <span>{{ quest.progressLabel }}</span>
          <span>{{ quest.progressPct }}%</span>
        </div>
        <div class="quest-progress">
          <div class="quest-progress-fill" :style="{ width: quest.progressPct + '%' }"></div>
        </div>

        <div class="quest-bottom">
          <div class="quest-reward">
            <Gift :size="13" />
            <span>{{ quest.reward }}</span>
          </div>
          <button type="button" class="quest-action" @click="$emit('navigate', quest.destination)">
            <ArrowRight :size="13" />
            <span>{{ quest.actionLabel }}</span>
          </button>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { computed } from 'vue'
import {
  ArrowRight,
  Bell,
  BookOpen,
  Clock,
  Fish,
  FlameKindling,
  Gift,
  Hammer,
  ListChecks,
  Package,
  Pickaxe,
  Sprout,
  TreePine,
} from 'lucide-vue-next'
import { useGameStore } from '../stores/gameStore'
import { getTasksForSkill, type TaskDefinition } from '../data/tasks'
import { SKILL_LIST, type SkillDefinition, type SkillId } from '../data/skills'
import { xpForLevel } from '../data/xp'

type QuestDestination = 'active' | 'routine' | 'farming'

interface QuestCard {
  id: string
  skillId: SkillId
  skillName: string
  icon: string
  color: string
  title: string
  description: string
  reward: string
  progressLabel: string
  progressPct: number
  destination: QuestDestination
  actionLabel: string
  stateLabel: string
  ready: boolean
  complete: boolean
}

defineEmits<{
  navigate: [destination: QuestDestination]
}>()

const store = useGameStore()

const ICONS: Record<string, Component> = {
  BookOpen,
  Clock,
  Fish,
  FlameKindling,
  Hammer,
  Package,
  Pickaxe,
  Sprout,
  TreePine,
}

const questCards = computed(() =>
  SKILL_LIST.map((skill) => skill.id === 'farming' ? farmingQuest(skill) : skillQuest(skill))
)

const completedCount = computed(() => questCards.value.filter((quest) => quest.complete).length)
const readyQuestCount = computed(() => questCards.value.filter((quest) => quest.ready).length)

function skillQuest(skill: SkillDefinition): QuestCard {
  const level = store.getSkillLevel(skill.id)
  const xp = store.getSkill(skill.id).xp
  const tasks = getTasksForSkill(skill.id)
  const unlockedTasks = tasks.filter((task) => level >= task.levelRequired)
  const currentTask = unlockedTasks[unlockedTasks.length - 1] ?? tasks[0]!
  const nextTask = tasks.find((task) => level < task.levelRequired) ?? null
  const destination: QuestDestination = skill.id === 'mining' ? 'active' : 'routine'

  if (nextTask) {
    const currentLevelXp = xpForLevel(level)
    const targetXp = xpForLevel(nextTask.levelRequired)
    const progress = Math.max(0, xp - currentLevelXp)
    const target = Math.max(1, targetXp - currentLevelXp)
    const progressPct = percent(progress, target)

    return {
      id: `${skill.id}-unlock-${nextTask.id}`,
      skillId: skill.id,
      skillName: skill.name,
      icon: skill.icon,
      color: skill.color,
      title: `Unlock ${taskChoiceLabel(nextTask)}`,
      description: `Work ${taskChoiceLabel(currentTask)} until ${skill.name} reaches Lv.${nextTask.levelRequired}.`,
      reward: `New ${skill.name} route`,
      progressLabel: `${Math.min(progress, target).toLocaleString()} / ${target.toLocaleString()} XP`,
      progressPct,
      destination,
      actionLabel: destination === 'active' ? 'Open Active' : 'Open Routine',
      stateLabel: progressPct >= 100 ? 'Complete' : `Lv.${level}`,
      ready: false,
      complete: progressPct >= 100,
    }
  }

  const actions = store.getTaskStats(currentTask.id).actions
  const target = nextActionMilestone(actions)
  const progressPct = percent(actions, target)

  return {
    id: `${skill.id}-actions-${target}`,
    skillId: skill.id,
    skillName: skill.name,
    icon: skill.icon,
    color: skill.color,
    title: `Prove ${taskChoiceLabel(currentTask)}`,
    description: `Complete ${target.toLocaleString()} ${skill.name} actions on the current route.`,
    reward: 'Mastery progress',
    progressLabel: `${Math.min(actions, target).toLocaleString()} / ${target.toLocaleString()} actions`,
    progressPct,
    destination,
    actionLabel: destination === 'active' ? 'Open Active' : 'Open Routine',
    stateLabel: progressPct >= 100 ? 'Complete' : 'In progress',
    ready: false,
    complete: progressPct >= 100,
  }
}

function farmingQuest(skill: SkillDefinition): QuestCard {
  const unlockedFields = store.unlockedFarmingPlotCount
  const plantedFields = store.plantedFarmingPlotCount
  const readyFields = store.readyFarmingPlotCount
  const farmingTasks = getTasksForSkill('farming')
  const level = store.getSkillLevel('farming')
  const unlockedFarmingTasks = farmingTasks.filter((task) => level >= task.levelRequired)
  const unlockedTask = unlockedFarmingTasks[unlockedFarmingTasks.length - 1] ?? farmingTasks[0]!

  if (readyFields > 0) {
    return {
      id: 'farming-harvest-ready',
      skillId: 'farming',
      skillName: skill.name,
      icon: skill.icon,
      color: skill.color,
      title: 'Harvest Ready Fields',
      description: `${readyFields} field${readyFields === 1 ? ' is' : 's are'} ready to collect.`,
      reward: 'Crop batch and Farming XP',
      progressLabel: `${readyFields} ready`,
      progressPct: 100,
      destination: 'farming',
      actionLabel: 'Open Farming',
      stateLabel: 'Ready',
      ready: true,
      complete: false,
    }
  }

  if (plantedFields < unlockedFields) {
    const progressPct = percent(plantedFields, unlockedFields)
    return {
      id: 'farming-fill-fields',
      skillId: 'farming',
      skillName: skill.name,
      icon: skill.icon,
      color: skill.color,
      title: 'Plant Every Field',
      description: 'Keep every unlocked field growing so future harvests land in batches.',
      reward: 'More background harvests',
      progressLabel: `${plantedFields} / ${unlockedFields} fields planted`,
      progressPct,
      destination: 'farming',
      actionLabel: 'Open Farming',
      stateLabel: 'Open fields',
      ready: false,
      complete: false,
    }
  }

  const actions = store.getTaskStats(unlockedTask.id).actions
  const target = nextActionMilestone(actions)
  const progressPct = percent(actions, target)

  return {
    id: `farming-harvest-${target}`,
    skillId: 'farming',
    skillName: skill.name,
    icon: skill.icon,
    color: skill.color,
    title: `Harvest ${taskChoiceLabel(unlockedTask)}`,
    description: `Return after the fields mature and keep building ${taskChoiceLabel(unlockedTask)} mastery.`,
    reward: 'Crop mastery and future fields',
    progressLabel: `${Math.min(actions, target).toLocaleString()} / ${target.toLocaleString()} harvests`,
    progressPct,
    destination: 'farming',
    actionLabel: 'Open Farming',
    stateLabel: 'Growing',
    ready: false,
    complete: progressPct >= 100,
  }
}

function iconComponent(name: string): Component {
  return ICONS[name] ?? ListChecks
}

function nextActionMilestone(current: number): number {
  return [1, 10, 25, 100, 250, 1000, 2500, 5000].find((target) => current < target) ?? current + 5000
}

function percent(value: number, target: number): number {
  if (target <= 0) return 100
  return Math.min(100, Math.max(0, Math.floor((value / target) * 100)))
}

function taskChoiceLabel(task: TaskDefinition): string {
  return task.name.replace(/^(Mine|Chop|Fish|Kindle|Cook|Forge|Shape|Craft|Bind|Grow)\s+/, '')
}
</script>

<style scoped>
.quests-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.quests-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.quests-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
}

.quests-sub {
  color: var(--color-text-muted);
  font-size: 13px;
}

.quests-summary {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 7px;
}

.quests-pill {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 9px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  background: var(--color-bg-card);
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.quests-pill-ready {
  color: #fde68a;
}

.quests-pill-lit {
  border-color: rgba(246, 211, 107, 0.7);
  background: rgba(246, 211, 107, 0.12);
}

.quest-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
}

.quest-card {
  min-height: 206px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.05), inset 0 -3px 0 rgba(0, 0, 0, 0.18);
}

.quest-card-ready {
  border-color: rgba(246, 211, 107, 0.82);
}

.quest-card-complete {
  border-color: rgba(134, 239, 172, 0.45);
}

.quest-top {
  display: flex;
  align-items: flex-start;
  gap: 9px;
}

.quest-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-sm);
}

.quest-main {
  min-width: 0;
  flex: 1;
}

.quest-skill {
  color: var(--color-text-muted);
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
}

.quest-main h3 {
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 900;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.quest-state {
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  padding: 3px 7px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  background: var(--color-bg-surface);
  font-size: 10px;
  font-weight: 900;
  white-space: nowrap;
}

.quest-desc {
  min-height: 42px;
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.45;
}

.quest-progress-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 800;
}

.quest-progress {
  height: 7px;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: var(--color-bg-elevated);
}

.quest-progress-fill {
  height: 100%;
  border-radius: var(--radius-sm);
  background: linear-gradient(90deg, var(--em-grass-dark), var(--em-gold));
  transition: width 0.3s ease;
}

.quest-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
}

.quest-reward {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #fde68a;
  font-size: 11px;
  font-weight: 800;
}

.quest-reward span {
  overflow-wrap: anywhere;
}

.quest-action {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 6px 9px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  background: var(--color-bg-surface);
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 900;
  cursor: pointer;
  white-space: nowrap;
}

.quest-action:hover {
  transform: translateY(1px);
  border-color: var(--color-border-hover);
  background: var(--color-bg-card-hover);
}

@media (max-width: 680px) {
  .quests-header {
    flex-direction: column;
  }

  .quests-summary {
    width: 100%;
    justify-content: flex-start;
  }

  .quest-bottom {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
