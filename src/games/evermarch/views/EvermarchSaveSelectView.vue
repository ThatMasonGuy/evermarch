<template>
  <div class="save-page" data-theme="evermarch">
    <!-- Nav -->
    <nav class="save-nav">
      <div class="save-nav-inner">
        <a :href="portalHref" class="save-nav-back">
          <ArrowLeft :size="16" />
          <span>Back to Evermarch</span>
        </a>
        <div class="save-nav-title">
          <Compass :size="18" />
          <span>Evermarch</span>
        </div>
        <div class="save-nav-user">
          <span class="save-nav-username">{{ authStore.displayName }}</span>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <div class="save-content">
      <div class="save-header animate-fade-in-up">
        <h1 class="save-title">Choose Your Path</h1>
        <p class="save-subtitle">Continue your local adventure or start a new one</p>
      </div>

      <div class="save-grid">
        <!-- Local Save Card -->
        <div
          v-if="hasLocal"
          class="save-card save-card-selected animate-fade-in-up"
          @click="continueLocal"
        >
          <div class="save-card-header">
            <div class="save-card-name">{{ localInfo.saveName }}</div>
            <div class="save-card-badge">Local Save</div>
          </div>

          <div class="save-card-meta">
            <div class="save-meta-row">
              <TrendingUp :size="13" />
              <span>Total Level {{ localInfo.totalLevel }}</span>
            </div>
            <div class="save-meta-row">
              <Clock :size="13" />
              <span>{{ formatPlaytime(localInfo.playtime) }}</span>
            </div>
            <div class="save-meta-row">
              <Calendar :size="13" />
              <span>{{ formatDate(localInfo.lastSavedAt) }}</span>
            </div>
            <div class="save-meta-row">
              <Coins :size="13" />
              <span>{{ localInfo.gold.toLocaleString() }} gold</span>
            </div>
          </div>

          <div class="save-card-footer">
            <div class="save-storage">
              <HardDrive :size="13" />
              <span>Stored on this device</span>
            </div>
          </div>
        </div>

        <!-- Cloud Restore Card (if logged in) -->
        <div
          v-if="authStore.user && isFirebaseEnabled"
          class="save-card save-card-cloud animate-fade-in-up"
        >
          <div class="save-card-header">
            <div class="save-card-name">Cloud Backup</div>
            <div class="save-card-badge save-card-badge-cloud">
              <Cloud :size="11" />
              Remote
            </div>
          </div>
          <div class="save-card-desc">
            <p v-if="cloudLoading">Checking for cloud backup...</p>
            <p v-else-if="cloudAvailable">
              A cloud backup exists. Restore it to this device to continue where you left off on another device.
            </p>
            <p v-else>
              No cloud backup found. Play locally and back up from in-game settings.
            </p>
          </div>
          <div class="save-card-footer" v-if="cloudAvailable">
            <button class="save-cloud-btn" @click.stop="restoreFromCloud">
              <CloudDownload :size="14" />
              <span>Restore to Device</span>
            </button>
          </div>
        </div>

        <!-- New Adventure Card -->
        <div class="save-card save-card-new animate-fade-in-up" @click="showCreateModal = true">
          <div class="save-new-inner">
            <Plus :size="32" />
            <span>New Adventure</span>
            <small v-if="hasLocal">This will overwrite your current save</small>
          </div>
        </div>
      </div>

      <!-- Action Bar -->
      <div class="save-actions animate-fade-in-up" v-if="hasLocal">
        <button class="btn btn-accent btn-play" @click="continueLocal">
          <Play :size="18" />
          <span>Continue Adventure</span>
        </button>
      </div>
      <div class="save-actions animate-fade-in-up" v-else>
        <button class="btn btn-accent btn-play" @click="showCreateModal = true">
          <Play :size="18" />
          <span>Start New Adventure</span>
        </button>
      </div>
    </div>

    <!-- Create Save Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCreateModal" class="modal-backdrop" @click.self="showCreateModal = false">
          <div class="modal-panel" data-theme="evermarch">
            <h2 class="modal-title">New Adventure</h2>

            <div class="modal-field">
              <label class="modal-label">Save Name</label>
              <input
                v-model="newSaveName"
                type="text"
                class="modal-input"
                placeholder="Name your adventure..."
                maxlength="32"
              />
            </div>

            <p class="modal-note" v-if="hasLocal">
              This will replace your existing local save. You can back up your current save to the cloud first from the in-game settings.
            </p>

            <div class="modal-actions">
              <button class="btn btn-ghost" @click="showCreateModal = false">Cancel</button>
              <button
                class="btn btn-accent"
                :disabled="!newSaveName.trim()"
                @click="handleCreateSave"
              >
                <Plus :size="14" />
                <span>Begin</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft, Compass, TrendingUp, Clock, Calendar, Coins,
  Cloud, CloudDownload, HardDrive,
  Plus, Play
} from 'lucide-vue-next'
import { useAuthStore } from '@/platform/stores/authStore'
import { isFirebaseEnabled } from '@/platform/services/firebase'
import { useGameStore } from '../stores/gameStore'
import { loadLocal, saveLocal, deleteLocalSave, pullFromCloud, hasCloudSave } from '../engine/saveSystem'
import { levelForXp } from '../data/xp'

const router = useRouter()
const authStore = useAuthStore()
const gameStore = useGameStore()

const hasLocal = ref(false)
const localInfo = ref({
  saveName: '',
  playtime: 0,
  lastSavedAt: 0,
  totalLevel: 0,
  gold: 0,
})

const cloudLoading = ref(false)
const cloudAvailable = ref(false)

const showCreateModal = ref(false)
const newSaveName = ref('')
const portalHref = import.meta.env.DEV ? '/' : '/evermarch'

onMounted(async () => {
  // Check local save
  const data = loadLocal()
  if (data) {
    hasLocal.value = true
    localInfo.value = {
      saveName: data.saveName ?? 'Adventure',
      playtime: data.playtime ?? 0,
      lastSavedAt: data.lastSavedAt ?? 0,
      totalLevel: (data.skills ?? []).reduce((sum, s) => sum + levelForXp(s.xp), 0),
      gold: data.gold ?? 0,
    }
  }

  // Check cloud save
  if (authStore.user) {
    cloudLoading.value = true
    cloudAvailable.value = await hasCloudSave(authStore.user.uid)
    cloudLoading.value = false
  }
})

function formatPlaytime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatDate(ts: number): string {
  if (!ts) return 'Never'
  return new Date(ts).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function continueLocal() {
  router.push('/play')
}

async function restoreFromCloud() {
  if (!authStore.user) return
  if (!cloudAvailable.value) return

  if (hasLocal.value) {
    if (!confirm('This will overwrite your local save with the cloud backup. Continue?')) return
  }

  const data = await pullFromCloud(authStore.user.uid)
  if (data) {
    gameStore.deserialize(data)
    saveLocal()
    router.push('/play')
  }
}

function handleCreateSave() {
  if (!newSaveName.value.trim()) return

  if (hasLocal.value) {
    deleteLocalSave()
  }

  gameStore.resetToDefaults(newSaveName.value.trim())
  saveLocal()
  showCreateModal.value = false
  router.push('/play')
}
</script>

<style scoped>
.save-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--color-bg-deep);
  color: var(--color-text-primary);
  display: flex;
  flex-direction: column;
}

/* Nav */
.save-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(6, 13, 10, 0.9);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--color-border);
}
.save-nav-inner {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
}
.save-nav-back {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-muted);
  text-decoration: none;
  transition: color var(--transition-fast);
}
.save-nav-back:hover { color: var(--color-accent-light); }
.save-nav-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  color: var(--color-accent-light);
}
.save-nav-username {
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* Content */
.save-content {
  flex: 1;
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
  padding: 48px 24px 80px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}
.save-header { text-align: center; }
.save-title {
  font-family: var(--font-display);
  font-size: clamp(28px, 6vw, 40px);
  font-weight: 800;
  animation: glow-pulse-text 4s ease-in-out infinite;
}
@keyframes glow-pulse-text {
  0%, 100% { text-shadow: 0 0 8px var(--color-accent-glow); }
  50% { text-shadow: 0 0 20px var(--color-accent-glow-strong); }
}
.save-subtitle {
  font-size: 15px;
  color: var(--color-text-secondary);
  margin-top: 8px;
}

/* Save Grid */
.save-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.save-card {
  position: relative;
  padding: 20px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  cursor: pointer;
  transition: all var(--transition-base);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.save-card:hover {
  border-color: var(--color-border-hover);
  background: var(--color-bg-card-hover);
}
.save-card-selected {
  border-color: var(--color-accent);
  box-shadow: 0 0 16px var(--color-accent-glow), inset 0 0 0 1px var(--color-accent-glow);
}

.save-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.save-card-name {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-primary);
}
.save-card-badge {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--color-accent-glow);
  color: var(--color-accent-light);
}
.save-card-badge-cloud {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(139, 92, 246, 0.15);
  color: #a78bfa;
}

.save-card-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.save-meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.save-card-desc {
  font-size: 13px;
  color: var(--color-text-muted);
  line-height: 1.6;
}

.save-card-footer {
  display: flex;
  align-items: center;
  padding-top: 10px;
  border-top: 1px solid var(--color-border);
}
.save-storage {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--color-text-muted);
}

.save-cloud-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(139, 92, 246, 0.3);
  background: rgba(139, 92, 246, 0.1);
  color: #a78bfa;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.save-cloud-btn:hover {
  background: rgba(139, 92, 246, 0.2);
}

/* New Save Card */
.save-card-new {
  border-style: dashed;
  border-color: var(--color-border-hover);
  background: transparent;
}
.save-card-new:hover {
  border-color: var(--color-accent);
  background: var(--color-accent-glow);
}
.save-new-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 120px;
  color: var(--color-text-muted);
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
}
.save-new-inner small {
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 400;
  color: var(--color-text-muted);
}
.save-card-new:hover .save-new-inner { color: var(--color-accent-light); }

/* Actions */
.save-actions {
  display: flex;
  justify-content: center;
  padding-top: 16px;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all var(--transition-base);
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-accent { background: var(--color-accent); color: #fff; }
.btn-accent:hover:not(:disabled) { box-shadow: 0 0 20px var(--color-accent-glow-strong); }
.btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}
.btn-ghost:hover { border-color: var(--color-border-hover); color: var(--color-text-primary); }
.btn-play {
  font-size: 16px;
  padding: 14px 36px;
  letter-spacing: 0.5px;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.modal-panel {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 32px;
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.modal-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  text-align: center;
}
.modal-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.modal-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.modal-input {
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  font-family: var(--font-body);
  font-size: 14px;
  outline: none;
  transition: border-color var(--transition-fast);
}
.modal-input:focus { border-color: var(--color-accent); }
.modal-input::placeholder { color: var(--color-text-muted); }
.modal-note {
  font-size: 12px;
  color: #fbbf24;
  line-height: 1.5;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
}

/* Transitions */
.modal-enter-active { transition: opacity 0.25s ease; }
.modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .modal-panel { transition: transform 0.25s ease; }
.modal-enter-from .modal-panel { transform: scale(0.95) translateY(10px); }

@media (max-width: 768px) {
  .save-content { padding: 32px 16px 64px; }
  .save-grid { grid-template-columns: 1fr; }
}
</style>
