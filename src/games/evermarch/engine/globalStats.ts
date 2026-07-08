import { firestore } from '@/platform/services/firebase'
import { useAuthStore } from '@/platform/stores/authStore'
import {
  doc,
  increment,
  runTransaction,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore'
import { useGameStore } from '../stores/gameStore'

const GLOBAL_STATS_DOC_PATH = ['public_stats', 'evermarch'] as const
const PLAYER_CONTRIBUTION_DOC_ID = 'global_contribution'
const GLOBAL_STATS_SCHEMA_VERSION = 1
const MIN_GLOBAL_STATS_SYNC_INTERVAL_MS = 5 * 60 * 1000

let lastGlobalStatsSyncAttemptAt = 0
let inFlightSync: Promise<GlobalStatsSyncResult> | null = null

export interface GlobalStatsSnapshot {
  totalLevel: number
  playtimeMs: number
  goldEarned: number
  itemsAcquired: number
}

export interface GlobalStatsSyncResult {
  updated: boolean
  reason?: 'auth-unavailable' | 'firebase-unavailable' | 'throttled' | 'no-delta' | 'failed'
  deltas?: GlobalStatsSnapshot
}

export async function syncGlobalStatsForCurrentUser(options: { force?: boolean } = {}) {
  const authStore = useAuthStore()
  const uid = authStore.user?.uid

  if (!uid) {
    return { updated: false, reason: 'auth-unavailable' } satisfies GlobalStatsSyncResult
  }

  return syncGlobalStatsContribution(uid, options)
}

export async function syncGlobalStatsContribution(
  uid: string,
  options: { force?: boolean } = {},
): Promise<GlobalStatsSyncResult> {
  if (!firestore) {
    return { updated: false, reason: 'firebase-unavailable' }
  }

  const now = Date.now()
  if (!options.force && now - lastGlobalStatsSyncAttemptAt < MIN_GLOBAL_STATS_SYNC_INTERVAL_MS) {
    return { updated: false, reason: 'throttled' }
  }

  if (inFlightSync) {
    return inFlightSync
  }

  lastGlobalStatsSyncAttemptAt = now
  inFlightSync = syncGlobalStatsContributionUnsafe(uid)
    .catch((error) => {
      console.warn('[Evermarch] Global stats sync failed:', error)
      return { updated: false, reason: 'failed' } satisfies GlobalStatsSyncResult
    })
    .finally(() => {
      inFlightSync = null
    })

  return inFlightSync
}

async function syncGlobalStatsContributionUnsafe(uid: string): Promise<GlobalStatsSyncResult> {
  if (!firestore) {
    return { updated: false, reason: 'firebase-unavailable' }
  }

  const current = currentGlobalStatsSnapshot()
  const aggregateRef = doc(firestore, ...GLOBAL_STATS_DOC_PATH)
  const contributionRef = doc(firestore, 'users', uid, 'evermarch_stats', PLAYER_CONTRIBUTION_DOC_ID)

  return runTransaction(firestore, async (transaction) => {
    const contributionSnap = await transaction.get(contributionRef)
    const previous = normalizeContributionSnapshot(contributionSnap.data())
    const deltas = positiveDeltas(current, previous)
    const hasDelta = Object.values(deltas).some((value) => value > 0)

    if (!hasDelta && contributionSnap.exists()) {
      return { updated: false, reason: 'no-delta', deltas } satisfies GlobalStatsSyncResult
    }

    const firstContribution = !contributionSnap.exists()
    const aggregateUpdate: Record<string, unknown> = {
      gameId: 'evermarch',
      schemaVersion: GLOBAL_STATS_SCHEMA_VERSION,
      updatedAt: serverTimestamp(),
      totalPlayers: increment(firstContribution ? 1 : 0),
      totalLevel: increment(deltas.totalLevel),
      totalPlaytimeMs: increment(deltas.playtimeMs),
      totalGoldEarned: increment(deltas.goldEarned),
      totalItemsAcquired: increment(deltas.itemsAcquired),
    }

    if (firstContribution) {
      aggregateUpdate.createdAt = serverTimestamp()
    }

    transaction.set(aggregateRef, aggregateUpdate, { merge: true })
    transaction.set(
      contributionRef,
      {
        gameId: 'evermarch',
        schemaVersion: GLOBAL_STATS_SCHEMA_VERSION,
        ...current,
        updatedAt: serverTimestamp(),
        ...(firstContribution ? { createdAt: serverTimestamp() } : {}),
      },
      { merge: true },
    )

    return { updated: true, deltas } satisfies GlobalStatsSyncResult
  })
}

function currentGlobalStatsSnapshot(): GlobalStatsSnapshot {
  const store = useGameStore()
  const accountStats = store.stats.account

  return {
    totalLevel: nonNegativeInteger(store.totalLevel),
    playtimeMs: nonNegativeInteger(accountStats.onlinePlayMs),
    goldEarned: nonNegativeInteger(accountStats.totalGoldEarned),
    itemsAcquired: nonNegativeInteger(accountStats.totalItemsAcquired),
  }
}

function normalizeContributionSnapshot(data: DocumentData | undefined): GlobalStatsSnapshot {
  return {
    totalLevel: nonNegativeInteger(data?.totalLevel),
    playtimeMs: nonNegativeInteger(data?.playtimeMs),
    goldEarned: nonNegativeInteger(data?.goldEarned),
    itemsAcquired: nonNegativeInteger(data?.itemsAcquired),
  }
}

function positiveDeltas(current: GlobalStatsSnapshot, previous: GlobalStatsSnapshot): GlobalStatsSnapshot {
  return {
    totalLevel: Math.max(0, current.totalLevel - previous.totalLevel),
    playtimeMs: Math.max(0, current.playtimeMs - previous.playtimeMs),
    goldEarned: Math.max(0, current.goldEarned - previous.goldEarned),
    itemsAcquired: Math.max(0, current.itemsAcquired - previous.itemsAcquired),
  }
}

function nonNegativeInteger(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}
