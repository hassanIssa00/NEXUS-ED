import { apiClient } from './client'

export interface StudentDashboardResponse {
  student: {
    id: string
    name: string
    schoolId?: string | null
    classes: Array<{
      id: string
      name: string
      teacher: string | null
    }>
  }
  summary: {
    totalSubjects: number
    pendingAssignments: number
    completedAssignments: number
    attendanceRate: number | null
    averageGrade: number | null
  }
  upcomingAssignments: Array<{
    id: string
    title: string
    description?: string | null
    dueDate?: string | null
    subject: { id: string; name: string }
    status: 'pending' | 'submitted' | 'graded'
    grade?: number | null
  }>
  attendance: {
    present: number
    absent: number
    late: number
    excused: number
  }
  attendanceRecordCount: number
  achievements: Array<{
    id: string
    name: string
    description: string
    unlockedAt: string
  }>
  weeklyActivity: Array<{
    label: string
    submissions: number
    attended: number
  }>
  subjectPerformance: Array<{
    id: string
    name: string
    teacher: string | null
    averageGrade: number | null
    progress: number | null
    totalLessons: number
    totalAssignments: number
    submittedAssignments: number
  }>
  gamification: {
    level: number
    totalXP: number
    streakDays: number
    achievementsUnlocked: number
  }
}

export interface TeacherDashboardResponse {
  teacher: {
    id: string
    name: string
    schoolId?: string | null
  }
  summary: {
    totalClasses: number
    totalStudents: number
    totalAssignments: number
    totalLessons: number
    pendingSubmissions: number
    attendanceRate: number | null
  }
  classPerformance: Array<{
    id: string
    name: string
    studentCount: number
    subjectCount: number
    averageGrade: number | null
  }>
  recentAssignments: Array<{
    id: string
    title: string
    subject: string
    dueDate?: string | null
    submissions: number
  }>
  gradingQueue: Array<{
    id: string
    submittedAt: string
    assignment: {
      id: string
      title: string
      dueDate?: string | null
    }
    student: {
      id: string
      name?: string | null
      email: string
    }
  }>
  attendanceSummary: {
    totalRecords: number
    present: number
    late: number
    absent: number
  }
  interventionAlerts?: Array<{
    id: string
    title: string
    body: string
    data: any
    createdAt: string
  }>
}

export interface AdminDashboardResponse {
  admin: {
    id: string
    name: string
    schoolId?: string | null
  }
  kpis: {
    totalUsers: number
    totalStudents: number
    totalTeachers: number
    totalClasses: number
    totalSubjects: number
    activeUsers: number
    totalRevenue: number
    attendanceRate: number | null
  }
  enrollmentSeries: Array<{ label: string; value: number }>
  revenueSeries: Array<{ label: string; value: number }>
  invoiceSummary: {
    total: number
    paid: number
    pending: number
    requiresAction: number
    failed: number
    refunded: number
  }
  recentActivity: Array<{
    id: string
    action: string
    entityType: string
    entityId?: string | null
    actor: string
    createdAt: string
  }>
  systemHealth: Array<{
    name: string
    status: 'healthy' | 'warning'
    value: number
    detail: string
  }>
}

export const dashboardApi = {
  getStudentDashboard: async (): Promise<StudentDashboardResponse> => {
    const response = await apiClient.get<StudentDashboardResponse>('/dashboard/student')
    return response.data
  },
  getTeacherDashboard: async (): Promise<TeacherDashboardResponse> => {
    const response = await apiClient.get<TeacherDashboardResponse>('/dashboard/teacher')
    return response.data
  },
  getAdminDashboard: async (): Promise<AdminDashboardResponse> => {
    const response = await apiClient.get<AdminDashboardResponse>('/dashboard/admin')
    return response.data
  },
  getParentDashboard: async (): Promise<any> => {
    const response = await apiClient.get('/dashboard/parent')
    return response.data
  }
}
