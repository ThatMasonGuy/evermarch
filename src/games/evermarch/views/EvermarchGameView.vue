<template>
  <div class="em-app" data-theme="evermarch">
    <!-- Top Bar -->
    <TopBar
      :cloud-sync-label="cloudSyncLabel"
      :cloud-sync-title="cloudSyncTitle"
      :cloud-sync-disabled="cloudBackupDisabled"
      :cloud-busy="cloudBusy"
      @backup="handleBackup"
      @settings="showSettings = true"
    />

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

        <!-- Progression View -->
        <div v-else-if="activeTab === 'progression'" class="animate-fade-in">
          <ProgressionPanel />
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
    <SaveControls
      :visible="showSettings"
      :cloud-busy="cloudBusy"
      :cloud-backup-disabled="cloudBackupDisabled"
      :cloud-cooldown-remaining-ms="cloudCooldownRemainingMs"
      :cloud-sync-detail="cloudSyncDetail"
      :backup-to-cloud="handleBackup"
      @close="showSettings = false"
    />
    <WelcomeBackModal :summary="offlineSummary" @close="offlineSummary = null" />
    <GainToasts />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { Swords } from 'lucide-vue-next'
import TopBar from '../components/TopBar.vue'
import SidebarNav from '../components/SidebarNav.vue'
import ActivityLog from '../components/ActivityLog.vue'
import ActiveLanePanel from '../components/ActiveLanePanel.vue'
import PassiveLanePanel from '../components/PassiveLanePanel.vue'
import SkillsPanel from '../components/SkillsPanel.vue'
import InventoryPanel from '../components/InventoryPanel.vue'
import WorldPanel from '../components/WorldPanel.vue'
import ProgressionPanel from '../components/ProgressionPanel.vue'
import SaveControls from '../components/SaveControls.vue'
import WelcomeBackModal from '../components/WelcomeBackModal.vue'
import GainToasts from '../components/GainToasts.vue'
import { useGameStore } from '../stores/gameStore'
import { useAuthStore } from '@/platform/stores/authStore'
import { isFirebaseEnabled } from '@/platform/services/firebase'
import { startEngine, stopEngine, processOfflineProgress, type OfflineProgressSummary } from '../engine/gameEngine'
import { loadLocal, saveLocal, pushToCloud } from '../engine/saveSystem'

const store = useGameStore()
const authStore = useAuthStore()
const activeTab = ref('lanes')
const showSettings = ref(false)
const isLogCollapsed = ref(true)
const offlineSummary = ref<OfflineProgressSummary | null>(null)
const cloudBusy = ref(false)
const nowMs = ref(Date.now())

const CLOUD_SAVE_COOLDOWN_MS = 30_000

let cloudStatusTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  // Load save
  const savedData = loadLocal()
  if (savedData) {
    store.deserialize(savedData)
    // Process offline gains for idle + background (NOT active)
    offlineSummary.value = processOfflineProgress(savedData.lastSavedAt)
  } else {
    store.resetToDefaults()
    store.addLog('Welcome to Evermarch!', 'system')
  }

  // Start game tick
  startEngine()

  // Save on tab close
  window.addEventListener('beforeunload', handleBeforeUnload)
  cloudStatusTimer = setInterval(() => {
    nowMs.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  stopEngine()
  window.removeEventListener('beforeunload', handleBeforeUnload)
  if (cloudStatusTimer) {
    clearInterval(cloudStatusTimer)
    cloudStatusTimer = null
  }
})

function handleBeforeUnload() {
  saveLocal()
}

const cloudSyncAgeMs = computed(() => {
  if (!store.lastCloudSyncedAt) return null
  return Math.max(0, nowMs.value - store.lastCloudSyncedAt)
})

const cloudCooldownRemainingMs = computed(() => {
  if (!store.lastCloudSyncedAt) return 0
  return Math.max(0, CLOUD_SAVE_COOLDOWN_MS - Math.max(0, nowMs.value - store.lastCloudSyncedAt))
})

const cloudCooldownRemainingSeconds = computed(() => Math.ceil(cloudCooldownRemainingMs.value / 1000))

const cloudBackupDisabled = computed(() => cloudBusy.value || cloudCooldownRemainingMs.value > 0)

const cloudSyncLabel = computed(() => {
  if (cloudBusy.value) return 'Saving'
  if (cloudSyncAgeMs.value === null) return 'No sync'
  return formatShortDuration(cloudSyncAgeMs.value)
})

const cloudSyncTitle = computed(() => {
  if (cloudBusy.value) return 'Saving to cloud'
  if (cloudSyncAgeMs.value === null) return 'Save to Cloud'
  const syncedText = formatLastSyncedText(cloudSyncAgeMs.value)
  if (cloudCooldownRemainingMs.value > 0) {
    return `${syncedText}. Backup available in ${cloudCooldownRemainingSeconds.value}s.`
  }
  return syncedText
})

const cloudSyncDetail = computed(() => {
  if (cloudBusy.value) return 'Saving to cloud...'
  if (cloudSyncAgeMs.value === null) return 'Not yet synced to cloud.'
  const syncedText = formatLastSyncedText(cloudSyncAgeMs.value)
  if (cloudCooldownRemainingMs.value > 0) {
    return `${syncedText}. Next cloud backup in ${cloudCooldownRemainingSeconds.value}s.`
  }
  return `${syncedText}.`
})

function formatShortDuration(ms: number): string {
  if (ms < 1_000) return 'Now'
  if (ms < 60_000) return `${Math.floor(ms / 1_000)}s`
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`
  return `${Math.floor(ms / 86_400_000)}d`
}

function formatReadableDuration(ms: number): string {
  if (ms < 1_000) return 'just now'
  if (ms < 60_000) {
    const seconds = Math.floor(ms / 1_000)
    return `${seconds}s`
  }
  if (ms < 3_600_000) {
    const minutes = Math.floor(ms / 60_000)
    return `${minutes}m`
  }
  if (ms < 86_400_000) {
    const hours = Math.floor(ms / 3_600_000)
    const minutes = Math.floor((ms % 3_600_000) / 60_000)
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
  const days = Math.floor(ms / 86_400_000)
  const hours = Math.floor((ms % 86_400_000) / 3_600_000)
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`
}

function formatLastSyncedText(ms: number): string {
  const age = formatReadableDuration(ms)
  return age === 'just now' ? 'Last synced just now' : `Last synced ${age} ago`
}

async function handleBackup(): Promise<boolean> {
  if (cloudBusy.value) return false
  if (cloudCooldownRemainingMs.value > 0) {
    store.addLog(`Cloud backup available in ${cloudCooldownRemainingSeconds.value}s.`, 'system')
    return false
  }
  if (!authStore.user) {
    store.addLog('Sign in to back up to the cloud.', 'system')
    return false
  }
  if (!isFirebaseEnabled) {
    store.addLog('Cloud backup is unavailable in this environment.', 'system')
    return false
  }
  cloudBusy.value = true
  try {
    saveLocal()
    const ok = await pushToCloud(authStore.user.uid)
    nowMs.value = Date.now()
    if (!ok) {
      store.addLog('Cloud backup failed.', 'system')
    }
    return ok
  } finally {
    cloudBusy.value = false
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
