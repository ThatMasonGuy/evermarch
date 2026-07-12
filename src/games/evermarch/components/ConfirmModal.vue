<template>
  <Teleport to="body">
    <Transition name="em-confirm-modal">
      <div
        v-if="visible"
        class="em-confirm-backdrop"
        data-theme="evermarch"
        role="presentation"
        @click.self="handleCancel"
      >
        <section
          class="em-confirm-modal"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="messageId"
        >
          <div class="em-confirm-icon" :class="{ 'em-confirm-icon-danger': danger }">
            <AlertTriangle v-if="danger" :size="20" />
            <Info v-else :size="20" />
          </div>
          <div class="em-confirm-copy">
            <h2 :id="titleId">{{ title }}</h2>
            <p :id="messageId">{{ message }}</p>
          </div>
          <div class="em-confirm-actions">
            <button v-if="!alertOnly" type="button" class="em-confirm-cancel" @click="handleCancel">
              {{ cancelLabel }}
            </button>
            <button
              type="button"
              class="em-confirm-accept"
              :class="{ 'em-confirm-accept-danger': danger }"
              @click="handleAccept"
            >
              {{ confirmLabel }}
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { AlertTriangle, Info } from 'lucide-vue-next'

withDefaults(defineProps<{
  visible: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  alertOnly?: boolean
}>(), {
  confirmLabel: 'Continue',
  cancelLabel: 'Cancel',
  danger: false,
  alertOnly: false,
})

const emit = defineEmits<{
  accept: []
  cancel: []
}>()

const titleId = `em-confirm-title-${Math.random().toString(36).slice(2)}`
const messageId = `em-confirm-message-${Math.random().toString(36).slice(2)}`

function handleAccept() {
  emit('accept')
}

function handleCancel() {
  emit('cancel')
}
</script>

<style scoped>
.em-confirm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 11000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(5px);
}

.em-confirm-modal {
  width: min(100%, 420px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 26px;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-xl);
  background: var(--color-bg-surface);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.4);
  text-align: center;
}

.em-confirm-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--color-accent-light);
  background: var(--color-accent-glow);
}

.em-confirm-icon-danger {
  color: #fca5a5;
  background: rgba(248, 113, 113, 0.14);
}

.em-confirm-copy {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.em-confirm-copy h2 {
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 700;
}

.em-confirm-copy p {
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-line;
}

.em-confirm-actions {
  width: 100%;
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
}

.em-confirm-actions button {
  min-height: 38px;
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.em-confirm-cancel {
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  background: transparent;
}

.em-confirm-accept {
  border: 1px solid var(--color-accent);
  color: #fff;
  background: var(--color-accent);
}

.em-confirm-accept-danger {
  border-color: #ef4444;
  background: #b91c1c;
}

.em-confirm-modal-enter-active,
.em-confirm-modal-leave-active {
  transition: opacity 0.2s ease;
}

.em-confirm-modal-enter-from,
.em-confirm-modal-leave-to {
  opacity: 0;
}

.em-confirm-modal-enter-active .em-confirm-modal,
.em-confirm-modal-leave-active .em-confirm-modal {
  transition: transform 0.2s ease;
}

.em-confirm-modal-enter-from .em-confirm-modal,
.em-confirm-modal-leave-to .em-confirm-modal {
  transform: translateY(8px) scale(0.97);
}
</style>
