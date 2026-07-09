<template>
  <div class="inv-panel">
    <header class="inv-header">
      <div class="inv-heading">
        <h2 class="inv-title">Inventory</h2>
        <span class="inv-sub">{{ ownedItems.length }} stacks held</span>
      </div>
      <div class="inv-summary">
        <div class="inv-summary-stat">
          <Coins :size="14" />
          <span>Gold</span>
          <strong>{{ formatNumber(store.gold) }}</strong>
        </div>
        <div class="inv-summary-stat">
          <Package :size="14" />
          <span>Total Value</span>
          <strong>{{ formatGold(totalInventoryValue) }}</strong>
        </div>
        <div class="inv-summary-stat">
          <Filter :size="14" />
          <span>Filtered Value</span>
          <strong>{{ formatGold(filteredValue) }}</strong>
        </div>
      </div>
    </header>

    <section class="inv-toolbar" aria-label="Inventory tools">
      <label class="inv-search">
        <Search :size="15" />
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search items"
          aria-label="Search inventory items"
        />
      </label>
      <label class="inv-sort">
        <SlidersHorizontal :size="14" />
        <select v-model="sortMode" aria-label="Sort inventory">
          <option value="name">Name</option>
          <option value="value">Value</option>
          <option value="count">Count</option>
          <option value="recent">Recent</option>
        </select>
      </label>
    </section>

    <section class="inv-categories" aria-label="Inventory categories">
      <button
        v-for="cat in categories"
        :key="cat.id"
        type="button"
        class="inv-cat-btn"
        :class="{ 'inv-cat-active': activeCategory === cat.id }"
        :title="`${cat.label}: ${formatGold(categorySummary(cat.id).value)}`"
        @click="activeCategory = cat.id"
      >
        <component :is="cat.icon" :size="14" />
        <span>{{ cat.label }}</span>
        <strong>{{ categorySummary(cat.id).count }}</strong>
        <small>{{ formatGold(categorySummary(cat.id).value) }}</small>
      </button>
    </section>

    <section class="inv-layout">
      <div class="inv-list-pane">
        <div class="inv-list-top">
          <span>{{ activeCategoryLabel }}</span>
          <strong>{{ filteredItems.length }} stacks</strong>
        </div>

        <div class="inv-grid" v-if="filteredItems.length > 0">
          <button
            v-for="item in filteredItems"
            :key="item.id"
            type="button"
            class="inv-item"
            :class="{ 'inv-item-selected': selectedItemId === item.id }"
            :data-resource-id="item.id"
            @click="selectItem(item.id)"
          >
            <span class="inv-item-icon" :class="`inv-item-icon-${item.category}`">
              <img v-if="item.sprite" :src="item.sprite" alt="" class="inv-item-sprite" />
              <component v-else :is="iconFor(item.icon)" :size="18" />
            </span>
            <span class="inv-item-main">
              <span class="inv-item-title">
                <span class="inv-item-name">{{ item.name }}</span>
                <span class="inv-item-cat">{{ item.categoryLabel }}</span>
              </span>
              <span class="inv-item-count">x{{ formatNumber(item.count) }}</span>
            </span>
            <span class="inv-item-meta">
              <span>{{ formatGold(item.sellValue) }} ea</span>
              <strong>{{ formatGold(item.stackValue) }}</strong>
            </span>
          </button>
        </div>

        <div v-else class="inv-empty">
          <PackageOpen :size="22" />
          <span>No matching item stacks.</span>
        </div>
      </div>

      <aside v-if="selectedItem" class="inv-detail" :data-resource-id="selectedItem.id">
        <header class="inv-detail-header">
          <div class="inv-detail-icon" :class="`inv-item-icon-${selectedItem.category}`">
            <img v-if="selectedItem.sprite" :src="selectedItem.sprite" alt="" class="inv-detail-sprite" />
            <component v-else :is="iconFor(selectedItem.icon)" :size="22" />
          </div>
          <div class="inv-detail-title">
            <h3>{{ selectedItem.name }}</h3>
            <span>{{ selectedItem.categoryLabel }}</span>
          </div>
        </header>

        <div class="inv-detail-stats">
          <div>
            <span>Owned</span>
            <strong>{{ formatNumber(selectedItem.count) }}</strong>
          </div>
          <div>
            <span>Stack Value</span>
            <strong>{{ formatGold(selectedItem.stackValue) }}</strong>
          </div>
          <div>
            <span>Sell Each</span>
            <strong>{{ formatGold(selectedItem.sellValue) }}</strong>
          </div>
        </div>

        <section class="inv-sell-panel">
          <div class="inv-sell-heading">
            <span>Sell Amount</span>
            <strong>{{ formatGold(projectedSellValue) }}</strong>
          </div>
          <input
            class="inv-sell-range"
            type="range"
            min="0"
            :max="maxSellAmount"
            :value="normalizedSellAmount"
            :disabled="!canSellSelected"
            aria-label="Sell amount"
            @input="setSellAmountFromEvent"
          />
          <div class="inv-sell-controls">
            <input
              class="inv-sell-input"
              type="number"
              min="0"
              :max="maxSellAmount"
              :value="normalizedSellAmount"
              :disabled="!canSellSelected"
              aria-label="Sell amount input"
              @input="setSellAmountFromEvent"
            />
            <button
              type="button"
              class="inv-quick-btn"
              :disabled="!canSellSelected"
              @click="setSellAmount(maxSellAmount)"
            >
              All
            </button>
            <button
              type="button"
              class="inv-quick-btn"
              :disabled="!canSellSelected || maxSellAmount <= 1"
              @click="setSellAmount(Math.max(0, maxSellAmount - 1))"
            >
              All But 1
            </button>
          </div>
          <button
            type="button"
            class="inv-sell-submit"
            :disabled="!canSellSelected || normalizedSellAmount <= 0"
            @click="sellSelected"
          >
            <Coins :size="14" />
            <span>Sell {{ formatNumber(normalizedSellAmount) }}</span>
          </button>
        </section>

        <div class="inv-tabs" role="tablist" aria-label="Item detail tabs">
          <button
            v-for="tabOption in detailTabs"
            :key="tabOption.id"
            type="button"
            class="inv-tab-btn"
            :class="{ 'inv-tab-active': activeDetailTab === tabOption.id }"
            :aria-selected="activeDetailTab === tabOption.id"
            @click="activeDetailTab = tabOption.id"
          >
            <component :is="tabOption.icon" :size="13" />
            <span>{{ tabOption.label }}</span>
          </button>
        </div>

        <section v-if="activeDetailTab === 'info'" class="inv-tab-panel">
          <p class="inv-description">{{ selectedItem.detail.description }}</p>

          <div class="inv-info-block">
            <h4>Sources</h4>
            <div v-if="selectedItem.detail.producers.length > 0" class="inv-link-list">
              <div
                v-for="producer in selectedItem.detail.producers"
                :key="producer.taskId"
                class="inv-link-row"
              >
                <span>{{ producer.skillName }}</span>
                <strong>{{ producer.taskName }}</strong>
                <small>Lv. {{ producer.levelRequired }} - +{{ producer.amount }}</small>
              </div>
            </div>
            <div v-else class="inv-muted-row">No task source configured.</div>
          </div>

          <div class="inv-info-block">
            <h4>Used By</h4>
            <div v-if="selectedItem.detail.consumers.length > 0" class="inv-link-list">
              <div
                v-for="consumer in selectedItem.detail.consumers"
                :key="consumer.taskId"
                class="inv-link-row"
              >
                <span>{{ consumer.skillName }}</span>
                <strong>{{ consumer.taskName }}</strong>
                <small>{{ consumer.costText }}</small>
              </div>
            </div>
            <div v-else class="inv-muted-row">No current task consumes this item.</div>
          </div>
        </section>

        <section v-else-if="activeDetailTab === 'stats'" class="inv-tab-panel">
          <div class="inv-stat-table">
            <div class="inv-stat-row">
              <span>Total Acquired</span>
              <strong>{{ formatNumber(selectedItem.stats.acquired) }}</strong>
            </div>
            <div class="inv-stat-row">
              <span>Acquisition Events</span>
              <strong>{{ formatNumber(selectedItem.stats.acquisitionEvents) }}</strong>
            </div>
            <div class="inv-stat-row">
              <span>Consumed</span>
              <strong>{{ formatNumber(selectedItem.stats.consumed) }}</strong>
            </div>
            <div class="inv-stat-row">
              <span>Sold</span>
              <strong>{{ formatNumber(selectedItem.stats.sold) }}</strong>
            </div>
            <div class="inv-stat-row">
              <span>Sale Events</span>
              <strong>{{ formatNumber(selectedItem.stats.saleEvents) }}</strong>
            </div>
            <div class="inv-stat-row">
              <span>Gold From Sales</span>
              <strong>{{ formatGold(selectedItem.stats.goldEarned) }}</strong>
            </div>
            <div class="inv-stat-row">
              <span>First Acquired</span>
              <strong>{{ formatTimestamp(selectedItem.stats.firstAcquiredAt) }}</strong>
            </div>
            <div class="inv-stat-row">
              <span>Last Acquired</span>
              <strong>{{ formatTimestamp(selectedItem.stats.lastAcquiredAt) }}</strong>
            </div>
          </div>
        </section>

        <section v-else class="inv-tab-panel">
          <div class="inv-upgrade-shell">
            <div class="inv-upgrade-icon">
              <Wrench :size="20" />
            </div>
            <div class="inv-upgrade-copy">
              <h4>No upgrade available</h4>
              <span>Tier: Base</span>
            </div>
          </div>
          <div class="inv-stat-table">
            <div class="inv-stat-row">
              <span>Upgrade Path</span>
              <strong>None</strong>
            </div>
            <div class="inv-stat-row">
              <span>Eligible Quantity</span>
              <strong>{{ formatNumber(selectedItem.count) }}</strong>
            </div>
          </div>
        </section>
      </aside>

      <aside v-else class="inv-detail inv-detail-empty">
        <PackageOpen :size="24" />
        <span>No item selected.</span>
      </aside>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { computed, markRaw, ref, watch } from 'vue'
import {
  BarChart3,
  BookOpen,
  Coins,
  Filter,
  Fish,
  FlameKindling,
  Gem,
  Hammer,
  Info,
  Package,
  PackageOpen,
  Search,
  SlidersHorizontal,
  Sprout,
  TreePine,
  Wheat,
  Wrench,
} from 'lucide-vue-next'
import { useGameStore, type ItemStats } from '../stores/gameStore'
import { getResourceDefinition, getResourceName } from '../data/resources'
import { ALL_TASKS, type TaskDefinition } from '../data/tasks'
import { SKILLS } from '../data/skills'
import { spriteForResource } from '../assets/visualAssets'

type DetailTab = 'info' | 'stats' | 'upgrade'
type SortMode = 'name' | 'value' | 'count' | 'recent'

interface CategoryOption {
  id: string
  label: string
  icon: Component
}

interface ItemTaskLink {
  taskId: string
  taskName: string
  skillName: string
  levelRequired: number
  amount: number
  costText: string
}

interface ItemDetail {
  description: string
  producers: ItemTaskLink[]
  consumers: ItemTaskLink[]
}

interface InventoryItem {
  id: string
  name: string
  icon: string
  sprite: string | null
  count: number
  category: string
  categoryLabel: string
  sellValue: number
  stackValue: number
  stats: ItemStats
  detail: ItemDetail
  sortAt: number
}

const store = useGameStore()
const activeCategory = ref('all')
const searchQuery = ref('')
const sortMode = ref<SortMode>('name')
const selectedItemId = ref<string | null>(null)
const activeDetailTab = ref<DetailTab>('info')
const sellAmount = ref(0)

const iconMap: Record<string, Component> = {
  BookOpen,
  Coins,
  Fish,
  FlameKindling,
  Gem,
  Hammer,
  Package,
  Sprout,
  TreePine,
  Wheat,
}

const categories: CategoryOption[] = [
  { id: 'all', label: 'All', icon: markRaw(Package) },
  { id: 'ore', label: 'Ores', icon: markRaw(Gem) },
  { id: 'log', label: 'Logs', icon: markRaw(TreePine) },
  { id: 'fish', label: 'Fish', icon: markRaw(Fish) },
  { id: 'crop', label: 'Crops', icon: markRaw(Sprout) },
  { id: 'food', label: 'Food', icon: markRaw(FlameKindling) },
  { id: 'ember', label: 'Embers', icon: markRaw(FlameKindling) },
  { id: 'metalwork', label: 'Metalwork', icon: markRaw(Hammer) },
  { id: 'fletched', label: 'Fletched', icon: markRaw(Hammer) },
  { id: 'crafted', label: 'Crafted', icon: markRaw(Gem) },
  { id: 'rune', label: 'Runes', icon: markRaw(BookOpen) },
  { id: 'misc', label: 'Misc', icon: markRaw(Package) },
]

const detailTabs = [
  { id: 'info' as const, label: 'Info', icon: markRaw(Info) },
  { id: 'stats' as const, label: 'Stats', icon: markRaw(BarChart3) },
  { id: 'upgrade' as const, label: 'Upgrade', icon: markRaw(Wrench) },
]

const categoryLabels = new Map(categories.map((category) => [category.id, category.label]))
const categorySingularLabels: Record<string, string> = {
  ore: 'ore',
  log: 'log',
  fish: 'fish',
  crop: 'crop',
  food: 'food item',
  ember: 'ember',
  metalwork: 'metalwork item',
  fletched: 'fletched item',
  crafted: 'crafted item',
  rune: 'rune',
  misc: 'misc item',
}

const ownedItems = computed(() => {
  const items: InventoryItem[] = []

  for (const [id, count] of Object.entries(store.inventory)) {
    if (count <= 0) continue
    const def = getResourceDefinition(id)
    const stats = store.getItemStats(id)

    items.push({
      id,
      name: def.name,
      icon: def.icon,
      sprite: spriteForResource(id, def.category),
      count,
      category: def.category,
      categoryLabel: categoryLabel(def.category),
      sellValue: def.sellValue,
      stackValue: def.sellValue * count,
      stats,
      detail: buildItemDetail(id),
      sortAt: stats.lastAcquiredAt ?? stats.firstAcquiredAt ?? 0,
    })
  }

  return items
})

const filteredItems = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const items = ownedItems.value.filter((item) => {
    const inCategory = activeCategory.value === 'all' || item.category === activeCategory.value
    const inSearch = query.length === 0
      || item.name.toLowerCase().includes(query)
      || item.categoryLabel.toLowerCase().includes(query)
      || item.id.toLowerCase().includes(query)
    return inCategory && inSearch
  })

  return [...items].sort(compareInventoryItems)
})

const selectedItem = computed(() =>
  selectedItemId.value
    ? ownedItems.value.find((item) => item.id === selectedItemId.value) ?? null
    : null
)

const activeCategoryLabel = computed(() => {
  const label = categoryLabels.get(activeCategory.value) ?? 'Items'
  return searchQuery.value.trim() ? `${label} matching "${searchQuery.value.trim()}"` : label
})

const totalInventoryValue = computed(() => store.inventoryValue)
const filteredValue = computed(() => filteredItems.value.reduce((sum, item) => sum + item.stackValue, 0))
const maxSellAmount = computed(() => selectedItem.value?.count ?? 0)
const normalizedSellAmount = computed(() => clampSellAmount(sellAmount.value))
const projectedSellValue = computed(() => (selectedItem.value?.sellValue ?? 0) * normalizedSellAmount.value)
const canSellSelected = computed(() => !!selectedItem.value && selectedItem.value.sellValue > 0 && maxSellAmount.value > 0)

watch(filteredItems, (items) => {
  if (items.length === 0) {
    selectedItemId.value = null
    sellAmount.value = 0
    return
  }

  if (!selectedItemId.value || !items.some((item) => item.id === selectedItemId.value)) {
    selectedItemId.value = items[0]?.id ?? null
  }
}, { immediate: true })

watch(selectedItem, (item) => {
  if (!item) {
    sellAmount.value = 0
    return
  }

  sellAmount.value = Math.min(Math.max(1, normalizedSellAmount.value || 1), item.count)
}, { immediate: true })

function selectItem(id: string) {
  selectedItemId.value = id
}

function categorySummary(categoryId: string): { count: number; value: number } {
  const matching = categoryId === 'all'
    ? ownedItems.value
    : ownedItems.value.filter((item) => item.category === categoryId)

  return {
    count: matching.length,
    value: matching.reduce((sum, item) => sum + item.stackValue, 0),
  }
}

function iconFor(icon: string): Component {
  return iconMap[icon] ?? Package
}

function compareInventoryItems(a: InventoryItem, b: InventoryItem): number {
  if (sortMode.value === 'value') {
    return b.stackValue - a.stackValue || a.name.localeCompare(b.name)
  }
  if (sortMode.value === 'count') {
    return b.count - a.count || a.name.localeCompare(b.name)
  }
  if (sortMode.value === 'recent') {
    return b.sortAt - a.sortAt || a.name.localeCompare(b.name)
  }
  return a.name.localeCompare(b.name)
}

function setSellAmountFromEvent(event: Event) {
  const target = event.target as HTMLInputElement
  setSellAmount(Number(target.value))
}

function setSellAmount(amount: number) {
  sellAmount.value = clampSellAmount(amount)
}

function clampSellAmount(amount: number): number {
  if (!Number.isFinite(amount)) return 0
  return Math.max(0, Math.min(maxSellAmount.value, Math.floor(amount)))
}

function sellSelected() {
  const item = selectedItem.value
  const amount = normalizedSellAmount.value
  if (!item || item.sellValue <= 0 || amount <= 0) return

  const goldGained = store.sellItem(item.id, amount)
  if (goldGained <= 0) return

  const remaining = store.getItemCount(item.id)
  sellAmount.value = remaining > 0 ? Math.min(amount, remaining) : 0
}

function buildItemDetail(resourceId: string): ItemDetail {
  const def = getResourceDefinition(resourceId)
  const producers = producerLinks(resourceId)
  const consumers = consumerLinks(resourceId)
  const sourceSkills = uniqueLabels(producers.map((producer) => producer.skillName))
  const consumerSkills = uniqueLabels(consumers.map((consumer) => consumer.skillName))
  const itemKind = categorySingularLabel(def.category)

  const sourceText = sourceSkills.length > 0
    ? `Produced through ${formatList(sourceSkills)}.`
    : 'No production task is configured.'
  const useText = consumerSkills.length > 0
    ? `Used by ${formatList(consumerSkills)}.`
    : 'Not consumed by any current task.'

  return {
    description: `${def.name} is ${articleFor(itemKind)} ${itemKind}. ${categoryUseText(def.category)} ${sourceText} ${useText}`,
    producers,
    consumers,
  }
}

function producerLinks(resourceId: string): ItemTaskLink[] {
  return ALL_TASKS
    .filter((task) => task.drops.some((drop) => drop.resourceId === resourceId))
    .sort(compareTasks)
    .map((task) => {
      const drop = task.drops.find((candidate) => candidate.resourceId === resourceId)
      return taskLink(task, drop?.amount ?? 1)
    })
}

function consumerLinks(resourceId: string): ItemTaskLink[] {
  return ALL_TASKS
    .filter((task) => (task.costs ?? []).some((cost) => cost.resourceId === resourceId))
    .sort(compareTasks)
    .map((task) => {
      const cost = task.costs?.find((candidate) => candidate.resourceId === resourceId)
      return taskLink(task, cost?.amount ?? 1, formatCosts(task.costs ?? []))
    })
}

function taskLink(task: TaskDefinition, amount: number, costText = ''): ItemTaskLink {
  return {
    taskId: task.id,
    taskName: task.name,
    skillName: SKILLS[task.skillId].name,
    levelRequired: task.levelRequired,
    amount,
    costText,
  }
}

function compareTasks(a: TaskDefinition, b: TaskDefinition): number {
  return a.levelRequired - b.levelRequired || a.name.localeCompare(b.name)
}

function formatCosts(costs: Array<{ resourceId: string; amount: number }>): string {
  return costs.map((cost) => `${cost.amount} ${getResourceName(cost.resourceId)}`).join(', ')
}

function categoryLabel(category: string): string {
  return categoryLabels.get(category) ?? category.replace(/^\w/, (letter) => letter.toUpperCase())
}

function categorySingularLabel(category: string): string {
  return categorySingularLabels[category] ?? `${categoryLabel(category).toLowerCase()} item`
}

function categoryUseText(category: string): string {
  switch (category) {
    case 'ore': return 'It supports mining and artisan production chains.'
    case 'log': return 'It feeds firemaking and fletching production chains.'
    case 'fish': return 'It is a raw ingredient for cooking.'
    case 'food': return 'It is prepared output from cooking.'
    case 'crop': return 'It supports farming and cooking recipes.'
    case 'ember': return 'It is refined through firemaking.'
    case 'metalwork': return 'It is forged for later construction and trade goods.'
    case 'fletched': return 'It is shaped through fletching.'
    case 'crafted': return 'It is assembled through crafting.'
    case 'rune': return 'It is bound through runecrafting.'
    default: return 'It is part of the wider resource economy.'
  }
}

function articleFor(label: string): string {
  return /^[aeiou]/i.test(label) ? 'an' : 'a'
}

function uniqueLabels(values: string[]): string[] {
  return Array.from(new Set(values))
}

function formatList(values: string[]): string {
  if (values.length === 0) return ''
  if (values.length === 1) return values[0]!
  if (values.length === 2) return `${values[0]} and ${values[1]}`
  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`
}

function formatNumber(value: number): string {
  return Math.floor(value).toLocaleString()
}

function formatGold(value: number): string {
  return `${formatNumber(value)} gold`
}

function formatTimestamp(value: number | null): string {
  if (!value) return 'Never'
  return new Date(value).toLocaleString('en-AU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style scoped>
.inv-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.inv-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.inv-heading {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.inv-title {
  font-family: var(--font-display);
  color: var(--color-text-primary);
  font-size: 20px;
  font-weight: 700;
}

.inv-sub {
  color: var(--color-text-muted);
  font-size: 12px;
}

.inv-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(112px, 1fr));
  gap: 8px;
}

.inv-summary-stat {
  min-width: 0;
  min-height: 42px;
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  align-items: center;
  column-gap: 6px;
  row-gap: 2px;
  padding: 8px 9px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
}

.inv-summary-stat svg {
  grid-row: 1 / span 2;
  color: var(--color-accent-light);
}

.inv-summary-stat span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-muted);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

.inv-summary-stat strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-primary);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.inv-toolbar {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(150px, 220px);
  gap: 8px;
}

.inv-search,
.inv-sort {
  min-height: 36px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 9px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-card);
  color: var(--color-text-muted);
}

.inv-search:focus-within,
.inv-sort:focus-within {
  border-color: var(--color-accent);
}

.inv-search input,
.inv-sort select {
  width: 100%;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--color-text-primary);
  font-family: var(--font-body);
  font-size: 13px;
}

.inv-sort select {
  cursor: pointer;
}

.inv-categories {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.inv-cat-btn {
  flex: 0 0 auto;
  min-width: 116px;
  min-height: 52px;
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 6px;
  row-gap: 2px;
  padding: 7px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  font-family: var(--font-body);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.inv-cat-btn:hover {
  border-color: var(--color-border-hover);
  color: var(--color-text-primary);
  background: var(--color-bg-card-hover);
}

.inv-cat-active {
  border-color: var(--color-accent);
  color: var(--color-accent-light);
  background: var(--color-accent-glow);
}

.inv-cat-btn svg {
  grid-row: 1 / span 2;
  color: currentColor;
}

.inv-cat-btn span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  font-weight: 800;
}

.inv-cat-btn strong {
  color: var(--color-text-primary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.inv-cat-btn small {
  grid-column: 2 / -1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-muted);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.inv-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(310px, 360px);
  align-items: start;
  gap: 12px;
}

.inv-list-pane,
.inv-detail {
  min-width: 0;
  border: 2px solid var(--em-block-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  box-shadow: 0 5px 0 var(--em-block-shadow);
}

.inv-list-pane {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
}

.inv-list-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 700;
}

.inv-list-top strong {
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
}

.inv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 7px;
}

.inv-item {
  min-width: 0;
  min-height: 76px;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  grid-template-rows: auto auto;
  gap: 7px;
  padding: 9px;
  border-radius: var(--radius-sm);
  border: 2px solid var(--color-border);
  background: var(--color-bg-surface);
  color: var(--color-text-secondary);
  font-family: var(--font-body);
  text-align: left;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.inv-item:hover {
  border-color: var(--color-border-hover);
  color: var(--color-text-primary);
  background: var(--color-bg-card-hover);
}

.inv-item-selected {
  border-color: var(--color-accent);
  color: var(--color-accent-light);
  background: var(--color-accent-glow);
}

.inv-item-icon,
.inv-detail-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-hover);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(0, 0, 0, 0.08)),
    var(--color-bg-card);
  color: var(--color-accent-light);
}

.inv-item-icon {
  width: 34px;
  height: 34px;
}

.inv-detail-icon {
  width: 42px;
  height: 42px;
}

.inv-item-sprite,
.inv-detail-sprite {
  display: block;
  object-fit: contain;
  filter: drop-shadow(0 3px 0 rgba(0, 0, 0, 0.22));
}

.inv-item-sprite {
  width: 28px;
  height: 28px;
}

.inv-detail-sprite {
  width: 34px;
  height: 34px;
}

.inv-item-icon-ore,
.inv-item-icon-crafted {
  color: #c4b5fd;
  background: rgba(167, 139, 250, 0.1);
  border-color: rgba(167, 139, 250, 0.2);
}

.inv-item-icon-log,
.inv-item-icon-crop {
  color: #86efac;
  background: rgba(34, 197, 94, 0.08);
  border-color: rgba(34, 197, 94, 0.18);
}

.inv-item-icon-fish {
  color: #93c5fd;
  background: rgba(59, 130, 246, 0.08);
  border-color: rgba(59, 130, 246, 0.18);
}

.inv-item-icon-food,
.inv-item-icon-ember {
  color: #fdba74;
  background: rgba(249, 115, 22, 0.08);
  border-color: rgba(249, 115, 22, 0.18);
}

.inv-item-icon-metalwork,
.inv-item-icon-fletched {
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.18);
}

.inv-item-icon-rune {
  color: #ddd6fe;
  background: rgba(124, 58, 237, 0.08);
  border-color: rgba(124, 58, 237, 0.18);
}

.inv-item-main {
  min-width: 0;
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.inv-item-title {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.inv-item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-primary);
  font-size: 12px;
  font-weight: 800;
}

.inv-item-cat {
  color: var(--color-text-muted);
  font-size: 10px;
  font-weight: 700;
}

.inv-item-count {
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.inv-item-meta {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--color-text-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.inv-item-meta strong {
  color: var(--color-accent-light);
  font-size: 11px;
}

.inv-detail {
  position: sticky;
  top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}

.inv-detail-header {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.inv-detail-title {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.inv-detail-title h3 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-primary);
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 700;
}

.inv-detail-title span {
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 700;
}

.inv-detail-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.inv-detail-stats div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 7px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-surface);
}

.inv-detail-stats span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-muted);
  font-size: 10px;
  font-weight: 700;
}

.inv-detail-stats strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-primary);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.inv-sell-panel {
  display: grid;
  gap: 8px;
  padding: 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-hover);
  background: var(--color-accent-glow);
}

.inv-sell-heading,
.inv-sell-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.inv-sell-heading {
  justify-content: space-between;
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 700;
}

.inv-sell-heading strong {
  color: var(--color-accent-light);
  font-variant-numeric: tabular-nums;
}

.inv-sell-range {
  width: 100%;
  accent-color: var(--color-accent);
}

.inv-sell-input {
  width: 84px;
  min-height: 30px;
  padding: 5px 7px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-surface);
  color: var(--color-text-primary);
  font-family: var(--font-body);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.inv-quick-btn,
.inv-sell-submit,
.inv-tab-btn {
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-surface);
  color: var(--color-text-secondary);
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.inv-quick-btn {
  flex: 1;
  padding: 5px 7px;
}

.inv-sell-submit {
  width: 100%;
  border-color: var(--color-accent);
  background: var(--color-accent-glow);
  color: var(--color-accent-light);
}

.inv-quick-btn:hover:not(:disabled),
.inv-sell-submit:hover:not(:disabled),
.inv-tab-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent-light);
}

.inv-quick-btn:disabled,
.inv-sell-submit:disabled,
.inv-sell-input:disabled,
.inv-sell-range:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.inv-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
}

.inv-tab-btn {
  padding: 5px 6px;
}

.inv-tab-active {
  border-color: var(--color-accent);
  background: var(--color-accent-glow);
  color: var(--color-accent-light);
}

.inv-tab-panel {
  display: grid;
  gap: 10px;
}

.inv-description {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.inv-info-block {
  display: grid;
  gap: 6px;
}

.inv-info-block h4 {
  color: var(--color-text-primary);
  font-size: 12px;
  font-weight: 800;
}

.inv-link-list,
.inv-stat-table {
  display: grid;
  gap: 5px;
}

.inv-link-row,
.inv-stat-row,
.inv-muted-row {
  min-width: 0;
  padding: 7px 8px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-surface);
}

.inv-link-row {
  display: grid;
  grid-template-columns: minmax(72px, 0.42fr) minmax(0, 1fr);
  gap: 2px 8px;
}

.inv-link-row span,
.inv-link-row small,
.inv-muted-row,
.inv-stat-row span {
  color: var(--color-text-muted);
  font-size: 11px;
}

.inv-link-row strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-primary);
  font-size: 11px;
}

.inv-link-row small {
  grid-column: 2;
}

.inv-stat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.inv-stat-row strong {
  color: var(--color-text-primary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.inv-upgrade-shell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 70px;
  padding: 10px;
  border-radius: var(--radius-sm);
  border: 1px dashed var(--color-border-hover);
  background: var(--color-bg-surface);
}

.inv-upgrade-icon {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  background: rgba(253, 230, 138, 0.08);
  color: #fde68a;
}

.inv-upgrade-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.inv-upgrade-copy h4 {
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 800;
}

.inv-upgrade-copy span {
  color: var(--color-text-muted);
  font-size: 11px;
}

.inv-empty,
.inv-detail-empty {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--color-text-muted);
  font-size: 12px;
  text-align: center;
}

@media (max-width: 1180px) {
  .inv-layout {
    grid-template-columns: 1fr;
  }

  .inv-detail {
    position: static;
  }
}

@media (max-width: 760px) {
  .inv-header {
    flex-direction: column;
  }

  .inv-summary,
  .inv-toolbar {
    width: 100%;
    grid-template-columns: 1fr;
  }

  .inv-grid {
    grid-template-columns: 1fr;
  }

  .inv-detail-stats {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 520px) {
  .inv-sell-controls {
    align-items: stretch;
    flex-direction: column;
  }

  .inv-sell-input {
    width: 100%;
  }

  .inv-tabs {
    grid-template-columns: 1fr;
  }

  .inv-link-row {
    grid-template-columns: 1fr;
  }

  .inv-link-row small {
    grid-column: auto;
  }
}
</style>
