<template>
  <div class="app-root" style="background: var(--color-bg-deep); color: var(--color-text-primary); min-height: 100vh; min-height: 100dvh;">
    <RouterView v-if="!authStore.loading" />
    <div v-else style="display:flex;align-items:center;justify-content:center;min-height:100vh;" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, nextTick } from 'vue'
import { RouterView } from 'vue-router'
import { useAuthStore } from '@/platform/stores/authStore'

const authStore = useAuthStore()

let unsubscribe: (() => void) | undefined

function dismissPreloader() {
  const el = document.getElementById('preloader')
  if (el) {
    el.classList.add('fade-out')
    setTimeout(() => el.remove(), 700)
  }
}

onMounted(async () => {
  unsubscribe = authStore.init()
  await nextTick()
  // Give the app a moment to render, then dismiss the preloader
  setTimeout(dismissPreloader, 400)
})

onUnmounted(() => {
  unsubscribe?.()
})
</script>
