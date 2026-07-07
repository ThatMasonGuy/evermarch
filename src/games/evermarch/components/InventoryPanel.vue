<template>
  <div class="inv-panel">
    <div class="inv-header">
      <h2 class="inv-title">Inventory</h2>
      <span class="inv-gold">
        <Coins :size="14" />
        {{ store.gold.toLocaleString() }} gold
      </span>
    </div>

    <div class="inv-categories">
      <button
        v-for="cat in categories"
        :key="cat.id"
        class="inv-cat-btn"
        :class="{ 'inv-cat-active': activeCategory === cat.id }"
        @click="activeCategory = cat.id"
      >
        {{ cat.label }}
      </button>
    </div>

    <div class="inv-grid" v-if="filteredItems.length > 0">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="inv-item"
        :data-resource-id="item.id"
      >
        <div class="inv-item-icon">
          <Package :size="16" />
        </div>
        <div class="inv-item-info">
          <div class="inv-item-main">
            <span class="inv-item-name">{{ item.name }}</span>
            <span class="inv-item-count">x{{ item.count.toLocaleString() }}</span>
          </div>
          <div class="inv-item-value">
            <span>
              <Coins :size="12" />
              {{ item.sellValue.toLocaleString() }} ea
            </span>
            <span>{{ item.stackValue.toLocaleString() }} total</span>
          </div>
          <div class="inv-item-actions">
            <button
              type="button"
              class="inv-sell-btn"
              :disabled="item.sellValue <= 0"
              :aria-label="`Sell one ${item.name}`"
              :title="`Sell one ${item.name}`"
              @click="sellOne(item)"
            >
              <Coins :size="13" />
              <span>Sell 1</span>
            </button>
            <button
              type="button"
              class="inv-sell-btn inv-sell-stack-btn"
              :disabled="item.sellValue <= 0"
              :aria-label="`Sell all ${item.name}`"
              :title="`Sell all ${item.name}`"
              @click="sellStack(item)"
            >
              <Coins :size="13" />
              <span>Stack</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="inv-empty">
      No items in this category yet. Start gathering!
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Coins, Package } from 'lucide-vue-next'
import { useGameStore } from '../stores/gameStore'
import { getResourceDefinition } from '../data/resources'

const store = useGameStore()
const activeCategory = ref('all')

interface InventoryItem {
  id: string
  name: string
  count: number
  category: string
  sellValue: number
  stackValue: number
}

const categories = [
  { id: 'all', label: 'All' },
  { id: 'ore', label: 'Ores' },
  { id: 'log', label: 'Logs' },
  { id: 'fish', label: 'Fish' },
  { id: 'crop', label: 'Crops' },
  { id: 'food', label: 'Food' },
  { id: 'ember', label: 'Embers' },
  { id: 'metalwork', label: 'Metalwork' },
  { id: 'fletched', label: 'Fletched' },
  { id: 'crafted', label: 'Crafted' },
  { id: 'rune', label: 'Runes' },
  { id: 'misc', label: 'Misc' },
]

const filteredItems = computed(() => {
  const items: InventoryItem[] = []

  for (const [id, count] of Object.entries(store.inventory)) {
    if (count <= 0) continue
    const def = getResourceDefinition(id)
    if (activeCategory.value !== 'all' && def.category !== activeCategory.value) continue
    items.push({
      id,
      name: def.name,
      count,
      category: def.category,
      sellValue: def.sellValue,
      stackValue: def.sellValue * count,
    })
  }

  return items.sort((a, b) => a.name.localeCompare(b.name))
})

function sellOne(item: InventoryItem) {
  store.sellItem(item.id, 1)
}

function sellStack(item: InventoryItem) {
  store.sellItem(item.id, item.count)
}
</script>

<style scoped>
.inv-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.inv-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.inv-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
}

.inv-gold {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-accent-light);
}

.inv-categories {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 8px;
}

.inv-cat-btn {
  padding: 5px 12px;
  border-radius: var(--radius-sm);
  border: none;
  background: none;
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.inv-cat-btn:hover { color: var(--color-text-primary); }
.inv-cat-active {
  background: var(--color-accent-glow);
  color: var(--color-accent-light);
}

.inv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 8px;
}

.inv-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
}

.inv-item-icon {
  color: var(--color-accent);
}

.inv-item-info {
  display: flex;
  flex-direction: column;
  gap: 7px;
  flex: 1;
  min-width: 0;
}

.inv-item-main {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.inv-item-name {
  font-size: 12px;
  color: var(--color-text-primary);
  overflow-wrap: anywhere;
}

.inv-item-count {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.inv-item-value {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  color: var(--color-text-muted);
}
.inv-item-value span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.inv-item-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.inv-sell-btn {
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 5px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-surface);
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.inv-sell-btn:hover:not(:disabled) {
  border-color: var(--color-accent);
  color: var(--color-accent-light);
  background: var(--color-accent-glow);
}
.inv-sell-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.inv-empty {
  padding: 24px;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-muted);
}
</style>
