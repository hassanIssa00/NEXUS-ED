import axios from 'axios'
import { getApiBaseUrl, getStoredAccessToken } from './endpoints';
import { auth as firebaseAuth } from '@/lib/firebase/config';

const API_BASE_URL = getApiBaseUrl();

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
        const token = getStoredAccessToken()
            || await firebaseAuth?.currentUser?.getIdToken();
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

        // If 401 and not already retried
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true

            try {
                // Try to refresh token
                const { data } = await axios.post(
                    `${API_BASE_URL}/auth/refresh`,
                    {},
                    { withCredentials: true }
                )

                // Save new access token
                sessionStorage.setItem('access_token', data.access_token)

                // Retry original request with new token
                originalRequest.headers.Authorization = `Bearer ${data.access_token}`
                return apiClient(originalRequest)
            } catch (refreshError) {
                // Refresh failed - redirect to login
                sessionStorage.removeItem('access_token')
                localStorage.removeItem('access_token')
                if (typeof window !== 'undefined') {
                    window.location.href = '/login'
                }
                return Promise.reject(refreshError)
            }
        }

        return Promise.reject(error)
    }
)
