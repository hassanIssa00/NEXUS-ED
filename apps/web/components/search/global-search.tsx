'use client';

import { useEffect, useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import {
  Archive, Award, BarChart3, Bell, BookMarked, BookOpen, Brain, Calendar,
  Camera, CreditCard, FileText, Gamepad2, GraduationCap, HeartHandshake,
  LayoutDashboard, MessageSquare, QrCode, Radio, Search, Settings, Shield,
  Sparkles, Star, Trophy, Users, Video, type LucideIcon,
} from 'lucide-react';
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { useAuth, type UserRole } from '@/contexts/auth-context';
import { useRouter } from '@/i18n/routing';
import { useLocale } from 'next-intl';

type Group = 'الرئيسية' | 'التعلم' | 'التقارير والمتابعة' | 'التواصل' | 'إدارة المدرسة' | 'الحساب';
type SearchItem = {
  id: string; title: string; description: string; keywords: string; group: Group;
  href: string; icon: LucideIcon; roles: UserRole[];
};
type IndexedItem = SearchItem & { searchText: string };

const englishTitles: Record<string, string> = {
  'لوحة التحكم': 'Dashboard', 'جدول الحصص': 'Class Schedule', 'المناهج والكتب الدراسية': 'Curriculum and Textbooks',
  'المصحف الشريف': 'Holy Quran', 'الواجبات المدرسية': 'School Assignments', 'الاختبارات': 'Quizzes and Exams',
  'البث المباشر للحصص': 'Live Classes', 'الألعاب التعليمية': 'Educational Games', 'مسابقة نكسس الكبرى': 'Nexus Million Challenge',
  'سجل الحضور والغياب': 'Attendance Record', 'الدرجات والتقييم': 'Grades and Assessment', 'الإنجازات والشهادات': 'Achievements and Certificates',
  'الملف الذكي للطالب': 'Student Learning Profile', 'معرض الفعاليات والأنشطة': 'Events and Activities Gallery',
  'مجتمع المدرسة': 'School Community', 'التواصل والرسائل': 'Messages', 'إعدادات الحساب': 'Account Settings',
  'أدوات نكسس': 'Nexus Tools', 'فصولي والطلاب': 'My Classes and Students', 'المناهج والخطط الدراسية': 'Curriculum and Study Plans',
  'الواجبات والتصحيح': 'Assignments and Grading', 'تقارير اختبارات القبول': 'Admission Assessment Reports',
  'رصد الحضور والانضباط': 'Attendance and Conduct', 'التقارير الأسبوعية الشاملة': 'Weekly Reports',
  'الشهادات والأوسمة': 'Certificates and Awards', 'لقاءات أولياء الأمور': 'Parent Meetings', 'قاعات الاجتماعات': 'Meeting Rooms',
  'ملتقى أولياء الأمور': 'Parent Forum', 'معرض الأنشطة والفعاليات': 'Activities and Events Gallery',
  'الأرشيف المدرسي اليومي': 'Daily School Archive', 'تحضير الدروس': 'Lesson Planning', 'الرسائل المباشرة': 'Direct Messages',
  'التنبيهات': 'Notifications', 'جدول الحصص الأسبوعي': 'Weekly Class Schedule', 'سجل الحضور والانضباط': 'Attendance and Conduct Record',
  'التقرير الأكاديمي الشامل': 'Academic Report', 'تقارير اختبارات الأبناء': 'Children’s Assessment Reports',
  'درجات الأبناء': 'Children’s Grades', 'شهادات الأبناء': 'Children’s Certificates',
  'التواصل مع المعلمين': 'Contact Teachers', 'معرض فعاليات الفصل': 'Class Events Gallery', 'المدفوعات والمستحقات': 'Payments and Fees',
  'الإشعارات والتنبيهات': 'Alerts and Notifications', 'سجلات الطلاب': 'Student Records', 'المستخدمون': 'Users',
  'أرشيف التسجيلات': 'Enrollment Archive', 'الفصول الدراسية': 'Classes', 'المواد الدراسية': 'School Subjects',
  'التسجيلات والقبول': 'Enrollments and Admissions', 'المكتبة التعليمية': 'Learning Library', 'إدارة الألعاب التعليمية': 'Manage Educational Games',
  'الصلاحيات والحسابات': 'Roles and Permissions', 'التقارير والإحصاءات': 'Reports and Statistics', 'الجداول الدراسية': 'Class Schedules',
  'الحضور العام': 'School Attendance', 'المعلمون': 'Teachers', 'الطلاب': 'Students', 'حالات المتابعة': 'Student Support Cases',
  'الغيابات': 'Absences', 'استبيانات أولياء الأمور': 'Parent Surveys', 'التقارير': 'Reports', 'التقارير المالية': 'Financial Reports',
  'الفواتير والتحصيل': 'Invoices and Collections', 'دليل الموظفين': 'Staff Directory', 'ملخص الموارد البشرية': 'HR Summary',
};

const englishGroupLabels: Record<Group, string> = {
  'الرئيسية': 'Home', 'التعلم': 'Learning', 'التقارير والمتابعة': 'Reports and Progress',
  'التواصل': 'Communication', 'إدارة المدرسة': 'School Management', 'الحساب': 'Account',
};

const englishGroupDescriptions: Record<Group, string> = {
  'الرئيسية': 'Overview and key information for your portal',
  'التعلم': 'Open learning resources, classes, and activities',
  'التقارير والمتابعة': 'Review grades, attendance, and progress',
  'التواصل': 'Open messages, meetings, and school updates',
  'إدارة المدرسة': 'View and manage school records and activities',
  'الحساب': 'Manage your account and preferences',
};

const page = (
  id: string, title: string, href: string, group: Group, icon: LucideIcon,
  roles: UserRole[], description: string, keywords = '',
): SearchItem => ({ id, title, href, group, icon, roles, description, keywords });

// This catalog follows the portal navigation while keeping each role's results private to its own access.
const pages: SearchItem[] = [
  page('student-home', 'لوحة التحكم', '/student', 'الرئيسية', LayoutDashboard, ['student'], 'ملخص يومك الدراسي ومتابعة تقدمك', 'home dashboard'),
  page('student-schedule', 'جدول الحصص', '/student/schedule', 'التعلم', Calendar, ['student'], 'الحصص اليومية والأسبوعية والدرس القادم', 'جدول مواعيد timetable'),
  page('student-subjects', 'المناهج والكتب الدراسية', '/student/subjects', 'التعلم', BookOpen, ['student'], 'المواد والوحدات والكتب التفاعلية', 'منهج كتب مواد مقرر curriculum books subjects'),
  page('student-quran', 'المصحف الشريف', '/student/quran', 'التعلم', BookMarked, ['student'], 'قراءة ومتابعة ورد القرآن الكريم', 'قرآن قران مصحف quran'),
  page('student-assignments', 'الواجبات المدرسية', '/student/assignments', 'التعلم', FileText, ['student'], 'الواجبات المطلوبة والتسليمات السابقة', 'واجب واجبات تكليف homework assignments'),
  page('student-quizzes', 'الاختبارات', '/student/quizzes', 'التعلم', FileText, ['student'], 'الاختبارات القصيرة ومحاولاتك', 'اختبار كويز quiz test exams'),
  page('student-live', 'البث المباشر للحصص', '/student/live', 'التعلم', Radio, ['student'], 'الدخول إلى الحصص المباشرة', 'لايف بث مباشر live stream'),
  page('student-games', 'الألعاب التعليمية', '/student/games', 'التعلم', Gamepad2, ['student'], 'أنشطة وألعاب مرتبطة بالتعلم', 'لعب لعبة games'),
  page('student-million', 'مسابقة نكسس الكبرى', '/student/million', 'التعلم', Star, ['student'], 'تقدمك وإنجازاتك في رحلة المليون', 'المليون نقاط مكافآت million journey'),
  page('student-attendance', 'سجل الحضور والغياب', '/student/attendance', 'التقارير والمتابعة', QrCode, ['student'], 'الحضور والتأخر في الفصول', 'غياب حضور تأخير attendance absence'),
  page('student-grades', 'الدرجات والتقييم', '/student/grades', 'التقارير والمتابعة', Award, ['student'], 'درجاتك ونتائج المواد', 'نتيجة تقييم grades marks score'),
  page('student-certificates', 'الإنجازات والشهادات', '/student/certificates', 'التقارير والمتابعة', Trophy, ['student'], 'شهاداتك وإنجازاتك المدرسية', 'شهادة awards certificates'),
  page('student-profile', 'الملف الذكي للطالب', '/student/profile', 'التقارير والمتابعة', Brain, ['student'], 'ملفك الدراسي ومؤشرات التقدم', 'تحليل ذكي ai smart profile'),
  page('student-photos', 'معرض الفعاليات والأنشطة', '/student/photos', 'إدارة المدرسة', Camera, ['student'], 'صور وفعاليات المدرسة', 'صور نشاط فعاليات gallery'),
  page('student-community', 'مجتمع المدرسة', '/student/community', 'التواصل', Users, ['student'], 'المشاركات المدرسية والمجتمع التعليمي', 'community school'),
  page('student-messages', 'التواصل والرسائل', '/student/messages', 'التواصل', MessageSquare, ['student'], 'رسائلك ومحادثاتك', 'chat messages'),
  page('student-settings', 'إعدادات الحساب', '/student/settings', 'الحساب', Settings, ['student'], 'بيانات التواصل وكلمة المرور', 'اعدادات setting account'),

  page('teacher-home', 'لوحة التحكم', '/teacher', 'الرئيسية', LayoutDashboard, ['teacher'], 'ملخص الفصول والواجبات ومؤشرات اليوم', 'home dashboard'),
  page('teacher-tools', 'أدوات نكسس', '/teacher?tab=tools', 'التعلم', Sparkles, ['teacher'], 'الأتمتة الذكية وأدوات المعلم', 'الذكاء الاصطناعي الاتمته الأتمتة automation ai tools'),
  page('teacher-classes', 'فصولي والطلاب', '/teacher/classes', 'إدارة المدرسة', Users, ['teacher'], 'إدارة فصولك وفتح ملفات الطلاب', 'فصل فصول طالب classes students'),
  page('teacher-curriculum', 'المناهج والخطط الدراسية', '/teacher/curriculum', 'التعلم', BookMarked, ['teacher'], 'المواد والوحدات والدروس والكتب', 'منهج خطة دراسية كتاب وحدات curriculum'),
  page('teacher-assignments', 'الواجبات والتصحيح', '/teacher/assignments', 'التعلم', FileText, ['teacher'], 'إنشاء الواجبات ومراجعة تسليمات الطلاب', 'واجب تصحيح تسليم assignment grading'),
  page('teacher-assessments', 'تقارير اختبارات القبول', '/assessment/reports', 'التقارير والمتابعة', BarChart3, ['teacher'], 'اختبارات تحديد المستوى ونتائج المتقدمين', 'قبول اختبار مستوى placement assessment'),
  page('teacher-attendance', 'رصد الحضور والانضباط', '/teacher/attendance', 'التقارير والمتابعة', QrCode, ['teacher'], 'تسجيل الحضور والتأخر والغياب', 'حضور غياب attendance'),
  page('teacher-reports', 'التقارير الأسبوعية الشاملة', '/teacher/reports', 'التقارير والمتابعة', BarChart3, ['teacher'], 'تقارير الفصول والأداء الأكاديمي', 'تقارير أسبوعي أداء weekly report'),
  page('teacher-certificates', 'الشهادات والأوسمة', '/teacher/automation/certificates', 'التقارير والمتابعة', Award, ['teacher'], 'إصدار الشهادات ومتابعة التكريم', 'شهادة أوسمة certificates awards'),
  page('teacher-parent-meetings', 'لقاءات أولياء الأمور', '/teacher/meetings', 'التواصل', HeartHandshake, ['teacher'], 'مواعيد لقاءات الأسرة والمعلمين', 'ولي أمر اجتماع parent meeting'),
  page('teacher-meetings', 'قاعات الاجتماعات', '/meetings', 'التواصل', Video, ['teacher'], 'غرف الاجتماعات الداخلية للمدرسة', 'اجتماع مكالمة meeting rooms'),
  page('student-meetings', 'قاعات الاجتماعات', '/meetings', 'التواصل', Video, ['student'], 'انضم إلى الحصة المباشرة أو اجتماع الفصل من حساب الطالب', 'اجتماع بث مباشر meeting room'),
  page('teacher-live', 'البث المباشر للحصص', '/teacher/live', 'التعلم', Radio, ['teacher'], 'إدارة الحصص المباشرة', 'بث لايف live stream'),
  page('teacher-community', 'ملتقى أولياء الأمور', '/teacher/community', 'التواصل', Users, ['teacher'], 'مساحة التواصل مع أسر الطلاب', 'ملتقى مجتمع community'),
  page('teacher-photos', 'معرض الأنشطة والفعاليات', '/teacher/photos', 'إدارة المدرسة', Camera, ['teacher'], 'صور وأنشطة الفصول', 'صور فعاليات gallery'),
  page('teacher-archive', 'الأرشيف المدرسي اليومي', '/teacher/archive', 'إدارة المدرسة', Archive, ['teacher'], 'السجلات والوقائع اليومية', 'أرشيف سجل يومي archive'),
  page('teacher-lessons', 'تحضير الدروس', '/teacher/lessons', 'التعلم', BookOpen, ['teacher'], 'إعداد خطط الدروس ومصادرها', 'تحضير درس خطة lesson plan'),
  page('teacher-messages', 'الرسائل المباشرة', '/teacher/messages', 'التواصل', MessageSquare, ['teacher'], 'محادثاتك مع الطلاب وأولياء الأمور', 'رسائل chat'),
  page('teacher-notifications', 'التنبيهات', '/teacher/notifications', 'التواصل', Bell, ['teacher'], 'الإشعارات والتنبيهات الجديدة', 'إشعارات تنبيه alerts'),
  page('teacher-settings', 'إعدادات الحساب', '/teacher/settings', 'الحساب', Settings, ['teacher'], 'بيانات التواصل وكلمة المرور', 'اعدادات setting'),

  page('parent-home', 'لوحة التحكم', '/parent', 'الرئيسية', LayoutDashboard, ['parent'], 'ملخص متابعة الأبناء', 'home dashboard'),
  page('parent-schedule', 'جدول الحصص الأسبوعي', '/parent/schedule', 'التعلم', Calendar, ['parent'], 'مواعيد حصص الأبناء والدرس القادم', 'جدول حصص schedule'),
  page('parent-attendance', 'سجل الحضور والانضباط', '/parent/attendance', 'التقارير والمتابعة', QrCode, ['parent'], 'متابعة حضور الأبناء وتأخرهم', 'غياب تأخير attendance'),
  page('parent-reports', 'التقرير الأكاديمي الشامل', '/parent/reports', 'التقارير والمتابعة', BarChart3, ['parent'], 'ملخص الأداء والتقدم الدراسي', 'تقرير نتائج report academic'),
  page('parent-assessments', 'تقارير اختبارات الأبناء', '/assessment/reports', 'التقارير والمتابعة', GraduationCap, ['parent'], 'نتائج اختبار القبول وتحديد المستوى', 'قبول اختبار مستوى placement'),
  page('parent-grades', 'درجات الأبناء', '/parent/grades', 'التقارير والمتابعة', Award, ['parent'], 'درجات المواد والتقييمات', 'نتيجة marks grades'),
  page('parent-certificates', 'شهادات الأبناء', '/parent/certificates', 'التقارير والمتابعة', Trophy, ['parent'], 'الشهادات والإنجازات المدرسية', 'شهادة certificates'),
  page('parent-meetings', 'لقاءات أولياء الأمور', '/parent/meetings', 'التواصل', HeartHandshake, ['parent'], 'حجز ومتابعة لقاءات المدرسة', 'اجتماع معلم meetings'),
  page('parent-nexus-meetings', 'قاعات الاجتماعات', '/meetings', 'التواصل', Video, ['parent'], 'انضم إلى اجتماع دعاك إليه المعلم من حساب ولي الأمر', 'اجتماع مكالمة meeting rooms'),
  page('parent-messages', 'التواصل مع المعلمين', '/parent/messages', 'التواصل', MessageSquare, ['parent'], 'الرسائل والمحادثات المدرسية', 'رسائل محادثة message'),
  page('parent-community', 'ملتقى أولياء الأمور', '/parent/community', 'التواصل', Users, ['parent'], 'مجتمع المدرسة والأسرة', 'مجتمع community'),
  page('parent-photos', 'معرض فعاليات الفصل', '/parent/photos', 'إدارة المدرسة', Camera, ['parent'], 'صور ومناسبات الفصل الدراسي', 'صور فعاليات gallery'),
  page('parent-payments', 'المدفوعات والمستحقات', '/parent/payments', 'إدارة المدرسة', CreditCard, ['parent'], 'متابعة الرسوم والفواتير', 'دفع رسوم فاتورة invoice payments'),
  page('parent-notifications', 'الإشعارات والتنبيهات', '/parent/notifications', 'التواصل', Bell, ['parent'], 'تنبيهات الأبناء والمدرسة', 'تنبيه إشعار alerts'),
  page('parent-settings', 'إعدادات الحساب', '/parent/settings', 'الحساب', Settings, ['parent'], 'بيانات التواصل وكلمة المرور', 'اعدادات setting'),

  page('admin-home', 'لوحة التحكم', '/admin', 'الرئيسية', LayoutDashboard, ['admin', 'manager'], 'مؤشرات المدرسة والإدارة', 'home dashboard'),
  page('admin-students', 'سجلات الطلاب', '/admin/students', 'إدارة المدرسة', GraduationCap, ['admin', 'manager'], 'ملفات الطلاب وبياناتهم الدراسية', 'طلاب طالب student records'),
  page('admin-users', 'المستخدمون', '/admin/users', 'إدارة المدرسة', Users, ['admin', 'manager'], 'إدارة حسابات وأدوار المستخدمين', 'حسابات مستخدمين users accounts'),
  page('admin-registration', 'أرشيف التسجيلات', '/admin/registration-archive', 'إدارة المدرسة', Archive, ['admin', 'manager'], 'طلبات التسجيل المحفوظة', 'قبول تسجيل archive'),
  page('admin-classes', 'الفصول الدراسية', '/admin/classes', 'إدارة المدرسة', BookOpen, ['admin', 'manager'], 'إدارة الصفوف والفصول', 'فصول صفوف classes'),
  page('admin-subjects', 'المواد الدراسية', '/admin/subjects', 'إدارة المدرسة', BookMarked, ['admin', 'manager'], 'إدارة مواد ومقررات المدرسة', 'مواد مقررات subjects curriculum'),
  page('admin-enrollments', 'التسجيلات والقبول', '/admin/enrollments', 'إدارة المدرسة', GraduationCap, ['admin', 'manager'], 'التسجيلات والطلاب المقبولون', 'تسجيل enrollments'),
  page('admin-assessments', 'تقارير اختبارات القبول', '/assessment/reports', 'التقارير والمتابعة', BarChart3, ['admin', 'manager'], 'اختبارات تحديد المستوى', 'اختبار قبول placement'),
  page('admin-content', 'المكتبة التعليمية', '/admin/content', 'التعلم', Video, ['admin', 'manager'], 'إدارة المحتوى والمصادر التعليمية', 'مكتبة محتوى library'),
  page('admin-games', 'إدارة الألعاب التعليمية', '/admin/games', 'التعلم', Gamepad2, ['admin', 'manager'], 'الألعاب والأنشطة التعليمية', 'لعبة games'),
  page('admin-permissions', 'الصلاحيات والحسابات', '/admin/permissions', 'إدارة المدرسة', Shield, ['admin', 'manager'], 'مراجعة الأدوار والصلاحيات', 'صلاحيات حماية role permissions'),
  page('admin-meetings', 'قاعات الاجتماعات', '/meetings', 'التواصل', Video, ['admin', 'manager'], 'اجتماعات الإدارة وفريق المدرسة', 'اجتماعات meetings'),

  page('principal-home', 'لوحة التحكم', '/principal', 'الرئيسية', LayoutDashboard, ['principal'], 'مؤشرات المدرسة ومتابعة العمل', 'dashboard'),
  page('principal-students', 'سجلات الطلاب', '/principal/students', 'إدارة المدرسة', GraduationCap, ['principal'], 'متابعة ملفات الطلاب', 'طلاب students'),
  page('principal-classes', 'الفصول الدراسية', '/principal/classes', 'إدارة المدرسة', Users, ['principal'], 'متابعة الفصول والصفوف', 'فصول classes'),
  page('principal-teachers', 'المعلمون', '/principal/teachers', 'إدارة المدرسة', Users, ['principal'], 'متابعة هيئة التدريس', 'مدرسين teachers'),
  page('principal-reports', 'التقارير والإحصاءات', '/principal/analytics', 'التقارير والمتابعة', BarChart3, ['principal'], 'مؤشرات الأداء المدرسي', 'احصائيات analytics reports'),
  page('principal-meetings', 'قاعات الاجتماعات', '/meetings', 'التواصل', Video, ['principal'], 'اجتماعات فريق الإدارة', 'اجتماعات meetings'),

  page('vice-home', 'لوحة التحكم', '/vice_principal', 'الرئيسية', LayoutDashboard, ['vice_principal'], 'ملخص مهام وكيل المدرسة', 'dashboard'),
  page('vice-schedules', 'الجداول الدراسية', '/vice_principal/schedules', 'التعلم', Calendar, ['vice_principal'], 'جداول الصفوف والمعلمين', 'جدول حصص schedules'),
  page('vice-attendance', 'الحضور العام', '/vice_principal/attendance', 'التقارير والمتابعة', QrCode, ['vice_principal'], 'متابعة الحضور والانضباط', 'غياب attendance'),
  page('vice-students', 'سجلات الطلاب', '/vice_principal/students', 'إدارة المدرسة', GraduationCap, ['vice_principal'], 'متابعة بيانات الطلاب', 'طلاب students'),
  page('vice-classes', 'الفصول الدراسية', '/vice_principal/classes', 'إدارة المدرسة', BookOpen, ['vice_principal'], 'عرض فصول المدرسة', 'فصول classes'),
  page('vice-meetings', 'قاعات الاجتماعات', '/meetings', 'التواصل', Video, ['vice_principal'], 'اجتماعات الإدارة', 'اجتماعات meetings'),

  page('counselor-home', 'لوحة التحكم', '/counselor', 'الرئيسية', LayoutDashboard, ['counselor'], 'ملخص الإرشاد الطلابي', 'dashboard'),
  page('counselor-students', 'الطلاب', '/counselor/students', 'إدارة المدرسة', Users, ['counselor'], 'متابعة الطلاب وملفاتهم', 'student'),
  page('counselor-classes', 'الفصول الدراسية', '/counselor/classes', 'إدارة المدرسة', BookOpen, ['counselor'], 'متابعة طلاب الفصول', 'فصول classes'),
  page('counselor-cases', 'حالات المتابعة', '/counselor/cases', 'التقارير والمتابعة', HeartHandshake, ['counselor'], 'الحالات والخطط الإرشادية', 'إرشاد case counseling'),
  page('counselor-attendance', 'الغيابات', '/counselor/attendance', 'التقارير والمتابعة', Calendar, ['counselor'], 'متابعة الغياب والتأخر', 'غياب absence'),
  page('counselor-surveys', 'استبيانات أولياء الأمور', '/counselor/parent-surveys', 'التقارير والمتابعة', FileText, ['counselor'], 'مراجعة استبيانات الأسر', 'استبيان ولي الأمر survey'),
  page('counselor-meetings', 'قاعات الاجتماعات', '/meetings', 'التواصل', Video, ['counselor'], 'اجتماعات المرشد والفريق', 'اجتماع meetings'),

  page('supervisor-home', 'لوحة التحكم', '/supervisor', 'الرئيسية', LayoutDashboard, ['supervisor'], 'ملخص الإشراف التربوي', 'dashboard'),
  page('supervisor-students', 'سجلات الطلاب', '/supervisor/students', 'إدارة المدرسة', GraduationCap, ['supervisor'], 'متابعة بيانات الطلاب', 'طلاب students'),
  page('supervisor-teachers', 'المعلمون', '/supervisor/teachers', 'إدارة المدرسة', Users, ['supervisor'], 'متابعة أداء المعلمين', 'مدرسين teachers'),
  page('supervisor-classes', 'الفصول الدراسية', '/supervisor/classes', 'إدارة المدرسة', BookOpen, ['supervisor'], 'متابعة فصول المدرسة', 'فصول classes'),
  page('supervisor-reports', 'التقارير', '/supervisor/reports', 'التقارير والمتابعة', BarChart3, ['supervisor'], 'تقارير الإشراف والمتابعة', 'reports'),
  page('supervisor-meetings', 'قاعات الاجتماعات', '/meetings', 'التواصل', Video, ['supervisor'], 'اجتماعات فريق الإشراف', 'اجتماعات'),

  page('accountant-home', 'لوحة التحكم', '/accountant', 'الرئيسية', LayoutDashboard, ['accountant'], 'ملخص الحسابات المدرسية', 'dashboard'),
  page('accountant-students', 'سجلات الطلاب', '/accountant/students', 'إدارة المدرسة', GraduationCap, ['accountant'], 'بيانات الطلاب المرتبطة بالحسابات', 'طلاب students'),
  page('accountant-classes', 'الفصول الدراسية', '/accountant/classes', 'إدارة المدرسة', BookOpen, ['accountant'], 'متابعة الفصول', 'فصول classes'),
  page('accountant-reports', 'التقارير المالية', '/accountant/reports', 'التقارير والمتابعة', BarChart3, ['accountant'], 'تقارير الرسوم والإيرادات', 'رسوم مالية reports'),
  page('accountant-invoices', 'الفواتير والتحصيل', '/accountant/invoices', 'إدارة المدرسة', CreditCard, ['accountant'], 'الفواتير والمدفوعات المدرسية', 'فاتورة دفع payments'),
  page('accountant-meetings', 'قاعات الاجتماعات', '/meetings', 'التواصل', Video, ['accountant'], 'اجتماعات فريق المدرسة', 'اجتماعات'),

  page('hr-home', 'لوحة التحكم', '/hr', 'الرئيسية', LayoutDashboard, ['hr'], 'ملخص الموارد البشرية', 'dashboard'),
  page('hr-students', 'سجلات الطلاب', '/hr/students', 'إدارة المدرسة', GraduationCap, ['hr'], 'متابعة بيانات الطلاب', 'طلاب students'),
  page('hr-classes', 'الفصول الدراسية', '/hr/classes', 'إدارة المدرسة', BookOpen, ['hr'], 'قوائم الفصول', 'فصول classes'),
  page('hr-employees', 'دليل الموظفين', '/hr/employees', 'إدارة المدرسة', Users, ['hr'], 'ملفات منسوبي المدرسة', 'موظفين معلمين staff employees'),
  page('hr-reports', 'ملخص الموارد البشرية', '/hr/reports', 'التقارير والمتابعة', BarChart3, ['hr'], 'تقارير الموظفين', 'موظفين reports'),
  page('hr-meetings', 'قاعات الاجتماعات', '/meetings', 'التواصل', Video, ['hr'], 'اجتماعات فريق المدرسة', 'اجتماعات'),

  page('admin-settings', 'إعدادات الحساب', '/admin/settings', 'الحساب', Settings, ['admin', 'manager'], 'إعدادات حساب المدرسة', 'اعدادات setting account'),
];

function normalizeArabic(value: string) {
  return value.normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .toLocaleLowerCase('ar')
    .replace(/[^\p{L}\p{N}\s/-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function groupResults(items: SearchItem[]) {
  const groups = new Map<Group, SearchItem[]>();
  for (const item of items) groups.set(item.group, [...(groups.get(item.group) ?? []), item]);
  return [...groups.entries()];
}

export function GlobalSearch() {
  const locale = useLocale();
  const isEnglish = locale === 'en';
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const { profile } = useAuth();
  const router = useRouter();
  const role = profile?.role;
  const availableItems = useMemo(() => pages.filter((item) => role && item.roles.includes(role)), [role]);
  const indexedItems = useMemo<IndexedItem[]>(
    () => availableItems.map((item) => ({ ...item, searchText: normalizeArabic([item.title, item.description, item.keywords, item.href, englishTitles[item.title] ?? '', englishGroupLabels[item.group], englishGroupDescriptions[item.group]].join(' ')) })),
    [availableItems],
  );
  const fuse = useMemo(() => new Fuse(indexedItems, {
    keys: ['searchText'], includeScore: true, threshold: 0.38, ignoreLocation: true, minMatchCharLength: 2,
  }), [indexedItems]);
  const query = normalizeArabic(search);
  const results = useMemo(() => {
    if (!query) {
      const recent = recentIds.map((id) => availableItems.find((item) => item.id === id)).filter((item): item is SearchItem => Boolean(item));
      return (recent.length ? recent : availableItems).slice(0, 8);
    }
    const direct = fuse.search(query);
    if (direct.length) return direct.slice(0, 14).map((result) => result.item);
    const tokens = query.split(' ').filter((token) => token.length > 1);
    if (tokens.length < 2) return [];
    const matches = new Map<string, { item: SearchItem; score: number; count: number }>();
    for (const token of tokens) for (const result of fuse.search(token).slice(0, 18)) {
      const match = matches.get(result.item.id) ?? { item: result.item, score: 0, count: 0 };
      match.score += result.score ?? 1; match.count += 1; matches.set(result.item.id, match);
    }
    return [...matches.values()].filter((match) => match.count === tokens.length)
      .sort((a, b) => a.score - b.score).slice(0, 14).map((match) => match.item);
  }, [availableItems, fuse, query, recentIds]);

  useEffect(() => {
    if (!open || !role) return;
    try {
      const saved = sessionStorage.getItem('nexus-search-recent:' + role);
      setRecentIds(saved ? JSON.parse(saved) as string[] : []);
    } catch { setRecentIds([]); }
  }, [open, role]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setSearch(''); setOpen((value) => !value);
      }
    };
    document.addEventListener('keydown', onShortcut);
    return () => document.removeEventListener('keydown', onShortcut);
  }, []);

  const handleSelect = (item: SearchItem) => {
    if (role) {
      const next = [item.id, ...recentIds.filter((id) => id !== item.id)].slice(0, 5);
      setRecentIds(next);
      try { sessionStorage.setItem('nexus-search-recent:' + role, JSON.stringify(next)); } catch { /* Storage is optional. */ }
    }
    setOpen(false);
    router.push(item.href as never);
  };
  const grouped = groupResults(results);

  return (
    <>
      <button type="button" onClick={() => { setSearch(''); setOpen(true); }} aria-label={isEnglish ? 'Search Nexus' : 'ابحث في نكسس'}
        className="group flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-600 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
        <Search className="h-4 w-4 shrink-0 text-sky-700 transition group-hover:scale-110" />
        <span className="hidden text-sm font-semibold sm:inline">{isEnglish ? 'Search Nexus' : 'ابحث في نكسس'}</span>
        <kbd className="hidden items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 md:inline-flex">Ctrl K</kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}
        contentClassName="max-w-xl overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl">
        <div dir={isEnglish ? 'ltr' : 'rtl'} className="border-b border-slate-100 bg-gradient-to-l from-sky-50 via-white to-indigo-50 px-5 pt-5">
          <div className="mb-3 flex items-start justify-between gap-4 pr-10">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-100 text-sky-800"><Search className="h-5 w-5" /></span>
              <div><p className="font-bold text-slate-900">{isEnglish ? 'Search Nexus' : 'ابحث في نكسس'}</p><p className="mt-0.5 text-xs text-slate-500">{isEnglish ? 'Find a page or service in your portal' : 'ابحث عن صفحة أو خدمة في بوابتك'}</p></div>
            </div>
          </div>
          <CommandInput dir={isEnglish ? 'ltr' : 'rtl'} autoFocus value={search} onValueChange={setSearch}
            placeholder={isEnglish ? 'Try: schedule, attendance, assignments...' : 'مثال: جدول الحصص، الغياب، الواجبات...'} className={`h-12 ${isEnglish ? 'text-left' : 'text-right'} placeholder:text-slate-400`} />
        </div>
        <CommandList className="max-h-[min(60vh,520px)] p-2">
          <CommandEmpty>
            <div className="mx-auto flex max-w-xs flex-col items-center gap-2 py-7 text-slate-500">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-slate-100"><Search className="h-5 w-5" /></span>
              <span className="font-semibold text-slate-700">{isEnglish ? 'No matching pages found' : 'ما لقينا صفحة مطابقة'}</span>
              <span className="text-xs">{isEnglish ? 'Try a shorter search term, such as “schedule” or “attendance”.' : 'جرّب كلمة أقصر مثل «جدول» أو «غياب».'}</span>
            </div>
          </CommandEmpty>
          {!query && <p className="px-3 pb-2 pt-1 text-xs font-semibold text-slate-400">{isEnglish ? (recentIds.length ? 'Recently opened' : 'Popular pages') : (recentIds.length ? 'آخر الصفحات التي فتحتها' : 'ابدأ من الصفحات الأكثر استخدامًا')}</p>}
          {grouped.map(([group, items]) => (
            <CommandGroup key={group} heading={isEnglish ? englishGroupLabels[group] : group} className="px-1 pb-1">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem key={item.id} value={item.id + ' ' + item.title + ' ' + (englishTitles[item.title] ?? '')} onSelect={() => handleSelect(item)}
                    className="group mb-1 min-h-[58px] cursor-pointer rounded-xl px-3 py-2.5 aria-selected:bg-sky-50 aria-selected:text-slate-900">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 transition group-aria-selected:bg-sky-100 group-aria-selected:text-sky-800"><Icon className="h-4 w-4" /></span>
                    <span className={`min-w-0 flex-1 ${isEnglish ? 'text-left' : 'text-right'}`}><span className="block truncate text-sm font-semibold text-slate-800">{isEnglish ? (englishTitles[item.title] ?? 'Portal page') : item.title}</span><span className="mt-0.5 block truncate text-xs font-normal text-slate-500">{isEnglish ? englishGroupDescriptions[item.group] : item.description}</span></span>
                    <span className="shrink-0 text-[10px] text-slate-400">{isEnglish ? 'Open' : 'فتح'}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-2.5 text-[11px] text-slate-500">
          <span>{isEnglish ? 'Search supports Arabic spelling variations' : 'البحث يتعامل مع اختلافات كتابة العربية'}</span><span className="flex items-center gap-2" dir="ltr"><kbd className="rounded border bg-white px-1.5 py-0.5">Esc</kbd><kbd className="rounded border bg-white px-1.5 py-0.5">↑ ↓</kbd><kbd className="rounded border bg-white px-1.5 py-0.5">Enter</kbd></span>
        </div>
      </CommandDialog>
    </>
  );
}
