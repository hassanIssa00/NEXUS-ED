import { getApiUrl, getStoredAccessToken } from '../lib/api/endpoints';

/**
 * Get auth token from storage
 */
function getAuthToken(): string {
    return getStoredAccessToken() || '';
}

/**
 * Make authenticated API request
 */
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getAuthToken();

    const response = await fetch(`${getApiUrl('/million')}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
        },
    });

    const data = await response.json();

    if (!data.success) {
        throw new Error(data.error || 'API request failed');
    }

    return data.data;
}

/**
 * Million Dialogue API Service
 */
export const millionService = {
    /**
     * Create a new room
     */
    async createRoom(data: {
        title: string;
        type: 'public' | 'private';
        settings?: any;
    }) {
        return apiRequest('/create-room', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Join a room
     */
    async joinRoom(roomId: string) {
        return apiRequest(`/join-room`, {
            method: 'POST',
            body: JSON.stringify({ roomId }),
        });
    },

    /**
     * Leave a room
     */
    async leaveRoom(roomId: string) {
        return apiRequest(`/leave-room`, {
            method: 'POST',
            body: JSON.stringify({ roomId }),
        });
    },

    /**
     * Start a round
     */
    async startRound(roomId: string) {
        return apiRequest(`/start-round`, {
            method: 'POST',
            body: JSON.stringify({ roomId }),
        });
    },

    /**
     * Submit an answer
     */
    async submitAnswer(data: {
        roomId: string;
        questionId: number;
        chosenIndex: number;
        timeTaken: number;
    }) {
        return apiRequest(`/answer`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Get room details
     */
    async getRoom(roomId: string) {
        return apiRequest(`/room/${roomId}`);
    },

    /**
     * Get leaderboard
     */
    async getLeaderboard(roomId: string) {
        return apiRequest(`/leaderboard/${roomId}`);
    },

    /**
     * Get user history
     */
    async getUserHistory(userId: string, limit: number = 10) {
        return apiRequest(`/history/${userId}?limit=${limit}`);
    },
};

export default millionService;
