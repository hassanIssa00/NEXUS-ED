import axios from 'axios'
import { getApiBaseUrl, getStoredAccessToken } from './endpoints';
import { reload } from 'firebase/auth';
import { auth as firebaseAuth } from '@/lib/firebase/config';

const API_BASE_URL = getApiBaseUrl();
let refreshPromise: Promise<string> | null = null;

function refreshAccessToken() {
    if (!API_BASE_URL) return Promise.reject(new Error('API is not configured'));
    if (!refreshPromise) {
        refreshPromise = axios.post(
            `${API_BASE_URL}/auth/refresh`,
            {},
            { withCredentials: true },
        ).then(({ data }) => {
            if (typeof data.access_token !== 'string' || !data.access_token) {
                throw new Error('Refresh response did not include an access token');
            }
            sessionStorage.setItem('access_token', data.access_token);
            localStorage.removeItem('access_token');
            return data.access_token as string;
        }).catch(async (refreshError) => {
            const firebaseUser = firebaseAuth?.currentUser;
            if (!firebaseUser) throw refreshError;

            await reload(firebaseUser);
            const idToken = await firebaseUser.getIdToken(true);
            const endpoint = firebaseUser.emailVerified ? '/auth/firebase' : '/auth/firebase/onboarding';
            const { data } = await axios.post(`${API_BASE_URL}${endpoint}`, { idToken }, { withCredentials: true });
            if (typeof data.access_token !== 'string' || !data.access_token) {
                throw new Error('Firebase session exchange did not include an access token');
            }
            sessionStorage.setItem('access_token', data.access_token);
            localStorage.removeItem('access_token');
            window.dispatchEvent(new Event('nexus:auth-refreshed'));
            return data.access_token as string;
        }).finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
}

function notifySessionExpired() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('nexus:auth-expired'));
    }
}

// Create axios instance
export const apiClient = axios.create({
    baseURL: API_BASE_URL ?? undefined,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // For cookies (refresh token)
})

// Request interceptor - add access token
apiClient.interceptors.request.use(
    async (config) => {
        if (!API_BASE_URL) {
            return Promise.reject(new Error('The Nexus API endpoint is not configured for this deployment.'));
        }
        const token = getStoredAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

// Response interceptor - handle 401 and refresh token
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config

        if (error.response?.status === 401 && originalRequest?._retry) {
            notifySessionExpired();
            return Promise.reject(error);
        }

        // Share one refresh request across concurrent 401 responses.
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
            originalRequest._retry = true

            try {
                const accessToken = await refreshAccessToken()
                originalRequest.headers.Authorization = `Bearer ${accessToken}`
                return apiClient(originalRequest)
            } catch (refreshError) {
                sessionStorage.removeItem('access_token')
                localStorage.removeItem('access_token')
                notifySessionExpired()
                return Promise.reject(refreshError)
            }
        }

        return Promise.reject(error)
    }
)
