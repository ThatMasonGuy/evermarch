// src/platform/services/authService.ts

import {
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    type User,
} from 'firebase/auth'
import { auth } from './firebase'

const googleProvider = new GoogleAuthProvider()

export const authService = {
    loginWithGoogle() {
        return signInWithPopup(auth, googleProvider)
    },

    loginWithEmail(email: string, password: string) {
        return signInWithEmailAndPassword(auth, email, password)
    },

    registerWithEmail(email: string, password: string) {
        return createUserWithEmailAndPassword(auth, email, password)
    },

    logout() {
        return signOut(auth)
    },

    onAuthChange(callback: (user: User | null) => void) {
        return onAuthStateChanged(auth, callback)
    },
}