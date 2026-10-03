import { getApiUrl, getStoredAccessToken } from '../api/endpoints';
const getAccessToken = getStoredAccessToken;

export interface Lesson {
    id: string;
    title: string;
    content?: string;
    videoUrl?: string;
    attachments?: string[];
    subjectId: string;
    subject?: {
        id: string;
        name: string;
        code?: string;
    };
    author?: {
        id: string;
        firstName?: string;
        lastName?: string;
        name?: string;
        email: string;
    };
    createdAt: string;
    updatedAt: string;
}

export interface CreateLessonDto {
    title: string;
    content?: string;
    videoUrl?: string;
    attachments?: string[];
    subjectId: string;
}

export interface UpdateLessonDto {
    title?: string;
    content?: string;
    videoUrl?: string;
    attachments?: string[];
}

class LessonServiceClass {
    async getAll(filters?: { subjectId?: string }): Promise<Lesson[]> {
        const token = getAccessToken();
        const params = new URLSearchParams();

        if (filters?.subjectId) {
            params.append('subjectId', filters.subjectId);
        }

        const response = await fetch(`${getApiUrl('/lessons')}?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch lessons');
        }

        return response.json();
    }

    async getMyLessons(): Promise<Lesson[]> {
        const token = getAccessToken();

        const response = await fetch(getApiUrl('/lessons/my'), {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch my lessons');
        }

        return response.json();
    }

    async getById(id: string): Promise<Lesson> {
        const token = getAccessToken();

        const response = await fetch(getApiUrl(`/lessons/${encodeURIComponent(id)}`), {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch lesson');
        }

        return response.json();
    }

    async create(data: CreateLessonDto): Promise<Lesson> {
        const token = getAccessToken();

        const response = await fetch(getApiUrl('/lessons'), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create lesson');
        }

        return response.json();
    }

    async update(id: string, data: UpdateLessonDto): Promise<Lesson> {
        const token = getAccessToken();

        const response = await fetch(getApiUrl(`/lessons/${encodeURIComponent(id)}`), {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update lesson');
        }

        return response.json();
    }

    async delete(id: string): Promise<void> {
        const token = getAccessToken();

        const response = await fetch(getApiUrl(`/lessons/${encodeURIComponent(id)}`), {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to delete lesson');
        }
    }
}

export const lessonService = new LessonServiceClass();
