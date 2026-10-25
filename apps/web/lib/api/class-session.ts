import { apiClient } from './client';

export interface ClassSession {
  id: string;
  classId: string;
  teacherId: string;
  title: string;
  isActive: boolean;
  duration: number;
  startTime: string;
  endedAt?: string | null;
  recordingStatus?: 'NOT_CONFIGURED' | 'RECORDING' | 'PROCESSING' | 'READY' | 'FAILED';
  teacher?: {
    name: string | null;
  };
}

export const classSessionApi = {
  start: (classId: string, data: { title: string; duration?: number }) =>
    apiClient.post<ClassSession>(`/classes/${classId}/sessions/start`, data),
    
  end: (classId: string, sessionId: string) => 
    apiClient.post(`/classes/${classId}/sessions/${sessionId}/end`),
    
  getActive: (classId: string) => 
    apiClient.get<ClassSession | null>(`/classes/${classId}/sessions/active`),

  history: (classId: string) =>
    apiClient.get<ClassSession[]>(`/classes/${classId}/sessions/history`),

  retryRecording: (classId: string, sessionId: string) =>
    apiClient.post<ClassSession>(`/classes/${classId}/sessions/${sessionId}/recording/retry`),

  downloadRecording: (classId: string, sessionId: string) =>
    apiClient.get<{ url: string; expiresInSeconds: number }>(`/classes/${classId}/sessions/${sessionId}/recording`),
    
  createJoinToken: (classId: string, sessionId: string) =>
    apiClient.post<{ url: string; token: string; session: ClassSession }>(`/classes/${classId}/sessions/${sessionId}/token`),

  checkInAfterConnect: (classId: string, sessionId: string) =>
    apiClient.post<{ status: 'PRESENT'; joinedAt: string; sessionId: string }>(`/classes/${classId}/sessions/${sessionId}/check-in`),
};
