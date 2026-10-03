import axios, { type InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_CONFIG_ERROR, API_URL } from '@/constants/Config';
import { ACCESS_TOKEN_KEY, LEGACY_TOKEN_KEY, LEGACY_USER_KEY, REFRESH_TOKEN_KEY } from './session';

type RetryConfig = InternalAxiosRequestConfig & { _nexusRetried?: boolean };
type RefreshResponse = { access_token: string; refresh_token: string };

export const apiClient = axios.create({
  baseURL: API_URL ?? undefined,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

let refreshInFlight: Promise<string | null> | null = null;
let sessionExpiredHandler: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null) {
  sessionExpiredHandler = handler;
}

function isMobileAuthRequest(url?: string) {
  return url?.includes('/auth/mobile/') ?? false;
}

apiClient.interceptors.request.use(async (config) => {
  if (!API_URL) throw new Error(API_CONFIG_ERROR ?? 'Nexus API is not configured.');
  if (!isMobileAuthRequest(config.url)) {
    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(undefined, async (error: unknown) => {
  if (!axios.isAxiosError(error)) throw error;

  const original = error.config as RetryConfig | undefined;
  if (error.response?.status !== 401 || !original || original._nexusRetried || isMobileAuthRequest(original.url)) {
    throw error;
  }
  original._nexusRetried = true;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (!refreshToken) return null;

      const response = await apiClient.post<RefreshResponse>('/auth/mobile/refresh', {
        refresh_token: refreshToken,
      });
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, response.data.refresh_token);
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, response.data.access_token);
      return response.data.access_token;
    })()
      .catch(async (refreshError: unknown) => {
        if (axios.isAxiosError(refreshError) && refreshError.response?.status === 401) {
          await Promise.all([
            SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
            SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
            SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY),
            SecureStore.deleteItemAsync(LEGACY_USER_KEY),
          ]);
          sessionExpiredHandler?.();
        }
        return null;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }

  const accessToken = await refreshInFlight;
  if (!accessToken) throw error;
  original.headers.Authorization = `Bearer ${accessToken}`;
  return apiClient(original);
});
