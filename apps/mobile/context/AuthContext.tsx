import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiClient, setSessionExpiredHandler } from '../lib/api';
import { ACCESS_TOKEN_KEY, LEGACY_TOKEN_KEY, LEGACY_USER_KEY, REFRESH_TOKEN_KEY } from '../lib/session';

export interface AuthUser {
  id: string;
  userId?: string;
  email: string;
  role: string;
  name?: string;
  firstName?: string;
  schoolId?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

interface MobileAuthResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

async function clearStoredSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY),
    SecureStore.deleteItemAsync(LEGACY_USER_KEY),
  ]);
}

async function persistTokens(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await Promise.all([
    SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY),
    SecureStore.deleteItemAsync(LEGACY_USER_KEY),
  ]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null));
    return () => setSessionExpiredHandler(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (!refreshToken) {
          await Promise.all([
            SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY),
            SecureStore.deleteItemAsync(LEGACY_USER_KEY),
          ]);
          return;
        }

        const refreshed = await apiClient.post<Pick<MobileAuthResponse, 'access_token' | 'refresh_token'>>(
          '/auth/mobile/refresh',
          { refresh_token: refreshToken },
        );
        await persistTokens(refreshed.data.access_token, refreshed.data.refresh_token);

        const profile = await apiClient.get<AuthUser>('/users/me');
        if (mounted) setUser(profile.data);
      } catch (error: any) {
        if (error?.response?.status === 401) await clearStoredSession();
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void restoreSession();
    return () => {
      mounted = false;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const response = await apiClient.post<MobileAuthResponse>('/auth/mobile/login', {
      email: email.trim(),
      password,
    });
    const session = response.data;
    if (!session.access_token || !session.refresh_token || !session.user?.id) {
      throw new Error('The Nexus API returned an invalid sign-in response.');
    }

    await persistTokens(session.access_token, session.refresh_token);
    setUser(session.user);
  };

  const signOut = async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    try {
      if (refreshToken) {
        await apiClient.post('/auth/mobile/logout', { refresh_token: refreshToken });
      }
    } catch {
      // The local session is still removed if the API is temporarily unavailable.
    } finally {
      await clearStoredSession();
      setUser(null);
    }
  };

  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
