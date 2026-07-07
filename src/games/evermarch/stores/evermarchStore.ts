import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { evermarchService, type EvermarchSave, type AlphaStatus } from '../services/evermarchService'

export const useEvermarchStore = defineStore('evermarch', () => {
  const alphaStatus = ref<AlphaStatus>({ alphaStatus: 'none' })
  const saves = ref<EvermarchSave[]>([])
  const activeSaveId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref('')

  const isApproved = computed(() => alphaStatus.value.alphaStatus === 'approved')
  const isPending = computed(() => alphaStatus.value.alphaStatus === 'pending')
  const activeSave = computed(() => saves.value.find((s) => s.id === activeSaveId.value) || null)

  async function fetchAlphaStatus(uid: string) {
    loading.value = true
    error.value = ''
    try {
      alphaStatus.value = await evermarchService.getAlphaStatus(uid)
    } catch (e) {
      error.value = 'Failed to check alpha status.'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  async function requestAccess() {
    loading.value = true
    error.value = ''
    try {
      const result = await evermarchService.requestAlphaAccess()
      alphaStatus.value = { ...alphaStatus.value, alphaStatus: result.status as AlphaStatus['alphaStatus'] }
    } catch (e) {
      error.value = 'Failed to submit access request.'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  async function fetchSaves(uid: string) {
    loading.value = true
    error.value = ''
    try {
      saves.value = await evermarchService.getSaves(uid)
    } catch (e) {
      error.value = 'Failed to load saves.'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  async function createSave(uid: string, name: string, mode: string = 'standard') {
    loading.value = true
    error.value = ''
    try {
      const save = await evermarchService.createSave(uid, name, mode)
      saves.value.push(save)
      return save
    } catch (e) {
      error.value = 'Failed to create save.'
      console.error(e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteSave(uid: string, saveId: string) {
    loading.value = true
    error.value = ''
    try {
      await evermarchService.deleteSave(uid, saveId)
      saves.value = saves.value.filter((s) => s.id !== saveId)
      if (activeSaveId.value === saveId) activeSaveId.value = null
    } catch (e) {
      error.value = 'Failed to delete save.'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  function selectSave(saveId: string) {
    activeSaveId.value = saveId
  }

  return {
    alphaStatus,
    saves,
    activeSaveId,
    activeSave,
    loading,
    error,
    isApproved,
    isPending,
    fetchAlphaStatus,
    requestAccess,
    fetchSaves,
    createSave,
    deleteSave,
    selectSave,
  }
})
