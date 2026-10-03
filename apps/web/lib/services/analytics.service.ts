import { getApiUrl, getStoredAccessToken } from '../api/endpoints';

export interface AnalyticsOverview {
    users: {
        total: number;
        students: number;
        teachers: number;
        parents: number;
    };
    classes: {
        total: number;
    };
    subjects: {
        total: number;
    };
    enrollments: {
        total: number;
    };
    recentActivity: Array<{
        type: string;
        description: string;
        timestamp: string;
    }>;
}

class AnalyticsService {
    async getOverview(): Promise<AnalyticsOverview> {
        const token = getStoredAccessToken();
        const response = await fetch(getApiUrl('/analytics/overview'), {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) throw new Error('Failed to fetch analytics');
        return response.json();
    }

    async getUserGrowth(days: number = 30) {
        const token = getStoredAccessToken();
        const response = await fetch(getApiUrl(`/analytics/user-growth?days=${encodeURIComponent(String(days))}`), {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) throw new Error('Failed to fetch user growth');
        return response.json();
    }
}

export const analyticsService = new AnalyticsService();
