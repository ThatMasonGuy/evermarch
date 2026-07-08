<template>
  <div class="em-app" data-theme="evermarch">
    <!-- Top Bar -->
    <TopBar @backup="handleBackup" @settings="showSettings = true" />

    <!-- Main Layout -->
    <div class="em-layout" :class="{ 'em-layout-log-collapsed': isLogCollapsed }">
      <!-- Left Sidebar -->
      <SidebarNav v-model="activeTab" />

      <!-- Center Content -->
      <main class="em-main">
        <!-- Default: Lanes View (Active + Passive) -->
        <div v-if="activeTab === 'lanes'" class="em-lanes-view animate-fade-in">
          <!-- Active Lane — dominant center -->
          <ActiveLanePanel />

          <!-- Passive Lanes -->
          <div class="em-passive-lanes">
            <PassiveLanePanel lane-type="idle" />
            <PassiveLanePanel lane-type="background" />
          </div>
        </div>

        <!-- Skills View -->
        <div v-else-if="activeTab === 'skills'" class="animate-fade-in">
          <SkillsPanel />
        </div>

        <!-- Inventory View -->
        <div v-else-if="activeTab === 'inventory'" class="animate-fade-in">
          <InventoryPanel />
        </div>

        <!-- World View -->
        <div v-else-if="activeTab === 'world'" class="animate-fade-in">
          <WorldPanel />
        </div>

        <!-- Delve (Placeholder) -->
        <div v-else-if="activeTab === 'delve'" class="em-placeholder animate-fade-in">
          <div class="em-placeholder-icon">
            <Swords :size="32" />
          </div>
          <h2 class="em-placeholder-title">Delve</h2>
          <p class="em-placeholder-desc">
            Enter procedural dungeons for loot and experience. Coming in a future update.
          </p>
        </div>
      </main>

      <!-- Right Sidebar: Activity Log -->
      <ActivityLog :collapsed="isLogCollapsed" @update:collapsed="isLogCollapsed = $event" />
    </div>

    <!-- Settings / Save Modal -->
    <SaveControls :visible="showSettings" @close="showSettings = false" />
    <GainToasts />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Swords } from 'lucide-vue-next'
import TopBar from '../components/TopBar.vue'
import SidebarNav from '../components/SidebarNav.vue'
import ActivityLog from '../components/ActivityLog.vue'
import ActiveLanePanel from '../components/ActiveLanePanel.vue'
import PassiveLanePanel from '../components/PassiveLanePanel.vue'
import SkillsPanel from '../components/SkillsPanel.vue'
import InventoryPanel from '../components/InventoryPanel.vue'
import WorldPanel from '../components/WorldPanel.vue'
import SaveControls from '../components/SaveControls.vue'
import GainToasts from '../components/GainToasts.vue'
import { useGameStore } from '../stores/gameStore'
import { useAuthStore } from '@/platform/stores/authStore'
import { isFirebaseEnabled } from '@/platform/services/firebase'
import { startEngine, stopEngine, processOfflineProgress } from '../engine/gameEngine'
import { loadLocal, saveLocal, pushToCloud } from '../engine/saveSystem'

const store = useGameStore()
const authStore = useAuthStore()
const activeTab = ref('lanes')
const showSettings = ref(false)
const isLogCollapsed = ref(true)

onMounted(() => {
  // Load save
  const savedData = loadLocal()
  if (savedData) {
    store.deserialize(savedData)
    // Process offline gains for idle + background (NOT active)
    processOfflineProgress(savedData.lastSavedAt)
  } else {
    store.resetToDefaults()
    store.addLog('Welcome to Evermarch!', 'system')
  }

  // Start game tick
  startEngine()

  // Save on tab close
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  stopEngine()
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

function handleBeforeUnload() {
  saveLocal()
}

async function handleBackup() {
  if (!authStore.user) {
    store.addLog('Sign in to back up to the cloud.', 'system')
    return
  }
  if (!isFirebaseEnabled) {
    store.addLog('Cloud backup is unavailable in this environment.', 'system')
    return
  }
  saveLocal()
  const ok = await pushToCloud(authStore.user.uid)
  if (!ok) {
    store.addLog('Cloud backup failed.', 'system')
  }
}
</script>

<style scoped>
.em-app {
  height: 100vh;
  height: 100dvh;
  background: var(--color-bg-deep);
  color: var(--color-text-primary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Layout ──────────────────────────────────────────────── */
.em-layout {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr) 260px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.em-layout-log-collapsed {
  grid-template-columns: 180px minmax(0, 1fr) 52px;
}

/* ── Main Content ────────────────────────────────────────── */
.em-main {
  overflow-y: auto;
  min-width: 0;
  min-height: 0;
  padding: 14px 16px;
}

/* ── Lanes View ──────────────────────────────────────────── */
.em-lanes-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.em-passive-lanes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

/* ── Placeholder Panels ──────────────────────────────────── */
.em-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px 24px;
  text-align: center;
}

.em-placeholder-icon {
  color: var(--color-accent);
  opacity: 0.5;
}

.em-placeholder-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
}

.em-placeholder-desc {
  font-size: 14px;
  color: var(--color-text-muted);
  max-width: 400px;
  line-height: 1.6;
}

/* ── Animations ──────────────────────────────────────────── */
.animate-fade-in {
  animation: fade-in 0.3s ease both;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ── Responsive ──────────────────────────────────────────── */
@media (max-width: 1024px) {
  .em-layout {
    grid-template-columns: 56px minmax(0, 1fr) 210px;
  }

  .em-layout-log-collapsed {
    grid-template-columns: 56px minmax(0, 1fr) 52px;
  }
}

@media (max-width: 768px) {
  .em-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }

  .em-layout > :first-child {
    border-right: none;
    border-bottom: 1px solid var(--color-border);
  }

  .em-layout > :first-child :deep(.em-sidebar-nav) {
    flex-direction: row;
    overflow-x: auto;
    padding: 6px 8px;
  }

  .em-layout > :last-child {
    display: none;
  }

  .em-passive-lanes {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .em-main {
    padding: 12px;
  }
}
</style>
