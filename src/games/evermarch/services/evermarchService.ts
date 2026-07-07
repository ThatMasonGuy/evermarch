import { firestore, functions } from '@/platform/services/firebase'
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

export const evermarchService = {
  async getAlphaStatus(uid: string): Promise<AlphaStatus> {
    const snap = await getDoc(doc(firestore, 'users', uid))
    const data = snap.data()
    if (!data?.evermarch) return { alphaStatus: 'none' }
    return {
      alphaStatus: data.evermarch.alphaStatus || 'none',
      requestedAt: data.evermarch.requestedAt?.toDate?.() || undefined,
      approvedAt: data.evermarch.approvedAt?.toDate?.() || undefined,
    }
  },

  async requestAlphaAccess(): Promise<{ status: string }> {
    const fn = httpsCallable<void, { status: string }>(functions, 'requestEvermarchAlpha')
    const result = await fn()
    return result.data
  },

  async getSaves(uid: string): Promise<EvermarchSave[]> {
    const colRef = collection(firestore, 'users', uid, 'evermarch_saves')
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
    const colRef = collection(firestore, 'users', uid, 'evermarch_saves')
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
    await deleteDoc(doc(firestore, 'users', uid, 'evermarch_saves', saveId))
  },
}
