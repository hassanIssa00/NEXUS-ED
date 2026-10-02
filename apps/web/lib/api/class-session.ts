import { apiClient } from './client';

export interface ClassSession {
  id: string;
  classId: string;
  teacherId: string;
  title: string;
  isActive: boolean;
  meetingUrl: string | null;
  duration: number;
  startTime: string;
  teacher?: {
    name: string | null;
  };
}

export const classSessionApi = {
  start: (classId: string, data: { title: string; meetingUrl: string; duration?: number }) =>
    apiClient.post<ClassSession>(`/classes/${classId}/sessions/start`, data),
    
  end: (classId: string, sessionId: string) => 
    apiClient.post(`/classes/${classId}/sessions/${sessionId}/end`),
    
  getActive: (classId: string) => 
    apiClient.get<ClassSession | null>(`/classes/${classId}/sessions/active`),
    
  markAttendance: (classId: string, sessionId: string, studentId: string) =>
    apiClient.post(`/classes/${classId}/sessions/${sessionId}/attendance`, { studentId }),
};
