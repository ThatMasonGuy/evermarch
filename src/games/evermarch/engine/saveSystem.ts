/**
 * Save System — local-first with manual cloud backup/restore.
 *
 * - Local save is the primary live source of truth during play
 * - Cloud save is a manual backup/sync target (push to cloud / pull from cloud)
 * - No forced cloud-first flow
 * - No "pick one storage mode" UX
 */

import { useGameStore, type GameSaveData } from '../stores/gameStore'
import { firestore } from '@/platform/services/firebase'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { syncGlobalStatsContribution } from './globalStats'

const LOCAL_SAVE_KEY = 'evermarch_save'

// ─── Local Save ────────────────────────────────────────────────

export function saveLocal(): boolean {
  try {
    const store = useGameStore()
    const data = store.serialize()
    data.lastSavedAt = Date.now()
    store.lastSavedAt = data.lastSavedAt
    localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(data))
    return true
  } catch (e) {
    console.error('[Evermarch] Failed to save locally:', e)
    return false
  }
}

export function loadLocal(): GameSaveData | null {
  try {
    const raw = localStorage.getItem(LOCAL_SAVE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as GameSaveData
  } catch (e) {
    console.error('[Evermarch] Failed to load local save:', e)
    return null
  }
}

export function hasLocalSave(): boolean {
  return localStorage.getItem(LOCAL_SAVE_KEY) !== null
}

export function deleteLocalSave(): void {
  localStorage.removeItem(LOCAL_SAVE_KEY)
}

// ─── Cloud Save (Manual Backup/Restore) ────────────────────────

/**
 * Push current local state to cloud as a backup.
 * Requires authenticated user.
 */
export async function pushToCloud(uid: string): Promise<boolean> {
  try {
    const store = useGameStore()
    if (!firestore) {
      store.addLog('Cloud backup is unavailable in this environment.', 'system')
      return false
    }

    const syncedAt = Date.now()
    const data = store.serialize()
    data.lastSavedAt = syncedAt
    data.lastCloudSyncedAt = syncedAt

    const docRef = doc(firestore, 'users', uid, 'evermarch_saves', 'primary')
    await setDoc(docRef, {
      gameData: JSON.stringify(data),
      saveName: data.saveName,
      lastSavedAt: serverTimestamp(),
      lastCloudSyncedAt: serverTimestamp(),
      playtime: data.playtime,
      totalLevel: store.totalLevel,
      gold: data.gold,
      version: data.version,
    })
    await syncGlobalStatsContribution(uid, { force: true })

    store.lastSavedAt = syncedAt
    store.lastCloudSyncedAt = syncedAt
    saveLocal()
    store.addLog('Save backed up to cloud.', 'system')
    return true
  } catch (e) {
    console.error('[Evermarch] Cloud push failed:', e)
    return false
  }
}

/**
 * Pull cloud save down to local device.
 * Overwrites local save — caller should confirm with user first.
 */
export async function pullFromCloud(uid: string): Promise<GameSaveData | null> {
  try {
    if (!firestore) {
      return null
    }

    const docRef = doc(firestore, 'users', uid, 'evermarch_saves', 'primary')
    const snap = await getDoc(docRef)

    if (!snap.exists()) return null

    const raw = snap.data()?.gameData
    if (!raw) return null

    const data = JSON.parse(raw) as GameSaveData
    return data
  } catch (e) {
    console.error('[Evermarch] Cloud pull failed:', e)
    return null
  }
}

/**
 * Check if a cloud save exists for this user.
 */
export async function hasCloudSave(uid: string): Promise<boolean> {
  try {
    if (!firestore) {
      return false
    }

    const docRef = doc(firestore, 'users', uid, 'evermarch_saves', 'primary')
    const snap = await getDoc(docRef)
    return snap.exists()
  } catch {
    return false
  }
}
