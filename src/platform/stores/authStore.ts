import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from 'firebase/auth'
import { authService } from '../services/authService'
import { userService } from '../services/userService'

export const useAuthStore = defineStore('auth', () => {
    const user = ref<User | null>(null)
    const loading = ref(true)

    const isLoggedIn = computed(() => !!user.value)
    const displayName = computed(() => user.value?.displayName ?? user.value?.email ?? 'Adventurer')
    const isGuest = computed(() => !user.value)

    let profileInitPromise: Promise<void> | null = null

    function setUser(newUser: User | null) {
        user.value = newUser
        loading.value = false
    }

    async function ensureUserProfileInitialized() {
        if (!user.value) return

        if (profileInitPromise) {
            return profileInitPromise
        }

        const activeUid = user.value.uid

        profileInitPromise = userService
            .initializeUserProfile()
            .then(() => undefined)
            .finally(() => {
                if (user.value?.uid === activeUid) {
                    profileInitPromise = null
                } else {
                    profileInitPromise = null
                }
            })

        return profileInitPromise
    }

    async function loginWithGoogle() {
        const result = await authService.loginWithGoogle()
        user.value = result.user
        await ensureUserProfileInitialized()
        return result
    }

    async function loginWithEmail(email: string, password: string) {
        const result = await authService.loginWithEmail(email, password)
        user.value = result.user
        await ensureUserProfileInitialized()
        return result
    }

    async function registerWithEmail(email: string, password: string) {
        const result = await authService.registerWithEmail(email, password)
        user.value = result.user
        await ensureUserProfileInitialized()
        return result
    }

    async function logout() {
        await authService.logout()
        user.value = null
        profileInitPromise = null
    }

    function init() {
        return authService.onAuthChange(async (newUser: User | null) => {
            setUser(newUser)

            if (newUser) {
                try {
                    await ensureUserProfileInitialized()
                } catch (error) {
                    console.error('Failed to initialize user profile:', error)
                }
            }
        })
    }

    return {
        user,
        loading,
        isLoggedIn,
        isGuest,
        displayName,
        setUser,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logout,
        init,
        ensureUserProfileInitialized,
    }
})