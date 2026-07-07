import { httpsCallable } from 'firebase/functions'
import { functions, isLocalPlatformMode } from './firebase'

type InitializeUserProfileResponse = {
    ok: boolean
    created: boolean
}

type RequestEvermarchAlphaResponse = {
    status: 'none' | 'pending' | 'approved' | 'rejected'
}

function requireFunctions() {
    if (!functions) {
        throw new Error('Firebase Functions are not configured for this environment.')
    }

    return functions
}

export const userService = {
    async initializeUserProfile() {
        if (isLocalPlatformMode) {
            return { ok: true, created: false }
        }

        const initializeUserProfileCallable = httpsCallable<
            Record<string, never>,
            InitializeUserProfileResponse
        >(requireFunctions(), 'initializeUserProfile')
        const result = await initializeUserProfileCallable({})
        return result.data
    },

    async requestEvermarchAlpha() {
        if (isLocalPlatformMode) {
            return { status: 'approved' }
        }

        const requestEvermarchAlphaCallable = httpsCallable<
            Record<string, never>,
            RequestEvermarchAlphaResponse
        >(requireFunctions(), 'requestEvermarchAlpha')
        const result = await requestEvermarchAlphaCallable({})
        return result.data
    },
}
