<template>
  <Teleport to="body">
    <Transition name="chest-modal">
      <div v-if="visible" class="chest-modal-backdrop" data-theme="evermarch" @click.self="$emit('close')">
        <section class="chest-modal" role="dialog" aria-modal="true" aria-labelledby="chest-title">
          <header class="chest-heading">
            <div class="chest-heading-icon"><PackageOpen :size="24" /></div>
            <div>
              <h2 id="chest-title">Open miner's chests</h2>
              <p>Each chest contains 1 or 2 TNT.</p>
            </div>
          </header>

          <div v-if="!result" class="chest-form">
            <div class="chest-count-row">
              <span>Chests to open</span>
              <strong>{{ quantity.toLocaleString() }} / {{ available.toLocaleString() }}</strong>
            </div>
            <input v-model.number="quantity" class="chest-range" type="range" min="1" :max="Math.max(1, available)" aria-label="Number of chests to open" />
            <div class="chest-controls">
              <input v-model.number="quantity" class="chest-number" type="number" min="1" :max="available" aria-label="Number of chests" />
              <button type="button" class="chest-secondary" @click="quantity = available">All</button>
            </div>
            <button type="button" class="chest-primary" :disabled="available <= 0" @click="openChests">
              <Sparkles :size="15" /> Open {{ quantity.toLocaleString() }} {{ quantity === 1 ? 'chest' : 'chests' }}
            </button>
          </div>

          <div v-else class="chest-result">
            <div class="chest-reveal"><PackageOpen :size="38" /><Sparkles :size="16" /></div>
            <strong>Chest haul revealed</strong>
            <span>Opened {{ result.opened.toLocaleString() }} {{ result.opened === 1 ? 'chest' : 'chests' }}.</span>
            <div class="chest-rewards">
              <div v-for="reward in result.rewards" :key="reward.resourceId" class="chest-reward">
                <Bomb :size="17" /><span>{{ reward.resourceId === 'tnt' ? 'TNT' : reward.resourceId }}</span><strong>+{{ reward.amount.toLocaleString() }}</strong>
              </div>
            </div>
            <div class="chest-actions">
              <button type="button" class="chest-secondary" @click="result = null">Open more</button>
              <button type="button" class="chest-primary" @click="$emit('close')">Done</button>
            </div>
          </div>

          <button type="button" class="chest-close" @click="$emit('close')">Close</button>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Bomb, PackageOpen, Sparkles } from 'lucide-vue-next'
import { useGameStore, type ChestOpenResult } from '../stores/gameStore'

const props = defineProps<{ visible: boolean; available: number }>()
defineEmits<{ close: [] }>()

const store = useGameStore()
const quantity = ref(1)
const result = ref<ChestOpenResult | null>(null)

watch(() => props.visible, (visible) => {
  if (visible) {
    quantity.value = Math.min(1, props.available)
    result.value = null
  }
})

watch(() => props.available, (available) => {
  quantity.value = clampQuantity(quantity.value, available)
})

function openChests() {
  const opened = store.openChests(clampQuantity(quantity.value, props.available))
  if (opened.opened > 0) result.value = opened
}

function clampQuantity(value: number, max: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.max(1, Math.min(Math.floor(value), Math.max(1, max)))
}
</script>

<style scoped>
.chest-modal-backdrop { position: fixed; inset: 0; z-index: 11000; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(0, 0, 0, 0.74); backdrop-filter: blur(5px); }
.chest-modal { width: min(100%, 430px); display: flex; flex-direction: column; gap: 16px; padding: 24px; border: 2px solid rgba(246, 211, 107, 0.42); border-radius: var(--radius-xl); background: var(--color-bg-surface); box-shadow: 0 24px 80px rgba(0, 0, 0, 0.46); }
.chest-heading { display: flex; align-items: center; gap: 12px; }
.chest-heading-icon { width: 44px; height: 44px; display: grid; place-items: center; border-radius: var(--radius-md); color: var(--em-gold); background: rgba(246, 211, 107, 0.14); }
.chest-heading h2 { font-family: var(--font-display); font-size: 18px; }
.chest-heading p, .chest-result > span { margin-top: 4px; color: var(--color-text-muted); font-size: 12px; }
.chest-form, .chest-result { display: flex; flex-direction: column; gap: 12px; }
.chest-count-row { display: flex; justify-content: space-between; color: var(--color-text-secondary); font-size: 12px; }
.chest-count-row strong { color: var(--em-gold); }
.chest-range { accent-color: var(--em-gold); }
.chest-controls, .chest-actions { display: flex; gap: 8px; }
.chest-number { flex: 1; min-width: 0; padding: 8px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); color: var(--color-text-primary); background: var(--color-bg-card); font: inherit; }
.chest-primary, .chest-secondary, .chest-close { min-height: 36px; padding: 7px 13px; border-radius: var(--radius-md); font: inherit; font-size: 12px; font-weight: 800; cursor: pointer; }
.chest-primary { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid #d97706; color: #fff7ed; background: #92400e; }
.chest-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.chest-secondary, .chest-close { border: 1px solid var(--color-border); color: var(--color-text-secondary); background: transparent; }
.chest-result { align-items: center; text-align: center; }
.chest-reveal { position: relative; display: grid; place-items: center; width: 74px; height: 68px; color: var(--em-gold); filter: drop-shadow(0 0 10px rgba(246, 211, 107, 0.5)); animation: chest-reveal 0.5s ease both; }
.chest-reveal svg:last-child { position: absolute; top: 4px; right: 4px; color: #fff7ed; }
.chest-rewards { width: 100%; display: flex; flex-direction: column; gap: 6px; padding: 10px; border: 1px solid rgba(246, 211, 107, 0.24); border-radius: var(--radius-md); background: rgba(246, 211, 107, 0.06); }
.chest-reward { display: grid; grid-template-columns: 24px 1fr auto; gap: 7px; align-items: center; color: var(--em-gold); font-size: 12px; text-align: left; }
.chest-reward strong { color: #fff7ed; }
.chest-actions > * { flex: 1; }
.chest-close { align-self: center; min-width: 100px; }
@keyframes chest-reveal { from { opacity: 0; transform: translateY(8px) scale(0.76); } to { opacity: 1; transform: translateY(0) scale(1); } }
.chest-modal-enter-active, .chest-modal-leave-active { transition: opacity 0.2s ease; }
.chest-modal-enter-from, .chest-modal-leave-to { opacity: 0; }
</style>
