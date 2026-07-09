import { watch } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/platform/stores/authStore'
import { useEvermarchStore } from '@/games/evermarch/stores/evermarchStore'
import { consumePlaySessionIntent } from '@/games/evermarch/engine/playSessionGate'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'evermarch-saves',
      component: () => import('@/games/evermarch/views/EvermarchSaveSelectView.vue'),
      meta: { requiresAuth: true, requiresAlpha: true },
    },
    {
      path: '/play',
      name: 'evermarch-game',
      component: () => import('@/games/evermarch/views/EvermarchGameView.vue'),
      meta: { requiresAuth: true, requiresAlpha: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

function waitForAuthReady() {
  const authStore = useAuthStore()

  if (!authStore.loading) {
    return Promise.resolve()
  }

  return new Promise<void>((resolve) => {
    const stop = watch(
      () => authStore.loading,
      (loading) => {
        if (!loading) {
          stop()
          resolve()
        }
      },
      { immediate: true },
    )
  })
}

function returnToPortal() {
  window.location.assign('/evermarch')
  return false
}

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  await waitForAuthReady()

  if (to.meta.requiresAuth && !authStore.user) {
    return returnToPortal()
  }

  if (to.meta.requiresAlpha) {
    if (!authStore.user) {
      return returnToPortal()
    }

    const evermarchStore = useEvermarchStore()
    await evermarchStore.fetchAlphaStatus(authStore.user.uid)

    if (!evermarchStore.isApproved) {
      return returnToPortal()
    }
  }

  if (to.name === 'evermarch-game' && !consumePlaySessionIntent()) {
    return { name: 'evermarch-saves' }
  }

  return true
})

export default router
