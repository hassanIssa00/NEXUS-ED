'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import {
    createUserWithEmailAndPassword,
    deleteUser,
    GoogleAuthProvider,
    onAuthStateChanged as onFirebaseAuthStateChanged,
    reload as reloadFirebaseUser,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut as firebaseSignOut,
    updateProfile,
    type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth as firebaseAuth, db as firebaseDb, isFirebaseConfigured } from '@/lib/firebase/config';
import { EMAIL_ACTION_CONTINUE_PATHS, getEmailActionSettings } from '@/lib/firebase/email-actions';
import { clearExplicitSignOut, getAuthSessionEpoch, hasExplicitlySignedOut, markExplicitlySignedOut } from '@/lib/auth-session-state';

export type UserRole =
    | 'student'
    | 'teacher'
    | 'parent'
    | 'admin'
    | 'manager'
    | 'principal'
    | 'vice_principal'
    | 'counselor'
    | 'supervisor'
    | 'accountant'
    | 'hr';

interface UserProfile {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    avatar_url?: string;
    phone?: string;
    status?: string;
    gradeLevel?: number;
    emailVerified?: boolean;
    onboardingComplete?: boolean;
    onboardingStep?: 'student-profile' | 'placement-assessment' | 'link-student' | 'parent-survey' | 'complete';
    onboardingStudentId?: string;
    onboardingOnly?: boolean;
    schoolId?: string | null;
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password: string, expectedRole?: UserRole) => Promise<UserRole>;
    signInWithGoogle: (role: 'student' | 'parent' | 'admin') => Promise<{ role: 'student' | 'parent' | 'admin'; isNewUser: boolean }>;
    signUp: (
        email: string,
        password: string,
        fullName: string,
        role: UserRole,
        phone?: string
    ) => Promise<void>;
    requestPasswordReset: (email: string, role?: 'student' | 'parent' | 'teacher') => Promise<'code' | 'link'>;
    confirmPasswordReset: (email: string, code: string, newPassword: string) => Promise<void>;
    refreshProfile: () => Promise<UserProfile | null>;
    markParentLinked: (studentId: string) => void;
    markParentSurveyComplete: () => void;
    refreshVerifiedSession: () => Promise<UserProfile | null>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_TOKEN_STORAGE_KEY = 'access_token';
const LEGACY_DEMO_KEYS = ['is_demo', 'demo_profile', 'nexus_user', 'nexus_role'];

const API_ROLE_TO_APP_ROLE: Record<string, UserRole> = {
    STUDENT: 'student',
    TEACHER: 'teacher',
    PARENT: 'parent',
    ADMIN: 'admin',
    MANAGER: 'manager',
    PRINCIPAL: 'principal',
    VICE_PRINCIPAL: 'vice_principal',
    COUNSELOR: 'counselor',
    SUPERVISOR: 'supervisor',
    ACCOUNTANT: 'accountant',
    HR: 'hr',
};

const APP_ROLE_TO_API_ROLE: Partial<Record<UserRole, string>> = {
    student: 'STUDENT',
    parent: 'PARENT',
};

const BOOTSTRAP_ADMIN_EMAIL = 'hassan.issa.eng@gmail.com';

function createApiUser(id: string, email: string): User {
    return {
        id,
        email,
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
    } as User;
}

function createFirebaseAppUser(user: FirebaseUser): User {
    return {
        id: user.uid,
        email: user.email,
        app_metadata: {},
        user_metadata: { full_name: user.displayName ?? '' },
        aud: 'authenticated',
        created_at: user.metadata.creationTime ?? new Date().toISOString(),
    } as User;
}

function normalizeApiRole(role: string | undefined): UserRole | null {
    return API_ROLE_TO_APP_ROLE[role?.toUpperCase() ?? ''] ?? null;
}

function getApiBaseUrl(): string | null {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
        // If we are on production/remote domain and API URL points to localhost, do not attempt network fetch
        if (hostname !== 'localhost' && hostname !== '127.0.0.1' && apiUrl?.includes('localhost')) {
            return null;
        }
        return apiUrl ? apiUrl.replace(/\/$/, '') : null;
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
    return apiUrl ? apiUrl.replace(/\/$/, '') : null;
}

export function isAuthenticationConfigured(): boolean {
    return Boolean(getApiBaseUrl() || supabase || (isFirebaseConfigured && firebaseAuth && firebaseDb));
}

export function isGoogleAuthenticationConfigured(role?: 'student' | 'parent' | 'admin'): boolean {
    return Boolean(
        isFirebaseConfigured
        && firebaseAuth
        && firebaseDb
        && !supabase
        && (role !== 'admin' || !getApiBaseUrl())
    );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const isProvisioningFirebaseUser = useRef(false);
    const isHandlingExpiredSession = useRef(false);
    const firebaseSessionExchange = useRef<{ key: string; promise: Promise<UserProfile | null> } | null>(null);

    const clearLocalApiSession = () => {
        sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
        localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
        localStorage.removeItem('token');
        for (const key of LEGACY_DEMO_KEYS) {
            sessionStorage.removeItem(key);
            localStorage.removeItem(key);
        }
    };

    const clearLegacyBrowserSession = () => {
        if (sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)?.startsWith('nexus_live_')) {
            sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
        }
        localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
        localStorage.removeItem('token');
        for (const key of LEGACY_DEMO_KEYS) {
            sessionStorage.removeItem(key);
            localStorage.removeItem(key);
        }
    };

    const clearApiRefreshCookie = async () => {
        const apiBaseUrl = getApiBaseUrl();
        if (!apiBaseUrl) return;
        await fetch(`${apiBaseUrl}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
        }).catch(() => undefined);
    };

    const setAuthenticatedState = (nextUser: User, nextProfile: UserProfile) => {
        setUser(nextUser);
        setProfile(nextProfile);
        setSession(null);
    };

    const fetchProfileFromApi = async (token: string): Promise<UserProfile | null> => {
        const apiBaseUrl = getApiBaseUrl();
        if (!apiBaseUrl) {
            return null;
        }

        const response = await fetch(`${apiBaseUrl}/auth/profile`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            credentials: 'include',
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        const normalizedRole = normalizeApiRole(data.role);
        if (!normalizedRole) {
            return null;
        }

        let avatarUrl = typeof data.avatar === 'string' ? data.avatar : undefined;
        if (avatarUrl?.startsWith('file:')) {
            try {
                const avatarResponse = await fetch(`${apiBaseUrl}/upload/me/avatar`, {
                    headers: { Authorization: `Bearer ${token}` },
                    credentials: 'include',
                });
                if (avatarResponse.ok) {
                    const avatarData = await avatarResponse.json();
                    avatarUrl = typeof avatarData.url === 'string' ? avatarData.url : undefined;
                } else {
                    avatarUrl = undefined;
                }
            } catch {
                avatarUrl = undefined;
            }
        }

        return {
            id: data.firebaseUid || data.id,
            email: data.email,
            full_name: data.name || data.email,
            role: normalizedRole,
            avatar_url: avatarUrl,
            phone: data.phone,
            gradeLevel: typeof data.gradeLevel === 'number' ? data.gradeLevel : undefined,
            emailVerified: typeof data.emailVerified === 'boolean' ? data.emailVerified : undefined,
            onboardingComplete: typeof data.onboardingComplete === 'boolean' ? data.onboardingComplete : undefined,
            onboardingStep: data.onboardingStep,
            onboardingStudentId: typeof data.onboardingStudentId === 'string' ? data.onboardingStudentId : undefined,
            schoolId: typeof data.schoolId === 'string' ? data.schoolId : null,
        };
    };

    const refreshApiSession = async (): Promise<string | null> => {
        const apiBaseUrl = getApiBaseUrl();
        if (!apiBaseUrl || hasExplicitlySignedOut()) {
            return null;
        }
        const requestEpoch = getAuthSessionEpoch();

        const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        if (!data.access_token) {
            return null;
        }

        if (hasExplicitlySignedOut() || getAuthSessionEpoch() !== requestEpoch) {
            if (hasExplicitlySignedOut()) await clearApiRefreshCookie();
            return null;
        }

        sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, data.access_token);
        return data.access_token as string;
    };

    const exchangeFirebaseSession = (firebaseUser: FirebaseUser, onboardingOnly = false): Promise<UserProfile | null> => {
        if (hasExplicitlySignedOut() || firebaseAuth?.currentUser?.uid !== firebaseUser.uid) {
            return Promise.resolve(null);
        }
        const requestEpoch = getAuthSessionEpoch();
        const exchangeKey = `${firebaseUser.uid}:${onboardingOnly ? 'onboarding' : 'full'}`;
        if (firebaseSessionExchange.current?.key === exchangeKey) {
            return firebaseSessionExchange.current.promise;
        }

        const promise = (async (): Promise<UserProfile | null> => {
            const apiBaseUrl = getApiBaseUrl();
            if (!apiBaseUrl) return null;
            const idToken = await firebaseUser.getIdToken();
            if (hasExplicitlySignedOut() || getAuthSessionEpoch() !== requestEpoch || firebaseAuth?.currentUser?.uid !== firebaseUser.uid) return null;

            const endpoint = onboardingOnly ? '/auth/firebase/onboarding' : '/auth/firebase';
            const response = await fetch(`${apiBaseUrl}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
                credentials: 'include',
            });
            const data = await response.json().catch(() => ({}));
            if (hasExplicitlySignedOut() || getAuthSessionEpoch() !== requestEpoch || firebaseAuth?.currentUser?.uid !== firebaseUser.uid) {
                if (hasExplicitlySignedOut()) await clearApiRefreshCookie();
                return null;
            }
            if (!response.ok) {
                throw new Error(data.message || 'تعذر ربط الحساب بخدمات المنصة. حاول مرة أخرى.');
            }

            const role = normalizeApiRole(data.user?.role);
            if (!role || !data.access_token || !data.user?.id) {
                throw new Error('استجابة خادم المنصة غير صالحة.');
            }

            if (hasExplicitlySignedOut() || getAuthSessionEpoch() !== requestEpoch) {
                await clearApiRefreshCookie();
                return null;
            }
            sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, data.access_token);
            const sessionProfile = await fetchProfileFromApi(data.access_token);
            if (hasExplicitlySignedOut() || getAuthSessionEpoch() !== requestEpoch || firebaseAuth?.currentUser?.uid !== firebaseUser.uid) {
                if (hasExplicitlySignedOut()) await clearApiRefreshCookie();
                return null;
            }
            if (sessionProfile) return sessionProfile;
            return {
                id: data.user.firebaseUid || firebaseUser.uid,
                email: data.user.email || firebaseUser.email || '',
                full_name: data.user.name || firebaseUser.displayName || firebaseUser.email || '',
                role,
                phone: data.user.phone || undefined,
                emailVerified: firebaseUser.emailVerified,
                onboardingComplete: false,
                onboardingStep: role === 'student' ? 'student-profile' : role === 'parent' ? 'link-student' : 'complete',
            };
        })();

        firebaseSessionExchange.current = { key: exchangeKey, promise };
        const clearExchange = () => {
            if (firebaseSessionExchange.current?.promise === promise) firebaseSessionExchange.current = null;
        };
        void promise.then(clearExchange, clearExchange);
        return promise;
    };

    useEffect(() => {
        const handleExpiredSession = () => {
            if (isHandlingExpiredSession.current) return;
            isHandlingExpiredSession.current = true;
            markExplicitlySignedOut();
            clearLocalApiSession();
            setUser(null);
            setProfile(null);
            setSession(null);

            void (async () => {
                if (firebaseAuth?.currentUser) await firebaseSignOut(firebaseAuth).catch(() => undefined);
                const segments = window.location.pathname.split('/').filter(Boolean);
                const locale = segments[0] === 'en' || segments[0] === 'ar' ? segments[0] : 'ar';
                const loginPath = `/${locale}/login`;
                if (window.location.pathname !== loginPath) window.location.replace(loginPath);
                else isHandlingExpiredSession.current = false;
            })();
        };

        window.addEventListener('nexus:auth-expired', handleExpiredSession);
        const handleApiSessionRefreshed = () => {
            const token = sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
            const firebaseUser = firebaseAuth?.currentUser;
            if (!token || !firebaseUser || hasExplicitlySignedOut()) return;
            const requestEpoch = getAuthSessionEpoch();
            void fetchProfileFromApi(token).then((nextProfile) => {
                if (nextProfile && !hasExplicitlySignedOut() && getAuthSessionEpoch() === requestEpoch && firebaseAuth?.currentUser?.uid === firebaseUser.uid) {
                    setAuthenticatedState(createFirebaseAppUser(firebaseUser), nextProfile);
                }
            });
        };
        window.addEventListener('nexus:auth-refreshed', handleApiSessionRefreshed);
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key !== 'nexus_explicitly_signed_out' && event.key !== null) return;
            if (!hasExplicitlySignedOut()) return;

            clearLocalApiSession();
            setUser(null);
            setProfile(null);
            setSession(null);
            setLoading(false);
            if (supabase) void supabase.auth.signOut().catch(() => undefined);
            if (firebaseAuth?.currentUser) void firebaseSignOut(firebaseAuth).catch(() => undefined);

            const segments = window.location.pathname.split('/').filter(Boolean);
            const locale = segments[0] === 'en' || segments[0] === 'ar' ? segments[0] : 'ar';
            const loginPath = `/${locale}/login`;
            if (window.location.pathname !== loginPath) window.location.replace(loginPath);
        };
        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('nexus:auth-expired', handleExpiredSession);
            window.removeEventListener('nexus:auth-refreshed', handleApiSessionRefreshed);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    const restoreApiSession = async (): Promise<UserProfile | null> => {
        const apiBaseUrl = getApiBaseUrl();
        const token = sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);

        if (!apiBaseUrl || !token || hasExplicitlySignedOut()) {
            return null;
        }
        const requestEpoch = getAuthSessionEpoch();
        const sessionChanged = () => hasExplicitlySignedOut() || getAuthSessionEpoch() !== requestEpoch;

        let nextToken = token;
        let nextProfile = await fetchProfileFromApi(nextToken);
        if (sessionChanged()) return null;

        if (!nextProfile) {
            const refreshedToken = await refreshApiSession();
            if (sessionChanged()) return null;
            if (!refreshedToken) {
                clearLocalApiSession();
                return null;
            }

            nextToken = refreshedToken;
            nextProfile = await fetchProfileFromApi(nextToken);
        }

        if (sessionChanged()) return null;

        if (!nextProfile) {
            clearLocalApiSession();
            return null;
        }

        setAuthenticatedState(
            createApiUser(nextProfile.id, nextProfile.email),
            nextProfile
        );
        return nextProfile;
    };

    const fetchSupabaseProfile = async (userId: string) => {
        if (!supabase) {
            return null;
        }
        const requestEpoch = getAuthSessionEpoch();

        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, email, full_name, role, avatar_url')
                .eq('id', userId)
                .single();

            if (error) {
                throw error;
            }

            const role = normalizeApiRole(data.role);
            if (!role) {
                throw new Error('Unrecognized account role');
            }

            const profile = { ...data, role } as UserProfile;
            if (hasExplicitlySignedOut() || getAuthSessionEpoch() !== requestEpoch) return null;
            setProfile(profile);
            return profile;
        } catch (error) {
            console.error('Error fetching profile:', error);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const fetchFirebaseProfile = async (userId: string): Promise<UserProfile | null> => {
        if (!firebaseDb) return null;

        try {
            const snapshot = await getDoc(doc(firebaseDb, 'users', userId));
            if (!snapshot.exists()) return null;

            const data = snapshot.data();
            const role = normalizeApiRole(data.role);
            if (!role || !['active', 'pending'].includes(String(data.status))) return null;
            const authUser = firebaseAuth?.currentUser;

            const nextProfile: UserProfile = {
                id: userId,
                email: String(data.email ?? ''),
                full_name: String(data.full_name ?? data.email ?? ''),
                role,
                avatar_url: typeof data.avatar_url === 'string' ? data.avatar_url : undefined,
                phone: typeof data.phone === 'string' ? data.phone : undefined,
                status: typeof data.status === 'string' ? data.status : undefined,
                gradeLevel: typeof data.gradeLevel === 'number' ? data.gradeLevel : undefined,
                onboardingComplete: data.onboardingComplete === true,
                onboardingStep: data.onboardingStep,
                onboardingStudentId: typeof data.onboardingStudentId === 'string' ? data.onboardingStudentId : undefined,
                emailVerified: authUser?.uid === userId ? authUser.emailVerified : undefined,
            };
            setProfile(nextProfile);
            return nextProfile;
        } catch (error) {
            console.error('Error fetching Firebase profile:', error);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const refreshProfile = async () => {
        const firebaseUser = firebaseAuth?.currentUser;
        if (firebaseUser && getApiBaseUrl()) {
            try {
                return await exchangeFirebaseSession(firebaseUser, !firebaseUser.emailVerified);
            } catch (error) {
                console.error('Failed to renew the platform session:', error);
                return null;
            }
        }

        const token = sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
        if (token) {
            const nextProfile = await fetchProfileFromApi(token);
            if (nextProfile) {
                setProfile(nextProfile);
                return nextProfile;
            }
        }

        if (firebaseUser) {
            const nextProfile = await fetchFirebaseProfile(firebaseUser.uid);
            if (nextProfile) setProfile(nextProfile);
            return nextProfile;
        }
        return null;
    };

    const markParentLinked = (studentId: string) => {
        setProfile((currentProfile) => currentProfile?.role === 'parent'
            ? {
                ...currentProfile,
                onboardingComplete: false,
                onboardingStep: 'parent-survey',
                onboardingStudentId: studentId,
            }
            : currentProfile);
    };

    const markParentSurveyComplete = () => {
        setProfile((currentProfile) => currentProfile?.role === 'parent'
            ? {
                ...currentProfile,
                onboardingComplete: true,
                onboardingStep: 'complete',
                onboardingStudentId: undefined,
            }
            : currentProfile);
    };

    const refreshVerifiedSession = async () => {
        const firebaseUser = firebaseAuth?.currentUser;
        if (!firebaseUser) return null;

        await reloadFirebaseUser(firebaseUser);
        await firebaseUser.getIdToken(true);
        if (!firebaseUser.emailVerified) return null;

        const nextProfile = await exchangeFirebaseSession(firebaseUser);
        if (nextProfile) setAuthenticatedState(createFirebaseAppUser(firebaseUser), nextProfile);
        return nextProfile;
    };

    useEffect(() => {
        let isActive = true;

        const bootstrapAuth = async () => {
            if (typeof window === 'undefined') {
                return;
            }

            clearLegacyBrowserSession();

            if (hasExplicitlySignedOut()) {
                await Promise.all([
                    clearApiRefreshCookie(),
                    supabase?.auth.signOut().catch(() => undefined),
                    firebaseAuth ? firebaseSignOut(firebaseAuth).catch(() => undefined) : Promise.resolve(),
                ]);
                if (isActive) {
                    setUser(null);
                    setProfile(null);
                    setSession(null);
                    setLoading(false);
                }
                return;
            }

            // Restore only a token validated by the API.
            const restoredApiProfile = await restoreApiSession();
            if (!isActive || hasExplicitlySignedOut()) {
                if (isActive && hasExplicitlySignedOut()) {
                    setUser(null);
                    setProfile(null);
                    setSession(null);
                    setLoading(false);
                }
                return;
            }

            if (restoredApiProfile) {
                const firebaseUser = hasExplicitlySignedOut() ? null : firebaseAuth?.currentUser;
                if (firebaseUser && restoredApiProfile.emailVerified === false) {
                    await reloadFirebaseUser(firebaseUser);
                    await firebaseUser.getIdToken(true);
                    if (firebaseUser.emailVerified) {
                        const verifiedProfile = await exchangeFirebaseSession(firebaseUser);
                        if (verifiedProfile && isActive) {
                            setAuthenticatedState(createFirebaseAppUser(firebaseUser), verifiedProfile);
                        }
                    }
                }
                setLoading(false);
                return;
            }

            if (supabase) {
                const {
                    data: { session: nextSession },
                } = await supabase.auth.getSession();

                if (!isActive || hasExplicitlySignedOut()) {
                    if (isActive && hasExplicitlySignedOut()) {
                        setUser(null);
                        setProfile(null);
                        setSession(null);
                        setLoading(false);
                        void supabase.auth.signOut().catch(() => undefined);
                    }
                    return;
                }

                setSession(nextSession);
                setUser(nextSession?.user ?? null);
                if (nextSession?.user) await fetchSupabaseProfile(nextSession.user.id);
                else setLoading(false);
                return;
            }

            const nextFirebaseUser = firebaseAuth?.currentUser;
            if (!nextFirebaseUser) {
                setLoading(false);
                return;
            }

            setUser(createFirebaseAppUser(nextFirebaseUser));
            setSession(null);
            const nextProfile = await fetchFirebaseProfile(nextFirebaseUser.uid);
            if (hasExplicitlySignedOut()) {
                setUser(null);
                setProfile(null);
                setSession(null);
                setLoading(false);
                if (firebaseAuth) await firebaseSignOut(firebaseAuth).catch(() => undefined);
                return;
            }
            if (!nextProfile && isActive) {
                setUser(null);
                if (firebaseAuth) await firebaseSignOut(firebaseAuth).catch(() => undefined);
            } else if (nextProfile && isActive && getApiBaseUrl()
                && (nextFirebaseUser.emailVerified || nextProfile.role === 'student' || nextProfile.role === 'parent')) {
                const apiProfile = await exchangeFirebaseSession(nextFirebaseUser, !nextFirebaseUser.emailVerified);
                if (apiProfile && isActive && !hasExplicitlySignedOut()) setProfile(apiProfile);
            }
        };

        bootstrapAuth().catch(async (error) => {
            console.error('Auth bootstrap failed:', error);
            if (isActive) {
                clearLocalApiSession();
                if (hasExplicitlySignedOut()) {
                    await Promise.all([
                        clearApiRefreshCookie(),
                        supabase?.auth.signOut().catch(() => undefined),
                        firebaseAuth ? firebaseSignOut(firebaseAuth).catch(() => undefined) : Promise.resolve(),
                    ]);
                    if (isActive) {
                        setUser(null);
                        setProfile(null);
                        setSession(null);
                    }
                    setLoading(false);
                    return;
                }
                const firebaseUser = firebaseAuth?.currentUser;
                if (firebaseUser) {
                    const localProfile = await fetchFirebaseProfile(firebaseUser.uid);
                    if (localProfile && isActive) {
                        setAuthenticatedState(createFirebaseAppUser(firebaseUser), {
                            ...localProfile,
                            emailVerified: firebaseUser.emailVerified,
                        });
                    }
                }
                setLoading(false);
            }
        });

        const {
            data: { subscription },
        } = supabase?.auth.onAuthStateChange((_event, nextSession) => {
            if (hasExplicitlySignedOut()) {
                setUser(null);
                setProfile(null);
                setSession(null);
                setLoading(false);
                void supabase?.auth.signOut().catch(() => undefined);
                return;
            }
            if (sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)) return;
            setSession(nextSession);
            setUser(nextSession?.user ?? null);
            if (nextSession?.user) void fetchSupabaseProfile(nextSession.user.id);
            else {
                setProfile(null);
                setLoading(false);
            }
        }) ?? { data: { subscription: null } };

        const unsubscribeFirebase = firebaseAuth
            ? onFirebaseAuthStateChanged(firebaseAuth, (nextUser) => {
                if (sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) || supabase || isProvisioningFirebaseUser.current) return;
                if (hasExplicitlySignedOut()) {
                    setUser(null);
                    setProfile(null);
                    setSession(null);
                    setLoading(false);
                    if (nextUser) void firebaseSignOut(firebaseAuth);
                    return;
                }
                if (!nextUser) {
                    setUser(null);
                    setProfile(null);
                    setSession(null);
                    setLoading(false);
                    return;
                }

                setUser(createFirebaseAppUser(nextUser));
                setSession(null);
                void fetchFirebaseProfile(nextUser.uid).then((nextProfile) => {
                    if (!nextProfile) {
                        setUser(null);
                        if (firebaseAuth) void firebaseSignOut(firebaseAuth);
                    } else if (getApiBaseUrl()
                        && (nextUser.emailVerified || nextProfile.role === 'student' || nextProfile.role === 'parent')) {
                        void exchangeFirebaseSession(nextUser, !nextUser.emailVerified).then((apiProfile) => {
                            if (apiProfile && firebaseAuth?.currentUser?.uid === nextUser.uid) {
                                setAuthenticatedState(createFirebaseAppUser(nextUser), apiProfile);
                            }
                        }).catch(async (error) => {
                            console.error('Firebase API session exchange failed:', error);
                            // Keep the Firebase identity intact; a temporary API failure must not sign the user out.
                        });
                    }
                });
            })
            : () => undefined;

        return () => {
            isActive = false;
            subscription?.unsubscribe();
            unsubscribeFirebase();
        };
        // Auth restoration runs once per provider mount, not when helper identities change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const signIn = async (email: string, password: string, expectedRole?: UserRole): Promise<UserRole> => {
        const apiBaseUrl = getApiBaseUrl();
        const useFirebaseFirst = (expectedRole === 'student' || expectedRole === 'parent')
            && isFirebaseConfigured
            && Boolean(firebaseAuth);
        const apiLoginBaseUrl = useFirebaseFirst ? null : apiBaseUrl;

        try {
            clearExplicitSignOut();
            if (apiBaseUrl) {
                // Clear any previous session before signing in with new credentials
                await clearApiRefreshCookie();
                clearLocalApiSession();
            }

            if (apiLoginBaseUrl) {
                const response = await fetch(`${apiLoginBaseUrl}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                    credentials: 'include',
                });

                if (response.ok) {
                    const data = await response.json();
                    const role = normalizeApiRole(data.user?.role);
                    if (!role) {
                        await fetch(`${apiLoginBaseUrl}/auth/logout`, {
                            method: 'POST',
                            credentials: 'include',
                        }).catch(() => undefined);
                        throw new Error('Unrecognized account role');
                    }
                    if (expectedRole && role !== expectedRole) {
                        await fetch(`${apiLoginBaseUrl}/auth/logout`, {
                            method: 'POST',
                            credentials: 'include',
                        }).catch(() => undefined);
                        throw new Error('PORTAL_ROLE_MISMATCH');
                    }
                    const fallbackProfile: UserProfile = {
                        id: data.user.id,
                        email: data.user.email,
                        full_name: data.user.name || data.user.email,
                        role,
                    };

                    clearExplicitSignOut();
                    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, data.access_token);
                    const nextProfile = await fetchProfileFromApi(data.access_token) ?? {
                        ...fallbackProfile,
                        onboardingComplete: false,
                        onboardingStep: role === 'student' ? 'student-profile' : role === 'parent' ? 'link-student' : 'complete',
                    };
                    setAuthenticatedState(
                        createApiUser(data.user.id, data.user.email),
                        nextProfile
                    );
                    return role;
                }

                const canUseFirebaseFallback = expectedRole === undefined
                    || expectedRole === 'student'
                    || expectedRole === 'parent';
                if (!(canUseFirebaseFallback && isFirebaseConfigured && firebaseAuth && response.status === 401)) {
                    const errorPayload = await response
                        .json()
                        .catch(() => ({ message: 'Authentication failed' }));
                    throw new Error(errorPayload.message || 'Authentication failed');
                }
            }

            if (supabase && !useFirebaseFirst) {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) {
                    throw error;
                }

                const profile = data.user ? await fetchSupabaseProfile(data.user.id) : null;
                if (!profile) {
                    await supabase.auth.signOut();
                    setUser(null);
                    setProfile(null);
                    setSession(null);
                    throw new Error('Unrecognized account role');
                }
                if (expectedRole && profile.role !== expectedRole) {
                    await supabase.auth.signOut();
                    setUser(null);
                    setProfile(null);
                    setSession(null);
                    throw new Error('PORTAL_ROLE_MISMATCH');
                }
                clearExplicitSignOut();
                return profile.role;
            }

            if (isFirebaseConfigured && firebaseAuth) {
                clearLocalApiSession();
                isProvisioningFirebaseUser.current = true;
                let keepFirebaseIdentity = false;
                try {
                    const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
                    await reloadFirebaseUser(credential.user);
                    await credential.user.getIdToken(true);
                    const nextProfile = await fetchFirebaseProfile(credential.user.uid);

                    if (!nextProfile) {
                        await firebaseSignOut(firebaseAuth);
                        setUser(null);
                        setProfile(null);
                        throw new Error('NEXUS_PROFILE_NOT_PROVISIONED');
                    }
                    if (expectedRole && nextProfile.role !== expectedRole) {
                        await firebaseSignOut(firebaseAuth);
                        setUser(null);
                        setProfile(null);
                        throw new Error('PORTAL_ROLE_MISMATCH');
                    }
                    keepFirebaseIdentity = true;
                    clearExplicitSignOut();

                    const apiProfile = credential.user.emailVerified
                        ? await exchangeFirebaseSession(credential.user)
                        : nextProfile.role === 'student' || nextProfile.role === 'parent'
                            ? await exchangeFirebaseSession(credential.user, true)
                            : null;
                    if (getApiBaseUrl() && (nextProfile.role === 'student' || nextProfile.role === 'parent') && !apiProfile) {
                        throw new Error('تعذر إنشاء جلسة آمنة لإكمال إعداد الحساب. حاول مرة أخرى.');
                    }
                    setAuthenticatedState(createFirebaseAppUser(credential.user), apiProfile ?? {
                        ...nextProfile,
                        emailVerified: credential.user.emailVerified,
                    });
                    return nextProfile.role;
                } catch (error) {
                    if (!keepFirebaseIdentity) {
                        await firebaseSignOut(firebaseAuth).catch(() => undefined);
                        setUser(null);
                        setProfile(null);
                    } else {
                        const currentUser = firebaseAuth.currentUser;
                        if (currentUser) {
                            const localProfile = await fetchFirebaseProfile(currentUser.uid);
                            if (localProfile) {
                                setAuthenticatedState(createFirebaseAppUser(currentUser), {
                                    ...localProfile,
                                    emailVerified: currentUser.emailVerified,
                                });
                            }
                        }
                    }
                    throw error;
                } finally {
                    isProvisioningFirebaseUser.current = false;
                }
            }

            throw new Error('Authentication services are not configured');
        } catch (error: any) {
            console.error('Login error:', error);
            throw new Error(error.message || 'حدث خطأ في تسجيل الدخول');
        }
    };

    const signUp = async (
        email: string,
        password: string,
        fullName: string,
        role: UserRole,
        phone?: string
    ) => {
        if (role !== 'student' && role !== 'parent') {
            throw new Error('حسابات الموظفين تنشئها إدارة المدرسة مباشرة، ولا تحتاج إلى مراجعة بعد إنشائها.');
        }
        const apiBaseUrl = getApiBaseUrl();

        try {
            await clearApiRefreshCookie();
            clearLocalApiSession();
            clearExplicitSignOut();
            if (apiBaseUrl && !isFirebaseConfigured) {
                const apiRole = APP_ROLE_TO_API_ROLE[role];
                if (!apiRole) {
                    throw new Error('إنشاء حسابات الموظفين متاح لإدارة المدرسة فقط.');
                }

                const response = await fetch(`${apiBaseUrl}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email,
                        password,
                        name: fullName,
                        role: apiRole,
                        phone,
                    }),
                    credentials: 'include',
                });

                if (!response.ok) {
                    const errorPayload = await response
                        .json()
                        .catch(() => ({ message: 'Registration failed' }));
                    throw new Error(errorPayload.message || 'Registration failed');
                }

                await signIn(email, password);
                return;
            }

            if (isFirebaseConfigured && firebaseAuth && firebaseDb) {
                if (role !== 'student' && role !== 'parent') {
                    throw new Error('هذا الدور لا يمكنه إنشاء حساب ذاتي.');
                }

                isProvisioningFirebaseUser.current = true;
                try {
                    const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
                    let profileCreated = false;
                    try {
                        await updateProfile(credential.user, { displayName: fullName });
                        await setDoc(doc(firebaseDb, 'users', credential.user.uid), {
                            uid: credential.user.uid,
                            email: credential.user.email,
                            full_name: fullName,
                            role,
                            status: 'active',
                            ...(phone ? { phone } : {}),
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp(),
                        });
                        profileCreated = true;

                        const nextProfile = await fetchFirebaseProfile(credential.user.uid);
                        if (!nextProfile) throw new Error('NEXUS_PROFILE_NOT_PROVISIONED');
                        clearExplicitSignOut();
                        const apiProfile = getApiBaseUrl()
                            ? await exchangeFirebaseSession(credential.user, true)
                            : null;
                        if (getApiBaseUrl() && !apiProfile) {
                            throw new Error('تعذر إنشاء جلسة آمنة لإكمال إعداد الحساب. حاول مرة أخرى.');
                        }
                        setAuthenticatedState(createFirebaseAppUser(credential.user), apiProfile ?? {
                            ...nextProfile,
                            emailVerified: credential.user.emailVerified,
                        });
                        return;
                    } catch (error) {
                        if (profileCreated) await firebaseSignOut(firebaseAuth).catch(() => undefined);
                        else await deleteUser(credential.user).catch(() => undefined);
                        throw error;
                    }
                } finally {
                    isProvisioningFirebaseUser.current = false;
                }
            }

            throw new Error('خدمة إنشاء الحساب غير متاحة حالياً. حاول مرة أخرى لاحقاً.');
        } catch (error: any) {
            throw new Error(error.message || 'حدث خطأ في إنشاء الحساب');
        }
    };

    const signInWithGoogle = async (role: 'student' | 'parent' | 'admin') => {
        if (role !== 'student' && role !== 'parent' && role !== 'admin') {
            throw new Error('بوابة Google غير متاحة لهذا الحساب.');
        }
        if (!isFirebaseConfigured || !firebaseAuth || !firebaseDb || supabase) {
            throw new Error('تسجيل Google غير مهيأ حاليًا.');
        }
        if (role === 'admin' && getApiBaseUrl()) {
            throw new Error('دخول المالك عبر Google غير مهيأ مع خادم API الحالي.');
        }

        isProvisioningFirebaseUser.current = true;
        let firebaseUserSignedIn = false;
        try {
            clearExplicitSignOut();
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });
            const credential = await signInWithPopup(firebaseAuth, provider);
            firebaseUserSignedIn = true;
            if (!credential.user.email || !credential.user.emailVerified) {
                throw new Error('يلزم استخدام حساب Google ببريد إلكتروني موثّق.');
            }
            if (role === 'admin' && credential.user.email.trim().toLowerCase() !== BOOTSTRAP_ADMIN_EMAIL) {
                throw new Error('دخول المالك الأول متاح فقط لحساب Google المعتمد للمنصة.');
            }

            const profileRef = doc(firebaseDb, 'users', credential.user.uid);
            let profileSnapshot = await getDoc(profileRef);
            let isNewUser = false;
            if (!profileSnapshot.exists()) {
                const fullName = (credential.user.displayName || credential.user.email).trim().slice(0, 120);
                const isBootstrapAdmin = role === 'admin'
                    && credential.user.email.trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL;
                await setDoc(profileRef, {
                    uid: credential.user.uid,
                    email: credential.user.email,
                    full_name: fullName,
                    role: isBootstrapAdmin ? 'admin' : role,
                    status: 'active',
                    ...(credential.user.photoURL ? { avatar_url: credential.user.photoURL } : {}),
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                profileSnapshot = await getDoc(profileRef);
                isNewUser = true;
            }

            const profileData = profileSnapshot.data();
            const profileRole = normalizeApiRole(profileData?.role);
            const isAuthorizedBootstrapAdmin = role === 'admin'
                && profileRole === 'admin'
                && credential.user.email.trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL
                && profileData?.status === 'active';
            const isStudentOrParent = profileRole === 'student' || profileRole === 'parent';
            if (!profileData || profileData.status === 'disabled' || (!isStudentOrParent && !isAuthorizedBootstrapAdmin)) {
                throw new Error('الحساب غير مهيأ لهذه البوابة. تواصل مع إدارة المنصة.');
            }
            if (profileRole !== role) throw new Error('هذا الحساب لا يطابق بوابة الدخول المختارة.');

            const nextProfile = await fetchFirebaseProfile(credential.user.uid);
            if (!nextProfile) throw new Error('تعذر تحميل ملف الحساب.');
            clearExplicitSignOut();
            const apiProfile = await exchangeFirebaseSession(credential.user);
            setAuthenticatedState(createFirebaseAppUser(credential.user), apiProfile ?? nextProfile);
            return { role, isNewUser };
        } catch (error) {
            if (firebaseUserSignedIn) await firebaseSignOut(firebaseAuth).catch(() => undefined);
            throw error;
        } finally {
            isProvisioningFirebaseUser.current = false;
        }
    };

    const requestPasswordReset = async (email: string, role: 'student' | 'parent' | 'teacher' = 'student'): Promise<'code' | 'link'> => {
        const normalizedEmail = email.trim().toLowerCase();
        if (supabase) {
            const locale = window.location.pathname.split('/').filter(Boolean)[0] || 'ar';
            const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
                redirectTo: `${window.location.origin}/${locale}/reset-password?role=${role}`,
            });
            if (error) throw error;
            return 'link';
        }

        if (firebaseAuth && isFirebaseConfigured) {
            firebaseAuth.languageCode = 'en';
            try {
                await sendPasswordResetEmail(firebaseAuth, normalizedEmail, {
                    ...getEmailActionSettings(EMAIL_ACTION_CONTINUE_PATHS.passwordReset),
                });
            } catch (error: any) {
                if (error?.code !== 'auth/user-not-found') throw error;
            }
            return 'link';
        }

        const apiBaseUrl = getApiBaseUrl();
        if (apiBaseUrl) {
            const response = await fetch(`${apiBaseUrl}/auth/password-reset/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: normalizedEmail }),
            });
            if (!response.ok) throw new Error('تعذر طلب رمز التحقق حاليًا. حاول لاحقًا.');
            return 'code';
        }

        throw new Error('خدمة استعادة كلمة المرور غير مهيأة حاليًا.');
    };

    const confirmPasswordReset = async (email: string, code: string, newPassword: string) => {
        const apiBaseUrl = getApiBaseUrl();
        if (!apiBaseUrl) throw new Error('استعادة كلمة المرور بالرمز غير مهيأة حاليًا.');

        const response = await fetch(`${apiBaseUrl}/auth/password-reset/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim(), newPassword }),
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'رمز التحقق غير صالح أو انتهت صلاحيته.');
        }
    };

    const signOut = async () => {
        const apiBaseUrl = getApiBaseUrl();
        markExplicitlySignedOut();
        clearLocalApiSession();
        setUser(null);
        setProfile(null);
        setSession(null);

        await Promise.all([
            apiBaseUrl ? fetch(`${apiBaseUrl}/auth/logout`, {
                method: 'POST',
                credentials: 'include',
            }).catch(() => undefined) : Promise.resolve(),
            supabase?.auth.signOut().catch(() => undefined),
            firebaseAuth ? firebaseSignOut(firebaseAuth).catch(() => undefined) : Promise.resolve(),
        ]);

        clearLocalApiSession();
        const segments = window.location.pathname.split('/').filter(Boolean);
        const locale = segments[0] === 'en' || segments[0] === 'ar' ? segments[0] : 'ar';
        window.location.replace(`/${locale}/login`);
    };

    const value = {
        user,
        profile,
        session,
        loading,
        signIn,
        signInWithGoogle,
        signUp,
        requestPasswordReset,
        confirmPasswordReset,
        refreshProfile,
        markParentLinked,
        markParentSurveyComplete,
        refreshVerifiedSession,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
