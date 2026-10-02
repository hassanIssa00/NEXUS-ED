import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    User
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from './config'

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
    try {
        if (!isFirebaseConfigured) throw new Error('Firebase is not configured for Nexus.')
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        return {
            user: userCredential.user,
            token: await userCredential.user.getIdToken()
        }
    } catch (error: any) {
        throw new Error(error.message || 'Login failed')
    }
}

/**
 * Register new user
 */
export async function signUp(email: string, password: string) {
    try {
        if (!isFirebaseConfigured) throw new Error('Firebase is not configured for Nexus.')
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        return {
            user: userCredential.user,
            token: await userCredential.user.getIdToken()
        }
    } catch (error: any) {
        throw new Error(error.message || 'Registration failed')
    }
}

/**
 * Sign out current user
 */
export async function signOut() {
    try {
        if (!isFirebaseConfigured) return
        await firebaseSignOut(auth)
    } catch (error: any) {
        throw new Error(error.message || 'Sign out failed')
    }
}

/**
 * Get current user
 */
export function getCurrentUser(): User | null {
    return isFirebaseConfigured ? auth.currentUser : null
}

/**
 * Listen to auth state changes
 */
export function onAuthChange(callback: (user: User | null) => void) {
    if (!isFirebaseConfigured) return () => undefined
    return onAuthStateChanged(auth, callback)
}

/**
 * Get current user token
 */
export async function getAuthToken(): Promise<string | null> {
    if (!isFirebaseConfigured) return null
    const user = auth.currentUser
    if (!user) return null
    return await user.getIdToken()
}
