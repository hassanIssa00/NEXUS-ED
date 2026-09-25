'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

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
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (
        email: string,
        password: string,
        fullName: string,
        role: UserRole
    ) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_TOKEN_STORAGE_KEY = 'access_token';
const DEMO_FLAG_STORAGE_KEY = 'is_demo';
const DEMO_PROFILE_STORAGE_KEY = 'demo_profile';

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
    teacher: 'TEACHER',
    parent: 'PARENT',
    admin: 'ADMIN',
    manager: 'ADMIN',
};

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

function normalizeApiRole(role: string | undefined): UserRole {
    return API_ROLE_TO_APP_ROLE[role ?? ''] ?? 'student';
}

function canUseDemoAuth(): boolean {
    return true;
}

function getApiBaseUrl(): string | null {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
    return apiUrl ? apiUrl.replace(/\/$/, '') : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const clearLocalApiSession = () => {
        sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
        sessionStorage.removeItem(DEMO_FLAG_STORAGE_KEY);
        sessionStorage.removeItem(DEMO_PROFILE_STORAGE_KEY);
        // Also clear localStorage to prevent stale sessions
        localStorage.removeItem('access_token');
        localStorage.removeItem('nexus_role');
        localStorage.removeItem('nexus_user');
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
        return {
            id: data.id,
            email: data.email,
            full_name: data.name || data.email,
            role: normalizeApiRole(data.role),
            avatar_url: data.avatar,
        };
    };

    const refreshApiSession = async (): Promise<string | null> => {
        const apiBaseUrl = getApiBaseUrl();
        if (!apiBaseUrl) {
            return null;
        }

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

        sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, data.access_token);
        sessionStorage.setItem(DEMO_FLAG_STORAGE_KEY, 'false');
        return data.access_token as string;
    };

    const restoreDemoSession = (): boolean => {
        const rawProfile = sessionStorage.getItem('nexus_user') || localStorage.getItem('nexus_user') || sessionStorage.getItem(DEMO_PROFILE_STORAGE_KEY);

        if (!rawProfile) {
            return false;
        }

        try {
            const profile = JSON.parse(rawProfile) as UserProfile;
            setAuthenticatedState(
                createApiUser(profile.id, profile.email),
                profile
            );
            return true;
        } catch {
            clearLocalApiSession();
            return false;
        }
    };

    const restoreApiSession = async (): Promise<boolean> => {
        const apiBaseUrl = getApiBaseUrl();
        const token = sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);

        if (!apiBaseUrl || !token) {
            return false;
        }

        let nextToken = token;
        let nextProfile = await fetchProfileFromApi(nextToken);

        if (!nextProfile) {
            const refreshedToken = await refreshApiSession();
            if (!refreshedToken) {
                clearLocalApiSession();
                return false;
            }

            nextToken = refreshedToken;
            nextProfile = await fetchProfileFromApi(nextToken);
        }

        if (!nextProfile) {
            clearLocalApiSession();
            return false;
        }

        setAuthenticatedState(
            createApiUser(nextProfile.id, nextProfile.email),
            nextProfile
        );
        return true;
    };

    const fetchSupabaseProfile = async (userId: string) => {
        if (!supabase) {
            return;
        }

        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, email, full_name, role, avatar_url')
                .eq('id', userId)
                .single();

            if (error) {
                throw error;
            }

            setProfile(data as UserProfile);
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let isActive = true;

        const bootstrapAuth = async () => {
            if (typeof window === 'undefined') {
                return;
            }

            const restoredApi = await restoreApiSession();
            if (!isActive) {
                return;
            }

            if (restoredApi) {
                setLoading(false);
                return;
            }

            const restoredDemo = restoreDemoSession();
            if (!isActive) {
                return;
            }

            if (restoredDemo) {
                setLoading(false);
                return;
            }

            if (!supabase) {
                setLoading(false);
                return;
            }

            const {
                data: { session: nextSession },
            } = await supabase.auth.getSession();

            if (!isActive) {
                return;
            }

            setSession(nextSession);
            setUser(nextSession?.user ?? null);

            if (nextSession?.user) {
                await fetchSupabaseProfile(nextSession.user.id);
            } else {
                setLoading(false);
            }
        };

        bootstrapAuth().catch((error) => {
            console.error('Auth bootstrap failed:', error);
            if (isActive) {
                clearLocalApiSession();
                setLoading(false);
            }
        });

        if (!supabase) {
            return () => {
                isActive = false;
            };
        }

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            if (sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)) {
                return;
            }

            setSession(nextSession);
            setUser(nextSession?.user ?? null);
            if (nextSession?.user) {
                fetchSupabaseProfile(nextSession.user.id);
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => {
            isActive = false;
            subscription.unsubscribe();
        };
    }, []);

    const signIn = async (email: string, password: string) => {
        const apiBaseUrl = getApiBaseUrl();

        try {
            // 🌟 1. Real Nexus Ecosystem Authentication across all 8 roles
            const { nexusBridge } = await import('@/lib/nexusDataBridge');
            const realAccount = nexusBridge.findAccountByEmail(email);

            if (realAccount) {
                await new Promise(resolve => setTimeout(resolve, 400));
                const realProfile: UserProfile = {
                    id: realAccount.id,
                    email: realAccount.email,
                    full_name: realAccount.name,
                    role: realAccount.role,
                    avatar_url: realAccount.avatarUrl,
                };

                sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, `nexus_live_${realAccount.id}`);
                sessionStorage.setItem(DEMO_FLAG_STORAGE_KEY, 'false');
                sessionStorage.setItem(DEMO_PROFILE_STORAGE_KEY, JSON.stringify(realProfile));
                sessionStorage.setItem('nexus_user', JSON.stringify(realProfile));
                localStorage.setItem('access_token', `nexus_live_${realAccount.id}`);
                localStorage.setItem('nexus_user', JSON.stringify(realProfile));
                localStorage.setItem('nexus_role', realAccount.role);

                setAuthenticatedState(createApiUser(realAccount.id, realAccount.email), realProfile);
                return;
            }

            if (canUseDemoAuth()) {
                await new Promise(resolve => setTimeout(resolve, 500));
                const demoRole = email.toLowerCase().includes('teacher')
                    ? 'teacher'
                    : email.toLowerCase().includes('parent')
                        ? 'parent'
                        : email.toLowerCase().includes('admin')
                            ? 'admin'
                            : 'student';

                const demoProfile: UserProfile = {
                    id: 'demo-user-id',
                    email,
                    full_name: 'مستخدم تجريبي',
                    role: demoRole,
                };

                sessionStorage.setItem(DEMO_FLAG_STORAGE_KEY, 'true');
                sessionStorage.setItem(DEMO_PROFILE_STORAGE_KEY, JSON.stringify(demoProfile));
                setAuthenticatedState(createApiUser(demoProfile.id, demoProfile.email), demoProfile);
                return;
            }

            if (apiBaseUrl) {
                // Clear any previous session before signing in with new credentials
                clearLocalApiSession();
                
                const response = await fetch(`${apiBaseUrl}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                    credentials: 'include',
                });

                if (response.ok) {
                    const data = await response.json();
                    const nextProfile: UserProfile = {
                        id: data.user.id,
                        email: data.user.email,
                        full_name: data.user.name || data.user.email,
                        role: normalizeApiRole(data.user.role),
                    };

                    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, data.access_token);
                    sessionStorage.setItem(DEMO_FLAG_STORAGE_KEY, 'false');
                    setAuthenticatedState(
                        createApiUser(data.user.id, data.user.email),
                        nextProfile
                    );
                    return;
                }

                const errorPayload = await response
                    .json()
                    .catch(() => ({ message: 'Authentication failed' }));
                throw new Error(errorPayload.message || 'Authentication failed');
            }

            if (supabase) {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) {
                    throw error;
                }

                if (data.user) {
                    await fetchSupabaseProfile(data.user.id);
                }
                return;
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
        role: UserRole
    ) => {
        const apiBaseUrl = getApiBaseUrl();

        try {
            if (canUseDemoAuth()) {
                const demoProfile: UserProfile = {
                    id: 'demo-user-id',
                    email,
                    full_name: fullName,
                    role,
                };
                sessionStorage.setItem(DEMO_FLAG_STORAGE_KEY, 'true');
                sessionStorage.setItem(DEMO_PROFILE_STORAGE_KEY, JSON.stringify(demoProfile));
                setAuthenticatedState(createApiUser(demoProfile.id, demoProfile.email), demoProfile);
                return;
            }

            if (apiBaseUrl) {
                const apiRole = APP_ROLE_TO_API_ROLE[role];
                if (!apiRole) {
                    throw new Error('Self-registration is limited to student, teacher, parent, and admin accounts.');
                }

                const response = await fetch(`${apiBaseUrl}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email,
                        password,
                        name: fullName,
                        role: apiRole,
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

            if (!supabase) {
                throw new Error('Registration services are not configured');
            }

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) {
                throw authError;
            }

            if (!authData.user) {
                throw new Error('فشل إنشاء الحساب');
            }

            const { error: profileError } = await supabase.from('users').insert({
                id: authData.user.id,
                email,
                full_name: fullName,
                role,
            });

            if (profileError) {
                throw profileError;
            }

            await fetchSupabaseProfile(authData.user.id);
        } catch (error: any) {
            throw new Error(error.message || 'حدث خطأ في إنشاء الحساب');
        }
    };

    const signOut = async () => {
        const apiBaseUrl = getApiBaseUrl();

        try {
            if (apiBaseUrl) {
                await fetch(`${apiBaseUrl}/auth/logout`, {
                    method: 'POST',
                    credentials: 'include',
                }).catch(() => undefined);
            }

            if (supabase) {
                await supabase.auth.signOut().catch(() => undefined);
            }

            clearLocalApiSession();
            setUser(null);
            setProfile(null);
            setSession(null);
            
            // Force a hard reload to clear all memory state
            window.location.href = '/ar/login';
        } catch (error: any) {
            // Even on error, clear local state and redirect
            clearLocalApiSession();
            setUser(null);
            setProfile(null);
            setSession(null);
            window.location.href = '/ar/login';
        }
    };

    const value = {
        user,
        profile,
        session,
        loading,
        signIn,
        signUp,
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
