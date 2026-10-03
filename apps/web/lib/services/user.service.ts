import { getApiUrl, getStoredAccessToken } from '../api/endpoints';

export interface User {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    role: 'STUDENT' | 'TEACHER' | 'PARENT' | 'ADMIN';
    phone?: string;
    isActive?: boolean;
    emailVerified?: boolean;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateUserDto {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    role: 'STUDENT' | 'TEACHER' | 'PARENT' | 'ADMIN';
    phone?: string;
}

export interface UpdateUserDto {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    role?: 'STUDENT' | 'TEACHER' | 'PARENT' | 'ADMIN';
    phone?: string;
    isActive?: boolean;
}

export interface UserStats {
    total: number;
    students: number;
    teachers: number;
    parents: number;
    admins: number;
}

class UserService {
    async getAll(filters?: { role?: string; search?: string; page?: number; limit?: number }) {
        const token = getStoredAccessToken();
        const params = new URLSearchParams();

        if (filters?.role) params.append('role', filters.role);
        if (filters?.search) params.append('search', filters.search);
        if (filters?.page) params.append('page', filters.page.toString());
        if (filters?.limit) params.append('limit', filters.limit.toString());

        const response = await fetch(`${getApiUrl('/users')}?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) throw new Error('Failed to fetch users');
        return response.json();
    }

    async getById(id: string): Promise<User> {
        const token = getStoredAccessToken();
        const response = await fetch(getApiUrl(`/users/${encodeURIComponent(id)}`), {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) throw new Error('Failed to fetch user');
        return response.json();
    }

    async create(data: CreateUserDto): Promise<User> {
        const token = getStoredAccessToken();
        const response = await fetch(getApiUrl('/users'), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create user');
        }
        return response.json();
    }

    async update(id: string, data: UpdateUserDto): Promise<User> {
        const token = getStoredAccessToken();
        const response = await fetch(getApiUrl(`/users/${encodeURIComponent(id)}`), {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error('Failed to update user');
        return response.json();
    }

    async delete(id: string): Promise<void> {
        const token = getStoredAccessToken();
        const response = await fetch(getApiUrl(`/users/${encodeURIComponent(id)}`), {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) throw new Error('Failed to delete user');
    }

    async getStats(): Promise<UserStats> {
        const token = getStoredAccessToken();
        const response = await fetch(getApiUrl('/users/stats'), {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) throw new Error('Failed to fetch stats');
        return response.json();
    }
}

export const userService = new UserService();
