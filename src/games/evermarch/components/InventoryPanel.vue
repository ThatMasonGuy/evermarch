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
      >
        <div class="inv-item-icon">
          <Package :size="16" />
        </div>
        <div class="inv-item-info">
          <span class="inv-item-name">{{ item.name }}</span>
          <span class="inv-item-count">x{{ item.count.toLocaleString() }}</span>
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
  const items: { id: string; name: string; count: number; category: string }[] = []

  for (const [id, count] of Object.entries(store.inventory)) {
    if (count <= 0) continue
    const def = getResourceDefinition(id)
    if (activeCategory.value !== 'all' && def.category !== activeCategory.value) continue
    items.push({ id, name: def.name, count, category: def.category })
  }

  return items.sort((a, b) => a.name.localeCompare(b.name))
})
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
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 6px;
}

.inv-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
}

.inv-item-icon {
  color: var(--color-accent);
}

.inv-item-info {
  display: flex;
  justify-content: space-between;
  flex: 1;
}

.inv-item-name {
  font-size: 12px;
  color: var(--color-text-primary);
}

.inv-item-count {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
}

.inv-empty {
  padding: 24px;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-muted);
}
</style>
