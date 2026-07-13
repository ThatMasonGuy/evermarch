<template>
  <Teleport to="body">
    <Transition name="chest-modal">
      <div v-if="visible && result" class="chest-modal-backdrop" data-theme="evermarch" @click.self="$emit('close')">
        <section class="chest-modal" role="dialog" aria-modal="true" aria-labelledby="chest-title">
          <div class="chest-reveal" aria-hidden="true">
            <span class="chest-reveal-glow"></span>
            <img :src="SPECIAL_ITEM_SPRITES.minersChestOpen" alt="" />
            <Sparkles :size="22" class="chest-reveal-spark chest-reveal-spark-left" />
            <Sparkles :size="18" class="chest-reveal-spark chest-reveal-spark-right" />
          </div>

          <header class="chest-heading">
            <span>Haul revealed</span>
            <h2 id="chest-title">{{ result.opened === 1 ? "Miner's chest opened" : `${result.opened.toLocaleString()} chests opened` }}</h2>
          </header>

          <div class="chest-rewards" aria-label="Chest rewards">
            <div v-for="reward in result.rewards" :key="reward.resourceId" class="chest-reward">
              <span class="chest-reward-icon">
                <img v-if="rewardSprite(reward.resourceId)" :src="rewardSprite(reward.resourceId) ?? ''" alt="" />
                <Bomb v-else :size="24" />
              </span>
              <span>
                <small>Added to inventory</small>
                <strong>{{ getResourceName(reward.resourceId) }}</strong>
              </span>
              <b>+{{ reward.amount.toLocaleString() }}</b>
            </div>
          </div>

          <button type="button" class="chest-done" @click="$emit('close')">Done</button>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { Bomb, Sparkles } from 'lucide-vue-next'
import type { ChestOpenResult } from '../stores/gameStore'
import { getResourceDefinition, getResourceName } from '../data/resources'
import { SPECIAL_ITEM_SPRITES, spriteForResource } from '../assets/visualAssets'

defineProps<{ visible: boolean; result: ChestOpenResult | null }>()
defineEmits<{ close: [] }>()

function rewardSprite(resourceId: string): string | null {
  const resource = getResourceDefinition(resourceId)
  return spriteForResource(resourceId, resource.category)
}
</script>

<style scoped>
.chest-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 11000;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(5, 4, 2, 0.82);
  backdrop-filter: blur(7px);
}

.chest-modal {
  width: min(100%, 460px);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
  overflow: hidden;
  padding: 22px;
  border: 3px solid #6f5336;
  border-radius: var(--radius-lg);
  background:
    linear-gradient(180deg, rgba(246, 211, 107, 0.08), transparent 42%),
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.025) 0 2px, transparent 2px 10px),
    #21170f;
  box-shadow:
    inset 0 3px 0 rgba(255, 255, 255, 0.09),
    inset 0 -7px 0 rgba(0, 0, 0, 0.24),
    0 28px 90px rgba(0, 0, 0, 0.58);
}

.chest-reveal {
  height: 180px;
  position: relative;
  display: grid;
  place-items: center;
}

.chest-reveal-glow {
  position: absolute;
  width: 190px;
  height: 110px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.38), rgba(217, 119, 6, 0.08) 52%, transparent 72%);
  filter: blur(8px);
  animation: chest-glow 1.2s ease-in-out infinite alternate;
}

.chest-reveal img {
  width: 178px;
  height: 178px;
  z-index: 1;
  object-fit: contain;
  filter: drop-shadow(0 12px 0 rgba(0, 0, 0, 0.28));
  animation: chest-open-reveal 520ms cubic-bezier(0.2, 0.82, 0.2, 1.08) both;
}

.chest-reveal-spark {
  position: absolute;
  z-index: 2;
  color: #fde68a;
  filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.72));
  animation: chest-spark 760ms ease-out both;
}

.chest-reveal-spark-left { left: 15%; top: 36%; }
.chest-reveal-spark-right { right: 14%; top: 18%; animation-delay: 120ms; }

.chest-heading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
}

.chest-heading span {
  color: #e4b84a;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.chest-heading h2 {
  color: #fff7ed;
  font-family: var(--font-display);
  font-size: 20px;
}

.chest-rewards {
  display: grid;
  gap: 8px;
}

.chest-reward {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  padding: 10px;
  border: 2px solid rgba(228, 184, 74, 0.28);
  border-radius: var(--radius-md);
  background: rgba(228, 184, 74, 0.07);
  animation: chest-reward-in 360ms 220ms ease-out both;
}

.chest-reward-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(228, 184, 74, 0.3);
  border-radius: var(--radius-sm);
  color: #fca5a5;
  background: rgba(0, 0, 0, 0.25);
}

.chest-reward-icon img { width: 40px; height: 40px; object-fit: contain; }
.chest-reward > span:nth-child(2) { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.chest-reward small { color: var(--color-text-muted); font-size: 9px; font-weight: 750; text-transform: uppercase; }
.chest-reward strong { overflow: hidden; color: #fff7ed; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.chest-reward b { color: #f6d36b; font-size: 17px; font-variant-numeric: tabular-nums; }

.chest-done {
  min-height: 42px;
  border: 2px solid #d97706;
  border-radius: var(--radius-sm);
  color: #fff7ed;
  background: linear-gradient(180deg, #a94d0b, #78350f);
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.14), 0 4px 0 #431407;
  font: inherit;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}

.chest-done:active { translate: 0 3px; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 1px 0 #431407; }

@keyframes chest-open-reveal {
  from { opacity: 0; transform: translateY(18px) scale(0.72); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes chest-glow {
  from { opacity: 0.62; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1.08); }
}

@keyframes chest-spark {
  from { opacity: 0; transform: translateY(10px) scale(0.4) rotate(-18deg); }
  to { opacity: 1; transform: translateY(0) scale(1) rotate(0); }
}

@keyframes chest-reward-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.chest-modal-enter-active,
.chest-modal-leave-active { transition: opacity 180ms ease; }
.chest-modal-enter-from,
.chest-modal-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .chest-reveal-glow,
  .chest-reveal img,
  .chest-reveal-spark,
  .chest-reward { animation: none; }
}
</style>
