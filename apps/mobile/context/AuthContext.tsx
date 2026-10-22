import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
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
  avatar_url?: string | null;
  schoolId?: string | null;
  emailVerified?: boolean;
  onboardingComplete?: boolean;
  onboardingStep?: OnboardingStep;
  onboardingStudentId?: string;
  gradeLevel?: number;
  teacherAvatarUploadPending?: boolean;
}

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string, expectedRole?: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    phone: string;
    role: 'student' | 'parent' | 'teacher';
    teacherCode?: string;
    teacherProfile?: { nationalId: string; specialization: string; yearsExperience?: number };
    teacherPhoto?: { uri: string; mimeType?: string | null; fileName?: string | null };
  }) => Promise<void>;
  uploadTeacherRegistrationAvatar: (photo: { uri: string; mimeType?: string | null; fileName?: string | null }) => Promise<void>;
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
  const avatarUrl = profile.avatarUrl ?? profile.avatar_url ?? profile.avatar ?? undefined;
  return {
    ...profile,
    id: profile.userId || profile.id,
    role: normalizeRole(profile.role),
    avatarUrl,
  };
}

function pendingFirebaseProfile(firebaseUser: FirebaseUser, data: Record<string, unknown>): AuthUser | null {
  if (firebaseUser.emailVerified) return null;
  const role = normalizeRole(typeof data.role === 'string' ? data.role : undefined);
    if (role !== 'STUDENT' && role !== 'TEACHER') return null;
  return {
    id: firebaseUser.uid,
    userId: firebaseUser.uid,
    email: firebaseUser.email ?? '',
    role,
    name: typeof data.full_name === 'string' ? data.full_name : firebaseUser.displayName ?? undefined,
    phone: typeof data.phone === 'string' ? data.phone : null,
    emailVerified: false,
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
    let avatarUrl = profile.avatarUrl ?? undefined;
    if (avatarUrl?.startsWith('file:') || avatarUrl?.startsWith('storage://')) {
      try {
        const avatarResponse = await apiClient.get<{ url?: string | null }>('/upload/me/avatar');
        avatarUrl = typeof avatarResponse.data.url === 'string' ? avatarResponse.data.url : undefined;
      } catch {
        avatarUrl = undefined;
      }
    }
    const hydratedProfile = { ...profile, avatar: avatarUrl, avatarUrl, avatar_url: avatarUrl };
    setUser(hydratedProfile);
    return hydratedProfile;
  }, []);

  const readPendingFirebaseProfile = useCallback(async (firebaseUser: FirebaseUser) => {
    if (!firebaseDb || firebaseUser.emailVerified) return null;
    const snapshot = await getDoc(doc(firebaseDb, 'users', firebaseUser.uid));
    if (!snapshot.exists()) return null;
    return pendingFirebaseProfile(firebaseUser, snapshot.data());
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
        if (firebaseUser) {
          const pendingProfile = await readPendingFirebaseProfile(firebaseUser);
          if (pendingProfile) {
            await clearStoredSession();
            if (active) setUser(pendingProfile);
            return;
          }
          await exchangeFirebaseUser(firebaseUser, true);
        } else await restoreApiSession();
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
  }, [exchangeFirebaseUser, loadProfile, readPendingFirebaseProfile]);

  useEffect(() => {
    if (!user?.id) return;
    let active = AppState.currentState === 'active';
    let timer: ReturnType<typeof setInterval> | undefined;
    const recordPresence = () => {
      if (active) void apiClient.post('/users/me/presence').catch(() => undefined);
    };
    const startHeartbeat = () => {
      if (timer) clearInterval(timer);
      timer = setInterval(recordPresence, 5 * 60 * 1000);
    };
    recordPresence();
    startHeartbeat();
    const subscription = AppState.addEventListener('change', (state) => {
      active = state === 'active';
      if (active) { recordPresence(); startHeartbeat(); }
      else if (timer) { clearInterval(timer); timer = undefined; }
    });
    return () => {
      subscription.remove();
      if (timer) clearInterval(timer);
    };
  }, [user?.id]);

  const signIn = async (email: string, password: string, expectedRole?: string) => {
    authActionRef.current += 1;
    try {
      let signedInProfile: AuthUser;
      if (expectedRole === 'STAFF' && firebaseAuth && firebaseDb && isFirebaseConfigured) {
        let firebaseCredentialsAccepted = false;
        try {
          const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
          firebaseCredentialsAccepted = true;
          await reload(credential.user);
          const pendingProfile = await readPendingFirebaseProfile(credential.user);
          if (pendingProfile) {
            if (pendingProfile.role !== 'TEACHER') {
              await signOutFirebase(firebaseAuth);
              throw new Error('هذا الحساب لا يتبع بوابة الموظفين. اختر نوع الحساب الصحيح.');
            }
            await clearStoredSession();
            setUser(pendingProfile);
            return;
          }
          signedInProfile = await exchangeFirebaseUser(credential.user, true);
        } catch (firebaseError: any) {
          if (firebaseCredentialsAccepted) {
            await signOutFirebase(firebaseAuth).catch(() => undefined);
            throw firebaseError;
          }
          const firebaseCode = String(firebaseError?.code ?? '');
          const canTryLegacyStaffLogin = [
            'auth/invalid-credential',
            'auth/wrong-password',
            'auth/user-not-found',
            'auth/invalid-email',
          ].some((code) => firebaseCode.includes(code));
          if (!canTryLegacyStaffLogin) throw firebaseError;

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
        }
      } else if (expectedRole === 'STAFF' || !firebaseAuth) {
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
        const pendingProfile = await readPendingFirebaseProfile(credential.user);
        if (pendingProfile) {
          const expectedRoleMatches = !expectedRole
            || (expectedRole === 'STAFF' ? pendingProfile.role === 'TEACHER' : pendingProfile.role === expectedRole);
          if (!expectedRoleMatches) {
            await signOutFirebase(firebaseAuth);
            throw new Error('هذا الحساب لا يتبع البوابة المختارة. اختر نوع الحساب الصحيح.');
          }
          await clearStoredSession();
          setUser(pendingProfile);
          return;
        }
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

  const register = async ({ email, password, name, phone, role, teacherCode, teacherProfile, teacherPhoto }: {
    email: string; password: string; name: string; phone: string; role: 'student' | 'parent' | 'teacher';
    teacherCode?: string;
    teacherProfile?: { nationalId: string; specialization: string; yearsExperience?: number };
    teacherPhoto?: { uri: string; mimeType?: string | null; fileName?: string | null };
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
          status: 'pending',
          phone: phone.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        if (role === 'student' || role === 'teacher') {
          const token = await credential.user.getIdToken(true);
          await apiClient.post('/auth/registration-attempt', {
            idToken: token,
            ...(role === 'teacher' ? { teacherCode, teacherProfile } : {}),
          });
          let teacherAvatarUploadPending = false;
          if (role === 'teacher' && teacherPhoto) {
            try {
              await uploadTeacherRegistrationAvatar(teacherPhoto);
            } catch {
              teacherAvatarUploadPending = true;
            }
          }
          firebaseAuth.languageCode = 'ar';
          await sendEmailVerification(credential.user, {
            url: 'https://nexus.masarplatform.org/ar/auth/action?result=verified',
            handleCodeInApp: false,
          });
          const pendingProfile = pendingFirebaseProfile(credential.user, {
            uid: credential.user.uid,
            email: credential.user.email ?? '',
            full_name: name.trim(),
            role,
            status: 'pending',
            phone: phone.trim(),
          });
          setUser(pendingProfile ? { ...pendingProfile, ...(teacherAvatarUploadPending ? { teacherAvatarUploadPending: true } : {}) } : null);
          return;
        }
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

  const uploadTeacherRegistrationAvatar = async (photo: { uri: string; mimeType?: string | null; fileName?: string | null }) => {
    const currentUser = firebaseAuth?.currentUser;
    if (!currentUser || !firebaseDb) throw new Error('انتهت جلسة التسجيل. أعد تسجيل الدخول ثم أكمل بيانات الصورة.');
    const form = new FormData();
    const extension = photo.fileName?.split('.').pop()?.toLowerCase() || photo.uri.split('.').pop()?.toLowerCase() || 'jpg';
    form.append('file', {
      uri: photo.uri,
      name: `teacher-avatar.${extension}`,
      type: photo.mimeType || 'image/jpeg',
    } as any);
    const idToken = await currentUser.getIdToken(true);
    await apiClient.post('/auth/teacher-registration/avatar', form, {
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'multipart/form-data' },
    });
    setUser((current) => current ? { ...current, teacherAvatarUploadPending: false } : current);
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
      url: 'https://nexus.masarplatform.org/ar/auth/action?result=verified',
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
        url: 'https://nexus.masarplatform.org/ar/auth/action?result=password-reset',
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
    <AuthContext.Provider value={{ user, loading, signIn, register, uploadTeacherRegistrationAvatar, refreshProfile, sendVerificationEmail, refreshVerifiedSession, requestPasswordReset, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
