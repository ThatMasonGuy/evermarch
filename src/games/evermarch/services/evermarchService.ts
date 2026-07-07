import { firestore, functions, isLocalPlatformMode } from '@/platform/services/firebase'
import { doc, getDoc, collection, getDocs, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'

export interface EvermarchSave {
  id: string
  name: string
  createdAt: Date
  lastPlayed: Date
  playtime: number // seconds
  level: number
  region: string
  mode: string // 'standard' | 'ironman'
  storage: 'cloud' | 'local'
  syncStatus: 'synced' | 'local-only' | 'conflict' | 'pending'
}

export interface AlphaStatus {
  alphaStatus: 'none' | 'pending' | 'approved'
  requestedAt?: Date
  approvedAt?: Date
}

function requireFirestore() {
  if (!firestore) {
    throw new Error('Firebase Firestore is not configured for this environment.')
  }

  return firestore
}

function requireFunctions() {
  if (!functions) {
    throw new Error('Firebase Functions are not configured for this environment.')
  }

  return functions
}

export const evermarchService = {
  async getAlphaStatus(uid: string): Promise<AlphaStatus> {
    if (isLocalPlatformMode) {
      return { alphaStatus: 'approved', approvedAt: new Date() }
    }

    const db = requireFirestore()
    const snap = await getDoc(doc(db, 'users', uid))
    const data = snap.data()
    if (!data?.evermarch) return { alphaStatus: 'none' }
    return {
      alphaStatus: data.evermarch.alphaStatus || 'none',
      requestedAt: data.evermarch.requestedAt?.toDate?.() || undefined,
      approvedAt: data.evermarch.approvedAt?.toDate?.() || undefined,
    }
  },

  async requestAlphaAccess(): Promise<{ status: string }> {
    if (isLocalPlatformMode) {
      return { status: 'approved' }
    }

    const fn = httpsCallable<void, { status: string }>(requireFunctions(), 'requestEvermarchAlpha')
    const result = await fn()
    return result.data
  },

  async getSaves(uid: string): Promise<EvermarchSave[]> {
    if (isLocalPlatformMode) {
      return []
    }

    const db = requireFirestore()
    const colRef = collection(db, 'users', uid, 'evermarch_saves')
    const snap = await getDocs(colRef)
    return snap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        name: data.name || 'Unnamed Save',
        createdAt: data.createdAt?.toDate?.() || new Date(),
        lastPlayed: data.lastPlayed?.toDate?.() || new Date(),
        playtime: data.playtime || 0,
        level: data.level || 1,
        region: data.region || 'The Hollow',
        mode: data.mode || 'standard',
        storage: data.storage || 'cloud',
        syncStatus: data.syncStatus || 'synced',
      }
    })
  },

  async createSave(uid: string, name: string, mode: string = 'standard'): Promise<EvermarchSave> {
    if (isLocalPlatformMode) {
      const now = new Date()
      return {
        id: `local-${now.getTime().toString(36)}`,
        name,
        createdAt: now,
        lastPlayed: now,
        playtime: 0,
        level: 1,
        region: 'The Hollow',
        mode,
        storage: 'local',
        syncStatus: 'local-only',
      }
    }

    const db = requireFirestore()
    const colRef = collection(db, 'users', uid, 'evermarch_saves')
    const newDoc = doc(colRef)
    const save: Record<string, unknown> = {
      name,
      createdAt: serverTimestamp(),
      lastPlayed: serverTimestamp(),
      playtime: 0,
      level: 1,
      region: 'The Hollow',
      mode,
      storage: 'cloud',
      syncStatus: 'synced',
    }
    await setDoc(newDoc, save)
    return {
      id: newDoc.id,
      name,
      createdAt: new Date(),
      lastPlayed: new Date(),
      playtime: 0,
      level: 1,
      region: 'The Hollow',
      mode,
      storage: 'cloud',
      syncStatus: 'synced',
    }
  },

  async deleteSave(uid: string, saveId: string): Promise<void> {
    if (isLocalPlatformMode) return

    const db = requireFirestore()
    await deleteDoc(doc(db, 'users', uid, 'evermarch_saves', saveId))
  },
}
