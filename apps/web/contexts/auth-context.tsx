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
    phone?: string;
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password: string, expectedRole?: UserRole) => Promise<UserRole>;
    signUp: (
        email: string,
        password: string,
        fullName: string,
        role: UserRole,
        phone?: string
    ) => Promise<void>;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const clearLocalApiSession = () => {
        sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
        localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
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
        for (const key of LEGACY_DEMO_KEYS) {
            sessionStorage.removeItem(key);
            localStorage.removeItem(key);
        }
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

        return {
            id: data.id,
            email: data.email,
            full_name: data.name || data.email,
            role: normalizedRole,
            avatar_url: data.avatar,
            phone: data.phone,
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
        return data.access_token as string;
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
            return null;
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

            const role = normalizeApiRole(data.role);
            if (!role) {
                throw new Error('Unrecognized account role');
            }

            const profile = { ...data, role } as UserProfile;
            setProfile(profile);
            return profile;
        } catch (error) {
            console.error('Error fetching profile:', error);
            return null;
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

            clearLegacyBrowserSession();

            // Restore only a token validated by the API.
            const restoredApi = await restoreApiSession();
            if (!isActive) {
                return;
            }

            if (restoredApi) {
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

    const signIn = async (email: string, password: string, expectedRole?: UserRole): Promise<UserRole> => {
        const apiBaseUrl = getApiBaseUrl();

        try {
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
                    const role = normalizeApiRole(data.user?.role);
                    if (!role) {
                        await fetch(`${apiBaseUrl}/auth/logout`, {
                            method: 'POST',
                            credentials: 'include',
                        }).catch(() => undefined);
                        throw new Error('Unrecognized account role');
                    }
                    if (expectedRole && role !== expectedRole) {
                        await fetch(`${apiBaseUrl}/auth/logout`, {
                            method: 'POST',
                            credentials: 'include',
                        }).catch(() => undefined);
                        throw new Error('PORTAL_ROLE_MISMATCH');
                    }
                    const nextProfile: UserProfile = {
                        id: data.user.id,
                        email: data.user.email,
                        full_name: data.user.name || data.user.email,
                        role,
                    };

                    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, data.access_token);
                    setAuthenticatedState(
                        createApiUser(data.user.id, data.user.email),
                        nextProfile
                    );
                    return role;
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
                return profile.role;
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
        const apiBaseUrl = getApiBaseUrl();

        try {
            if (apiBaseUrl) {
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

            throw new Error('خدمة إنشاء الحساب غير متاحة حالياً. حاول مرة أخرى لاحقاً.');
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
