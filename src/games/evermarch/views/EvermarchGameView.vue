<template>
  <div class="em-app" data-theme="evermarch">
    <!-- Top Bar -->
    <TopBar
      :cloud-sync-label="cloudSyncLabel"
      :cloud-sync-title="cloudSyncTitle"
      :cloud-sync-disabled="cloudBackupDisabled"
      :cloud-busy="cloudBusy"
      :cloud-sync-stale="cloudSyncStale"
      @backup="handleBackup"
      @settings="showSettings = true"
    />

    <!-- Main Layout -->
    <div class="em-layout" :class="{ 'em-layout-log-collapsed': isLogCollapsed }">
      <!-- Left Sidebar -->
      <SidebarNav v-model="activeTab" />

      <!-- Center Content -->
      <main class="em-main">
        <!-- Active View -->
        <div v-if="activeTab === 'active'" class="em-active-view animate-fade-in">
          <!-- Active Lane — dominant center -->
          <ActiveLanePanel />

        </div>

        <!-- Routine View -->
        <div v-else-if="activeTab === 'routine'" class="em-routine-view animate-fade-in">
          <RoutinePanel />
        </div>

        <!-- Farming View -->
        <div v-else-if="activeTab === 'farming'" class="animate-fade-in">
          <FarmingPanel />
        </div>

        <!-- Quests View -->
        <div v-else-if="activeTab === 'quests'" class="animate-fade-in">
          <QuestsPanel @navigate="activeTab = $event" />
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
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { Swords } from 'lucide-vue-next'
import TopBar from '../components/TopBar.vue'
import SidebarNav from '../components/SidebarNav.vue'
import ActivityLog from '../components/ActivityLog.vue'
import ActiveLanePanel from '../components/ActiveLanePanel.vue'
import RoutinePanel from '../components/RoutinePanel.vue'
import FarmingPanel from '../components/FarmingPanel.vue'
import QuestsPanel from '../components/QuestsPanel.vue'
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
const activeTab = ref('active')
const showSettings = ref(false)
const isLogCollapsed = ref(true)
const offlineSummary = ref<OfflineProgressSummary | null>(null)
const cloudBusy = ref(false)
const nowMs = ref(Date.now())
const gameReadyForCloud = ref(false)
const autoCloudSyncedUid = ref<string | null>(null)

const CLOUD_SAVE_COOLDOWN_MS = 30_000
const CLOUD_SYNC_STALE_MS = 10 * 60 * 1000

let cloudStatusTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  // Load save
  const savedData = loadLocal()
  if (savedData) {
    store.deserialize(savedData)
    // Process offline gains for routine work. Farming plots become ready by timestamp.
    offlineSummary.value = processOfflineProgress(savedData.lastSavedAt)
  } else {
    store.resetToDefaults()
    store.addLog('Welcome to Evermarch!', 'system')
  }

  // Start game tick
  startEngine()
  gameReadyForCloud.value = true

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

watch(
  () => [authStore.user?.uid ?? null, gameReadyForCloud.value] as const,
  ([uid, ready]) => {
    if (!uid || !ready || autoCloudSyncedUid.value === uid) return
    autoCloudSyncedUid.value = uid
    void runCloudBackup({ ignoreCooldown: true, automatic: true })
  },
  { immediate: true }
)

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

const cloudSyncStale = computed(() => {
  if (!authStore.user || cloudBusy.value) return false
  if (cloudSyncAgeMs.value === null) return true
  return cloudSyncAgeMs.value > CLOUD_SYNC_STALE_MS
})

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
  return runCloudBackup()
}

async function runCloudBackup(options: { ignoreCooldown?: boolean; automatic?: boolean } = {}): Promise<boolean> {
  if (cloudBusy.value) return false
  if (!options.ignoreCooldown && cloudCooldownRemainingMs.value > 0) {
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
      store.addLog(options.automatic ? 'Login cloud sync failed.' : 'Cloud backup failed.', 'system')
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
  background:
    linear-gradient(rgba(246, 211, 107, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(246, 211, 107, 0.035) 1px, transparent 1px),
    linear-gradient(180deg, #171c16 0%, var(--color-bg-deep) 34%, #100b07 100%);
  background-size: 32px 32px, 32px 32px, auto;
  color: var(--color-text-primary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  overscroll-behavior: contain;
  -webkit-text-size-adjust: 100%;
}

/* ── Layout ──────────────────────────────────────────────── */
.em-layout {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr) 260px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border-top: 2px solid rgba(255, 255, 255, 0.04);
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
  background:
    linear-gradient(180deg, rgba(142, 202, 230, 0.035), transparent 180px),
    rgba(0, 0, 0, 0.08);
}

/* ── Primary Views ───────────────────────────────────────── */
.em-active-view,
.em-routine-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
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
  border: 2px dashed var(--color-border-hover);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
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
    grid-template-rows: auto minmax(0, 1fr) auto;
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
    min-height: 0;
  }

}

@media (max-width: 480px) {
  .em-main {
    padding: 12px;
  }
}
</style>
