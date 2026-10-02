import { apiClient } from './client';

export interface AiResponse {
  answer: string;
}

export const aiApi = {
  ask: async (question: string, subject?: string) => {
    return apiClient.post<{ success: boolean; data: AiResponse }>('/ai/ask', { question, subject });
  },
  autoGrade: async (submissionId: string) => {
    return apiClient.post<{ success: boolean; data: any }>(`/ai/grade/${submissionId}`);
  }
};
