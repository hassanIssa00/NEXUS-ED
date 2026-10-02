import { apiClient } from '@/lib/api/client';

function unwrap<T>(response: { data: any }): T {
    return (response.data?.data ?? response.data) as T;
}

export interface Assignment {
    id: string;
    title: string;
    description?: string;
    dueDate?: string;
    maxScore: number;
    attachments?: string[];
    subjectId: string;
    subject?: { id: string; name: string; code?: string };
    teacher?: { id: string; name?: string; email: string };
    _count?: { submissions: number };
    submission?: Submission | null;
    createdAt: string;
    updatedAt: string;
}

export interface Submission {
    id: string;
    content?: string;
    attachments?: string[];
    score?: number | null;
    grade?: number | null;
    feedback?: string;
    assignmentId: string;
    assignment?: Pick<Assignment, 'id' | 'title' | 'maxScore' | 'subjectId'>;
    studentId: string;
    student?: { id: string; name?: string | null; email: string };
    submittedAt: string;
    gradedAt?: string;
}

export interface CreateAssignmentDto {
    title: string;
    description?: string;
    subjectId: string;
    dueDate?: string;
    maxScore?: number;
    attachments?: string[];
}

export interface SubmitAssignmentDto {
    content?: string;
    attachments?: string[];
}

export interface GradeSubmissionDto {
    score: number;
    feedback?: string;
}

class AssignmentServiceClass {
    async getAll(filters?: { subjectId?: string }): Promise<Assignment[]> {
        return unwrap(await apiClient.get('/assignments', { params: filters }));
    }

    async getMyAssignments(): Promise<Assignment[]> {
        return unwrap(await apiClient.get('/assignments/my'));
    }

    async getStudentAssignments(): Promise<Assignment[]> {
        return unwrap(await apiClient.get('/assignments/student'));
    }

    async getById(id: string): Promise<Assignment> {
        return unwrap(await apiClient.get(`/assignments/${id}`));
    }

    async create(data: CreateAssignmentDto): Promise<Assignment> {
        return unwrap(await apiClient.post('/assignments', data));
    }

    async update(id: string, data: Partial<CreateAssignmentDto>): Promise<Assignment> {
        return unwrap(await apiClient.patch(`/assignments/${id}`, data));
    }

    async delete(id: string): Promise<void> {
        await apiClient.delete(`/assignments/${id}`);
    }

    async submit(id: string, data: SubmitAssignmentDto): Promise<Submission> {
        return unwrap(await apiClient.post(`/assignments/${id}/submit`, data));
    }

    async getSubmissions(assignmentId: string): Promise<Submission[]> {
        return unwrap(await apiClient.get(`/assignments/${assignmentId}/submissions`));
    }

    async gradeSubmission(submissionId: string, data: GradeSubmissionDto): Promise<Submission> {
        return unwrap(await apiClient.patch(`/assignments/submissions/${submissionId}/grade`, data));
    }
}

export const assignmentService = new AssignmentServiceClass();
