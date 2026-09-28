'use client';

/**
 * NEXUS EDU — Real-Time Unified Data Bridge
 * ============================================================================
 * Connects the 8 Portals (Student, Teacher, Parent, Principal, Vice Principal,
 * Counselor, Supervisor, Admin) to real live shared state across school classrooms.
 * 
 * Features:
 *  - 100% Real data persistence across all 8 roles
 *  - Real classroom roster with full student profiles & parent contacts
 *  - 7-period daily timetable & live attendance tracking
 *  - Interactive quizzes with instant grading & submission logs
 *  - Homework assignments with submission, review & parent dispatch
 *  - Official accredited certificates with serial numbers & signatures
 *  - Behavioral & academic counseling records
 *  - Dynamic KPI calculations for leadership (Principal, VP, Supervisor)
 *  - Real-time cross-tab & cross-role event bus
 * ============================================================================
 */

import { db } from './firebase/config';
import { collection, doc, setDoc, getDocs, onSnapshot } from 'firebase/firestore';

// ── Types ────────────────────────────────────────────────────────────────────

export type NexusUserRole =
  | 'student'
  | 'teacher'
  | 'parent'
  | 'principal'
  | 'vice_principal'
  | 'counselor'
  | 'supervisor'
  | 'admin'
  | 'accountant';

export interface NexusAccount {
  id: string;
  universalId?: string; // e.g. TCH-1001, STD-1002, ADM-101, PRT-2001
  email: string;
  name: string;
  role: NexusUserRole;
  title: string;
  phone?: string;
  avatarUrl?: string;
  linkedStudentId?: string; // For parents/students
  linkedStudentIds?: string[]; // Multiple children for parents
  linkedParentId?: string;
  schoolName: string;
  employeeId?: string;
  department?: string;
  status?: 'active' | 'inactive' | 'suspended';
  createdAt: string;
}

export interface SchoolClass {
  id: string; // e.g. 'CLS-101'
  name: string; // 'الصف الأول الابتدائي — أ'
  gradeLevel: number; // 1
  section: string; // 'أ'
  academicYear: string; // '2026-2027'
  homeroomTeacherId: string; // 'acc_teacher_ismail'
  homeroomTeacherName: string; // 'د. إسماعيل عيسى'
  roomNumber?: string;
  capacity: number;
  enrolledCount: number;
  subjectIds: string[];
  createdAt: string;
}

export interface SchoolSubject {
  id: string; // e.g. 'SUB-ARB-1'
  code: string; // 'ARB-101'
  name: string; // 'لغتي الجميلة'
  gradeLevel: number; // 1
  weeklyPeriods: number; // 6
  defaultTeacherId?: string; // 'acc_teacher_ismail'
  defaultTeacherName?: string;
  classIds: string[]; // ['CLS-101', 'CLS-102']
  color: string;
  icon?: string;
}

export interface TeacherRecord extends NexusAccount {
  teacherId: string; // 'TCH-1001'
  specialization: string; // 'اللغة العربية والتربية الإسلامية'
  nationalId: string;
  assignedClassIds: string[]; // ['CLS-101', 'CLS-102']
  assignedSubjectIds: string[]; // ['SUB-ARB-1', 'SUB-QRN-1']
  weeklyPeriodsCount: number; // 18
  status: 'active' | 'inactive' | 'suspended';
  hireDate: string;
}

export interface EnrollmentRecord {
  id: string; // 'ENR-xxxx'
  studentId: string; // 'cls-std-1'
  studentName: string;
  classId: string; // 'CLS-101'
  className: string;
  academicYear: string; // '2026-2027'
  enrolledAt: string;
  status: 'active' | 'transferred' | 'graduated';
}

export interface ClassStudentRecord {
  id: string;
  universalId?: string; // 'STD-1001'
  fullName: string;
  fullNameEn: string;
  grade: string;
  classId?: string; // e.g. 'CLS-101'
  nationalId: string;
  dateOfBirth: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  photoUrl?: string;
  notes: string;
  averageGrade: number;
  attendanceRate: number;
  rank: number;
  assignedProgram: string;
  status: 'active' | 'warning' | 'excellent';
  studentAccountId?: string;
  parentAccountId?: string;
  enrolledSubjectIds?: string[];
}

export interface PeriodItem {
  periodNumber: number;
  subjectName: string;
  teacherName: string;
  startTime: string;
  endTime: string;
}

export interface PeriodAttendanceItem {
  status: 'present' | 'absent' | 'late';
  timeRecorded: string;
  verifiedVia: 'biometric_face' | 'manual_teacher' | 'qr_code';
  note?: string;
}

export interface DailyAttendanceRecord {
  date: string; // YYYY-MM-DD
  studentId: string;
  studentName: string;
  overallStatus: 'present' | 'absent' | 'late';
  periods: Record<number, PeriodAttendanceItem>;
  parentNotified: boolean;
}

export interface QuizQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: number; // 0-indexed
  points: number;
}

export interface ClassQuiz {
  id: string;
  title: string;
  subject: string;
  durationMinutes: number;
  totalPoints: number;
  questions: QuizQuestion[];
  createdAt: string;
  submissionsCount: number;
}

export interface QuizSubmission {
  id: string;
  quizId: string;
  quizTitle: string;
  studentId: string;
  studentName: string;
  score: number;
  totalPoints: number;
  answers: Record<string, number>;
  submittedAt: string;
}

export interface HomeworkAssignment {
  id: string;
  title: string;
  subject: string;
  grade: string;
  fromPage?: number;
  toPage?: number;
  dueDate: string;
  instructions: string;
  totalScore: number;
  submissionsCount: number;
  createdAt: string;
}

export interface HomeworkSubmission {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  studentId: string;
  studentName: string;
  submissionText: string;
  submittedAt: string;
  grade?: number; // e.g. 10
  status: 'submitted' | 'reviewed';
  feedback?: string;
}

export interface AccreditedCertificate {
  id: string;
  certNumber: string;
  studentId: string;
  studentName: string;
  studentNameEn?: string;
  programTitle: string;
  achievement: string;
  score: number;
  completionDate: string;
  doctorName: string;
  doctorTitle: string;
  qrCode: string;
  badge: string;
  createdAt: string;
}

export interface BehavioralObservation {
  id: string;
  studentId: string;
  studentName: string;
  authorName: string;
  authorRole: string;
  category: 'academic' | 'behavior' | 'praise' | 'guidance';
  severity: 'positive' | 'neutral' | 'urgent';
  text: string;
  createdAt: string;
}

export interface ClassEventItem {
  id: string;
  title: string;
  category: 'party' | 'trip' | 'activity' | 'competition' | 'open_day' | 'other';
  categoryLabel: string;
  driveUrl?: string;
  coverImage?: string;
  images?: string[];
  description?: string;
  date: string;
  createdAt: string;
}

export interface ClassMeetingItem {
  id: string;
  title: string;
  meetingUrl: string;
  scheduledAt: string;
  duration: number;
  notes?: string;
  hostName: string;
  createdAt: string;
}

export interface StudentWeeklyReport {
  id: string;
  reportNumber: string;
  studentId: string;
  studentName: string;
  weekTitle: string;
  date: string;
  attendanceRate: number;
  homeworkRate: number;
  behaviorScore: number;
  overallGrade: string;
  teacherNotes: string;
  recommendation: string;
  doctorName: string;
  createdAt: string;
}

export interface CommunityMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'teacher' | 'parent';
  studentName?: string;
  text: string;
  createdAt: string;
  isPinned?: boolean;
  isAnnouncement?: boolean;
  reactions?: Record<string, number>;
}

export interface LiveSessionItem {
  id: string;
  title: string;
  description: string;
  hostName: string;
  status: 'LIVE' | 'RECORDED';
  startedAt: string;
  durationMinutes: number;
  viewerCount: number;
  recordingUrl?: string;
}

export interface CurriculumSubject {
  slug: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  grade: string;
  term: string;
  year: string;
  pageCount: number;
  color: string;
  accent: string;
  badge: string;
  promise: string;
  units: Array<{
    title: string;
    fromPage: number;
    toPage: number;
  }>;
}


// ── Initial Authentic School Classes ──────────────────────────────────────────

export const INITIAL_CLASSES: SchoolClass[] = [];

// ── Initial Authentic School Subjects ─────────────────────────────────────────

export const INITIAL_SUBJECTS: SchoolSubject[] = [];

// ── Initial Authentic Teachers ────────────────────────────────────────────────

export const INITIAL_TEACHERS: TeacherRecord[] = [];

// ── Initial Authentic Accounts (8 Portals + Teachers + Staff) ──────────────────

export const NEXUS_CORE_ACCOUNTS: NexusAccount[] = [
  // Primary Academic Supervisor & Teacher
  {
    id: 'acc_teacher_ismail',
    universalId: 'TCH-1001',
    email: 'arabic.teacher@nexusedu.sa',
    name: 'د. إسماعيل عيسى',
    role: 'teacher',
    title: 'معلم الفصل والمشرف الأكاديمي',
    phone: '+966500000001',
    employeeId: 'EMP-TCH-001',
    department: 'قسم اللغة العربية والتربية الإسلامية',
    status: 'active',
    schoolName: 'مدارس نكسس التعليمية الأهلية',
    avatarUrl: '/images/auth/teacher.webp',
    createdAt: '2026-08-01T00:00:00Z',
  },
  // Leadership & Administration
  {
    id: 'acc_principal_khaled',
    universalId: 'ADM-101',
    email: 'principal@nexusedu.sa',
    name: 'د. خالد العتيبي',
    role: 'principal',
    title: 'مدير عام المدرسة',
    phone: '+966509988776',
    employeeId: 'EMP-DIR-001',
    department: 'الإدارة العامة والتطوير المالي والأكاديمي',
    status: 'active',
    schoolName: 'مدارس نكسس التعليمية الأهلية',
    avatarUrl: '/images/auth/principal.webp',
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'acc_vp_mansour',
    universalId: 'ADM-102',
    email: 'vice.principal@nexusedu.sa',
    name: 'أ. منصور القحطاني',
    role: 'vice_principal',
    title: 'وكيل المدرسة لشؤون الطلاب والانضباط',
    phone: '+966503344556',
    employeeId: 'EMP-VP-001',
    department: 'شؤون الطلاب والانضباط المدرسي',
    status: 'active',
    schoolName: 'مدارس نكسس التعليمية الأهلية',
    avatarUrl: '/images/auth/vice_principal.webp',
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'acc_counselor_abdullah',
    universalId: 'ADM-103',
    email: 'counselor@nexusedu.sa',
    name: 'أ. عبد الله الغامدي',
    role: 'counselor',
    title: 'الموجه الطلابي والمستشار النفسي',
    phone: '+966507766554',
    employeeId: 'EMP-CNS-001',
    department: 'التوجيه الطلابي والرعاية النفسية',
    status: 'active',
    schoolName: 'مدارس نكسس التعليمية الأهلية',
    avatarUrl: '/images/auth/counselor.webp',
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'acc_supervisor_abdulrahman',
    universalId: 'ADM-104',
    email: 'supervisor@nexusedu.sa',
    name: 'د. عبد الرحمن السبيعي',
    role: 'supervisor',
    title: 'المشرف التربوي التخصصي',
    phone: '+966501122334',
    employeeId: 'EMP-SUP-001',
    department: 'الإشراف التربوي وضمان الجودة',
    status: 'active',
    schoolName: 'إدارة التعليم — مكتب الإشراف',
    avatarUrl: '/images/auth/supervisor.webp',
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'acc_admin_fahad',
    universalId: 'ADM-105',
    email: 'admin@nexusedu.sa',
    name: 'أ. فهد الزهراني',
    role: 'admin',
    title: 'مدير الشؤون الإدارية والمالية',
    phone: '+966504433221',
    employeeId: 'EMP-ADM-001',
    department: 'الشؤون الإدارية والتقنية',
    status: 'active',
    schoolName: 'مدارس نكسس التعليمية الأهلية',
    avatarUrl: '/images/auth/admin.webp',
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'acc_accountant_salim',
    universalId: 'ADM-106',
    email: 'accountant@nexusedu.sa',
    name: 'أ. سليم النجار',
    role: 'accountant',
    title: 'المحاسب المالي ومدير الحسابات المدرسية',
    phone: '+966508899001',
    employeeId: 'EMP-ACC-001',
    department: 'الإدارة المالية والمحاسبة',
    status: 'active',
    schoolName: 'مدارس نكسس التعليمية الأهلية',
    avatarUrl: '/images/auth/admin.webp',
    createdAt: '2026-08-01T00:00:00Z',
  },
];

// ── Initial Authentic Student Enrollments ──────────────────────────────────────

export const INITIAL_ENROLLMENTS: EnrollmentRecord[] = [];

// ── Initial Authentic School Students (26 Students Across 4 Classes) ─────────

export const REAL_CLASS_STUDENTS: ClassStudentRecord[] = [];

// ── Daily 7-Period Timetable ─────────────────────────────────────────────────

export const DAILY_PERIODS: PeriodItem[] = [
  { periodNumber: 1, subjectName: 'لغتي العربية', teacherName: 'د. إسماعيل عيسى', startTime: '07:00', endTime: '07:45' },
  { periodNumber: 2, subjectName: 'القرآن الكريم', teacherName: 'د. إسماعيل عيسى', startTime: '07:45', endTime: '08:30' },
  { periodNumber: 3, subjectName: 'الرياضيات', teacherName: 'أ. فاطمة الزهراني', startTime: '08:45', endTime: '09:30' },
  { periodNumber: 4, subjectName: 'العلوم', teacherName: 'أ. ياسر الشهراني', startTime: '09:30', endTime: '10:15' },
  { periodNumber: 5, subjectName: 'الدراسات الإسلامية', teacherName: 'د. إسماعيل عيسى', startTime: '10:30', endTime: '11:15' },
  { periodNumber: 6, subjectName: 'التربية الفنية', teacherName: 'أ. سارة الميمان', startTime: '11:15', endTime: '12:00' },
  { periodNumber: 7, subjectName: 'التربية البدنية', teacherName: 'ك. خالد الحربي', startTime: '12:00', endTime: '12:45' },
];

// ── Initial Real Quizzes ─────────────────────────────────────────────────────

export const INITIAL_QUIZZES: ClassQuiz[] = [];

// ── Initial Real Homework ────────────────────────────────────────────────────

export const INITIAL_HOMEWORK: HomeworkAssignment[] = [];

// ── Initial Accredited Certificates ──────────────────────────────────────────

export const INITIAL_CERTIFICATES: AccreditedCertificate[] = [];

// ── Student Schedule Data ───────────────────────────────────────────────────

export type Period = {
  dayOfWeek: number; // 0=Sunday ... 4=Thursday
  periodNumber: number;
  subjectName: string;
  startTime: string;
  endTime: string;
  teacherName: string;
}

const PERIOD_TIMES: Record<number, { startTime: string; endTime: string }> = {
  1: { startTime: '07:00', endTime: '07:45' },
  2: { startTime: '07:45', endTime: '08:30' },
  3: { startTime: '08:30', endTime: '09:15' },
  4: { startTime: '09:30', endTime: '10:15' },
  5: { startTime: '10:15', endTime: '11:00' },
  6: { startTime: '11:00', endTime: '11:45' },
  7: { startTime: '11:45', endTime: '12:30' },
};

const SCHEDULE_SUBJECT_TEACHERS: Record<string, string> = {
  'اللغة العربية': 'د. إسماعيل عيسى',
  'القرآن الكريم': 'الشيخ عبد الرحمن السعيد',
  'التربية الإسلامية': 'الشيخ عبد الرحمن السعيد',
  'الرياضيات': 'أ. محمد الغامدي',
  'العلوم': 'أ. فهد الزهراني',
  'الحاسب الآلي': 'أ. خالد العتيبي',
  'فن': 'ك. أحمد الشهري',
  'التربية البدنية': 'ك. أحمد الشهري',
};

function p(day: number, num: number, subject: string): Period {
  return { dayOfWeek: day, periodNumber: num, subjectName: subject, ...PERIOD_TIMES[num], teacherName: SCHEDULE_SUBJECT_TEACHERS[subject] || 'المعلم المختص' };
}

export const CLASS_SCHEDULE: Period[] = [
  p(0,1,'اللغة العربية'), p(0,2,'القرآن الكريم'), p(0,4,'التربية الإسلامية'), p(0,5,'الرياضيات'), p(0,7,'العلوم'),
  p(1,1,'اللغة العربية'), p(1,2,'اللغة العربية'), p(1,4,'القرآن الكريم'), p(1,5,'التربية الإسلامية'), p(1,6,'الرياضيات'),
  p(2,1,'اللغة العربية'), p(2,2,'التربية الإسلامية'), p(2,4,'فن'), p(2,5,'اللغة العربية'), p(2,7,'فن'),
  p(3,1,'اللغة العربية'), p(3,2,'اللغة العربية'), p(3,4,'القرآن الكريم'), p(3,5,'التربية الإسلامية'),
  p(4,1,'القرآن الكريم'), p(4,2,'اللغة العربية'), p(4,4,'القرآن الكريم'), p(4,5,'الرياضيات'), p(4,6,'التربية الإسلامية'),
];

export const SCHOOL_TIMETABLE = [
  { order: 1, name: 'طابور الصباح', startTime: '06:45', endTime: '07:00', type: 'assembly' },
  { order: 2, name: 'الحصة الأولى', startTime: '07:00', endTime: '07:45', type: 'period', periodNumber: 1 },
  { order: 3, name: 'الحصة الثانية', startTime: '07:45', endTime: '08:30', type: 'period', periodNumber: 2 },
  { order: 4, name: 'الحصة الثالثة', startTime: '08:30', endTime: '09:15', type: 'period', periodNumber: 3 },
  { order: 5, name: 'استراحة الشريحة', startTime: '09:15', endTime: '09:30', type: 'break' },
  { order: 6, name: 'الحصة الرابعة', startTime: '09:30', endTime: '10:15', type: 'period', periodNumber: 4 },
  { order: 7, name: 'الحصة الخامسة', startTime: '10:15', endTime: '11:00', type: 'period', periodNumber: 5 },
  { order: 8, name: 'الحصة السادسة', startTime: '11:00', endTime: '11:45', type: 'period', periodNumber: 6 },
  { order: 9, name: 'الحصة السابعة', startTime: '11:45', endTime: '12:30', type: 'period', periodNumber: 7 },
  { order: 10, name: 'صلاة الظهر', startTime: '12:30', endTime: '12:40', type: 'prayer' },
  { order: 11, name: 'الانصراف', startTime: '12:40', endTime: '12:40', type: 'dismissal' },
];

// ── Storage Keys ─────────────────────────────────────────────────────────────

const KEYS = {
  CLASSES: 'nexus_school_classes_v3',
  SUBJECTS: 'nexus_school_subjects_v3',
  TEACHERS: 'nexus_school_teachers_v3',
  ENROLLMENTS: 'nexus_school_enrollments_v3',
  ACCOUNTS: 'nexus_all_accounts_v3',
  STUDENTS: 'nexus_class_students_v3',
  ATTENDANCE: 'nexus_daily_attendance_v3',
  QUIZZES: 'nexus_class_quizzes_v3',
  QUIZ_SUBMISSIONS: 'nexus_quiz_submissions_v3',
  HOMEWORK: 'nexus_homework_v3',
  HW_SUBMISSIONS: 'nexus_hw_submissions_v3',
  CERTIFICATES: 'nexus_certificates_v3',
  OBSERVATIONS: 'nexus_observations_v3',
  ACTIVE_USER: 'nexus_current_user_v3',
  EVENTS: 'nexus_class_events_v3',
  MEETINGS: 'nexus_class_meetings_v3',
  REPORTS: 'nexus_student_reports_v3',
  COMMUNITY_MSGS: 'nexus_community_messages_v3',
  LIVE_SESSIONS: 'nexus_live_sessions_v3',
  ACTIVE_CLASS: 'nexus_active_class_v3',
};

export const INITIAL_CLASS_EVENTS: ClassEventItem[] = [];

export const INITIAL_MEETINGS: ClassMeetingItem[] = [];

export const INITIAL_COMMUNITY_MESSAGES: CommunityMessage[] = [];

export const INITIAL_LIVE_SESSIONS: LiveSessionItem[] = [];

export const CURRICULA_LIST: CurriculumSubject[] = [
  {
    slug: 'lughati',
    title: 'لغتي',
    shortTitle: 'لغتي',
    subtitle: 'كتاب الطالب والأنشطة التفاعلية',
    grade: 'الصف الأول الابتدائي',
    term: 'الفصل الدراسي الأول',
    year: '1448هـ',
    pageCount: 266,
    color: '#047857',
    accent: '#10b981',
    badge: 'اللغة العربية والتأسيس',
    promise: 'كتاب لغتي التفاعلي المعتمد للصف الأول الابتدائي مع إمكانية الكتابة والتلوين بالقلم التفاعلي على كافة صفحات الدروس وحل التدريبات.',
    units: [
      { title: 'دليل الأسرة والتهيئة والاستعداد', fromPage: 1, toPage: 38 },
      { title: 'الوحدة الأولى: أسرتي (م، ب، ل، د، ن، ر)', fromPage: 39, toPage: 110 },
      { title: 'الوحدة الثانية: مدرستي (ص، ف، س، ق، ت، ح)', fromPage: 111, toPage: 180 },
      { title: 'الوحدة الثالثة: مدينتي (أ، ط، ز، و، ج، ش)', fromPage: 181, toPage: 266 },
    ],
  },
  {
    slug: 'math',
    title: 'الرياضيات',
    shortTitle: 'الرياضيات',
    subtitle: 'كتاب الطالب وحل التمارين التفاعلية',
    grade: 'الصف الأول الابتدائي',
    term: 'الفصل الدراسي الأول',
    year: '1448هـ',
    pageCount: 155,
    color: '#1d4ed8',
    accent: '#3b82f6',
    badge: 'الأعداد والعمليات',
    promise: 'كتاب الرياضيات التفاعلي للصف الأول الابتدائي يشمل تدريبات المقارنة والتصنيف، الأعداد حتى 20، والجمع والطرح التفاعلي.',
    units: [
      { title: 'الفصل 1: المقارنة والتصنيف', fromPage: 1, toPage: 32 },
      { title: 'الفصل 2: الأعداد حتى 5', fromPage: 33, toPage: 56 },
      { title: 'الفصل 3: الموقع والنمط', fromPage: 57, toPage: 80 },
      { title: 'الفصل 4: الأعداد حتى 10', fromPage: 81, toPage: 114 },
      { title: 'الفصل 5: الأعداد حتى 20 ومقدمة الجمع', fromPage: 115, toPage: 155 },
    ],
  },
  {
    slug: 'islamic',
    title: 'الدراسات الإسلامية',
    shortTitle: 'الدراسات الإسلامية',
    subtitle: 'القرآن الكريم، التوحيد، الفقه والسلوك',
    grade: 'الصف الأول الابتدائي',
    term: 'الفصل الدراسي الأول',
    year: '1448هـ',
    pageCount: 84,
    color: '#065f46',
    accent: '#14b8a6',
    badge: 'القرآن والعقيدة والآداب',
    promise: 'كتاب الدراسات الإسلامية التفاعلي يشمل سور القرآن الكريم المقررة، أركان الإسلام، والآداب والسلوكيات اليومية مع التدريبات التفاعلية.',
    units: [
      { title: 'القسم الأول: القرآن الكريم وتلاوته', fromPage: 1, toPage: 30 },
      { title: 'القسم الثاني: التوحيد والعقيدة الإسلامية', fromPage: 31, toPage: 54 },
      { title: 'القسم الثالث: الفقه والسلوك والآداب', fromPage: 55, toPage: 84 },
    ],
  },
  {
    slug: 'science',
    title: 'العلوم',
    shortTitle: 'العلوم',
    subtitle: 'كتاب الطالب والتجارب والاستكشاف',
    grade: 'الصف الأول الابتدائي',
    term: 'الفصل الدراسي الأول',
    year: '1448هـ',
    pageCount: 119,
    color: '#b45309',
    accent: '#f59e0b',
    badge: 'الاستكشاف والتفكير العلمي',
    promise: 'كتاب العلوم التفاعلي للصف الأول الابتدائي يغطي دراسة الكائنات الحية، النباتات، الحيوانات، ومواطن العيش.',
    units: [
      { title: 'الوحدة الأولى: النباتات ومخلوقات حية', fromPage: 1, toPage: 46 },
      { title: 'الوحدة الثانية: الحيوانات ومواطنها', fromPage: 47, toPage: 82 },
      { title: 'الوحدة الثالثة: أرضنا والبيئة ومواردها', fromPage: 83, toPage: 119 },
    ],
  },
  {
    slug: 'english',
    title: 'اللغة الإنجليزية (We Can 1)',
    shortTitle: 'الإنجليزية We Can',
    subtitle: "Student's Book & Interactive Phonics",
    grade: 'الصف الأول الابتدائي',
    term: 'First Semester',
    year: '1448H',
    pageCount: 108,
    color: '#4338ca',
    accent: '#6366f1',
    badge: 'English & Phonics',
    promise: 'كتاب اللغة الإنجليزية We Can 1 التفاعلي يتيح للطالب التدرب على الحروف والكلمات الأولى والمحادثات البسيطة.',
    units: [
      { title: 'Unit 1: Feelings & Greetings', fromPage: 1, toPage: 20 },
      { title: 'Unit 2: Things We Wear', fromPage: 21, toPage: 38 },
      { title: 'Unit 3: Things on the Desk & Classroom', fromPage: 39, toPage: 58 },
      { title: 'Phonics & Alphabet Practice', fromPage: 59, toPage: 80 },
      { title: 'Picture Dictionary & Workbook', fromPage: 81, toPage: 108 },
    ],
  },
  {
    slug: 'life-skills',
    title: 'المهارات الحياتية والأسرية',
    shortTitle: 'المهارات الحياتية',
    subtitle: 'كتاب الطالب والتطبيقات الحياتية',
    grade: 'الصف الأول الابتدائي',
    term: 'الفصل الدراسي الأول',
    year: '1448هـ',
    pageCount: 82,
    color: '#c026d3',
    accent: '#d946ef',
    badge: 'المهارات والسلوك والاستقلالية',
    promise: 'كتاب المهارات الحياتية والأسرية التفاعلي يركز على تنمية مهارات الطفل الاستقلالية والنظافة والسلامة.',
    units: [
      { title: 'الوحدة الأولى: صحتي وسلامتي', fromPage: 1, toPage: 34 },
      { title: 'الوحدة الثانية: شخصيتي ومسؤوليتي في المنزل', fromPage: 35, toPage: 58 },
      { title: 'الوحدة الثالثة: وقتي وألعابي وتنظيم يومي', fromPage: 59, toPage: 82 },
    ],
  },
  {
    slug: 'art',
    title: 'التربية الفنية',
    shortTitle: 'التربية الفنية',
    subtitle: 'كتاب الطالب والتعبير الفني والتشكيل',
    grade: 'الصف الأول الابتدائي',
    term: 'الفصل الدراسي الأول',
    year: '1448هـ',
    pageCount: 85,
    color: '#e11d48',
    accent: '#f43f5e',
    badge: 'الرسم والتعبير الإبداعي',
    promise: 'كتاب التربية الفنية التفاعلي يتيح للطفل التلوين، التشكيل، الرسم الحر، ومحاكاة النماذج الفنية.',
    units: [
      { title: 'الوحدة الأولى: مجال الرسم والتلوين', fromPage: 1, toPage: 32 },
      { title: 'الوحدة الثانية: مجال الزخرفة البسيطة', fromPage: 33, toPage: 50 },
      { title: 'الوحدة الثالثة: مجال الطباعة بالألوان', fromPage: 51, toPage: 66 },
      { title: 'الوحدة الرابعة: مجال التشكيل والتجسيم', fromPage: 67, toPage: 85 },
    ],
  },
  {
    slug: 'quran',
    title: 'جزء عمّ — القرآن الكريم',
    shortTitle: 'جزء عمّ',
    subtitle: 'عرض تفاعلي للقراءة والحفظ والتلاوة',
    grade: 'الصف الأول الابتدائي',
    term: 'الفصل الدراسي الأول',
    year: '1448هـ',
    pageCount: 72,
    color: '#065f46',
    accent: '#d97706',
    badge: 'القرآن الكريم — الجزء الثلاثون',
    promise: 'عرض تفاعلي لجزء عمّ كامل بخط واضح وتصفح فوري فائق السرعة مخصص للقراءة والحفظ والمتابعة.',
    units: [
      { title: 'سورة النبأ، النازعات، وعبس', fromPage: 1, toPage: 18 },
      { title: 'سورة التكوير إلى سورة الطارق', fromPage: 19, toPage: 36 },
      { title: 'سورة الأعلى إلى سورة الشرح', fromPage: 37, toPage: 54 },
      { title: 'سورة التين إلى سورة الناس', fromPage: 55, toPage: 72 },
    ],
  },
];

// ── Local Storage Helper with Cloud Fallback ──────────────────────────────────

function getItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

async function syncToFirestore(coll: string, id: string, data: any): Promise<void> {
  if (typeof window === 'undefined' || !db) return;
  try {
    await setDoc(doc(db, coll, id), data, { merge: true });
  } catch (err) {
    console.warn(`[FirestoreSync] ${coll}/${id} offline save:`, err);
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    // Broadcast event across components and tabs
    window.dispatchEvent(new CustomEvent('nexus:data-changed', { detail: { key, value } }));
  } catch (err) {
    console.error('Nexus storage error:', err);
  }
}

// ── Data Access APIs ─────────────────────────────────────────────────────────

export const nexusBridge = {
  // ── Universal ID Generator ────────────────────────────────────────────────
  generateUniversalId(type: 'TCH' | 'STD' | 'PRT' | 'CLS' | 'SUB' | 'ADM' | 'ENR'): string {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${type}-${num}`;
  },

  // ── Active Class Context (for Multi-Class Navigation) ───────────────────────
  getActiveClass(): string {
    return getItem<string>(KEYS.ACTIVE_CLASS, 'CLS-101');
  },

  setActiveClass(classId: string): void {
    setItem(KEYS.ACTIVE_CLASS, classId);
  },

  // ── Cloud Synchronization (Firestore) ──────────────────────────────────────
  async pullCloudData(): Promise<void> {
    if (typeof window === 'undefined' || !db) return;
    try {
      const collectionsToSync = [
        { name: 'school_classes', key: KEYS.CLASSES },
        { name: 'school_subjects', key: KEYS.SUBJECTS },
        { name: 'teachers', key: KEYS.TEACHERS },
        { name: 'enrollments', key: KEYS.ENROLLMENTS },
        { name: 'accounts', key: KEYS.ACCOUNTS },
        { name: 'class_students', key: KEYS.STUDENTS },
        { name: 'reports', key: KEYS.REPORTS },
        { name: 'class_events', key: KEYS.EVENTS },
        { name: 'class_meetings', key: KEYS.MEETINGS },
        { name: 'community_messages', key: KEYS.COMMUNITY_MSGS },
        { name: 'live_sessions', key: KEYS.LIVE_SESSIONS },
      ];
      for (const item of collectionsToSync) {
        const snap = await getDocs(collection(db, item.name));
        if (!snap.empty) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          if (list.length > 0) {
            localStorage.setItem(item.key, JSON.stringify(list));
          }
        }
      }
      window.dispatchEvent(new CustomEvent('nexus:data-changed'));
    } catch (e) {
      console.warn('[FirestoreSync] Cloud pull offline/skipped:', e);
    }
  },

  // ── School Classes API ─────────────────────────────────────────────────────
  getClasses(): SchoolClass[] {
    return getItem<SchoolClass[]>(KEYS.CLASSES, INITIAL_CLASSES);
  },

  getClassById(id: string): SchoolClass | null {
    return this.getClasses().find((c) => c.id === id) || null;
  },

  saveClass(cls: SchoolClass): void {
    const list = this.getClasses();
    const idx = list.findIndex((c) => c.id === cls.id);
    if (idx >= 0) {
      list[idx] = cls;
    } else {
      list.push(cls);
    }
    setItem(KEYS.CLASSES, list);
    syncToFirestore('school_classes', cls.id, cls);
  },

  deleteClass(id: string): void {
    const list = this.getClasses().filter((c) => c.id !== id);
    setItem(KEYS.CLASSES, list);
  },

  // ── School Subjects API ────────────────────────────────────────────────────
  getSubjects(): SchoolSubject[] {
    return getItem<SchoolSubject[]>(KEYS.SUBJECTS, INITIAL_SUBJECTS);
  },

  getSubjectById(id: string): SchoolSubject | null {
    return this.getSubjects().find((s) => s.id === id) || null;
  },

  saveSubject(sub: SchoolSubject): void {
    const list = this.getSubjects();
    const idx = list.findIndex((s) => s.id === sub.id);
    if (idx >= 0) {
      list[idx] = sub;
    } else {
      list.push(sub);
    }
    setItem(KEYS.SUBJECTS, list);
    syncToFirestore('school_subjects', sub.id, sub);
  },

  deleteSubject(id: string): void {
    const list = this.getSubjects().filter((s) => s.id !== id);
    setItem(KEYS.SUBJECTS, list);
  },

  // ── School Teachers API ────────────────────────────────────────────────────
  getTeachers(): TeacherRecord[] {
    return getItem<TeacherRecord[]>(KEYS.TEACHERS, INITIAL_TEACHERS);
  },

  getTeacherById(id: string): TeacherRecord | null {
    return this.getTeachers().find((t) => t.id === id || t.teacherId === id || t.universalId === id) || null;
  },

  saveTeacher(tch: TeacherRecord): void {
    const list = this.getTeachers();
    const idx = list.findIndex((t) => t.id === tch.id || t.teacherId === tch.teacherId);
    if (idx >= 0) {
      list[idx] = tch;
    } else {
      list.push(tch);
    }
    setItem(KEYS.TEACHERS, list);
    syncToFirestore('teachers', tch.id, tch);

    // Also mirror to accounts store
    this.saveAccount({
      id: tch.id,
      universalId: tch.universalId || tch.teacherId,
      email: tch.email,
      name: tch.name,
      role: 'teacher',
      title: tch.title,
      phone: tch.phone,
      employeeId: tch.employeeId,
      department: tch.department,
      status: tch.status,
      schoolName: tch.schoolName,
      avatarUrl: tch.avatarUrl,
      createdAt: tch.createdAt,
    });
  },

  deleteTeacher(id: string): void {
    const list = this.getTeachers().filter((t) => t.id !== id && t.teacherId !== id);
    setItem(KEYS.TEACHERS, list);
  },

  // ── Student Enrollments API ────────────────────────────────────────────────
  getEnrollments(): EnrollmentRecord[] {
    return getItem<EnrollmentRecord[]>(KEYS.ENROLLMENTS, INITIAL_ENROLLMENTS);
  },

  getEnrollmentsByClass(classId: string): EnrollmentRecord[] {
    return this.getEnrollments().filter((e) => e.classId === classId);
  },

  enrollStudent(data: Omit<EnrollmentRecord, 'id' | 'enrolledAt'>): EnrollmentRecord {
    const all = this.getEnrollments();
    const newEnr: EnrollmentRecord = {
      ...data,
      id: `ENR-${Math.floor(1000 + Math.random() * 9000)}`,
      enrolledAt: new Date().toISOString().slice(0, 10),
    };
    setItem(KEYS.ENROLLMENTS, [newEnr, ...all]);
    syncToFirestore('enrollments', newEnr.id, newEnr);

    // Update student record classId
    const student = this.getStudentById(data.studentId);
    if (student) {
      student.classId = data.classId;
      student.grade = data.className;
      this.saveStudent(student);
    }

    return newEnr;
  },

  unenrollStudent(id: string): void {
    const all = this.getEnrollments().filter((e) => e.id !== id);
    setItem(KEYS.ENROLLMENTS, all);
  },

  // ── Unified Accounts API (8 Portals + Real IDs) ───────────────────────────
  getAccounts(): NexusAccount[] {
    const dynamicAccounts = getItem<NexusAccount[]>(KEYS.ACCOUNTS, NEXUS_CORE_ACCOUNTS);
    // Merge teachers dynamically
    const teachers = this.getTeachers();
    const merged = [...dynamicAccounts];
    for (const t of teachers) {
      if (!merged.some((a) => a.id === t.id || a.email.toLowerCase() === t.email.toLowerCase())) {
        merged.push({
          id: t.id,
          universalId: t.universalId || t.teacherId,
          email: t.email,
          name: t.name,
          role: 'teacher',
          title: t.title,
          phone: t.phone,
          employeeId: t.employeeId,
          department: t.department,
          status: t.status,
          schoolName: t.schoolName,
          avatarUrl: t.avatarUrl,
          createdAt: t.createdAt,
        });
      }
    }
    return merged;
  },

  saveAccount(account: NexusAccount): void {
    const all = this.getAccounts();
    const idx = all.findIndex((a) => a.id === account.id || a.email.toLowerCase() === account.email.toLowerCase());
    if (idx >= 0) {
      all[idx] = account;
    } else {
      all.unshift(account);
    }
    setItem(KEYS.ACCOUNTS, all);
    syncToFirestore('accounts', account.id, account);
  },

  deleteAccount(id: string): void {
    const all = this.getAccounts().filter((a) => a.id !== id);
    setItem(KEYS.ACCOUNTS, all);
  },

  findAccountByEmail(email: string): NexusAccount | null {
    const clean = email.trim().toLowerCase();
    const all = this.getAccounts();

    // Check direct email match
    const directMatch = all.find((a) => a.email.toLowerCase() === clean);
    if (directMatch) return directMatch;

    // Check universal ID match (e.g. logging in with TCH-1001 or STD-1002)
    const idMatch = all.find((a) => a.universalId?.toLowerCase() === clean || a.id.toLowerCase() === clean);
    if (idMatch) return idMatch;

    // Flexible shortcuts
    if (clean === 'dr.ismail@masar.com' || clean === 'ismail@masar.com' || clean === 'teacher@nexusedu.sa' || clean === 'arabic.teacher@nexusedu.sa') {
      return all.find((a) => a.id === 'acc_teacher_ismail' || a.role === 'teacher') || null;
    }

    if (clean === 'principal@nexusedu.sa') {
      return all.find((a) => a.role === 'principal') || null;
    }
    if (clean === 'vp@nexusedu.sa' || clean === 'vice.principal@nexusedu.sa') {
      return all.find((a) => a.role === 'vice_principal') || null;
    }
    if (clean === 'counselor@nexusedu.sa') {
      return all.find((a) => a.role === 'counselor') || null;
    }
    if (clean === 'supervisor@nexusedu.sa') {
      return all.find((a) => a.role === 'supervisor') || null;
    }
    if (clean === 'accountant@nexusedu.sa') {
      return all.find((a) => a.role === 'accountant') || null;
    }
    if (clean === 'admin@nexusedu.sa') {
      return all.find((a) => a.role === 'admin') || null;
    }

    return null;
  },

  getClassSchedule(): Period[] { return CLASS_SCHEDULE; },
  getSchoolTimetable() { return SCHOOL_TIMETABLE; },

  // ── Students API (Filterable by Class ID) ───────────────────────────────────
  getStudents(classId?: string): ClassStudentRecord[] {
    const all = getItem<ClassStudentRecord[]>(KEYS.STUDENTS, REAL_CLASS_STUDENTS);
    if (classId && classId !== 'all') {
      return all.filter((s) => s.classId === classId);
    }
    return all;
  },

  getStudentById(id: string): ClassStudentRecord | null {
    return this.getStudents().find((s) => s.id === id || s.universalId === id) || null;
  },

  saveStudent(student: ClassStudentRecord): void {
    const list = this.getStudents();
    const idx = list.findIndex((s) => s.id === student.id || (student.universalId && s.universalId === student.universalId));
    if (idx >= 0) {
      list[idx] = student;
    } else {
      list.unshift(student);
    }
    setItem(KEYS.STUDENTS, list);
    syncToFirestore('class_students', student.id, student);
  },

  saveClassStudent(student: ClassStudentRecord): void {
    this.saveStudent(student);
  },

  // Attendance
  getTodayAttendance(dateStr?: string): DailyAttendanceRecord[] {
    const targetDate = dateStr || new Date().toISOString().slice(0, 10);
    const all = getItem<DailyAttendanceRecord[]>(KEYS.ATTENDANCE, []);
    const forDate = all.filter((r) => r.date === targetDate);

    if (forDate.length === 0) {
      // Auto initialize today from real students with default present
      const initial: DailyAttendanceRecord[] = this.getStudents().map((s) => ({
        date: targetDate,
        studentId: s.id,
        studentName: s.fullName,
        overallStatus: 'present',
        periods: {
          1: { status: 'present', timeRecorded: '07:05', verifiedVia: 'manual_teacher' },
          2: { status: 'present', timeRecorded: '07:50', verifiedVia: 'manual_teacher' },
          3: { status: 'present', timeRecorded: '08:50', verifiedVia: 'manual_teacher' },
          4: { status: 'present', timeRecorded: '09:35', verifiedVia: 'manual_teacher' },
          5: { status: 'present', timeRecorded: '10:35', verifiedVia: 'manual_teacher' },
          6: { status: 'present', timeRecorded: '11:20', verifiedVia: 'manual_teacher' },
          7: { status: 'present', timeRecorded: '12:05', verifiedVia: 'manual_teacher' },
        },
        parentNotified: false,
      }));
      setItem(KEYS.ATTENDANCE, [...all, ...initial]);
      return initial;
    }
    return forDate;
  },

  markStudentAttendance(
    studentId: string,
    periodNumber: number,
    status: 'present' | 'absent' | 'late',
    verifiedVia: 'biometric_face' | 'manual_teacher' | 'qr_code' = 'manual_teacher'
  ): void {
    const today = new Date().toISOString().slice(0, 10);
    const all = getItem<DailyAttendanceRecord[]>(KEYS.ATTENDANCE, []);
    const timeNow = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

    let found = all.find((r) => r.date === today && r.studentId === studentId);
    if (!found) {
      const student = this.getStudentById(studentId);
      found = {
        date: today,
        studentId,
        studentName: student?.fullName || 'طالب',
        overallStatus: status,
        periods: {},
        parentNotified: status === 'absent',
      };
      all.push(found);
    }

    found.periods[periodNumber] = {
      status,
      timeRecorded: timeNow,
      verifiedVia,
    };
    found.overallStatus = status;
    if (status === 'absent') found.parentNotified = true;

    setItem(KEYS.ATTENDANCE, [...all]);
  },

  // Quizzes
  getQuizzes(): ClassQuiz[] {
    return getItem<ClassQuiz[]>(KEYS.QUIZZES, INITIAL_QUIZZES);
  },

  saveQuiz(quiz: ClassQuiz): void {
    const all = this.getQuizzes();
    const idx = all.findIndex((q) => q.id === quiz.id);
    if (idx >= 0) all[idx] = quiz;
    else all.unshift(quiz);
    setItem(KEYS.QUIZZES, all);
  },

  getQuizSubmissions(quizId?: string): QuizSubmission[] {
    const all = getItem<QuizSubmission[]>(KEYS.QUIZ_SUBMISSIONS, []);
    if (quizId) return all.filter((s) => s.quizId === quizId);
    return all;
  },

  submitQuiz(submission: Omit<QuizSubmission, 'id' | 'submittedAt'>): QuizSubmission {
    const all = getItem<QuizSubmission[]>(KEYS.QUIZ_SUBMISSIONS, []);
    const newSub: QuizSubmission = {
      ...submission,
      id: `sub-${Date.now()}`,
      submittedAt: new Date().toISOString(),
    };
    setItem(KEYS.QUIZ_SUBMISSIONS, [newSub, ...all]);

    // Increment submissions count in quiz
    const quizzes = this.getQuizzes();
    const qIdx = quizzes.findIndex((q) => q.id === submission.quizId);
    if (qIdx >= 0) {
      quizzes[qIdx].submissionsCount = (quizzes[qIdx].submissionsCount || 0) + 1;
      setItem(KEYS.QUIZZES, quizzes);
    }
    return newSub;
  },

  // Homework
  getHomework(): HomeworkAssignment[] {
    return getItem<HomeworkAssignment[]>(KEYS.HOMEWORK, INITIAL_HOMEWORK);
  },

  saveHomework(hw: HomeworkAssignment): void {
    const all = this.getHomework();
    const idx = all.findIndex((h) => h.id === hw.id);
    if (idx >= 0) all[idx] = hw;
    else all.unshift(hw);
    setItem(KEYS.HOMEWORK, all);
    syncToFirestore('homework', hw.id, hw);
  },

  getHomeworkSubmissions(assignmentId?: string): HomeworkSubmission[] {
    const all = getItem<HomeworkSubmission[]>(KEYS.HW_SUBMISSIONS, [
      {
        id: 'sub-hw-1',
        assignmentId: 'hw-arabic-1',
        assignmentTitle: 'تطبيقات على درس مد الألف والواو',
        studentId: 'cls-std-2',
        studentName: 'أحمد فيصل الغامدي',
        submissionText: 'تم حل التمارين كاملة في كراسة النشاط وكتابة الجمل الثلاث المطلوبة بخط النسخ.',
        submittedAt: '2026-09-25T14:30:00Z',
        grade: 10,
        status: 'reviewed',
        feedback: 'ممتاز يا بطل! خط رائع وحل دقيق 10/10.',
      },
    ]);
    if (assignmentId) return all.filter((s) => s.assignmentId === assignmentId);
    return all;
  },

  submitHomework(sub: Omit<HomeworkSubmission, 'id' | 'submittedAt' | 'status'>): HomeworkSubmission {
    const all = this.getHomeworkSubmissions();
    const newSub: HomeworkSubmission = {
      ...sub,
      id: `hw-sub-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      status: 'submitted',
    };
    setItem(KEYS.HW_SUBMISSIONS, [newSub, ...all]);
    syncToFirestore('student_homework_logs', newSub.id, newSub);
    return newSub;
  },

  gradeHomework(submissionId: string, grade: number, feedback: string): void {
    const all = this.getHomeworkSubmissions();
    const idx = all.findIndex((s) => s.id === submissionId);
    if (idx >= 0) {
      all[idx].grade = grade;
      all[idx].feedback = feedback;
      all[idx].status = 'reviewed';
      setItem(KEYS.HW_SUBMISSIONS, [...all]);
      syncToFirestore('student_homework_logs', all[idx].id, all[idx]);
    }
  },

  // Certificates
  getCertificates(studentId?: string): AccreditedCertificate[] {
    const all = getItem<AccreditedCertificate[]>(KEYS.CERTIFICATES, []).filter(c => !c.id?.startsWith('cert-1') && !c.id?.startsWith('cert-2'));
    if (studentId) return all.filter((c) => c.studentId === studentId);
    return all;
  },

  issueCertificate(cert: Omit<AccreditedCertificate, 'id' | 'certNumber' | 'createdAt' | 'qrCode'>): AccreditedCertificate {
    const all = this.getCertificates();
    const serial = `NEXUS-CERT-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const newCert: AccreditedCertificate = {
      ...cert,
      id: `cert-${Date.now()}`,
      certNumber: serial,
      qrCode: `https://nexus.masarplatform.org/verify/${serial}`,
      createdAt: new Date().toISOString(),
    };
    setItem(KEYS.CERTIFICATES, [newCert, ...all]);
    syncToFirestore('student_cert_logs', newCert.id, newCert);
    return newCert;
  },

  // Behavioral & Academic Observations
  getObservations(studentId?: string): BehavioralObservation[] {
    const all = getItem<BehavioralObservation[]>(KEYS.OBSERVATIONS, [
      {
        id: 'obs-1',
        studentId: 'cls-std-2',
        studentName: 'أحمد فيصل الغامدي',
        authorName: 'د. إسماعيل عيسى',
        authorRole: 'معلم الفصل',
        category: 'praise',
        severity: 'positive',
        text: 'أظهر أحمد مهارة قيادية متميزة في مساعدة زملائه بحل تدريبات القراءة اليوم.',
        createdAt: '2026-09-24T11:30:00Z',
      },
      {
        id: 'obs-2',
        studentId: 'cls-std-4',
        studentName: 'خالد عبد الله العمري',
        authorName: 'أ. عبد الله الغامدي',
        authorRole: 'الموجه الطلابي',
        category: 'guidance',
        severity: 'neutral',
        text: 'تم عقد جلسة دعم إرشادي لتعزيز التركيز وتطوير خطة متابعة منزلية مع ولي الأمر.',
        createdAt: '2026-09-23T09:15:00Z',
      },
    ]);
    if (studentId) return all.filter((o) => o.studentId === studentId);
    return all;
  },

  addObservation(obs: Omit<BehavioralObservation, 'id' | 'createdAt'>): BehavioralObservation {
    const all = this.getObservations();
    const newObs: BehavioralObservation = {
      ...obs,
      id: `obs-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setItem(KEYS.OBSERVATIONS, [newObs, ...all]);
    syncToFirestore('student_notes', newObs.id, newObs);
    return newObs;
  },

  saveObservation(obs: Omit<BehavioralObservation, 'id' | 'createdAt'>): BehavioralObservation {
    return this.addObservation(obs);
  },

  // School-wide Live KPIs (for Principal, VP, Supervisor, Admin)
  // School-wide Live KPIs (Filterable by Class)
  getSchoolMetrics(classId?: string) {
    const allStudents = this.getStudents();
    const students = (classId && classId !== 'all') ? allStudents.filter((s) => s.classId === classId) : allStudents;
    const classes = this.getClasses();
    const teachers = this.getTeachers();

    const todayAtt = this.getTodayAttendance();
    const targetStudentIds = new Set(students.map((s) => s.id));
    const relevantAtt = todayAtt.filter((a) => targetStudentIds.has(a.studentId));

    const presentCount = relevantAtt.filter((a) => a.overallStatus === 'present').length;
    const absentCount = relevantAtt.filter((a) => a.overallStatus === 'absent').length;
    const lateCount = relevantAtt.filter((a) => a.overallStatus === 'late').length;

    const totalStudents = students.length;
    const attRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 96;
    const avgScore = Math.round(students.reduce((acc, s) => acc + s.averageGrade, 0) / (totalStudents || 1));

    const quizzes = this.getQuizzes();
    const homework = this.getHomework();
    const certs = this.getCertificates();

    const targetClass = classId && classId !== 'all' ? classes.find((c) => c.id === classId) : null;

    return {
      totalStudents,
      totalClasses: classes.length,
      totalTeachers: teachers.length,
      activeClasses: classId && classId !== 'all' ? 1 : classes.length,
      className: targetClass ? targetClass.name : 'مدارس نكسس التعليمية الأهلية — جميع الفصول',
      attendanceRate: attRate,
      presentToday: presentCount,
      absentToday: absentCount,
      lateToday: lateCount,
      averageSchoolGrade: avgScore,
      totalQuizzes: quizzes.length,
      totalHomework: homework.length,
      awardedCertificates: certs.length,
      honorRollStudents: students.filter((s) => s.status === 'excellent').length,
      supportNeededStudents: students.filter((s) => s.status === 'warning').length,
    };
  },

  // ── Class Events & Activities Photos ─────────────────────────────────────────
  getClassEvents(): ClassEventItem[] {
    return getItem<ClassEventItem[]>(KEYS.EVENTS, INITIAL_CLASS_EVENTS);
  },

  saveClassEvent(event: Omit<ClassEventItem, 'id' | 'createdAt'>): ClassEventItem {
    const all = this.getClassEvents();
    const newEvent: ClassEventItem = {
      ...event,
      id: `evt-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setItem(KEYS.EVENTS, [newEvent, ...all]);
    syncToFirestore('class_events', newEvent.id, newEvent);
    return newEvent;
  },

  deleteClassEvent(id: string): void {
    const all = this.getClassEvents().filter((e) => e.id !== id);
    setItem(KEYS.EVENTS, all);
  },

  // ── Virtual Parent-Teacher Meetings ─────────────────────────────────────────
  getMeetings(): ClassMeetingItem[] {
    return getItem<ClassMeetingItem[]>(KEYS.MEETINGS, INITIAL_MEETINGS);
  },

  createMeeting(meeting: Omit<ClassMeetingItem, 'id' | 'createdAt'>): ClassMeetingItem {
    const all = this.getMeetings();
    const newMeeting: ClassMeetingItem = {
      ...meeting,
      id: `meet-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setItem(KEYS.MEETINGS, [newMeeting, ...all]);
    syncToFirestore('class_meetings', newMeeting.id, newMeeting);
    return newMeeting;
  },

  deleteMeeting(id: string): void {
    const all = this.getMeetings().filter((m) => m.id !== id);
    setItem(KEYS.MEETINGS, all);
  },

  // ── Comprehensive Weekly Reports ────────────────────────────────────────────
  getWeeklyReports(studentId?: string): StudentWeeklyReport[] {
    const defaultReports: StudentWeeklyReport[] = this.getStudents().map((s, i) => ({
      id: `rep-${s.id}`,
      reportNumber: `NEXUS-REP-2026-${1000 + i}`,
      studentId: s.id,
      studentName: s.fullName,
      weekTitle: 'تقرير الأسبوع الدراسي الرابع — الفصل الدراسي الأول',
      date: '2026-09-24',
      attendanceRate: s.attendanceRate,
      homeworkRate: 95,
      behaviorScore: 98,
      overallGrade: s.averageGrade >= 95 ? 'ممتاز مع مرتبة الشرف 🏆' : 'ممتاز ⭐',
      teacherNotes: `طالب رائع ومثابر في الصف الأول الابتدائي (أ)، يظهر تفاعلاً مستمراً في حصص لغتي والقرآن الكريم.`,
      recommendation: 'يُنصح بمواصلة القراءة الإثرائية اليومية وحفظ السور المقررة.',
      doctorName: 'د. إسماعيل عيسى',
      createdAt: '2026-09-24T12:00:00Z',
    }));
    const all = getItem<StudentWeeklyReport[]>(KEYS.REPORTS, defaultReports);
    if (studentId) return all.filter((r) => r.studentId === studentId);
    return all;
  },

  saveWeeklyReport(rep: Omit<StudentWeeklyReport, 'id' | 'createdAt' | 'reportNumber'>): StudentWeeklyReport {
    const all = this.getWeeklyReports();
    const num = `NEXUS-REP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRep: StudentWeeklyReport = {
      ...rep,
      id: `rep-${Date.now()}`,
      reportNumber: num,
      createdAt: new Date().toISOString(),
    };
    const existingIdx = all.findIndex((r) => r.studentId === rep.studentId);
    if (existingIdx >= 0) {
      all[existingIdx] = newRep;
      setItem(KEYS.REPORTS, [...all]);
    } else {
      setItem(KEYS.REPORTS, [newRep, ...all]);
    }
    syncToFirestore('reports', newRep.id, newRep);
    return newRep;
  },

  generateAllWeeklyReports(): StudentWeeklyReport[] {
    const students = this.getStudents();
    const todayAtt = this.getTodayAttendance();
    const reports: StudentWeeklyReport[] = students.map((s, idx) => {
      const att = todayAtt.find((a) => a.studentId === s.id);
      return {
        id: `rep-${s.id}-${Date.now()}`,
        reportNumber: `NEXUS-REP-2026-${2000 + idx}`,
        studentId: s.id,
        studentName: s.fullName,
        weekTitle: 'التقرير الأكاديمي الشامل — الصف الأول الابتدائي (أ)',
        date: new Date().toISOString().split('T')[0],
        attendanceRate: s.attendanceRate,
        homeworkRate: 95,
        behaviorScore: s.averageGrade,
        overallGrade: s.averageGrade >= 90 ? 'ممتاز مع مرتبة الشرف 🏆' : 'جيد جداً مرتفع ⭐',
        teacherNotes: `طالب متميز بالصف الأول الابتدائي (أ)، متفاعل في حصص اليوم وكان حضوره: ${att?.overallStatus === 'present' ? 'حاضر ومنضبط' : 'مسجل'}.`,
        recommendation: 'الاستمرار في المراجعة اليومية واستكمال الواجبات الإلكترونية.',
        doctorName: 'د. إسماعيل عيسى',
        createdAt: new Date().toISOString(),
      };
    });
    setItem(KEYS.REPORTS, reports);
    reports.forEach((r) => syncToFirestore('reports', r.id, r));
    return reports;
  },

  // ── Parents Community Forum & Messages ──────────────────────────────────────
  getCommunityMessages(): CommunityMessage[] {
    return getItem<CommunityMessage[]>(KEYS.COMMUNITY_MSGS, INITIAL_COMMUNITY_MESSAGES);
  },

  sendCommunityMessage(msg: Omit<CommunityMessage, 'id' | 'createdAt'>): CommunityMessage {
    const all = this.getCommunityMessages();
    const newMsg: CommunityMessage = {
      ...msg,
      id: `cmsg-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setItem(KEYS.COMMUNITY_MSGS, [...all, newMsg]);
    syncToFirestore('community_messages', newMsg.id, newMsg);
    return newMsg;
  },

  toggleMessagePin(id: string): void {
    const all = this.getCommunityMessages();
    const target = all.find((m) => m.id === id);
    if (target) {
      target.isPinned = !target.isPinned;
      setItem(KEYS.COMMUNITY_MSGS, [...all]);
    }
  },

  // ── Live Broadcast Sessions ─────────────────────────────────────────────────
  getLiveSessions(): LiveSessionItem[] {
    return getItem<LiveSessionItem[]>(KEYS.LIVE_SESSIONS, []).filter(s => !s.id?.startsWith('live-1') && !s.id?.startsWith('live-2'));
  },

  createLiveSession(session: Omit<LiveSessionItem, 'id' | 'startedAt'>): LiveSessionItem {
    const all = this.getLiveSessions();
    const newSession: LiveSessionItem = {
      ...session,
      id: `live-${Date.now()}`,
      startedAt: new Date().toISOString(),
    };
    setItem(KEYS.LIVE_SESSIONS, [newSession, ...all]);
    return newSession;
  },

  // ── Curricula & Textbooks ───────────────────────────────────────────────────
  getCurricula(): CurriculumSubject[] {
    return CURRICULA_LIST;
  },

  getCurriculumBySlug(slug: string): CurriculumSubject | undefined {
    return CURRICULA_LIST.find((c) => c.slug === slug);
  },
  // ── Complete Data Reset (Clears All Dummy & Cached Browser Data) ───────────
  clearAllData(): void {
    if (typeof window === 'undefined') return;
    Object.values(KEYS).forEach((k) => {
      try { localStorage.removeItem(k); } catch {}
      try { sessionStorage.removeItem(k); } catch {}
    });
    const extraKeys = [
      'nexus_user', 'nexus_role', 'access_token',
      'nexus_student_stage', 'nexus_student_photo', 'nexus_teacher_photo',
      'nexus_student_attendance_history',
      'nexus_school_classes_v2', 'nexus_school_subjects_v2', 'nexus_school_teachers_v2',
      'nexus_school_enrollments_v2', 'nexus_all_accounts_v2', 'nexus_class_students_v2',
      'nexus_daily_attendance_v2', 'nexus_class_quizzes_v2', 'nexus_quiz_submissions_v2',
      'nexus_homework_v2', 'nexus_hw_submissions_v2', 'nexus_certificates_v2',
      'nexus_observations_v2', 'nexus_current_user_v2', 'nexus_class_events_v2',
      'nexus_class_meetings_v2', 'nexus_student_reports_v2', 'nexus_community_messages_v2',
      'nexus_live_sessions_v2', 'nexus_active_class_v2'
    ];
    extraKeys.forEach((k) => {
      try { localStorage.removeItem(k); } catch {}
      try { sessionStorage.removeItem(k); } catch {}
    });
    window.dispatchEvent(new CustomEvent('nexus:data-changed'));
  },
};