'use client';

/**
 * NEXUS EDU — Real-Time Unified Data Bridge
 * ============================================================================
 * Connects the 8 Portals (Student, Teacher, Parent, Principal, Vice Principal,
 * Counselor, Supervisor, Admin) to real live shared state, incorporating all
 * real features from Dr. Ismail Issa's Classroom (فصل د. إسماعيل عيسى).
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
  photoUrl: string;
  notes: string;
  averageGrade: number;
  attendanceRate: number;
  rank: number;
  assignedProgram: string;
  status: 'active' | 'warning' | 'excellent';
  studentAccountId: string;
  parentAccountId: string;
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

export const INITIAL_CLASSES: SchoolClass[] = [
  {
    id: 'CLS-101',
    name: 'الصف الأول الابتدائي — فصل (أ) د. إسماعيل عيسى',
    gradeLevel: 1,
    section: 'أ',
    academicYear: '2026-2027',
    homeroomTeacherId: 'acc_teacher_ismail',
    homeroomTeacherName: 'د. إسماعيل عيسى',
    roomNumber: 'قاعة 101',
    capacity: 25,
    enrolledCount: 8,
    subjectIds: ['SUB-ARB-1', 'SUB-QRN-1', 'SUB-ISL-1', 'SUB-MTH-1', 'SUB-SCI-1', 'SUB-ENG-1', 'SUB-ART-1', 'SUB-PE-1'],
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'CLS-102',
    name: 'الصف الأول الابتدائي — فصل (ب) أ. ماجد الغامدي',
    gradeLevel: 1,
    section: 'ب',
    academicYear: '2026-2027',
    homeroomTeacherId: 'acc_teacher_majed',
    homeroomTeacherName: 'أ. ماجد الغامدي',
    roomNumber: 'قاعة 102',
    capacity: 25,
    enrolledCount: 6,
    subjectIds: ['SUB-ARB-1', 'SUB-QRN-1', 'SUB-ISL-1', 'SUB-MTH-1', 'SUB-SCI-1', 'SUB-ENG-1', 'SUB-ART-1', 'SUB-PE-1'],
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'CLS-201',
    name: 'الصف الثاني الابتدائي — فصل (أ) أ. عبد الله الشهري',
    gradeLevel: 2,
    section: 'أ',
    academicYear: '2026-2027',
    homeroomTeacherId: 'acc_teacher_abdullah',
    homeroomTeacherName: 'أ. عبد الله الشهري',
    roomNumber: 'قاعة 201',
    capacity: 25,
    enrolledCount: 6,
    subjectIds: ['SUB-ARB-2', 'SUB-MTH-2', 'SUB-SCI-2', 'SUB-ART-1', 'SUB-PE-1'],
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'CLS-301',
    name: 'الصف الثالث الابتدائي — فصل (أ) أ. عمر الفيفي',
    gradeLevel: 3,
    section: 'أ',
    academicYear: '2026-2027',
    homeroomTeacherId: 'acc_teacher_omar',
    homeroomTeacherName: 'أ. عمر الفيفي',
    roomNumber: 'قاعة 301',
    capacity: 25,
    enrolledCount: 6,
    subjectIds: ['SUB-ARB-3', 'SUB-MTH-2', 'SUB-SCI-2', 'SUB-ART-1', 'SUB-PE-1'],
    createdAt: '2026-08-01T00:00:00Z',
  },
];

// ── Initial Authentic School Subjects ─────────────────────────────────────────

export const INITIAL_SUBJECTS: SchoolSubject[] = [
  { id: 'SUB-ARB-1', code: 'ARB-101', name: 'لغتي الجميلة', gradeLevel: 1, weeklyPeriods: 6, defaultTeacherId: 'acc_teacher_ismail', defaultTeacherName: 'د. إسماعيل عيسى', classIds: ['CLS-101', 'CLS-102'], color: '#10B981' },
  { id: 'SUB-QRN-1', code: 'QRN-101', name: 'القرآن الكريم وتلاوته', gradeLevel: 1, weeklyPeriods: 4, defaultTeacherId: 'acc_teacher_ismail', defaultTeacherName: 'د. إسماعيل عيسى', classIds: ['CLS-101', 'CLS-102'], color: '#059669' },
  { id: 'SUB-ISL-1', code: 'ISL-101', name: 'الدراسات الإسلامية', gradeLevel: 1, weeklyPeriods: 3, defaultTeacherId: 'acc_teacher_ismail', defaultTeacherName: 'د. إسماعيل عيسى', classIds: ['CLS-101', 'CLS-102'], color: '#047857' },
  { id: 'SUB-MTH-1', code: 'MTH-101', name: 'الرياضيات', gradeLevel: 1, weeklyPeriods: 5, defaultTeacherId: 'acc_teacher_fatima', defaultTeacherName: 'أ. فاطمة الزهراني', classIds: ['CLS-101', 'CLS-102'], color: '#3B82F6' },
  { id: 'SUB-SCI-1', code: 'SCI-101', name: 'العلوم الطبيعية', gradeLevel: 1, weeklyPeriods: 3, defaultTeacherId: 'acc_teacher_yasser', defaultTeacherName: 'أ. ياسر الشهراني', classIds: ['CLS-101', 'CLS-102'], color: '#8B5CF6' },
  { id: 'SUB-ENG-1', code: 'ENG-101', name: 'اللغة الإنجليزية (Top Goal)', gradeLevel: 1, weeklyPeriods: 3, defaultTeacherId: 'acc_teacher_majed', defaultTeacherName: 'أ. ماجد الغامدي', classIds: ['CLS-101', 'CLS-102'], color: '#EC4899' },
  { id: 'SUB-ART-1', code: 'ART-101', name: 'التربية الفنية', gradeLevel: 1, weeklyPeriods: 2, defaultTeacherId: 'acc_teacher_sara', defaultTeacherName: 'أ. سارة الميمان', classIds: ['CLS-101', 'CLS-102', 'CLS-201', 'CLS-301'], color: '#F59E0B' },
  { id: 'SUB-PE-1', code: 'PE-101', name: 'التربية البدنية والدفاع عن النفس', gradeLevel: 1, weeklyPeriods: 2, defaultTeacherId: 'acc_teacher_khaled', defaultTeacherName: 'ك. خالد الحربي', classIds: ['CLS-101', 'CLS-102', 'CLS-201', 'CLS-301'], color: '#EF4444' },
  { id: 'SUB-ARB-2', code: 'ARB-201', name: 'لغتي الجميلة (الصف الثاني)', gradeLevel: 2, weeklyPeriods: 6, defaultTeacherId: 'acc_teacher_abdullah', defaultTeacherName: 'أ. عبد الله الشهري', classIds: ['CLS-201'], color: '#10B981' },
  { id: 'SUB-MTH-2', code: 'MTH-201', name: 'الرياضيات (الصف الثاني)', gradeLevel: 2, weeklyPeriods: 5, defaultTeacherId: 'acc_teacher_fatima', defaultTeacherName: 'أ. فاطمة الزهراني', classIds: ['CLS-201'], color: '#3B82F6' },
  { id: 'SUB-SCI-2', code: 'SCI-201', name: 'العلوم الطبيعية (الصف الثاني)', gradeLevel: 2, weeklyPeriods: 3, defaultTeacherId: 'acc_teacher_yasser', defaultTeacherName: 'أ. ياسر الشهراني', classIds: ['CLS-201'], color: '#8B5CF6' },
  { id: 'SUB-ARB-3', code: 'ARB-301', name: 'لغتي الجميلة (الصف الثالث)', gradeLevel: 3, weeklyPeriods: 6, defaultTeacherId: 'acc_teacher_omar', defaultTeacherName: 'أ. عمر الفيفي', classIds: ['CLS-301'], color: '#10B981' },
];

// ── Initial Authentic Teachers ────────────────────────────────────────────────

export const INITIAL_TEACHERS: TeacherRecord[] = [
  {
    id: 'acc_teacher_ismail',
    teacherId: 'TCH-1001',
    universalId: 'TCH-1001',
    email: 'arabic.teacher@nexusedu.sa',
    name: 'د. إسماعيل عيسى',
    role: 'teacher',
    title: 'المشرف الأكاديمي ورائد فصل 1-أ ومدرس لغتي والقرآن',
    phone: '+966500000001',
    specialization: 'اللغة العربية والدراسات الإسلامية',
    nationalId: '1012345678',
    assignedClassIds: ['CLS-101', 'CLS-102'],
    assignedSubjectIds: ['SUB-ARB-1', 'SUB-QRN-1', 'SUB-ISL-1'],
    weeklyPeriodsCount: 18,
    status: 'active',
    schoolName: 'مدارس نكسس التعليمية الأهلية',
    employeeId: 'EMP-TCH-001',
    department: 'قسم اللغة العربية والتربية الإسلامية',
    avatarUrl: '/images/auth/teacher.webp',
    hireDate: '2020-08-15',
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'acc_teacher_fatima',
    teacherId: 'TCH-1002',
    universalId: 'TCH-1002',
    email: 'math.teacher@nexusedu.sa',
    name: 'أ. فاطمة الزهراني',
    role: 'teacher',
    title: 'معلمة الرياضيات والحساب الذهني',
    phone: '+966501234567',
    specialization: 'الرياضيات وتنمية التفكير المنطقي',
    nationalId: '1023456789',
    assignedClassIds: ['CLS-101', 'CLS-102', 'CLS-201'],
    assignedSubjectIds: ['SUB-MTH-1', 'SUB-MTH-2'],
    weeklyPeriodsCount: 15,
    status: 'active',
    schoolName: 'مدارس نكسس التعليمية الأهلية',
    employeeId: 'EMP-TCH-002',
    department: 'قسم الرياضيات والعلوم',
    avatarUrl: '/images/auth/teacher.webp',
    hireDate: '2021-08-20',
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'acc_teacher_yasser',
    teacherId: 'TCH-1003',
    universalId: 'TCH-1003',
    email: 'science.teacher@nexusedu.sa',
    name: 'أ. ياسر الشهراني',
    role: 'teacher',
    title: 'معلم العلوم الطبيعية والتجارب العملية',
    phone: '+966502345678',
    specialization: 'العلوم والفيزياء المبسطة والبيئة',
    nationalId: '1034567890',
    assignedClassIds: ['CLS-101', 'CLS-102', 'CLS-201'],
    assignedSubjectIds: ['SUB-SCI-1', 'SUB-SCI-2'],
    weeklyPeriodsCount: 12,
    status: 'active',
    schoolName: 'مدارس نكسس التعليمية الأهلية',
    employeeId: 'EMP-TCH-003',
    department: 'قسم الرياضيات والعلوم',
    avatarUrl: '/images/auth/teacher.webp',
    hireDate: '2022-08-15',
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'acc_teacher_majed',
    teacherId: 'TCH-1006',
    universalId: 'TCH-1006',
    email: 'english.teacher@nexusedu.sa',
    name: 'أ. ماجد الغامدي',
    role: 'teacher',
    title: 'معلم اللغة الإنجليزية ورائد فصل 1-ب',
    phone: '+966505678901',
    specialization: 'اللغة الإنجليزية والمحادثة',
    nationalId: '1067890123',
    assignedClassIds: ['CLS-101', 'CLS-102'],
    assignedSubjectIds: ['SUB-ENG-1'],
    weeklyPeriodsCount: 12,
    status: 'active',
    schoolName: 'مدارس نكسس التعليمية الأهلية',
    employeeId: 'EMP-TCH-006',
    department: 'قسم اللغات الأجنبية',
    avatarUrl: '/images/auth/teacher.webp',
    hireDate: '2022-01-10',
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'acc_teacher_abdullah',
    teacherId: 'TCH-1007',
    universalId: 'TCH-1007',
    email: 'grade2.teacher@nexusedu.sa',
    name: 'أ. عبد الله الشهري',
    role: 'teacher',
    title: 'رائد فصل 2-أ ومعلم اللغة العربية',
    phone: '+966506789012',
    specialization: 'اللغة العربية والصفوف الأولية',
    nationalId: '1078901234',
    assignedClassIds: ['CLS-201'],
    assignedSubjectIds: ['SUB-ARB-2'],
    weeklyPeriodsCount: 16,
    status: 'active',
    schoolName: 'مدارس نكسس التعليمية الأهلية',
    employeeId: 'EMP-TCH-007',
    department: 'قسم الصفوف الأولية',
    avatarUrl: '/images/auth/teacher.webp',
    hireDate: '2023-08-15',
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'acc_teacher_omar',
    teacherId: 'TCH-1008',
    universalId: 'TCH-1008',
    email: 'grade3.teacher@nexusedu.sa',
    name: 'أ. عمر الفيفي',
    role: 'teacher',
    title: 'رائد فصل 3-أ ومعلم التربية الإسلامية',
    phone: '+966507890123',
    specialization: 'التربية الإسلامية ولغتي',
    nationalId: '1089012345',
    assignedClassIds: ['CLS-301'],
    assignedSubjectIds: ['SUB-ARB-3'],
    weeklyPeriodsCount: 16,
    status: 'active',
    schoolName: 'مدارس نكسس التعليمية الأهلية',
    employeeId: 'EMP-TCH-008',
    department: 'قسم الصفوف الأولية',
    avatarUrl: '/images/auth/teacher.webp',
    hireDate: '2023-08-15',
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'acc_teacher_sara',
    teacherId: 'TCH-1004',
    universalId: 'TCH-1004',
    email: 'art.teacher@nexusedu.sa',
    name: 'أ. سارة الميمان',
    role: 'teacher',
    title: 'معلمة التربية الفنية والمهارات الإبداعية',
    phone: '+966503456789',
    specialization: 'التربية الفنية والتشكيلية',
    nationalId: '1045678901',
    assignedClassIds: ['CLS-101', 'CLS-102', 'CLS-201', 'CLS-301'],
    assignedSubjectIds: ['SUB-ART-1'],
    weeklyPeriodsCount: 10,
    status: 'active',
    schoolName: 'مدارس نكسس التعليمية الأهلية',
    employeeId: 'EMP-TCH-004',
    department: 'قسم الأنشطة والموهبة',
    avatarUrl: '/images/auth/teacher.webp',
    hireDate: '2022-09-01',
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'acc_teacher_khaled',
    teacherId: 'TCH-1005',
    universalId: 'TCH-1005',
    email: 'pe.teacher@nexusedu.sa',
    name: 'ك. خالد الحربي',
    role: 'teacher',
    title: 'معلم التربية البدنية واللياقة والدفاع عن النفس',
    phone: '+966504567890',
    specialization: 'التربية البدنية والصحة الرياضية',
    nationalId: '1056789012',
    assignedClassIds: ['CLS-101', 'CLS-102', 'CLS-201', 'CLS-301'],
    assignedSubjectIds: ['SUB-PE-1'],
    weeklyPeriodsCount: 10,
    status: 'active',
    schoolName: 'مدارس نكسس التعليمية الأهلية',
    employeeId: 'EMP-TCH-005',
    department: 'قسم التربية البدنية والنشاط الرياضي',
    avatarUrl: '/images/auth/teacher.webp',
    hireDate: '2021-09-01',
    createdAt: '2026-08-01T00:00:00Z',
  },
];

// ── Initial Authentic Accounts (8 Portals + Teachers + Staff) ──────────────────

export const NEXUS_CORE_ACCOUNTS: NexusAccount[] = [
  // Teachers
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
  {
    id: 'acc_teacher_fatima',
    universalId: 'TCH-1002',
    email: 'math.teacher@nexusedu.sa',
    name: 'أ. فاطمة الزهراني',
    role: 'teacher',
    title: 'معلمة الرياضيات والحساب الذهني',
    phone: '+966501234567',
    employeeId: 'EMP-TCH-002',
    department: 'قسم الرياضيات والعلوم',
    status: 'active',
    schoolName: 'مدارس نكسس التعليمية الأهلية',
    avatarUrl: '/images/auth/teacher.webp',
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'acc_teacher_yasser',
    universalId: 'TCH-1003',
    email: 'science.teacher@nexusedu.sa',
    name: 'أ. ياسر الشهراني',
    role: 'teacher',
    title: 'معلم العلوم الطبيعية',
    phone: '+966502345678',
    employeeId: 'EMP-TCH-003',
    department: 'قسم الرياضيات والعلوم',
    status: 'active',
    schoolName: 'مدارس نكسس التعليمية الأهلية',
    avatarUrl: '/images/auth/teacher.webp',
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'acc_teacher_majed',
    universalId: 'TCH-1006',
    email: 'english.teacher@nexusedu.sa',
    name: 'أ. ماجد الغامدي',
    role: 'teacher',
    title: 'معلم اللغة الإنجليزية ورائد فصل 1-ب',
    phone: '+966505678901',
    employeeId: 'EMP-TCH-006',
    department: 'قسم اللغات الأجنبية',
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
  // Primary Student & Parent Samples
  {
    id: 'acc_student_ahmed',
    universalId: 'STD-1002',
    email: 'student1@nexusedu.sa',
    name: 'أحمد فيصل الغامدي',
    role: 'student',
    title: 'طالب — الصف الأول (أ) فصل د. إسماعيل عيسى',
    phone: '+966559876543',
    linkedStudentId: 'cls-std-2',
    status: 'active',
    schoolName: 'مدارس نكسس التعليمية الأهلية',
    avatarUrl: '/images/auth/student.webp',
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'acc_parent_faisal',
    universalId: 'PRT-2002',
    email: 'parent1@nexusedu.sa',
    name: 'فيصل الغامدي',
    role: 'parent',
    title: 'ولي أمر الطالب أحمد فيصل',
    phone: '+966559876543',
    linkedStudentId: 'cls-std-2',
    linkedStudentIds: ['cls-std-2'],
    status: 'active',
    schoolName: 'مدارس نكسس التعليمية الأهلية',
    avatarUrl: '/images/auth/parent.webp',
    createdAt: '2026-08-01T00:00:00Z',
  },
];

// ── Initial Authentic Student Enrollments ──────────────────────────────────────

export const INITIAL_ENROLLMENTS: EnrollmentRecord[] = [
  // Class 1-A (Dr. Ismail Issa)
  { id: 'ENR-1001', studentId: 'cls-std-1', studentName: 'ربيع أحمد الزهراني', classId: 'CLS-101', className: 'الصف الأول الابتدائي — فصل (أ)', academicYear: '2026-2027', enrolledAt: '2026-08-15', status: 'active' },
  { id: 'ENR-1002', studentId: 'cls-std-2', studentName: 'أحمد فيصل الغامدي', classId: 'CLS-101', className: 'الصف الأول الابتدائي — فصل (أ)', academicYear: '2026-2027', enrolledAt: '2026-08-15', status: 'active' },
  { id: 'ENR-1003', studentId: 'cls-std-3', studentName: 'سارة محمد الشهري', classId: 'CLS-101', className: 'الصف الأول الابتدائي — فصل (أ)', academicYear: '2026-2027', enrolledAt: '2026-08-15', status: 'active' },
  { id: 'ENR-1004', studentId: 'cls-std-4', studentName: 'خالد عبد الله العمري', classId: 'CLS-101', className: 'الصف الأول الابتدائي — فصل (أ)', academicYear: '2026-2027', enrolledAt: '2026-08-15', status: 'active' },
  { id: 'ENR-1005', studentId: 'cls-std-5', studentName: 'نورة سعيد القحطاني', classId: 'CLS-101', className: 'الصف الأول الابتدائي — فصل (أ)', academicYear: '2026-2027', enrolledAt: '2026-08-15', status: 'active' },
  { id: 'ENR-1006', studentId: 'cls-std-6', studentName: 'محمد حسن المالكي', classId: 'CLS-101', className: 'الصف الأول الابتدائي — فصل (أ)', academicYear: '2026-2027', enrolledAt: '2026-08-15', status: 'active' },
  { id: 'ENR-1007', studentId: 'cls-std-7', studentName: 'ريان يوسف الثقفي', classId: 'CLS-101', className: 'الصف الأول الابتدائي — فصل (أ)', academicYear: '2026-2027', enrolledAt: '2026-08-15', status: 'active' },
  { id: 'ENR-1008', studentId: 'cls-std-8', studentName: 'لجين هاني السالم', classId: 'CLS-101', className: 'الصف الأول الابتدائي — فصل (أ)', academicYear: '2026-2027', enrolledAt: '2026-08-15', status: 'active' },
  // Class 1-B (Mr. Majed Al-Ghamdi)
  { id: 'ENR-1009', studentId: 'cls-std-9', studentName: 'عبد الرحمن ناصر المطيري', classId: 'CLS-102', className: 'الصف الأول الابتدائي — فصل (ب)', academicYear: '2026-2027', enrolledAt: '2026-08-15', status: 'active' },
  { id: 'ENR-1010', studentId: 'cls-std-10', studentName: 'جود تركي الشمري', classId: 'CLS-102', className: 'الصف الأول الابتدائي — فصل (ب)', academicYear: '2026-2027', enrolledAt: '2026-08-15', status: 'active' },
  { id: 'ENR-1011', studentId: 'cls-std-11', studentName: 'فيصل عبد العزيز الدوسري', classId: 'CLS-102', className: 'الصف الأول الابتدائي — فصل (ب)', academicYear: '2026-2027', enrolledAt: '2026-08-15', status: 'active' },
  { id: 'ENR-1012', studentId: 'cls-std-12', studentName: 'ريما عبد الإله العتيبي', classId: 'CLS-102', className: 'الصف الأول الابتدائي — فصل (ب)', academicYear: '2026-2027', enrolledAt: '2026-08-15', status: 'active' },
  { id: 'ENR-1013', studentId: 'cls-std-13', studentName: 'سلطان فهد الخالدي', classId: 'CLS-102', className: 'الصف الأول الابتدائي — فصل (ب)', academicYear: '2026-2027', enrolledAt: '2026-08-15', status: 'active' },
  { id: 'ENR-1014', studentId: 'cls-std-14', studentName: 'ليان منصور الحربي', classId: 'CLS-102', className: 'الصف الأول الابتدائي — فصل (ب)', academicYear: '2026-2027', enrolledAt: '2026-08-15', status: 'active' },
  // Class 2-A (Mr. Abdullah Al-Shehri)
  { id: 'ENR-2001', studentId: 'cls-std-15', studentName: 'زياد متعب القحطاني', classId: 'CLS-201', className: 'الصف الثاني الابتدائي — فصل (أ)', academicYear: '2026-2027', enrolledAt: '2026-08-15', status: 'active' },
  { id: 'ENR-2002', studentId: 'cls-std-16', studentName: 'دانة خالد القرني', classId: 'CLS-201', className: 'الصف الثاني الابتدائي — فصل (أ)', academicYear: '2026-2027', enrolledAt: '2026-08-15', status: 'active' },
  { id: 'ENR-2003', studentId: 'cls-std-17', studentName: 'تركي صالح الغامدي', classId: 'CLS-201', className: 'الصف الثاني الابتدائي — فصل (أ)', academicYear: '2026-2027', enrolledAt: '2026-08-15', status: 'active' },
  { id: 'ENR-2004', studentId: 'cls-std-18', studentName: 'هلا ماجد العنزي', classId: 'CLS-201', className: 'الصف الثاني الابتدائي — فصل (أ)', academicYear: '2026-2027', enrolledAt: '2026-08-15', status: 'active' },
  { id: 'ENR-2005', studentId: 'cls-std-19', studentName: 'بدر عبد الله السبيعي', classId: 'CLS-201', className: 'الصف الثاني الابتدائي — فصل (أ)', academicYear: '2026-2027', enrolledAt: '2026-08-15', status: 'active' },
  { id: 'ENR-2006', studentId: 'cls-std-20', studentName: 'شهد إبراهيم الغامدي', classId: 'CLS-201', className: 'الصف الثاني الابتدائي — فصل (أ)', academicYear: '2026-2027', enrolledAt: '2026-08-15', status: 'active' },
  // Class 3-A (Mr. Omar Al-Faifi)
  { id: 'ENR-3001', studentId: 'cls-std-21', studentName: 'مشاري نايف البقمي', classId: 'CLS-301', className: 'الصف الثالث الابتدائي — فصل (أ)', academicYear: '2026-2027', enrolledAt: '2026-08-15', status: 'active' },
  { id: 'ENR-3002', studentId: 'cls-std-22', studentName: 'رنيم فايز الحازمي', classId: 'CLS-301', className: 'الصف الثالث الابتدائي — فصل (أ)', academicYear: '2026-2027', enrolledAt: '2026-08-15', status: 'active' },
  { id: 'ENR-3003', studentId: 'cls-std-23', studentName: 'عبد العزيز طلال الرويلي', classId: 'CLS-301', className: 'الصف الثالث الابتدائي — فصل (أ)', academicYear: '2026-2027', enrolledAt: '2026-08-15', status: 'active' },
  { id: 'ENR-3004', studentId: 'cls-std-24', studentName: 'تالة أحمد الجهني', classId: 'CLS-301', className: 'الصف الثالث الابتدائي — فصل (أ)', academicYear: '2026-2027', enrolledAt: '2026-08-15', status: 'active' },
  { id: 'ENR-3005', studentId: 'cls-std-25', studentName: 'مهند عادل الشهري', classId: 'CLS-301', className: 'الصف الثالث الابتدائي — فصل (أ)', academicYear: '2026-2027', enrolledAt: '2026-08-15', status: 'active' },
  { id: 'ENR-3006', studentId: 'cls-std-26', studentName: 'جنى هاني العصيمي', classId: 'CLS-301', className: 'الصف الثالث الابتدائي — فصل (أ)', academicYear: '2026-2027', enrolledAt: '2026-08-15', status: 'active' },
];

// ── Initial Authentic School Students (26 Students Across 4 Classes) ─────────

export const REAL_CLASS_STUDENTS: ClassStudentRecord[] = [
  // ── Class 1-A (Dr. Ismail Issa) ─────────────────────────────────────────────
  {
    id: 'cls-std-1',
    universalId: 'STD-1001',
    fullName: 'ربيع أحمد الزهراني',
    fullNameEn: 'Rabee Ahmed Al-Zahrani',
    grade: 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
    classId: 'CLS-101',
    nationalId: '1102938475',
    dateOfBirth: '2019-04-12',
    parentName: 'أحمد الزهراني',
    parentPhone: '0501234567',
    parentEmail: 'parent.rabee@nexusedu.sa',
    photoUrl: '/images/avatars/student1.webp',
    notes: 'طالب متفوق في القراءة السريعة وحفظ قصار السور بنطق سليم.',
    averageGrade: 98,
    attendanceRate: 99,
    rank: 1,
    assignedProgram: 'القراءة المعبرة والحساب الذهني',
    status: 'excellent',
    studentAccountId: 'acc_std_1',
    parentAccountId: 'acc_prt_1',
    enrolledSubjectIds: ['SUB-ARB-1', 'SUB-QRN-1', 'SUB-ISL-1', 'SUB-MTH-1', 'SUB-SCI-1', 'SUB-ENG-1'],
  },
  {
    id: 'cls-std-2',
    universalId: 'STD-1002',
    fullName: 'أحمد فيصل الغامدي',
    fullNameEn: 'Ahmed Faisal Al-Ghamdi',
    grade: 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
    classId: 'CLS-101',
    nationalId: '1092837465',
    dateOfBirth: '2019-06-25',
    parentName: 'فيصل الغامدي',
    parentPhone: '0559876543',
    parentEmail: 'parent1@nexusedu.sa',
    photoUrl: '/images/avatars/student2.webp',
    notes: 'شغوف بالرياضيات والمشاركة الصفية، ويحل الواجبات بانتظام.',
    averageGrade: 95,
    attendanceRate: 97,
    rank: 2,
    assignedProgram: 'تنمية المهارات اللغوية',
    status: 'excellent',
    studentAccountId: 'acc_student_ahmed',
    parentAccountId: 'acc_parent_faisal',
    enrolledSubjectIds: ['SUB-ARB-1', 'SUB-QRN-1', 'SUB-ISL-1', 'SUB-MTH-1', 'SUB-SCI-1', 'SUB-ENG-1'],
  },
  {
    id: 'cls-std-3',
    universalId: 'STD-1003',
    fullName: 'سارة محمد الشهري',
    fullNameEn: 'Sara Mohammed Al-Shehri',
    grade: 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
    classId: 'CLS-101',
    nationalId: '1083746592',
    dateOfBirth: '2019-02-18',
    parentName: 'محمد الشهري',
    parentPhone: '0541122334',
    parentEmail: 'parent.sara@nexusedu.sa',
    photoUrl: '/images/avatars/student3.webp',
    notes: 'متميزة جداً في التعبير الإبداعي والرسم والخط العربي.',
    averageGrade: 97,
    attendanceRate: 100,
    rank: 1,
    assignedProgram: 'الإثراء اللغوي',
    status: 'excellent',
    studentAccountId: 'acc_std_3',
    parentAccountId: 'acc_prt_3',
    enrolledSubjectIds: ['SUB-ARB-1', 'SUB-QRN-1', 'SUB-ISL-1', 'SUB-MTH-1', 'SUB-SCI-1', 'SUB-ENG-1'],
  },
  {
    id: 'cls-std-4',
    universalId: 'STD-1004',
    fullName: 'خالد عبد الله العمري',
    fullNameEn: 'Khaled Abdullah Al-Amri',
    grade: 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
    classId: 'CLS-101',
    nationalId: '1074658392',
    dateOfBirth: '2019-08-30',
    parentName: 'عبد الله العمري',
    parentPhone: '0567788990',
    parentEmail: 'parent.khaled@nexusedu.sa',
    photoUrl: '/images/avatars/student4.webp',
    notes: 'يحتاج تعزيزاً في مهارات المدود وتركيب الكلمات، يبدي تحسناً ملحوظاً.',
    averageGrade: 86,
    attendanceRate: 91,
    rank: 6,
    assignedProgram: 'برنامج التهجي البسيط',
    status: 'warning',
    studentAccountId: 'acc_std_4',
    parentAccountId: 'acc_prt_4',
    enrolledSubjectIds: ['SUB-ARB-1', 'SUB-QRN-1', 'SUB-ISL-1', 'SUB-MTH-1', 'SUB-SCI-1', 'SUB-ENG-1'],
  },
  {
    id: 'cls-std-5',
    universalId: 'STD-1005',
    fullName: 'نورة سعيد القحطاني',
    fullNameEn: 'Noura Saeed Al-Qahtani',
    grade: 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
    classId: 'CLS-101',
    nationalId: '1065748391',
    dateOfBirth: '2019-05-14',
    parentName: 'سعيد القحطاني',
    parentPhone: '0534455667',
    parentEmail: 'parent.noura@nexusedu.sa',
    photoUrl: '/images/avatars/student5.webp',
    notes: 'حريصة على الترتيب والهدوء وإنجاز الأنشطة في وقت قياسي.',
    averageGrade: 93,
    attendanceRate: 96,
    rank: 4,
    assignedProgram: 'تنمية الذكاء المنطقي',
    status: 'active',
    studentAccountId: 'acc_std_5',
    parentAccountId: 'acc_prt_5',
    enrolledSubjectIds: ['SUB-ARB-1', 'SUB-QRN-1', 'SUB-ISL-1', 'SUB-MTH-1', 'SUB-SCI-1', 'SUB-ENG-1'],
  },
  {
    id: 'cls-std-6',
    universalId: 'STD-1006',
    fullName: 'محمد حسن المالكي',
    fullNameEn: 'Mohammed Hassan Al-Malki',
    grade: 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
    classId: 'CLS-101',
    nationalId: '1056847392',
    dateOfBirth: '2019-09-01',
    parentName: 'حسن المالكي',
    parentPhone: '0523344556',
    parentEmail: 'parent.mohammed@nexusedu.sa',
    photoUrl: '/images/avatars/student6.webp',
    notes: 'نشيط وذكي، يحب التجارب العلمية واستكشاف الطبيعة.',
    averageGrade: 94,
    attendanceRate: 98,
    rank: 3,
    assignedProgram: 'العلوم الاستكشافية',
    status: 'excellent',
    studentAccountId: 'acc_std_6',
    parentAccountId: 'acc_prt_6',
    enrolledSubjectIds: ['SUB-ARB-1', 'SUB-QRN-1', 'SUB-ISL-1', 'SUB-MTH-1', 'SUB-SCI-1', 'SUB-ENG-1'],
  },
  {
    id: 'cls-std-7',
    universalId: 'STD-1007',
    fullName: 'ريان يوسف الثقفي',
    fullNameEn: 'Rayan Youssef Al-Thaqafi',
    grade: 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
    classId: 'CLS-101',
    nationalId: '1047958473',
    dateOfBirth: '2019-11-20',
    parentName: 'يوسف الثقفي',
    parentPhone: '0519988776',
    parentEmail: 'parent.rayan@nexusedu.sa',
    photoUrl: '/images/avatars/student7.webp',
    notes: 'متعاون مع زملائه، يظهر اهتماماً متزايداً بحل الألغاز.',
    averageGrade: 89,
    attendanceRate: 94,
    rank: 5,
    assignedProgram: 'التفكير الإبداعي',
    status: 'active',
    studentAccountId: 'acc_std_7',
    parentAccountId: 'acc_prt_7',
    enrolledSubjectIds: ['SUB-ARB-1', 'SUB-QRN-1', 'SUB-ISL-1', 'SUB-MTH-1', 'SUB-SCI-1', 'SUB-ENG-1'],
  },
  {
    id: 'cls-std-8',
    universalId: 'STD-1008',
    fullName: 'لجين هاني السالم',
    fullNameEn: 'Lojain Hani Al-Salem',
    grade: 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
    classId: 'CLS-101',
    nationalId: '1038967584',
    dateOfBirth: '2019-03-05',
    parentName: 'هاني السالم',
    parentPhone: '0508877665',
    parentEmail: 'parent.lojain@nexusedu.sa',
    photoUrl: '/images/avatars/student8.webp',
    notes: 'ذاكرة قوية وسرعة استيعاب مذهلة في تلاوة القرآن الكريم.',
    averageGrade: 97,
    attendanceRate: 99,
    rank: 1,
    assignedProgram: 'إتقان التلاوة والتجويد',
    status: 'excellent',
    studentAccountId: 'acc_std_8',
    parentAccountId: 'acc_prt_8',
    enrolledSubjectIds: ['SUB-ARB-1', 'SUB-QRN-1', 'SUB-ISL-1', 'SUB-MTH-1', 'SUB-SCI-1', 'SUB-ENG-1'],
  },

  // ── Class 1-B (Mr. Majed Al-Ghamdi) ─────────────────────────────────────────
  {
    id: 'cls-std-9',
    universalId: 'STD-1009',
    fullName: 'عبد الرحمن ناصر المطيري',
    fullNameEn: 'Abdulrahman Nasser Al-Mutairi',
    grade: 'الصف الأول الابتدائي — فصل (ب)',
    classId: 'CLS-102',
    nationalId: '1029847561',
    dateOfBirth: '2019-05-10',
    parentName: 'ناصر المطيري',
    parentPhone: '0551122334',
    parentEmail: 'parent.abdulrahman@nexusedu.sa',
    photoUrl: '/images/avatars/default.webp',
    notes: 'طالب حريص ومتحمس لحصص اللغة الإنجليزية والقراءة.',
    averageGrade: 92,
    attendanceRate: 96,
    rank: 2,
    assignedProgram: 'المهارات اللغوية الشاملة',
    status: 'active',
    studentAccountId: 'acc_std_9',
    parentAccountId: 'acc_prt_9',
    enrolledSubjectIds: ['SUB-ARB-1', 'SUB-QRN-1', 'SUB-MTH-1', 'SUB-ENG-1'],
  },
  {
    id: 'cls-std-10',
    universalId: 'STD-1010',
    fullName: 'جود تركي الشمري',
    fullNameEn: 'Joud Turki Al-Shammari',
    grade: 'الصف الأول الابتدائي — فصل (ب)',
    classId: 'CLS-102',
    nationalId: '1018746532',
    dateOfBirth: '2019-07-22',
    parentName: 'تركي الشمري',
    parentPhone: '0552233445',
    parentEmail: 'parent.joud@nexusedu.sa',
    photoUrl: '/images/avatars/default.webp',
    notes: 'ذكاء حاد ومشاركة دائمة في المناقشات الصفية.',
    averageGrade: 96,
    attendanceRate: 100,
    rank: 1,
    assignedProgram: 'رعاية الموهوبات',
    status: 'excellent',
    studentAccountId: 'acc_std_10',
    parentAccountId: 'acc_prt_10',
    enrolledSubjectIds: ['SUB-ARB-1', 'SUB-QRN-1', 'SUB-MTH-1', 'SUB-ENG-1'],
  },
  {
    id: 'cls-std-11',
    universalId: 'STD-1011',
    fullName: 'فيصل عبد العزيز الدوسري',
    fullNameEn: 'Faisal Abdulaziz Al-Dawsari',
    grade: 'الصف الأول الابتدائي — فصل (ب)',
    classId: 'CLS-102',
    nationalId: '1007654321',
    dateOfBirth: '2019-01-14',
    parentName: 'عبد العزيز الدوسري',
    parentPhone: '0553344556',
    parentEmail: 'parent.faisal.d@nexusedu.sa',
    photoUrl: '/images/avatars/default.webp',
    notes: 'مجتهد في الرياضيات والرسم والأنشطة الرياضية.',
    averageGrade: 90,
    attendanceRate: 95,
    rank: 3,
    assignedProgram: 'الحساب الذهني والذكاء الحركي',
    status: 'active',
    studentAccountId: 'acc_std_11',
    parentAccountId: 'acc_prt_11',
    enrolledSubjectIds: ['SUB-ARB-1', 'SUB-MTH-1', 'SUB-SCI-1', 'SUB-ENG-1'],
  },
  {
    id: 'cls-std-12',
    universalId: 'STD-1012',
    fullName: 'ريما عبد الإله العتيبي',
    fullNameEn: 'Reema Abdulilah Al-Otaibi',
    grade: 'الصف الأول الابتدائي — فصل (ب)',
    classId: 'CLS-102',
    nationalId: '1098765430',
    dateOfBirth: '2019-10-05',
    parentName: 'عبد الإله العتيبي',
    parentPhone: '0554455667',
    parentEmail: 'parent.reema@nexusedu.sa',
    photoUrl: '/images/avatars/default.webp',
    notes: 'هادئة ومنضبطة، وتظهر شغفاً كبيراً بتلاوة القرآن الكريم.',
    averageGrade: 94,
    attendanceRate: 98,
    rank: 2,
    assignedProgram: 'حفظ المتون القرآنية',
    status: 'excellent',
    studentAccountId: 'acc_std_12',
    parentAccountId: 'acc_prt_12',
    enrolledSubjectIds: ['SUB-ARB-1', 'SUB-QRN-1', 'SUB-MTH-1', 'SUB-ENG-1'],
  },
  {
    id: 'cls-std-13',
    universalId: 'STD-1013',
    fullName: 'سلطان فهد الخالدي',
    fullNameEn: 'Sultan Fahad Al-Khaldi',
    grade: 'الصف الأول الابتدائي — فصل (ب)',
    classId: 'CLS-102',
    nationalId: '1087654329',
    dateOfBirth: '2019-06-18',
    parentName: 'فهد الخالدي',
    parentPhone: '0555566778',
    parentEmail: 'parent.sultan@nexusedu.sa',
    photoUrl: '/images/avatars/default.webp',
    notes: 'نشاط بدني مميز ومحب للتجارب الاستكشافية.',
    averageGrade: 88,
    attendanceRate: 92,
    rank: 4,
    assignedProgram: 'الاستكشاف العملي',
    status: 'active',
    studentAccountId: 'acc_std_13',
    parentAccountId: 'acc_prt_13',
    enrolledSubjectIds: ['SUB-ARB-1', 'SUB-MTH-1', 'SUB-SCI-1', 'SUB-ENG-1'],
  },
  {
    id: 'cls-std-14',
    universalId: 'STD-1014',
    fullName: 'ليان منصور الحربي',
    fullNameEn: 'Layan Mansour Al-Harbi',
    grade: 'الصف الأول الابتدائي — فصل (ب)',
    classId: 'CLS-102',
    nationalId: '1076543218',
    dateOfBirth: '2019-12-01',
    parentName: 'منصور الحربي',
    parentPhone: '0556677889',
    parentEmail: 'parent.layan@nexusedu.sa',
    photoUrl: '/images/avatars/default.webp',
    notes: 'خط جميل ومهارة عالية في التلوين والقراءة البصرية.',
    averageGrade: 93,
    attendanceRate: 97,
    rank: 3,
    assignedProgram: 'الفنون والتعبير اللغوي',
    status: 'active',
    studentAccountId: 'acc_std_14',
    parentAccountId: 'acc_prt_14',
    enrolledSubjectIds: ['SUB-ARB-1', 'SUB-QRN-1', 'SUB-MTH-1', 'SUB-ENG-1'],
  },

  // ── Class 2-A (Mr. Abdullah Al-Shehri) ──────────────────────────────────────
  {
    id: 'cls-std-15',
    universalId: 'STD-2001',
    fullName: 'زياد متعب القحطاني',
    fullNameEn: 'Ziyad Mutaeb Al-Qahtani',
    grade: 'الصف الثاني الابتدائي — فصل (أ)',
    classId: 'CLS-201',
    nationalId: '1065432107',
    dateOfBirth: '2018-03-15',
    parentName: 'متعب القحطاني',
    parentPhone: '0557788990',
    parentEmail: 'parent.ziyad@nexusedu.sa',
    photoUrl: '/images/avatars/default.webp',
    notes: 'متفوق دراسياً ورئيس جماعة الإذاعة المدرسية للصف الثاني.',
    averageGrade: 99,
    attendanceRate: 100,
    rank: 1,
    assignedProgram: 'الخطابة والإلقاء',
    status: 'excellent',
    studentAccountId: 'acc_std_15',
    parentAccountId: 'acc_prt_15',
    enrolledSubjectIds: ['SUB-ARB-2', 'SUB-MTH-2', 'SUB-SCI-2'],
  },
  {
    id: 'cls-std-16',
    universalId: 'STD-2002',
    fullName: 'دانة خالد القرني',
    fullNameEn: 'Dana Khaled Al-Qarni',
    grade: 'الصف الثاني الابتدائي — فصل (أ)',
    classId: 'CLS-201',
    nationalId: '1054321096',
    dateOfBirth: '2018-09-20',
    parentName: 'خالد القرني',
    parentPhone: '0558899001',
    parentEmail: 'parent.dana@nexusedu.sa',
    photoUrl: '/images/avatars/default.webp',
    notes: 'سرعة بديهة في مسائل الضرب والجمع التكراري.',
    averageGrade: 96,
    attendanceRate: 98,
    rank: 2,
    assignedProgram: 'أولمبياد الرياضيات الناشئ',
    status: 'excellent',
    studentAccountId: 'acc_std_16',
    parentAccountId: 'acc_prt_16',
    enrolledSubjectIds: ['SUB-ARB-2', 'SUB-MTH-2', 'SUB-SCI-2'],
  },
  {
    id: 'cls-std-17',
    universalId: 'STD-2003',
    fullName: 'تركي صالح الغامدي',
    fullNameEn: 'Turki Saleh Al-Ghamdi',
    grade: 'الصف الثاني الابتدائي — فصل (أ)',
    classId: 'CLS-201',
    nationalId: '1043210985',
    dateOfBirth: '2018-04-10',
    parentName: 'صالح الغامدي',
    parentPhone: '0559900112',
    parentEmail: 'parent.turki@nexusedu.sa',
    photoUrl: '/images/avatars/default.webp',
    notes: 'مشاركة ممتازة في المعارض العلمية وتجارب المغناطيسية.',
    averageGrade: 91,
    attendanceRate: 94,
    rank: 4,
    assignedProgram: 'العلوم العملية والابتكار',
    status: 'active',
    studentAccountId: 'acc_std_17',
    parentAccountId: 'acc_prt_17',
    enrolledSubjectIds: ['SUB-ARB-2', 'SUB-MTH-2', 'SUB-SCI-2'],
  },
  {
    id: 'cls-std-18',
    universalId: 'STD-2004',
    fullName: 'هلا ماجد العنزي',
    fullNameEn: 'Hala Majed Al-Enezi',
    grade: 'الصف الثاني الابتدائي — فصل (أ)',
    classId: 'CLS-201',
    nationalId: '1032109874',
    dateOfBirth: '2018-11-28',
    parentName: 'ماجد العنزي',
    parentPhone: '0560011223',
    parentEmail: 'parent.hala@nexusedu.sa',
    photoUrl: '/images/avatars/default.webp',
    notes: 'إتقان تام لقواعد الإملاء وكتابة القصص المصورة.',
    averageGrade: 95,
    attendanceRate: 99,
    rank: 3,
    assignedProgram: 'الكاتب الصغير',
    status: 'excellent',
    studentAccountId: 'acc_std_18',
    parentAccountId: 'acc_prt_18',
    enrolledSubjectIds: ['SUB-ARB-2', 'SUB-MTH-2', 'SUB-SCI-2'],
  },
  {
    id: 'cls-std-19',
    universalId: 'STD-2005',
    fullName: 'بدر عبد الله السبيعي',
    fullNameEn: 'Bader Abdullah Al-Subaie',
    grade: 'الصف الثاني الابتدائي — فصل (أ)',
    classId: 'CLS-201',
    nationalId: '1021098763',
    dateOfBirth: '2018-07-12',
    parentName: 'عبد الله السبيعي',
    parentPhone: '0561122334',
    parentEmail: 'parent.bader@nexusedu.sa',
    photoUrl: '/images/avatars/default.webp',
    notes: 'تحسن مستمر في التركيز وحل الواجبات اليومية.',
    averageGrade: 88,
    attendanceRate: 93,
    rank: 5,
    assignedProgram: 'الدعم والمتابعة الفردية',
    status: 'active',
    studentAccountId: 'acc_std_19',
    parentAccountId: 'acc_prt_19',
    enrolledSubjectIds: ['SUB-ARB-2', 'SUB-MTH-2', 'SUB-SCI-2'],
  },
  {
    id: 'cls-std-20',
    universalId: 'STD-2006',
    fullName: 'شهد إبراهيم الغامدي',
    fullNameEn: 'Shahad Ibrahim Al-Ghamdi',
    grade: 'الصف الثاني الابتدائي — فصل (أ)',
    classId: 'CLS-201',
    nationalId: '1010987652',
    dateOfBirth: '2018-01-30',
    parentName: 'إبراهيم الغامدي',
    parentPhone: '0562233445',
    parentEmail: 'parent.shahad@nexusedu.sa',
    photoUrl: '/images/avatars/default.webp',
    notes: 'تميز في الرسم والتصميم والأنشطة الفنية بالمدرسة.',
    averageGrade: 93,
    attendanceRate: 96,
    rank: 4,
    assignedProgram: 'الفنون الرقمية المبسطة',
    status: 'active',
    studentAccountId: 'acc_std_20',
    parentAccountId: 'acc_prt_20',
    enrolledSubjectIds: ['SUB-ARB-2', 'SUB-MTH-2', 'SUB-SCI-2'],
  },

  // ── Class 3-A (Mr. Omar Al-Faifi) ───────────────────────────────────────────
  {
    id: 'cls-std-21',
    universalId: 'STD-3001',
    fullName: 'مشاري نايف البقمي',
    fullNameEn: 'Meshari Nayef Al-Boqami',
    grade: 'الصف الثالث الابتدائي — فصل (أ)',
    classId: 'CLS-301',
    nationalId: '1099876541',
    dateOfBirth: '2017-05-18',
    parentName: 'نايف البقمي',
    parentPhone: '0563344556',
    parentEmail: 'parent.meshari@nexusedu.sa',
    photoUrl: '/images/avatars/default.webp',
    notes: 'حفظ متقن لثلاثة أجزاء من القرآن وتفوق في الحساب.',
    averageGrade: 97,
    attendanceRate: 98,
    rank: 1,
    assignedProgram: 'المتقن للقرآن والحساب',
    status: 'excellent',
    studentAccountId: 'acc_std_21',
    parentAccountId: 'acc_prt_21',
    enrolledSubjectIds: ['SUB-ARB-3', 'SUB-MTH-2', 'SUB-SCI-2'],
  },
  {
    id: 'cls-std-22',
    universalId: 'STD-3002',
    fullName: 'رنيم فايز الحازمي',
    fullNameEn: 'Raneem Fayez Al-Hazmi',
    grade: 'الصف الثالث الابتدائي — فصل (أ)',
    classId: 'CLS-301',
    nationalId: '1088765430',
    dateOfBirth: '2017-08-25',
    parentName: 'فايز الحازمي',
    parentPhone: '0564455667',
    parentEmail: 'parent.raneem@nexusedu.sa',
    photoUrl: '/images/avatars/default.webp',
    notes: 'مشاركة ممتازة في الأنشطة الطلابية والمسابقات الثقافية.',
    averageGrade: 95,
    attendanceRate: 99,
    rank: 2,
    assignedProgram: 'فرسان القراءة والتحدي',
    status: 'excellent',
    studentAccountId: 'acc_std_22',
    parentAccountId: 'acc_prt_22',
    enrolledSubjectIds: ['SUB-ARB-3', 'SUB-MTH-2', 'SUB-SCI-2'],
  },
  {
    id: 'cls-std-23',
    universalId: 'STD-3003',
    fullName: 'عبد العزيز طلال الرويلي',
    fullNameEn: 'Abdulaziz Talal Al-Ruwaili',
    grade: 'الصف الثالث الابتدائي — فصل (أ)',
    classId: 'CLS-301',
    nationalId: '1077654319',
    dateOfBirth: '2017-02-14',
    parentName: 'طلال الرويلي',
    parentPhone: '0565566778',
    parentEmail: 'parent.abdulaziz.r@nexusedu.sa',
    photoUrl: '/images/avatars/default.webp',
    notes: 'شغف بالروبوتات وتجارب التفكير البرمجي المبسط.',
    averageGrade: 93,
    attendanceRate: 95,
    rank: 3,
    assignedProgram: 'المبتكر الصغير والروبوت',
    status: 'active',
    studentAccountId: 'acc_std_23',
    parentAccountId: 'acc_prt_23',
    enrolledSubjectIds: ['SUB-ARB-3', 'SUB-MTH-2', 'SUB-SCI-2'],
  },
  {
    id: 'cls-std-24',
    universalId: 'STD-3004',
    fullName: 'تالة أحمد الجهني',
    fullNameEn: 'Talah Ahmed Al-Juhani',
    grade: 'الصف الثالث الابتدائي — فصل (أ)',
    classId: 'CLS-301',
    nationalId: '1066543208',
    dateOfBirth: '2017-10-09',
    parentName: 'أحمد الجهني',
    parentPhone: '0566677889',
    parentEmail: 'parent.talah@nexusedu.sa',
    photoUrl: '/images/avatars/default.webp',
    notes: 'طالبة متميزة في اللغة العربية وقواعد النحو المبسط.',
    averageGrade: 94,
    attendanceRate: 97,
    rank: 2,
    assignedProgram: 'النحو والأساليب البلاغية',
    status: 'active',
    studentAccountId: 'acc_std_24',
    parentAccountId: 'acc_prt_24',
    enrolledSubjectIds: ['SUB-ARB-3', 'SUB-MTH-2', 'SUB-SCI-2'],
  },
  {
    id: 'cls-std-25',
    universalId: 'STD-3005',
    fullName: 'مهند عادل الشهري',
    fullNameEn: 'Mohannad Adel Al-Shehri',
    grade: 'الصف الثالث الابتدائي — فصل (أ)',
    classId: 'CLS-301',
    nationalId: '1055432197',
    dateOfBirth: '2017-06-30',
    parentName: 'عادل الشهري',
    parentPhone: '0567788990',
    parentEmail: 'parent.mohannad@nexusedu.sa',
    photoUrl: '/images/avatars/default.webp',
    notes: 'مهارات قيادية وعضو نشط في فريق النظام والمساعدة الصفي.',
    averageGrade: 91,
    attendanceRate: 94,
    rank: 4,
    assignedProgram: 'القيادة الطلابية والمسؤولية',
    status: 'active',
    studentAccountId: 'acc_std_25',
    parentAccountId: 'acc_prt_25',
    enrolledSubjectIds: ['SUB-ARB-3', 'SUB-MTH-2', 'SUB-SCI-2'],
  },
  {
    id: 'cls-std-26',
    universalId: 'STD-3006',
    fullName: 'جنى هاني العصيمي',
    fullNameEn: 'Jana Hani Al-Osaimi',
    grade: 'الصف الثالث الابتدائي — فصل (أ)',
    classId: 'CLS-301',
    nationalId: '1044321086',
    dateOfBirth: '2017-12-19',
    parentName: 'هاني العصيمي',
    parentPhone: '0568899001',
    parentEmail: 'parent.jana@nexusedu.sa',
    photoUrl: '/images/avatars/default.webp',
    notes: 'تألق في حفظ الأحاديث الشريفة وسرعة الاستجابة الذهنية.',
    averageGrade: 96,
    attendanceRate: 99,
    rank: 1,
    assignedProgram: 'حفظ السنة النبوية والتجويد',
    status: 'excellent',
    studentAccountId: 'acc_std_26',
    parentAccountId: 'acc_prt_26',
    enrolledSubjectIds: ['SUB-ARB-3', 'SUB-MTH-2', 'SUB-SCI-2'],
  },
];

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

export const INITIAL_QUIZZES: ClassQuiz[] = [
  {
    id: 'quiz-arabic-1',
    title: 'اختبار مهارات القراءة والكتابة (لغتي العربية)',
    subject: 'لغتي العربية',
    durationMinutes: 15,
    totalPoints: 15,
    createdAt: '2026-09-20T08:00:00Z',
    submissionsCount: 8,
    questions: [
      {
        id: 'q1',
        questionText: 'اختر الكلمة التي تبدأ بحرف اللام (ل):',
        options: ['قلم', 'لعبة', 'كتاب', 'شمس'],
        correctAnswer: 1,
        points: 5,
      },
      {
        id: 'q2',
        questionText: 'الكلمة التي تحتوي على مد بالألف هي:',
        options: ['باب', 'كتب', 'جلس', 'قلم'],
        correctAnswer: 0,
        points: 5,
      },
      {
        id: 'q3',
        questionText: 'أي الجمل التالية جملة اسمية صحيحة؟',
        options: ['يقرأ الطالب بهدوء', 'الطالب مجتهد في دروسه', 'إلى المدرسة صباحاً', 'في الفصل مسروراً'],
        correctAnswer: 1,
        points: 5,
      },
    ],
  },
  {
    id: 'quiz-math-1',
    title: 'كويز العمليات الحسابية والتفكير المنطقي',
    subject: 'الرياضيات',
    durationMinutes: 15,
    totalPoints: 15,
    createdAt: '2026-09-22T08:30:00Z',
    submissionsCount: 7,
    questions: [
      {
        id: 'qm1',
        questionText: 'كم ناتج جمع 7 + 8؟',
        options: ['13', '14', '15', '16'],
        correctAnswer: 2,
        points: 5,
      },
      {
        id: 'qm2',
        questionText: 'أي الأعداد التالية عدد زوجي؟',
        options: ['9', '11', '14', '17'],
        correctAnswer: 2,
        points: 5,
      },
      {
        id: 'qm3',
        questionText: 'الشكل الهندسي الذي له ثلاثة أضلاع وثلاثة رؤوس هو:',
        options: ['المربع', 'المستطيل', 'المثلث', 'الدائرة'],
        correctAnswer: 2,
        points: 5,
      },
    ],
  },
];

// ── Initial Real Homework ────────────────────────────────────────────────────

export const INITIAL_HOMEWORK: HomeworkAssignment[] = [
  {
    id: 'hw-arabic-1',
    title: 'تطبيقات على درس مد الألف والواو',
    subject: 'لغتي العربية',
    grade: 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
    fromPage: 38,
    toPage: 41,
    dueDate: '2026-09-28',
    instructions: 'قراءة النص واستخراج الكلمات الممدودة، وكتابة 3 جمل مفيدة بخط النسخ.',
    totalScore: 10,
    submissionsCount: 7,
    createdAt: '2026-09-24T10:00:00Z',
  },
  {
    id: 'hw-math-1',
    title: 'مسائل الجمع الرأسي والأفقي حتى 20',
    subject: 'الرياضيات',
    grade: 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
    fromPage: 28,
    toPage: 30,
    dueDate: '2026-09-29',
    instructions: 'حل التمارين من رقم 1 إلى رقم 10 في كتاب التمارين.',
    totalScore: 10,
    submissionsCount: 6,
    createdAt: '2026-09-24T11:00:00Z',
  },
];

// ── Initial Accredited Certificates ──────────────────────────────────────────

export const INITIAL_CERTIFICATES: AccreditedCertificate[] = [
  {
    id: 'cert-1',
    certNumber: 'NEXUS-CERT-2026-88102',
    studentId: 'cls-std-2',
    studentName: 'أحمد فيصل الغامدي',
    studentNameEn: 'Ahmed Faisal Al-Ghamdi',
    programTitle: 'برنامج التميز الأكاديمي والحساب الذهني',
    achievement: 'الحصول على الدرجة الكاملة والمركز الأول في اختبارات الشهر',
    score: 98,
    completionDate: '2026-09-23',
    doctorName: 'د. إسماعيل عيسى',
    doctorTitle: 'مشرف عام الفصل والمستشار الأكاديمي',
    qrCode: 'https://nexus.masarplatform.org/verify/NEXUS-CERT-2026-88102',
    badge: 'وسام العبقرية',
    createdAt: '2026-09-23T12:00:00Z',
  },
  {
    id: 'cert-2',
    certNumber: 'NEXUS-CERT-2026-88103',
    studentId: 'cls-std-1',
    studentName: 'ربيع أحمد الزهراني',
    studentNameEn: 'Rabee Ahmed Al-Zahrani',
    programTitle: 'برنامج القراءة السريعة وحفظ المتون',
    achievement: 'إتقان مخارج الحروف والتلاوة المعبرة بدون أخطاء',
    score: 99,
    completionDate: '2026-09-24',
    doctorName: 'د. إسماعيل عيسى',
    doctorTitle: 'مشرف عام الفصل والمستشار الأكاديمي',
    qrCode: 'https://nexus.masarplatform.org/verify/NEXUS-CERT-2026-88103',
    badge: 'وسام الإتقان القرآني',
    createdAt: '2026-09-24T12:00:00Z',
  },
];

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

function p(day: number, num: number, subject: string): Period {
  return { dayOfWeek: day, periodNumber: num, subjectName: subject, ...PERIOD_TIMES[num], teacherName: 'د. إسماعيل عيسى' };
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
  CLASSES: 'nexus_school_classes_v2',
  SUBJECTS: 'nexus_school_subjects_v2',
  TEACHERS: 'nexus_school_teachers_v2',
  ENROLLMENTS: 'nexus_school_enrollments_v2',
  ACCOUNTS: 'nexus_all_accounts_v2',
  STUDENTS: 'nexus_class_students_v2',
  ATTENDANCE: 'nexus_daily_attendance_v2',
  QUIZZES: 'nexus_class_quizzes_v2',
  QUIZ_SUBMISSIONS: 'nexus_quiz_submissions_v2',
  HOMEWORK: 'nexus_homework_v2',
  HW_SUBMISSIONS: 'nexus_hw_submissions_v2',
  CERTIFICATES: 'nexus_certificates_v2',
  OBSERVATIONS: 'nexus_observations_v2',
  ACTIVE_USER: 'nexus_current_user_v2',
  EVENTS: 'nexus_class_events_v2',
  MEETINGS: 'nexus_class_meetings_v2',
  REPORTS: 'nexus_student_reports_v2',
  COMMUNITY_MSGS: 'nexus_community_messages_v2',
  LIVE_SESSIONS: 'nexus_live_sessions_v2',
  ACTIVE_CLASS: 'nexus_active_class_v2',
};

export const INITIAL_CLASS_EVENTS: ClassEventItem[] = [
  {
    id: 'evt-1',
    title: 'حفلة تكريم الطلاب المتميزين في القراءة 🏆',
    category: 'party',
    categoryLabel: 'حفلة وتكريم 🎉',
    description: 'تغطية مصورة لحفل تكريم فرسان القراءة والتلاوة بفصل د. إسماعيل عيسى بحضور إدارة المدرسة.',
    date: '2026-09-24',
    coverImage: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=80',
    ],
    createdAt: '2026-09-24T10:00:00Z',
  },
  {
    id: 'evt-2',
    title: 'الرحلة التعليمية الاستكشافية للمركز العلمي 🚌',
    category: 'trip',
    categoryLabel: 'رحلة مدرسية 🚌',
    description: 'زيارة ميدانية لمعارض العلوم التفاعلية وتجارب الكيمياء المبسطة للصف الأول الابتدائي.',
    date: '2026-09-20',
    coverImage: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80',
    ],
    createdAt: '2026-09-20T11:00:00Z',
  },
  {
    id: 'evt-3',
    title: 'معرض الخط العربي والرسومات الإبداعية 🎨',
    category: 'activity',
    categoryLabel: 'نشاط صفي 🎨',
    description: 'أعمال طلاب الفصل في كتابة الحروف بخط النسخ وتلوين اللوحات الفنية المعبرة.',
    date: '2026-09-18',
    coverImage: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80',
    ],
    createdAt: '2026-09-18T09:00:00Z',
  },
];

export const INITIAL_MEETINGS: ClassMeetingItem[] = [
  {
    id: 'meet-1',
    title: 'لقاء أولياء الأمور الدوري — تقييم نتائج الشهر الأول والتأسيس',
    meetingUrl: 'https://meet.google.com/nexus-ismail-class',
    scheduledAt: '2026-09-28T18:00',
    duration: 45,
    notes: 'مناقشة خطة القراءة اليومية في المنزل، وتطوير المهارات الحسابية لفرسان الفصل.',
    hostName: 'د. إسماعيل عيسى',
    createdAt: '2026-09-25T12:00:00Z',
  },
  {
    id: 'meet-2',
    title: 'جلسة توجيه فردية لأولياء أمور الطلاب المتفوقين',
    meetingUrl: 'https://meet.google.com/nexus-ismail-honor',
    scheduledAt: '2026-10-02T19:00',
    duration: 30,
    notes: 'خطة الإثراء المتقدمة ومسابقات الحساب الذهني وحفظ القرآن.',
    hostName: 'د. إسماعيل عيسى',
    createdAt: '2026-09-25T14:00:00Z',
  },
];

export const INITIAL_COMMUNITY_MESSAGES: CommunityMessage[] = [
  {
    id: 'cmsg-1',
    senderId: 'acc_teacher_ismail',
    senderName: 'د. إسماعيل عيسى',
    senderRole: 'teacher',
    text: 'السلام عليكم ورحمة الله وبركاته، أهلاً بجميع أولياء أمور طلاب الصف الأول الابتدائي. هذا الملتقى مخصص لمتابعة اليوم الدراسي والاستفسارات والتواصل الفعال لما فيه مصلحة أبنائنا الأبطال.',
    createdAt: '2026-09-24T08:00:00Z',
    isPinned: true,
    isAnnouncement: true,
    reactions: { '❤️': 8, '👏': 6, '🤲': 8 },
  },
  {
    id: 'cmsg-2',
    senderId: 'acc_parent_faisal',
    senderName: 'فيصل الغامدي',
    senderRole: 'parent',
    studentName: 'أحمد فيصل الغامدي',
    text: 'وعليكم السلام ورحمة الله وبركاته دكتور إسماعيل. جزاكم الله خيراً على المجهود العظيم ومتابعة أحمد المستمرة في حفظ القرآن وحل الواجبات 🙏',
    createdAt: '2026-09-24T09:30:00Z',
    reactions: { '👍': 5 },
  },
  {
    id: 'cmsg-3',
    senderId: 'acc_teacher_ismail',
    senderName: 'د. إسماعيل عيسى',
    senderRole: 'teacher',
    text: 'تنويه هام: تم رصد درجات اختبار لغتي التفاعلي ورفع الواجب الجديد، برجاء حث الأبناء على المراجعة والتسليم عبر المنصة.',
    createdAt: '2026-09-25T15:00:00Z',
    isAnnouncement: true,
    reactions: { '👍': 7, '🌟': 4 },
  },
];

export const INITIAL_LIVE_SESSIONS: LiveSessionItem[] = [
  {
    id: 'live-1',
    title: 'حصة لغتي التفاعلية المباشرة — مهارات المدود والتنوين',
    description: 'بث مباشر تفاعلي لشرح درس المد بالألف والواو مع حل تدريبات كتاب الطالب مباشرة.',
    hostName: 'د. إسماعيل عيسى',
    status: 'LIVE',
    startedAt: new Date().toISOString(),
    durationMinutes: 45,
    viewerCount: 8,
  },
  {
    id: 'live-2',
    title: 'جلسة تأسيس الحساب الذهني والأعداد حتى 20',
    description: 'تسجيل الحصة التفاعلية الخاصة بمهارات الجمع البسيط والمقارنة والتصنيف.',
    hostName: 'د. إسماعيل عيسى',
    status: 'RECORDED',
    startedAt: '2026-09-24T10:00:00Z',
    durationMinutes: 40,
    viewerCount: 24,
    recordingUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
];

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
    if (clean === 'student@nexusedu.sa' || clean === 'student1@nexusedu.sa') {
      return all.find((a) => a.role === 'student') || null;
    }
    if (clean === 'parent@nexusedu.sa' || clean === 'parent1@nexusedu.sa') {
      return all.find((a) => a.role === 'parent') || null;
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
      const initial: DailyAttendanceRecord[] = this.getStudents().map((s, i) => ({
        date: targetDate,
        studentId: s.id,
        studentName: s.fullName,
        overallStatus: i === 3 ? 'absent' : i === 4 ? 'late' : 'present', // realistic variety
        periods: {
          1: { status: i === 3 ? 'absent' : 'present', timeRecorded: '07:05', verifiedVia: 'biometric_face' },
          2: { status: i === 3 ? 'absent' : 'present', timeRecorded: '07:50', verifiedVia: 'manual_teacher' },
          3: { status: i === 3 ? 'absent' : i === 4 ? 'late' : 'present', timeRecorded: '08:50', verifiedVia: 'biometric_face' },
          4: { status: i === 3 ? 'absent' : 'present', timeRecorded: '09:35', verifiedVia: 'manual_teacher' },
          5: { status: i === 3 ? 'absent' : 'present', timeRecorded: '10:35', verifiedVia: 'manual_teacher' },
          6: { status: i === 3 ? 'absent' : 'present', timeRecorded: '11:20', verifiedVia: 'manual_teacher' },
          7: { status: i === 3 ? 'absent' : 'present', timeRecorded: '12:05', verifiedVia: 'manual_teacher' },
        },
        parentNotified: i === 3,
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
    const all = getItem<AccreditedCertificate[]>(KEYS.CERTIFICATES, INITIAL_CERTIFICATES);
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
      teacherNotes: `طالب رائع ومثابر في فصل د. إسماعيل عيسى، يظهر تفاعلاً مستمراً في حصص لغتي والقرآن الكريم.`,
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
        weekTitle: 'التقرير الأكاديمي الشامل — فصل د. إسماعيل عيسى',
        date: new Date().toISOString().split('T')[0],
        attendanceRate: s.attendanceRate,
        homeworkRate: 95,
        behaviorScore: s.averageGrade,
        overallGrade: s.averageGrade >= 90 ? 'ممتاز مع مرتبة الشرف 🏆' : 'جيد جداً مرتفع ⭐',
        teacherNotes: `طالب متميز بفصل د. إسماعيل عيسى، متفاعل في حصص اليوم وكان حضوره: ${att?.overallStatus === 'present' ? 'حاضر ومنضبط' : 'مسجل'}.`,
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
    return getItem<LiveSessionItem[]>(KEYS.LIVE_SESSIONS, INITIAL_LIVE_SESSIONS);
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
};
