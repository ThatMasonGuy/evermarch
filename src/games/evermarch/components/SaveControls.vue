<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-backdrop" data-theme="evermarch" @click.self="$emit('close')">
        <div class="save-modal">
          <h2 class="save-modal-title">Save & Settings</h2>

          <!-- Save Info -->
          <div class="save-info">
            <div class="save-info-row">
              <span class="save-info-label">Save Name</span>
              <span class="save-info-value">{{ store.saveName }}</span>
            </div>
            <div class="save-info-row">
              <span class="save-info-label">Playtime</span>
              <span class="save-info-value">{{ formatPlaytime(store.playtime) }}</span>
            </div>
            <div class="save-info-row">
              <span class="save-info-label">Last Saved</span>
              <span class="save-info-value">{{ formatDate(store.lastSavedAt) }}</span>
            </div>
            <div class="save-info-row">
              <span class="save-info-label">Total Level</span>
              <span class="save-info-value">{{ store.totalLevel }}</span>
            </div>
          </div>

          <!-- Local Save Actions -->
          <div class="save-section">
            <h3 class="save-section-title">
              <HardDrive :size="14" />
              <span>Local Save</span>
            </h3>
            <p class="save-section-desc">Your game saves automatically to this device every 30 seconds.</p>
            <button class="save-btn" @click="handleSaveLocal">
              <Save :size="14" />
              <span>Save Now</span>
            </button>
          </div>

          <!-- Cloud Backup -->
          <div class="save-section">
            <h3 class="save-section-title">
              <Cloud :size="14" />
              <span>Cloud Backup</span>
            </h3>
            <p class="save-section-desc">
              Manually back up to the cloud to transfer between devices.
              Cloud saves do not replace your local save.
            </p>
            <div class="save-btn-row">
              <button
                class="save-btn"
                :disabled="!isLoggedIn || cloudBusy"
                @click="handlePushToCloud"
              >
                <CloudUpload :size="14" />
                <span>{{ cloudBusy ? 'Saving...' : 'Backup to Cloud' }}</span>
              </button>
              <button
                class="save-btn save-btn-ghost"
                :disabled="!isLoggedIn || cloudBusy"
                @click="handlePullFromCloud"
              >
                <CloudDownload :size="14" />
                <span>{{ cloudBusy ? 'Loading...' : 'Restore from Cloud' }}</span>
              </button>
            </div>
            <p v-if="!isLoggedIn" class="save-warning">Sign in to use cloud saves.</p>
            <p v-if="cloudMessage" class="save-message" :class="cloudMessageType">{{ cloudMessage }}</p>
          </div>

          <!-- Danger Zone -->
          <div class="save-section save-section-danger">
            <h3 class="save-section-title save-title-danger">
              <AlertTriangle :size="14" />
              <span>Reset</span>
            </h3>
            <button class="save-btn save-btn-danger" @click="handleReset">
              <Trash2 :size="14" />
              <span>Delete Save & Start Over</span>
            </button>
          </div>

          <button class="save-close" @click="$emit('close')">Close</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  HardDrive, Cloud, CloudUpload, CloudDownload,
  Save, Trash2, AlertTriangle
} from 'lucide-vue-next'
import { useGameStore } from '../stores/gameStore'
import { useAuthStore } from '@/platform/stores/authStore'
import { saveLocal, pushToCloud, pullFromCloud, deleteLocalSave } from '../engine/saveSystem'

defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const store = useGameStore()
const authStore = useAuthStore()

const isLoggedIn = computed(() => !!authStore.user)
const cloudBusy = ref(false)
const cloudMessage = ref('')
const cloudMessageType = ref<'success' | 'error'>('success')

function formatPlaytime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function handleSaveLocal() {
  saveLocal()
  store.addLog('Game saved locally.', 'system')
  cloudMessage.value = 'Saved locally.'
  cloudMessageType.value = 'success'
}

async function handlePushToCloud() {
  if (!authStore.user) return
  cloudBusy.value = true
  cloudMessage.value = ''
  const ok = await pushToCloud(authStore.user.uid)
  cloudBusy.value = false
  if (ok) {
    cloudMessage.value = 'Backed up to cloud successfully.'
    cloudMessageType.value = 'success'
  } else {
    cloudMessage.value = 'Cloud backup failed. Try again.'
    cloudMessageType.value = 'error'
  }
}

async function handlePullFromCloud() {
  if (!authStore.user) return
  if (!confirm('This will overwrite your local save with the cloud backup. Continue?')) return

  cloudBusy.value = true
  cloudMessage.value = ''
  const data = await pullFromCloud(authStore.user.uid)
  cloudBusy.value = false

  if (data) {
    store.deserialize(data)
    saveLocal()
    store.addLog('Save restored from cloud.', 'system')
    cloudMessage.value = 'Restored from cloud.'
    cloudMessageType.value = 'success'
  } else {
    cloudMessage.value = 'No cloud save found, or restore failed.'
    cloudMessageType.value = 'error'
  }
}

function handleReset() {
  if (!confirm('Are you sure? This will permanently delete your save.')) return
  if (!confirm('Really? All progress will be lost.')) return
  deleteLocalSave()
  store.resetToDefaults()
  saveLocal()
  store.addLog('Save reset. Starting fresh.', 'system')
  emit('close')
}
</script>

<style scoped>
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

.save-modal {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 28px;
  width: 100%;
  max-width: 440px;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.save-modal-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  text-align: center;
}

.save-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
}

.save-info-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.save-info-label { color: var(--color-text-muted); }
.save-info-value { color: var(--color-text-secondary); font-weight: 600; }

.save-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.save-section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.save-section-desc {
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.save-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-accent);
  background: var(--color-accent-glow);
  color: var(--color-accent-light);
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.save-btn:hover:not(:disabled) {
  background: rgba(52, 211, 153, 0.2);
}
.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.save-btn-ghost {
  border-color: var(--color-border);
  background: none;
  color: var(--color-text-secondary);
}
.save-btn-ghost:hover:not(:disabled) {
  border-color: var(--color-border-hover);
  color: var(--color-text-primary);
}

.save-btn-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.save-btn-danger {
  border-color: #b91c1c;
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
}
.save-btn-danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.2);
}

.save-title-danger { color: #f87171; }

.save-section-danger {
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.save-warning {
  font-size: 11px;
  color: #fbbf24;
}

.save-message {
  font-size: 11px;
  font-weight: 500;
}
.save-message.success { color: var(--color-accent-light); }
.save-message.error { color: #f87171; }

.save-close {
  padding: 8px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: none;
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.save-close:hover {
  border-color: var(--color-border-hover);
  color: var(--color-text-primary);
}

.modal-enter-active { transition: opacity 0.25s ease; }
.modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .save-modal { transition: transform 0.25s ease; }
.modal-enter-from .save-modal { transform: scale(0.95) translateY(10px); }
</style>
