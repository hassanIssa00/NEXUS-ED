import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as signOutFirebase,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import * as SecureStore from 'expo-secure-store';
import { apiClient, setSessionExpiredHandler, setSessionRefreshHandler } from '../lib/api';
import { firebaseAuth, firebaseConfigMissingMessage, firebaseDb, isFirebaseConfigured } from '../lib/firebase';
import { ACCESS_TOKEN_KEY, LEGACY_TOKEN_KEY, LEGACY_USER_KEY, REFRESH_TOKEN_KEY } from '../lib/session';

export type OnboardingStep = 'student-profile' | 'placement-assessment' | 'link-student' | 'parent-survey' | 'complete';

export interface AuthUser {
  id: string;
  userId?: string;
  email: string;
  role: string;
  name?: string;
  firstName?: string;
  phone?: string | null;
  avatar?: string | null;
  avatarUrl?: string | null;
  schoolId?: string | null;
  emailVerified?: boolean;
  onboardingComplete?: boolean;
  onboardingStep?: OnboardingStep;
  onboardingStudentId?: string;
  gradeLevel?: number;
}

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string, expectedRole?: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; phone: string; role: 'student' | 'parent' }) => Promise<void>;
  refreshProfile: () => Promise<AuthUser | null>;
  sendVerificationEmail: () => Promise<void>;
  refreshVerifiedSession: () => Promise<AuthUser | null>;
  requestPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

type ApiSession = { access_token?: string; refresh_token?: string; user?: AuthUser };
const AuthContext = createContext<AuthContextType>({} as AuthContextType);

async function clearStoredSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY),
    SecureStore.deleteItemAsync(LEGACY_USER_KEY),
  ]);
}

async function persistTokens(accessToken: string, refreshToken?: string) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  else await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await Promise.all([
    SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY),
    SecureStore.deleteItemAsync(LEGACY_USER_KEY),
  ]);
}

function normalizeRole(value?: string) {
  return value?.toUpperCase().replaceAll('-', '_') ?? '';
}

function normalizeProfile(profile: AuthUser): AuthUser {
  return {
    ...profile,
    id: profile.userId || profile.id,
    role: normalizeRole(profile.role),
  };
}

function friendlyError(error: any) {
  const apiMessage = error?.response?.data?.message;
  if (Array.isArray(apiMessage)) return apiMessage.join('، ');
  if (apiMessage) return apiMessage;
  const code = String(error?.code ?? '');
  if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password')) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  if (code.includes('auth/email-already-in-use')) return 'هذا البريد مسجل بالفعل. جرّب تسجيل الدخول.';
  if (code.includes('auth/weak-password')) return 'كلمة المرور يجب ألا تقل عن 8 أحرف.';
  if (code.includes('auth/invalid-email')) return 'صيغة البريد الإلكتروني غير صحيحة.';
  if (code.includes('auth/account-exists-with-different-credential')) return 'هذا البريد مرتبط بطريقة دخول أخرى. استخدم طريقة الدخول المسجلة للحساب.';
  if (code.includes('auth/network-request-failed')) return 'تعذر الاتصال. تحقق من الإنترنت وحاول مرة أخرى.';
  return error?.message || 'تعذر إكمال الطلب. حاول مرة أخرى.';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const authActionRef = useRef(0);

  const loadProfile = useCallback(async () => {
    const response = await apiClient.get<AuthUser>('/auth/profile');
    const profile = normalizeProfile(response.data);
    setUser(profile);
    return profile;
  }, []);

  const exchangeFirebaseUser = useCallback(async (firebaseUser: FirebaseUser, forceRefresh = false) => {
    const token = await firebaseUser.getIdToken(forceRefresh);
    const endpoint = firebaseUser.emailVerified ? '/auth/firebase' : '/auth/firebase/onboarding';
    const response = await apiClient.post<ApiSession>(endpoint, { idToken: token });
    if (!response.data.access_token) throw new Error('لم يتم إنشاء جلسة للمنصة. حاول مرة أخرى.');
    await persistTokens(response.data.access_token, response.data.refresh_token);
    return loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    let active = true;
    setSessionExpiredHandler(() => {
      setUser(null);
    });
    setSessionRefreshHandler(async () => {
      const firebaseUser = firebaseAuth?.currentUser;
      if (!firebaseUser) return null;
      try {
        const refreshedProfile = await exchangeFirebaseUser(firebaseUser, true);
        return refreshedProfile ? SecureStore.getItemAsync(ACCESS_TOKEN_KEY) : null;
      } catch {
        return null;
      }
    });

    const restoreApiSession = async () => {
      try {
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (!refreshToken) return;
        const refreshed = await apiClient.post<ApiSession>('/auth/mobile/refresh', { refresh_token: refreshToken });
        if (!refreshed.data.access_token || !refreshed.data.refresh_token) return;
        await persistTokens(refreshed.data.access_token, refreshed.data.refresh_token);
        await loadProfile();
      } catch {
        await clearStoredSession();
      }
    };

    const finishFirebaseRestore = async (firebaseUser: FirebaseUser | null) => {
      if (authActionRef.current > 0) {
        if (active) setLoading(false);
        return;
      }
      try {
        if (firebaseUser) await exchangeFirebaseUser(firebaseUser, true);
        else await restoreApiSession();
      } catch {
        if (active && firebaseUser?.emailVerified) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    const unsubscribe = firebaseAuth
      ? onAuthStateChanged(firebaseAuth, (firebaseUser) => void finishFirebaseRestore(firebaseUser))
      : null;
    if (!unsubscribe) void finishFirebaseRestore(null);

    return () => {
      active = false;
      unsubscribe?.();
      setSessionExpiredHandler(null);
      setSessionRefreshHandler(null);
    };
  }, [exchangeFirebaseUser, loadProfile]);

  const signIn = async (email: string, password: string, expectedRole?: string) => {
    authActionRef.current += 1;
    try {
      let signedInProfile: AuthUser;
      if (expectedRole === 'STAFF' || !firebaseAuth) {
        const response = await apiClient.post<ApiSession>('/auth/mobile/login', { email: email.trim(), password });
        if (!response.data.access_token || !response.data.refresh_token || !response.data.user?.id) {
          throw new Error('لم يُرجع الخادم جلسة صالحة. تحقق من إعداد حساب الموظف وحاول مرة أخرى.');
        }
        await persistTokens(response.data.access_token, response.data.refresh_token);
        try {
          signedInProfile = await loadProfile();
        } catch (profileError) {
          await clearStoredSession();
          throw profileError;
        }
      } else {
        const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
        await reload(credential.user);
        const profile = await exchangeFirebaseUser(credential.user, true);
        signedInProfile = profile;
        if (profile.role !== 'STUDENT' && profile.role !== 'PARENT' && !profile.schoolId) {
          throw new Error('حساب الموظف غير مرتبط بمدرسة. تواصل مع مسؤول النظام.');
        }
      }

      const publicRole = signedInProfile.role === 'STUDENT' || signedInProfile.role === 'PARENT';
      if (expectedRole === 'STAFF' ? publicRole : expectedRole && signedInProfile.role !== expectedRole) {
        setUser(null);
        await clearStoredSession();
        if (firebaseAuth?.currentUser) await signOutFirebase(firebaseAuth);
        throw new Error('هذا الحساب لا يتبع البوابة المختارة. اختر نوع الحساب الصحيح.');
      }
    } catch (error) {
      throw new Error(friendlyError(error));
    } finally {
      authActionRef.current -= 1;
    }
  };

  const register = async ({ email, password, name, phone, role }: {
    email: string; password: string; name: string; phone: string; role: 'student' | 'parent';
  }) => {
    if (!firebaseAuth || !firebaseDb || !isFirebaseConfigured) throw new Error(firebaseConfigMissingMessage());
    authActionRef.current += 1;
    try {
      const credential = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
      try {
        await updateProfile(credential.user, { displayName: name.trim() });
        await setDoc(doc(firebaseDb, 'users', credential.user.uid), {
          uid: credential.user.uid,
          email: credential.user.email,
          full_name: name.trim(),
          role,
          status: 'active',
          phone: phone.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await exchangeFirebaseUser(credential.user, true);
      } catch (error) {
        await signOutFirebase(firebaseAuth);
        throw error;
      }
    } catch (error) {
      throw new Error(friendlyError(error));
    } finally {
      authActionRef.current -= 1;
    }
  };

  const refreshProfile = async () => {
    try {
      const firebaseUser = firebaseAuth?.currentUser;
      if (firebaseUser) return await exchangeFirebaseUser(firebaseUser, true);
      return await loadProfile();
    } catch {
      return null;
    }
  };

  const sendVerificationEmail = async () => {
    const currentUser = firebaseAuth?.currentUser;
    if (!currentUser) throw new Error('انتهت جلسة الحساب. سجّل الدخول من جديد.');
    if (currentUser.emailVerified) return;
    await sendEmailVerification(currentUser, {
      url: 'https://nexus.masarplatform.org/en/auth/action?result=verified',
      handleCodeInApp: false,
    });
  };

  const refreshVerifiedSession = async () => {
    const currentUser = firebaseAuth?.currentUser;
    if (!currentUser) return null;
    await reload(currentUser);
    await currentUser.getIdToken(true);
    if (!currentUser.emailVerified) return null;
    return exchangeFirebaseUser(currentUser, true);
  };

  const requestPasswordReset = async (email: string) => {
    if (firebaseAuth) {
      await sendPasswordResetEmail(firebaseAuth, email.trim(), {
        url: 'https://nexus.masarplatform.org/en/auth/action?result=password-reset',
        handleCodeInApp: false,
      });
      return;
    }
    await apiClient.post('/auth/password-reset/request', { email: email.trim() });
  };

  const signOut = async () => {
    authActionRef.current += 1;
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (refreshToken) await apiClient.post('/auth/mobile/logout', { refresh_token: refreshToken });
    } catch {
      // Local and Firebase sessions are cleared even while the API is unavailable.
    } finally {
      try {
        await clearStoredSession();
        if (firebaseAuth?.currentUser) await signOutFirebase(firebaseAuth);
        setUser(null);
      } finally {
        authActionRef.current -= 1;
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, register, refreshProfile, sendVerificationEmail, refreshVerifiedSession, requestPasswordReset, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
