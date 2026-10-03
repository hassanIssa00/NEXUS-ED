import { getApiUrl, getStoredAccessToken } from '../api/endpoints';

export interface Enrollment {
    id: string;
    studentId: string;
    classId: string;
    enrolledAt: string;
    student?: {
        id: string;
        email: string;
        firstName?: string;
        lastName?: string;
        name?: string;
        phone?: string;
    };
    class?: {
        id: string;
        name: string;
        academicYear?: string;
    };
}

class EnrollmentService {
    async create(studentId: string, classId: string): Promise<Enrollment> {
        const token = getStoredAccessToken();
        const response = await fetch(getApiUrl('/enrollments'), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ studentId, classId }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to enroll student');
        }
        return response.json();
    }

    async bulkEnroll(studentIds: string[], classId: string) {
        const token = getStoredAccessToken();
        const response = await fetch(getApiUrl('/enrollments/bulk'), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ studentIds, classId }),
        });

        if (!response.ok) throw new Error('Failed to bulk enroll');
        return response.json();
    }

    async getByClass(classId: string): Promise<Enrollment[]> {
        const token = getStoredAccessToken();
        const response = await fetch(getApiUrl(`/enrollments/class/${encodeURIComponent(classId)}`), {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) throw new Error('Failed to fetch enrollments');
        return response.json();
    }

    async getByStudent(studentId: string): Promise<Enrollment[]> {
        const token = getStoredAccessToken();
        const response = await fetch(getApiUrl(`/enrollments/student/${encodeURIComponent(studentId)}`), {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) throw new Error('Failed to fetch enrollments');
        return response.json();
    }

    async delete(id: string): Promise<void> {
        const token = getStoredAccessToken();
        const response = await fetch(getApiUrl(`/enrollments/${encodeURIComponent(id)}`), {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) throw new Error('Failed to delete enrollment');
    }
}

export const enrollmentService = new EnrollmentService();
