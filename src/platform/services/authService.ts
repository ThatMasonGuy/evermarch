// src/platform/services/authService.ts

import {
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    type User,
    type UserCredential,
} from 'firebase/auth'
import { auth, isLocalPlatformMode } from './firebase'

const googleProvider = new GoogleAuthProvider()

const localDevUser = {
    uid: 'evermarch-local-dev',
    email: 'local-dev@evermarch.test',
    displayName: 'Local Developer',
    isAnonymous: false,
    providerId: 'local-dev',
} as User

function localCredential(): UserCredential {
    return {
        user: localDevUser,
        providerId: 'local-dev',
        operationType: 'signIn',
    } as UserCredential
}

function requireAuth() {
    if (!auth) {
        throw new Error('Firebase Auth is not configured for this environment.')
    }

    return auth
}

export const authService = {
    loginWithGoogle() {
        if (isLocalPlatformMode) return localCredential()
        return signInWithPopup(requireAuth(), googleProvider)
    },

    loginWithEmail(email: string, password: string) {
        if (isLocalPlatformMode) return localCredential()
        return signInWithEmailAndPassword(requireAuth(), email, password)
    },

    registerWithEmail(email: string, password: string) {
        if (isLocalPlatformMode) return localCredential()
        return createUserWithEmailAndPassword(requireAuth(), email, password)
    },

    logout() {
        if (isLocalPlatformMode) return Promise.resolve()
        return signOut(requireAuth())
    },

    onAuthChange(callback: (user: User | null) => void) {
        if (isLocalPlatformMode) {
            queueMicrotask(() => callback(localDevUser))
            return () => {}
        }

        if (!auth) {
            queueMicrotask(() => callback(null))
            return () => {}
        }

        return onAuthStateChanged(auth, callback)
    },
}
