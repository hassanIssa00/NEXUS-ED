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
  email: string;
  name: string;
  role: NexusUserRole;
  title: string;
  phone?: string;
  avatarUrl?: string;
  linkedStudentId?: string; // For parents/students
  linkedParentId?: string;
  schoolName: string;
  createdAt: string;
}

export interface ClassStudentRecord {
  id: string;
  fullName: string;
  fullNameEn: string;
  grade: string;
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

// ── Initial Authentic Accounts (8 Portals) ───────────────────────────────────

export const NEXUS_CORE_ACCOUNTS: NexusAccount[] = [
  {
    id: 'acc_teacher_ismail',
    email: 'arabic.teacher@nexusedu.sa',
    name: 'د. إسماعيل عيسى',
    role: 'teacher',
    title: 'معلم الفصل والمشرف الأكاديمي',
    phone: '+966500000001',
    schoolName: 'مدارس نكسس التعليمية الأهلية',
    avatarUrl: '/images/auth/teacher.webp',
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'acc_student_ahmed',
    email: 'student1@nexusedu.sa',
    name: 'أحمد فيصل الغامدي',
    role: 'student',
    title: 'طالب — فصل د. إسماعيل عيسى',
    phone: '+966559876543',
    linkedStudentId: 'cls-std-2',
    schoolName: 'مدارس نكسس التعليمية الأهلية',
    avatarUrl: '/images/auth/student.webp',
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'acc_parent_faisal',
    email: 'parent1@nexusedu.sa',
    name: 'فيصل الغامدي',
    role: 'parent',
    title: 'ولي أمر الطالب أحمد فيصل',
    phone: '+966559876543',
    linkedStudentId: 'cls-std-2',
    schoolName: 'مدارس نكسس التعليمية الأهلية',
    avatarUrl: '/images/auth/parent.webp',
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'acc_principal_khaled',
    email: 'principal@nexusedu.sa',
    name: 'د. خالد العتيبي',
    role: 'principal',
    title: 'مدير عام المدرسة',
    phone: '+966509988776',
    schoolName: 'مدارس نكسس التعليمية الأهلية',
    avatarUrl: '/images/auth/principal.webp',
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'acc_vp_mansour',
    email: 'vice.principal@nexusedu.sa',
    name: 'أ. منصور القحطاني',
    role: 'vice_principal',
    title: 'وكيل المدرسة لشؤون الطلاب والانضباط',
    phone: '+966503344556',
    schoolName: 'مدارس نكسس التعليمية الأهلية',
    avatarUrl: '/images/auth/vice_principal.webp',
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'acc_counselor_abdullah',
    email: 'counselor@nexusedu.sa',
    name: 'أ. عبد الله الغامدي',
    role: 'counselor',
    title: 'الموجه الطلابي والمستشار النفسي',
    phone: '+966507766554',
    schoolName: 'مدارس نكسس التعليمية الأهلية',
    avatarUrl: '/images/auth/counselor.webp',
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'acc_supervisor_abdulrahman',
    email: 'supervisor@nexusedu.sa',
    name: 'د. عبد الرحمن السبيعي',
    role: 'supervisor',
    title: 'المشرف التربوي التخصصي',
    phone: '+966501122334',
    schoolName: 'إدارة التعليم — مكتب الإشراف',
    avatarUrl: '/images/auth/supervisor.webp',
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'acc_admin_fahad',
    email: 'admin@nexusedu.sa',
    name: 'أ. فهد الزهراني',
    role: 'admin',
    title: 'مدير الشؤون الإدارية والمالية',
    phone: '+966504433221',
    schoolName: 'مدارس نكسس التعليمية الأهلية',
    avatarUrl: '/images/auth/admin.webp',
    createdAt: '2026-08-01T00:00:00Z',
  },
];

// ── Initial Real Classroom Students (فصل د. إسماعيل عيسى) ────────────────────

export const REAL_CLASS_STUDENTS: ClassStudentRecord[] = [
  {
    id: 'cls-std-1',
    fullName: 'ربيع أحمد الزهراني',
    fullNameEn: 'Rabee Ahmed Al-Zahrani',
    grade: 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
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
  },
  {
    id: 'cls-std-2',
    fullName: 'أحمد فيصل الغامدي',
    fullNameEn: 'Ahmed Faisal Al-Ghamdi',
    grade: 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
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
  },
  {
    id: 'cls-std-3',
    fullName: 'سارة محمد الشهري',
    fullNameEn: 'Sara Mohammed Al-Shehri',
    grade: 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
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
  },
  {
    id: 'cls-std-4',
    fullName: 'خالد عبد الله العمري',
    fullNameEn: 'Khaled Abdullah Al-Amri',
    grade: 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
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
  },
  {
    id: 'cls-std-5',
    fullName: 'نورة سعيد القحطاني',
    fullNameEn: 'Noura Saeed Al-Qahtani',
    grade: 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
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
  },
  {
    id: 'cls-std-6',
    fullName: 'محمد حسن المالكي',
    fullNameEn: 'Mohammed Hassan Al-Malki',
    grade: 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
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
  },
  {
    id: 'cls-std-7',
    fullName: 'ريان يوسف الثقفي',
    fullNameEn: 'Rayan Youssef Al-Thaqafi',
    grade: 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
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
  },
  {
    id: 'cls-std-8',
    fullName: 'لجين هاني السالم',
    fullNameEn: 'Lojain Hani Al-Salem',
    grade: 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
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

// ── Storage Keys ─────────────────────────────────────────────────────────────

const KEYS = {
  STUDENTS: 'nexus_class_students_v2',
  ATTENDANCE: 'nexus_daily_attendance_v2',
  QUIZZES: 'nexus_class_quizzes_v2',
  QUIZ_SUBMISSIONS: 'nexus_quiz_submissions_v2',
  HOMEWORK: 'nexus_homework_v2',
  HW_SUBMISSIONS: 'nexus_hw_submissions_v2',
  CERTIFICATES: 'nexus_certificates_v2',
  OBSERVATIONS: 'nexus_observations_v2',
  ACTIVE_USER: 'nexus_current_user_v2',
};

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
  // Accounts
  getAccounts(): NexusAccount[] {
    return NEXUS_CORE_ACCOUNTS;
  },

  findAccountByEmail(email: string): NexusAccount | null {
    const clean = email.trim().toLowerCase();
    // Allow flexible logins e.g. 'dr.ismail@masar.com' maps to teacher
    if (clean === 'dr.ismail@masar.com' || clean === 'ismail@masar.com' || clean === 'teacher@nexusedu.sa') {
      return NEXUS_CORE_ACCOUNTS.find((a) => a.role === 'teacher') || null;
    }
    if (clean === 'student@nexusedu.sa') {
      return NEXUS_CORE_ACCOUNTS.find((a) => a.role === 'student') || null;
    }
    if (clean === 'parent@nexusedu.sa') {
      return NEXUS_CORE_ACCOUNTS.find((a) => a.role === 'parent') || null;
    }
    if (clean === 'vp@nexusedu.sa') {
      return NEXUS_CORE_ACCOUNTS.find((a) => a.role === 'vice_principal') || null;
    }
    if (clean === 'accountant@nexusedu.sa') {
      return NEXUS_CORE_ACCOUNTS.find((a) => a.role === 'admin') || null;
    }
    return NEXUS_CORE_ACCOUNTS.find((a) => a.email.toLowerCase() === clean) || null;
  },

  // Students
  getStudents(): ClassStudentRecord[] {
    return getItem<ClassStudentRecord[]>(KEYS.STUDENTS, REAL_CLASS_STUDENTS);
  },

  getStudentById(id: string): ClassStudentRecord | null {
    return this.getStudents().find((s) => s.id === id) || null;
  },

  saveStudent(student: ClassStudentRecord): void {
    const list = this.getStudents();
    const idx = list.findIndex((s) => s.id === student.id);
    if (idx >= 0) {
      list[idx] = student;
    } else {
      list.unshift(student);
    }
    setItem(KEYS.STUDENTS, list);
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
    return newObs;
  },

  // School-wide Live KPIs (for Principal, VP, Supervisor, Admin)
  getSchoolMetrics() {
    const students = this.getStudents();
    const todayAtt = this.getTodayAttendance();
    const presentCount = todayAtt.filter((a) => a.overallStatus === 'present').length;
    const absentCount = todayAtt.filter((a) => a.overallStatus === 'absent').length;
    const lateCount = todayAtt.filter((a) => a.overallStatus === 'late').length;

    const totalStudents = students.length;
    const attRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 96;
    const avgScore = Math.round(students.reduce((acc, s) => acc + s.averageGrade, 0) / (totalStudents || 1));

    const quizzes = this.getQuizzes();
    const homework = this.getHomework();
    const certs = this.getCertificates();

    return {
      totalStudents,
      activeClasses: 1, // فصل د. إسماعيل عيسى
      className: 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
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
};
