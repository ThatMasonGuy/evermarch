import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

type InitializeUserProfileResponse = {
    ok: boolean
    created: boolean
}

type RequestEvermarchAlphaResponse = {
    status: 'none' | 'pending' | 'approved' | 'rejected'
}

const initializeUserProfileCallable = httpsCallable<
    Record<string, never>,
    InitializeUserProfileResponse
>(functions, 'initializeUserProfile')

const requestEvermarchAlphaCallable = httpsCallable<
    Record<string, never>,
    RequestEvermarchAlphaResponse
>(functions, 'requestEvermarchAlpha')

export const userService = {
    async initializeUserProfile() {
        const result = await initializeUserProfileCallable({})
        return result.data
    },

    async requestEvermarchAlpha() {
        const result = await requestEvermarchAlphaCallable({})
        return result.data
    },
}