'use client'

import { FormEvent, Fragment, useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Activity, AlertTriangle, BookOpen, CalendarDays, CircleAlert, Download, GraduationCap, Loader2, RefreshCw, School, Users, Wallet } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { PresenceBadge } from '@/components/ui/presence-badge'
import { DatePicker } from '@/components/ui/date-picker'
import { PrintReportButton, ReportPrintFooter, ReportPrintIdentity } from '@/components/reports/report-print-tools'
import { ClassHierarchyPicker } from '@/components/classes/ClassHierarchyPicker'
import { parseClassName } from '@/lib/school-class-hierarchy'

type Mode = 'classes' | 'students' | 'teachers' | 'staff' | 'attendance' | 'cases' | 'finance-report' | 'staff-report' | 'supervisor-report'
type SchoolClass = { id: string; name: string; teacher?: { name?: string | null; email?: string | null } | null; _count?: { students?: number; subjects?: number } }
type ClassRosterStudent = { id: string; name?: string | null; firstName?: string | null; lastName?: string | null; avatar?: string | null }
type ClassActivity = { classId: string; className: string; studentsCount: number; avgAttendance: number | null; avgGrade: number | null; assignmentsCompleted: number; totalAssignments: number; status: string }
type TeacherPerformance = { teacherId: string; teacherName: string; stats: { classesCount: number; subjectsCount: number; assignmentsCreated: number; assignmentsGraded: number; avgStudentScore: number | null } }
type StaffMember = { id: string; name?: string | null; firstName?: string | null; lastName?: string | null; email: string; role: string; phone?: string | null; avatar?: string | null; isActive?: boolean; lastActiveDate?: string | null }
type UserPageMeta = { page: number; totalPages: number; total: number }
type AttendanceData = { class: { id: string; name: string }; date: string; students: Array<{ id: string; name?: string | null; firstName?: string | null; lastName?: string | null; avatar?: string | null }>; records: Array<{ studentId: string; status: string; notes?: string | null }> }
type Warning = { studentId: string; studentName: string; classId: string; className: string; riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; alerts: Array<{ type: string; value: number }> }
type Copy = { title: string; subtitle: string; loading: string; error: string; refresh: string; empty: string; export: string; name: string; email: string; phone: string; role: string; status: string; active: string; inactive: string; students: string; subjects: string; teacher: string; attendance: string; grade: string; assignments: string; class: string; date: string; selectClass: string; present: string; absent: string; late: string; excused: string; risk: string; severity: string; classes: string; staff: string; teachers: string; highCases: string; totalRevenue: string; months: string; month: string; amount: string; employees: string; reports: string; assignedClasses: string; graded: string; noAttendance: string; noClasses: string; statusLabels: Record<string, string>; riskLabels: Record<string, string>; roleLabels: Record<string, string> }

const words: Record<'ar' | 'en', Record<Mode, Copy>> = {
  ar: {
    classes: { title: 'الفصول الدراسية', subtitle: 'قائمة الفصول المسجلة وأعداد الطلاب والمواد من بيانات المدرسة.', loading: 'جار تحميل الفصول...', error: 'تعذر تحميل الفصول من النظام.', refresh: 'تحديث', empty: 'لا توجد فصول مسجلة للمدرسة حتى الآن.', export: 'تصدير CSV', name: 'الفصل', email: 'البريد الإلكتروني', phone: 'الهاتف', role: 'الدور', status: 'الحالة', active: 'نشط', inactive: 'غير نشط', students: 'الطلاب', subjects: 'المواد', teacher: 'المعلم المسؤول', attendance: 'الحضور', grade: 'متوسط الدرجات', assignments: 'تسليمات الواجبات', class: 'الفصل', date: 'التاريخ', selectClass: 'اختر فصلًا', present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'بعذر', risk: 'مؤشرات المتابعة', severity: 'مستوى الحالة', classes: 'الفصول', staff: 'الموظفون', teachers: 'المعلمون', highCases: 'حالات تحتاج تدخلًا', totalRevenue: 'الإيرادات المحصلة', months: 'أشهر بها تحصيل', month: 'الشهر', amount: 'المبلغ', employees: 'الموظفون النشطون', reports: 'التقرير المدرسي', assignedClasses: 'الفصول المسندة', graded: 'واجبات مصححة', noAttendance: 'لا توجد سجلات حضور لهذا الفصل في التاريخ المحدد.', noClasses: 'أضف الفصول إلى النظام أولًا لعرض المتابعة.', statusLabels: { EXCELLENT: 'متميز', GOOD: 'مستقر', NEEDS_ATTENTION: 'يحتاج متابعة', CRITICAL: 'يحتاج تدخلًا', NO_DATA: 'لا توجد بيانات' }, riskLabels: { LOW: 'منخفض', MEDIUM: 'متوسط', HIGH: 'مرتفع', CRITICAL: 'حرج' }, roleLabels: { TEACHER: 'معلم', ADMIN: 'إداري', PRINCIPAL: 'مدير', VICE_PRINCIPAL: 'وكيل', COUNSELOR: 'مرشد طلابي', SUPERVISOR: 'مشرف', ACCOUNTANT: 'محاسب', HR: 'موارد بشرية' } },
    students: { title: 'سجلات الطلاب', subtitle: 'الطلاب المسجلون في المدرسة وحالة حساباتهم.', loading: 'جار تحميل الطلاب...', error: 'تعذر تحميل سجلات الطلاب.', refresh: 'تحديث', empty: 'لا يوجد طلاب مسجلون في المدرسة.', export: 'تصدير CSV', name: 'اسم الطالب', email: 'البريد الإلكتروني', phone: 'الهاتف', role: 'الدور', status: 'حالة الحساب', active: 'نشط', inactive: 'غير نشط', students: 'الطلاب', subjects: 'المواد', teacher: 'المعلم المسؤول', attendance: 'الحضور', grade: 'متوسط الدرجات', assignments: 'تسليمات الواجبات', class: 'الفصل', date: 'التاريخ', selectClass: 'اختر فصلًا', present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'بعذر', risk: 'مؤشرات المتابعة', severity: 'مستوى الحالة', classes: 'الفصول', staff: 'الموظفون', teachers: 'المعلمون', highCases: 'حالات تحتاج تدخلًا', totalRevenue: 'الإيرادات المحصلة', months: 'أشهر بها تحصيل', month: 'الشهر', amount: 'المبلغ', employees: 'الموظفون النشطون', reports: 'التقرير المدرسي', assignedClasses: 'الفصول المسندة', graded: 'واجبات مصححة', noAttendance: 'لا توجد سجلات حضور لهذا الفصل في التاريخ المحدد.', noClasses: 'أضف الفصول إلى النظام أولًا لعرض المتابعة.', statusLabels: {}, riskLabels: { LOW: 'منخفض', MEDIUM: 'متوسط', HIGH: 'مرتفع', CRITICAL: 'حرج' }, roleLabels: {} },
    teachers: { title: 'متابعة المعلمين', subtitle: 'عبء التدريس والواجبات والتصحيح من السجلات المسجلة.', loading: 'جار تحميل بيانات المعلمين...', error: 'تعذر تحميل مؤشرات المعلمين.', refresh: 'تحديث', empty: 'لا توجد سجلات معلمين نشطة.', export: 'تصدير CSV', name: 'المعلم', email: 'البريد الإلكتروني', phone: 'الهاتف', role: 'الدور', status: 'الحالة', active: 'نشط', inactive: 'غير نشط', students: 'الطلاب', subjects: 'المواد', teacher: 'المعلم المسؤول', attendance: 'الحضور', grade: 'متوسط الدرجات', assignments: 'الواجبات المنشأة', class: 'الفصل', date: 'التاريخ', selectClass: 'اختر فصلًا', present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'بعذر', risk: 'مؤشرات المتابعة', severity: 'مستوى الحالة', classes: 'الفصول', staff: 'الموظفون', teachers: 'المعلمون', highCases: 'حالات تحتاج تدخلًا', totalRevenue: 'الإيرادات المحصلة', months: 'أشهر بها تحصيل', month: 'الشهر', amount: 'المبلغ', employees: 'الموظفون النشطون', reports: 'التقرير المدرسي', assignedClasses: 'الفصول المسندة', graded: 'واجبات مصححة', noAttendance: 'لا توجد سجلات حضور لهذا الفصل في التاريخ المحدد.', noClasses: 'أضف الفصول إلى النظام أولًا لعرض المتابعة.', statusLabels: {}, riskLabels: {}, roleLabels: {} },
    staff: { title: 'دليل موظفي المدرسة', subtitle: 'حسابات العاملين النشطة في المدرسة وأدوارهم وبيانات التواصل المسجلة.', loading: 'جار تحميل دليل الموظفين...', error: 'تعذر تحميل دليل الموظفين.', refresh: 'تحديث', empty: 'لا توجد حسابات موظفين مسجلة.', export: 'تصدير CSV', name: 'الموظف', email: 'البريد الإلكتروني', phone: 'الهاتف', role: 'الدور', status: 'الحالة', active: 'نشط', inactive: 'غير نشط', students: 'الطلاب', subjects: 'المواد', teacher: 'المعلم المسؤول', attendance: 'الحضور', grade: 'متوسط الدرجات', assignments: 'تسليمات الواجبات', class: 'الفصل', date: 'التاريخ', selectClass: 'اختر فصلًا', present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'بعذر', risk: 'مؤشرات المتابعة', severity: 'مستوى الحالة', classes: 'الفصول', staff: 'الموظفون', teachers: 'المعلمون', highCases: 'حالات تحتاج تدخلًا', totalRevenue: 'الإيرادات المحصلة', months: 'أشهر بها تحصيل', month: 'الشهر', amount: 'المبلغ', employees: 'الموظفون النشطون', reports: 'التقرير المدرسي', assignedClasses: 'الفصول المسندة', graded: 'واجبات مصححة', noAttendance: 'لا توجد سجلات حضور لهذا الفصل في التاريخ المحدد.', noClasses: 'أضف الفصول إلى النظام أولًا لعرض المتابعة.', statusLabels: {}, riskLabels: {}, roleLabels: { TEACHER: 'معلم', ADMIN: 'إداري', PRINCIPAL: 'مدير', VICE_PRINCIPAL: 'وكيل', COUNSELOR: 'مرشد طلابي', SUPERVISOR: 'مشرف', ACCOUNTANT: 'محاسب', HR: 'موارد بشرية' } },
    attendance: { title: 'متابعة الحضور العام', subtitle: 'استعراض سجل حضور الفصل في يوم محدد وفق بيانات المدرسة.', loading: 'جار تحميل بيانات الحضور...', error: 'تعذر تحميل سجل الحضور.', refresh: 'تحديث', empty: 'لا يوجد طلاب مسجلون في هذا الفصل.', export: 'تصدير CSV', name: 'الطالب', email: 'البريد الإلكتروني', phone: 'الهاتف', role: 'الدور', status: 'حالة الحضور', active: 'نشط', inactive: 'غير نشط', students: 'الطلاب', subjects: 'المواد', teacher: 'المعلم المسؤول', attendance: 'الحضور', grade: 'متوسط الدرجات', assignments: 'تسليمات الواجبات', class: 'الفصل', date: 'التاريخ', selectClass: 'اختر فصلًا', present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'بعذر', risk: 'مؤشرات المتابعة', severity: 'مستوى الحالة', classes: 'الفصول', staff: 'الموظفون', teachers: 'المعلمون', highCases: 'حالات تحتاج تدخلًا', totalRevenue: 'الإيرادات المحصلة', months: 'أشهر بها تحصيل', month: 'الشهر', amount: 'المبلغ', employees: 'الموظفون النشطون', reports: 'التقرير المدرسي', assignedClasses: 'الفصول المسندة', graded: 'واجبات مصححة', noAttendance: 'لا توجد سجلات حضور لهذا الفصل في التاريخ المحدد.', noClasses: 'لا توجد فصول مسجلة للمدرسة حتى الآن.', statusLabels: { PRESENT: 'حاضر', ABSENT: 'غائب', LATE: 'متأخر', EXCUSED: 'بعذر' }, riskLabels: {}, roleLabels: {} },
    cases: { title: 'حالات الطلاب ومؤشرات المتابعة', subtitle: 'مؤشرات آلية ناتجة عن الحضور والدرجات والواجبات المسجلة، لمساعدة المرشد في ترتيب المتابعة.', loading: 'جار تحميل الحالات...', error: 'تعذر تحميل مؤشرات الطلاب.', refresh: 'تحديث', empty: 'لا توجد حالات متابعة مسجلة حاليًا.', export: 'تصدير CSV', name: 'الطالب', email: 'البريد الإلكتروني', phone: 'الهاتف', role: 'الدور', status: 'الحالة', active: 'نشط', inactive: 'غير نشط', students: 'الطلاب', subjects: 'المواد', teacher: 'المعلم المسؤول', attendance: 'الحضور', grade: 'متوسط الدرجات', assignments: 'تسليمات الواجبات', class: 'الفصل', date: 'التاريخ', selectClass: 'اختر فصلًا', present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'بعذر', risk: 'المؤشر المسجل', severity: 'مستوى الحالة', classes: 'الفصول', staff: 'الموظفون', teachers: 'المعلمون', highCases: 'حالات تحتاج تدخلًا', totalRevenue: 'الإيرادات المحصلة', months: 'أشهر بها تحصيل', month: 'الشهر', amount: 'المبلغ', employees: 'الموظفون النشطون', reports: 'التقرير المدرسي', assignedClasses: 'الفصول المسندة', graded: 'واجبات مصححة', noAttendance: 'لا توجد سجلات حضور لهذا الفصل في التاريخ المحدد.', noClasses: 'لا توجد فصول مرتبطة بالمدرسة.', statusLabels: {}, riskLabels: { LOW: 'منخفض', MEDIUM: 'متوسط', HIGH: 'مرتفع', CRITICAL: 'حرج' }, roleLabels: {} },
    'finance-report': { title: 'التقارير المالية', subtitle: 'الإيرادات المحصلة المسجلة خلال آخر 12 شهرًا.', loading: 'جار تحميل التقرير المالي...', error: 'تعذر تحميل التقرير المالي.', refresh: 'تحديث', empty: 'لا توجد إيرادات محصلة مسجلة خلال آخر 12 شهرًا.', export: 'تصدير CSV', name: 'المعلم', email: 'البريد الإلكتروني', phone: 'الهاتف', role: 'الدور', status: 'الحالة', active: 'نشط', inactive: 'غير نشط', students: 'الطلاب', subjects: 'المواد', teacher: 'المعلم المسؤول', attendance: 'الحضور', grade: 'متوسط الدرجات', assignments: 'تسليمات الواجبات', class: 'الفصل', date: 'التاريخ', selectClass: 'اختر فصلًا', present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'بعذر', risk: 'مؤشرات المتابعة', severity: 'مستوى الحالة', classes: 'الفصول', staff: 'الموظفون', teachers: 'المعلمون', highCases: 'حالات تحتاج تدخلًا', totalRevenue: 'الإيرادات المحصلة', months: 'أشهر بها تحصيل', month: 'الشهر', amount: 'المبلغ', employees: 'الموظفون النشطون', reports: 'التقرير المدرسي', assignedClasses: 'الفصول المسندة', graded: 'واجبات مصححة', noAttendance: 'لا توجد سجلات حضور لهذا الفصل في التاريخ المحدد.', noClasses: 'لا توجد بيانات مالية.', statusLabels: {}, riskLabels: {}, roleLabels: {} },
    'staff-report': { title: 'ملخص الموارد البشرية', subtitle: 'أعداد الحسابات المسجلة حسب الفئات المتاحة في قاعدة بيانات المدرسة.', loading: 'جار تحميل ملخص الموظفين...', error: 'تعذر تحميل ملخص الحسابات.', refresh: 'تحديث', empty: 'لا توجد بيانات موظفين.', export: 'تصدير CSV', name: 'الفئة', email: 'البريد الإلكتروني', phone: 'الهاتف', role: 'الدور', status: 'الحالة', active: 'نشط', inactive: 'غير نشط', students: 'الطلاب', subjects: 'المواد', teacher: 'المعلم المسؤول', attendance: 'الحضور', grade: 'متوسط الدرجات', assignments: 'تسليمات الواجبات', class: 'الفصل', date: 'التاريخ', selectClass: 'اختر فصلًا', present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'بعذر', risk: 'مؤشرات المتابعة', severity: 'مستوى الحالة', classes: 'الفصول', staff: 'الموظفون', teachers: 'المعلمون', highCases: 'حالات تحتاج تدخلًا', totalRevenue: 'الإيرادات المحصلة', months: 'أشهر بها تحصيل', month: 'الشهر', amount: 'العدد', employees: 'الموظفون النشطون', reports: 'التقرير المدرسي', assignedClasses: 'الفصول المسندة', graded: 'واجبات مصححة', noAttendance: 'لا توجد سجلات حضور لهذا الفصل في التاريخ المحدد.', noClasses: 'لا توجد بيانات.', statusLabels: {}, riskLabels: {}, roleLabels: {} },
    'supervisor-report': { title: 'التقرير الإشرافي', subtitle: 'ملخص أداء الفصول والمعلمين من سجلات الحضور والدرجات والواجبات.', loading: 'جار تجهيز التقرير الإشرافي...', error: 'تعذر تحميل بيانات التقرير.', refresh: 'تحديث', empty: 'لا توجد سجلات كافية لإعداد التقرير.', export: 'تصدير CSV', name: 'المؤشر', email: 'البريد الإلكتروني', phone: 'الهاتف', role: 'الدور', status: 'الحالة', active: 'نشط', inactive: 'غير نشط', students: 'الطلاب', subjects: 'المواد', teacher: 'المعلم المسؤول', attendance: 'متوسط الحضور', grade: 'متوسط الدرجات', assignments: 'تسليمات الواجبات', class: 'الفصل', date: 'التاريخ', selectClass: 'اختر فصلًا', present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'بعذر', risk: 'مؤشرات المتابعة', severity: 'مستوى الحالة', classes: 'الفصول', staff: 'الموظفون', teachers: 'المعلمون', highCases: 'فصول تحتاج متابعة', totalRevenue: 'الإيرادات المحصلة', months: 'أشهر بها تحصيل', month: 'الشهر', amount: 'القيمة', employees: 'عدد المعلمين', reports: 'التقرير المدرسي', assignedClasses: 'الفصول المسندة', graded: 'واجبات مصححة', noAttendance: 'لا توجد سجلات حضور لهذا الفصل في التاريخ المحدد.', noClasses: 'لا توجد فصول مسجلة لإعداد التقرير.', statusLabels: { EXCELLENT: 'متميز', GOOD: 'مستقر', NEEDS_ATTENTION: 'يحتاج متابعة', CRITICAL: 'يحتاج تدخلًا', NO_DATA: 'لا توجد بيانات' }, riskLabels: {}, roleLabels: {} },
  },
  en: {} as Record<Mode, Copy>,
}

// Keep English labels explicit for the pages that appear in staff portals.
words.en = Object.fromEntries(Object.entries(words.ar).map(([key, value]) => [key, {
  ...value,
  title: ({ classes: 'Classes', students: 'Student records', teachers: 'Teacher performance', staff: 'School staff directory', attendance: 'School attendance', cases: 'Student follow-up cases', 'finance-report': 'Financial reports', 'staff-report': 'Human resources summary', 'supervisor-report': 'Supervision report' } as Record<Mode, string>)[key as Mode],
  subtitle: ({ classes: 'Registered classes, enrollment, and subjects from school records.', students: 'Students enrolled at the school and their account status.', teachers: 'Teaching assignments and grading from recorded school activity.', staff: 'Staff accounts, roles, and recorded contact details.', attendance: 'Review a class attendance record for a selected date.', cases: 'Recorded attendance, grade, and assignment indicators to help prioritize follow-up.', 'finance-report': 'Collected revenue recorded during the last 12 months.', 'staff-report': 'School account counts from available staff records.', 'supervisor-report': 'Class and teacher performance from recorded attendance, grades, and assignments.' } as Record<Mode, string>)[key as Mode],
  loading: 'Loading school records…', error: 'Could not load this report from the school system.', refresh: 'Refresh', empty: 'No records are available.', export: 'Export CSV', name: key === 'students' ? 'Student' : key === 'staff' ? 'Staff member' : key === 'classes' ? 'Class' : 'Name', email: 'Email', phone: 'Phone', role: 'Role', status: 'Status', active: 'Active', inactive: 'Inactive', students: 'Students', subjects: 'Subjects', teacher: 'Assigned teacher', attendance: 'Attendance', grade: 'Average grade', assignments: 'Assignments', class: 'Class', date: 'Date', selectClass: 'Select a class', present: 'Present', absent: 'Absent', late: 'Late', excused: 'Excused', risk: 'Indicators', severity: 'Risk level', classes: 'Classes', staff: 'Staff', teachers: 'Teachers', highCases: 'Cases needing intervention', totalRevenue: 'Collected revenue', months: 'Months with collections', month: 'Month', amount: 'Amount', employees: 'Active staff', reports: 'School report', assignedClasses: 'Assigned classes', graded: 'Graded', noAttendance: 'No attendance records for this class on the selected date.', noClasses: 'No school classes are registered yet.', statusLabels: { PRESENT: 'Present', ABSENT: 'Absent', LATE: 'Late', EXCUSED: 'Excused', EXCELLENT: 'Excellent', GOOD: 'On track', NEEDS_ATTENTION: 'Needs follow-up', CRITICAL: 'Needs intervention', NO_DATA: 'No data' }, riskLabels: { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical' }, roleLabels: { TEACHER: 'Teacher', ADMIN: 'Administrator', PRINCIPAL: 'Principal', VICE_PRINCIPAL: 'Vice principal', COUNSELOR: 'Counselor', SUPERVISOR: 'Supervisor', ACCOUNTANT: 'Accountant', HR: 'Human resources' },
}])) as unknown as Record<Mode, Copy>

function personName(person: Partial<StaffMember> & { name?: string | null; firstName?: string | null; lastName?: string | null }) {
  return person.name || [person.firstName, person.lastName].filter(Boolean).join(' ') || person.email || '—'
}

function csvDownload(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
  const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map(quote).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function localDateValue() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

export default function PortalDataPage({ mode, studentRecordBasePath }: { mode: Mode; studentRecordBasePath?: string }) {
  const locale = useLocale() === 'en' ? 'en' : 'ar'
  const t = words[locale][mode]
  const [rows, setRows] = useState<any[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [expandedClassId, setExpandedClassId] = useState('')
  const [classRoster, setClassRoster] = useState<ClassRosterStudent[]>([])
  const [classRosterLoading, setClassRosterLoading] = useState(false)
  const [classRosterError, setClassRosterError] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [classFilterId, setClassFilterId] = useState('')
  const [date, setDate] = useState(localDateValue)
  const [attendance, setAttendance] = useState<AttendanceData | null>(null)
  const [staffStats, setStaffStats] = useState<Record<string, number> | null>(null)
  const [userPage, setUserPage] = useState(1)
  const [userMeta, setUserMeta] = useState<UserPageMeta | null>(null)
  const [searchDraft, setSearchDraft] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const studentClassFilterId = mode === 'students' ? classFilterId : ''

  const load = useCallback(async (refresh = false) => {
    setLoading(!refresh)
    setRefreshing(refresh)
    setError('')
    try {
      if (mode === 'classes') {
        const response = await apiClient.get<SchoolClass[]>('/classes')
        setRows(response.data)
      } else if (mode === 'students') {
        const classesResponse = await apiClient.get<SchoolClass[]>('/classes')
        setClasses(classesResponse.data)
        if (studentClassFilterId) {
          const response = await apiClient.get<Array<{ student: StaffMember }>>(`/enrollments/class/${studentClassFilterId}`)
          const roster = response.data.map(({ student }) => ({ ...student, role: 'STUDENT' }))
          const normalizedSearch = studentSearch.trim().toLocaleLowerCase()
          setRows(normalizedSearch ? roster.filter((student) => `${personName(student)} ${student.email}`.toLocaleLowerCase().includes(normalizedSearch)) : roster)
          setUserMeta(null)
        } else {
          const response = await apiClient.get<{ data: StaffMember[]; meta: UserPageMeta }>('/users', { params: { role: 'STUDENT', page: userPage, limit: 25, search: studentSearch || undefined } })
          setRows(response.data.data)
          setUserMeta(response.data.meta)
        }
      } else if (mode === 'staff') {
        const response = await apiClient.get<{ data: StaffMember[] }>('/users/staff', { params: { page: 1, limit: 100 } })
        setRows(response.data.data)
      } else if (mode === 'teachers') {
        const response = await apiClient.get<TeacherPerformance[]>('/admin/dashboard/teachers')
        setRows(response.data)
      } else if (mode === 'attendance') {
        const response = await apiClient.get<SchoolClass[]>('/classes')
        setClasses(response.data)
        setSelectedClass((current) => current || response.data[0]?.id || '')
        setRows(response.data)
      } else if (mode === 'cases') {
        const response = await apiClient.get<SchoolClass[]>('/classes')
        setClasses(response.data)
        const lists = await Promise.all(response.data.map(async (schoolClass) => {
          const warningResponse = await apiClient.get<any[]>('/analytics/student/early-warnings', { params: { classId: schoolClass.id } })
          return warningResponse.data.map((warning) => ({ ...warning, classId: schoolClass.id, className: schoolClass.name }))
        }))
        setRows(lists.flat())
      } else if (mode === 'finance-report') {
        const response = await apiClient.get<Array<{ name: string; total: number; currency: string }>>('/admin/dashboard/stats/financial')
        setRows(response.data)
      } else if (mode === 'staff-report') {
        const response = await apiClient.get<Record<string, number>>('/users/stats')
        setStaffStats(response.data)
        setRows(Object.entries(response.data).map(([name, value]) => ({ name, value })))
      } else {
        const [schoolClassesResponse, classesResponse, teachersResponse] = await Promise.all([
          apiClient.get<SchoolClass[]>('/classes'),
          apiClient.get<ClassActivity[]>('/admin/dashboard/classes'),
          apiClient.get<TeacherPerformance[]>('/admin/dashboard/teachers'),
        ])
        setClasses(schoolClassesResponse.data)
        setRows([{ classes: classesResponse.data, teachers: teachersResponse.data }])
      }
    } catch {
      setError(t.error)
      setRows([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [mode, studentClassFilterId, studentSearch, t.error, userPage])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (mode !== 'classes' || !expandedClassId) return
    let alive = true
    setClassRoster([])
    setClassRosterError('')
    setClassRosterLoading(true)
    apiClient.get<{ students?: Array<{ student?: ClassRosterStudent }> }>(`/classes/${expandedClassId}`)
      .then((response) => {
        if (alive) setClassRoster((response.data.students || []).map((enrollment) => enrollment.student).filter((student): student is ClassRosterStudent => Boolean(student?.id)))
      })
      .catch(() => {
        if (alive) setClassRosterError(locale === 'en' ? 'Could not load students in this class.' : 'تعذر تحميل طلاب هذا الفصل.')
      })
      .finally(() => { if (alive) setClassRosterLoading(false) })
    return () => { alive = false }
  }, [expandedClassId, locale, mode])

  useEffect(() => {
    if (mode !== 'students' && mode !== 'staff') return
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(true)
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [load, mode])

  useEffect(() => {
    if (mode !== 'attendance' || !selectedClass) return
    let alive = true
    setAttendance(null)
    apiClient.get<AttendanceData>(`/attendance/classes/${selectedClass}`, { params: { date } })
      .then((response) => { if (alive) { setAttendance(response.data); setError('') } })
      .catch(() => { if (alive) setError(t.error) })
    return () => { alive = false }
  }, [date, mode, selectedClass, t.error])

  const exportRows = () => {
    if (mode === 'classes') csvDownload('school-classes.csv', [t.name, t.students, t.subjects, t.teacher], rows.map((row) => [row.name, row._count?.students ?? 0, row._count?.subjects ?? 0, row.teacher?.name || row.teacher?.email || '']))
    else if (mode === 'students' || mode === 'staff') csvDownload(mode === 'students' ? 'school-students.csv' : 'school-staff.csv', [t.name, t.email, t.phone, t.role, t.status], rows.map((row) => [personName(row), row.email, row.phone || '', t.roleLabels[row.role] || row.role, row.isActive ? t.active : t.inactive]))
    else if (mode === 'teachers') csvDownload('teacher-performance.csv', [t.name, t.assignedClasses, t.subjects, t.assignments, t.graded, t.grade], rows.map((row) => [row.teacherName, row.stats.classesCount, row.stats.subjectsCount, row.stats.assignmentsCreated, row.stats.assignmentsGraded, row.stats.avgStudentScore ?? '']))
    else if (mode === 'cases') csvDownload('student-follow-up-cases.csv', [t.name, t.class, t.severity, t.risk], visibleCases.map((row) => [row.studentName, row.className, t.riskLabels[row.riskLevel] || row.riskLevel, row.alerts.map((alert: any) => alert.type).join('; ')]))
    else if (mode === 'finance-report') csvDownload('financial-report.csv', [t.month, t.amount], rows.map((row) => [row.name, `${row.total} ${row.currency}`]))
    else if (mode === 'attendance' && attendance) csvDownload('class-attendance.csv', [t.name, t.status], attendance.students.map((student) => [personName(student), t.statusLabels[attendance.records.find((record) => record.studentId === student.id)?.status || ''] || '—']))
    else if (mode === 'supervisor-report' && rows[0]) csvDownload('supervision-report.csv', [t.reports, t.name, t.class, t.students, t.attendance, t.grade, t.status, t.subjects, t.assignments, t.graded], [
      ...visibleSupervisorClasses.map((row) => [t.classes, row.className, '', row.studentsCount, row.avgAttendance ?? '', row.avgGrade ?? '', t.statusLabels[row.status] || row.status, '', '', '']),
      ...rows[0].teachers.map((row: TeacherPerformance) => [t.teachers, row.teacherName, '', '', '', row.stats.avgStudentScore ?? '', '', row.stats.subjectsCount, row.stats.assignmentsCreated, row.stats.assignmentsGraded]),
    ])
    else if (mode === 'staff-report' && staffStats) csvDownload('hr-summary.csv', [t.name, t.amount], Object.entries(staffStats).map(([name, value]) => [name, value]))
  }

  const exportable = ['classes', 'students', 'teachers', 'staff', 'attendance', 'cases', 'finance-report', 'staff-report', 'supervisor-report'].includes(mode)
  const cases = rows as Warning[]
  const visibleCases = classFilterId ? cases.filter((item) => item.classId === classFilterId) : cases
  const supervisorClassRows = (mode === 'supervisor-report' ? rows[0]?.classes || [] : []) as ClassActivity[]
  const visibleSupervisorClasses = classFilterId ? supervisorClassRows.filter((row) => row.classId === classFilterId) : supervisorClassRows
  const isEmpty = !loading && !error && (mode === 'attendance' ? Boolean(attendance && attendance.students.length === 0) : mode === 'cases' ? visibleCases.length === 0 : mode === 'supervisor-report' ? !visibleSupervisorClasses.length && !rows[0]?.teachers?.length : rows.length === 0)
  const visibleClassRows = classFilterId ? rows.filter((row) => row.id === classFilterId) : rows
  const riskClasses: Record<string, string> = { LOW: 'bg-slate-100 text-slate-800', MEDIUM: 'bg-amber-100 text-amber-800', HIGH: 'bg-orange-100 text-orange-800', CRITICAL: 'bg-rose-100 text-rose-800' }
  const financeTotals = mode === 'finance-report' ? rows.reduce<Record<string, number>>((totals, row) => { totals[row.currency] = (totals[row.currency] || 0) + Number(row.total || 0); return totals }, {}) : {}
  const searchStudents = (event: FormEvent) => {
    event.preventDefault()
    setUserPage(1)
    setStudentSearch(searchDraft.trim())
  }

  return <main className="report-print-root mx-auto max-w-7xl space-y-6 pb-12" dir={locale === 'en' ? 'ltr' : 'rtl'}>
    <ReportPrintIdentity title={t.title} subtitle={mode === 'attendance' && attendance ? `${t.subtitle} · ${classes.find((item) => item.id === selectedClass)?.name || ''} · ${date}` : mode === 'students' && userMeta ? `${t.subtitle} · صفحة ${userMeta.page} من ${userMeta.totalPages}` : classFilterId ? `${t.subtitle} · ${classes.find((item) => item.id === classFilterId)?.name || ''}` : t.subtitle} />
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5"><div><p className="text-sm font-semibold text-primary">Nexus EDU</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">{t.title}</h1><p className="mt-2 text-sm text-muted-foreground">{t.subtitle}</p></div><div className="print:hidden flex gap-2"><button type="button" onClick={() => void load(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />{t.refresh}</button>{exportable && <button type="button" onClick={exportRows} disabled={!rows.length && !attendance} className="inline-flex items-center gap-2 rounded-lg bg-foreground px-3 py-2 text-sm font-bold text-background disabled:opacity-50"><Download className="h-4 w-4" />{t.export}</button>}{!loading && !error && (mode !== 'attendance' || Boolean(attendance)) && <PrintReportButton label={locale === 'en' ? 'Print / Save PDF' : 'طباعة / حفظ PDF'} />}</div></header>
    {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
    {loading && <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t.loading}</div>}
    {!loading && !error && ['students', 'cases', 'supervisor-report'].includes(mode) && classes.length > 0 && <section className="print:hidden rounded-xl border border-border bg-card p-4"><div className="mb-3"><h2 className="font-bold">{locale === 'en' ? 'Classify by stage, grade and class' : 'تصنيف حسب المرحلة والصف والفصل'}</h2><p className="mt-1 text-xs text-muted-foreground">{locale === 'en' ? 'Choose a class to narrow the records to its enrolled students.' : 'اختر الفصل لعرض السجلات المرتبطة بطلابه فقط.'}</p></div><ClassHierarchyPicker classes={classes} value={classFilterId} onChange={(value) => { setUserPage(1); setClassFilterId(value) }} locale={locale} /><button type="button" onClick={() => { setUserPage(1); setClassFilterId('') }} className="mt-3 text-xs font-semibold text-primary hover:underline">{locale === 'en' ? 'Show all classes' : 'عرض كل الفصول'}</button></section>}
    {isEmpty && <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground"><School className="mx-auto mb-3 h-7 w-7" />{mode === 'attendance' && classes.length === 0 ? t.noClasses : t.empty}</div>}

    {!loading && !error && mode === 'classes' && rows.length > 0 && <section className="space-y-3"><div className="print:hidden rounded-xl border border-border bg-card p-4"><div className="mb-3"><h2 className="font-bold">{locale === 'en' ? 'Choose stage, grade and class' : 'اختر المرحلة ثم الصف ثم الفصل'}</h2><p className="mt-1 text-xs text-muted-foreground">{locale === 'en' ? 'Choices come from classes actually registered in the school.' : 'تعرض القوائم الفصول المسجلة فعلًا في المدرسة فقط.'}</p></div><ClassHierarchyPicker classes={rows} value={classFilterId} onChange={setClassFilterId} locale={locale} /><button type="button" onClick={() => setClassFilterId('')} className="mt-3 text-xs font-semibold text-primary hover:underline">{locale === 'en' ? 'Show all classes' : 'عرض كل الفصول'}</button></div><div className="overflow-hidden rounded-xl border border-border bg-card"><div className="grid gap-3 border-b border-border p-4 sm:grid-cols-3">{[[t.classes, visibleClassRows.length, School], [t.students, visibleClassRows.reduce((sum, row) => sum + (row._count?.students ?? 0), 0), GraduationCap], [t.subjects, visibleClassRows.reduce((sum, row) => sum + (row._count?.subjects ?? 0), 0), BookOpen]].map(([label, value, Icon]: any) => <div key={label} className="flex items-center justify-between rounded-lg bg-muted/50 p-4"><span className="text-sm text-muted-foreground">{label}</span><span className="flex items-center gap-2 text-xl font-bold"><Icon className="h-5 w-5 text-primary" />{value}</span></div>)}</div><table className="w-full min-w-[720px] text-start text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3">{locale === 'en' ? 'Grade / class' : 'الصف والفصل'}</th><th className="px-4 py-3">{t.students}</th><th className="px-4 py-3">{t.subjects}</th><th className="px-4 py-3">{t.teacher}</th><th className="px-4 py-3">{locale === 'en' ? 'Roster' : 'قائمة الطلاب'}</th></tr></thead><tbody className="divide-y divide-border">{visibleClassRows.map((row) => <Fragment key={row.id}><tr><td className="px-4 py-3"><p className="font-semibold">{parseClassName(row.name).gradeLabel}</p><p className="mt-1 text-xs text-muted-foreground">{row.name}</p></td><td className="px-4 py-3">{row._count?.students ?? 0}</td><td className="px-4 py-3">{row._count?.subjects ?? 0}</td><td className="px-4 py-3">{row.teacher?.name || row.teacher?.email || '—'}</td><td className="px-4 py-3"><button type="button" aria-expanded={expandedClassId === row.id} onClick={() => setExpandedClassId((current) => current === row.id ? '' : row.id)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-primary hover:bg-muted">{expandedClassId === row.id ? (locale === 'en' ? 'Hide students' : 'إخفاء الطلاب') : (locale === 'en' ? 'View students' : 'عرض الطلاب')}</button></td></tr>{expandedClassId === row.id && <tr><td colSpan={5} className="bg-muted/20 p-4">{classRosterLoading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{locale === 'en' ? 'Loading students…' : 'جار تحميل الطلاب…'}</div> : classRosterError ? <p role="alert" className="text-sm text-destructive">{classRosterError}</p> : classRoster.length === 0 ? <p className="text-sm text-muted-foreground">{locale === 'en' ? 'No students are enrolled in this class.' : 'لا يوجد طلاب مسجلون في هذا الفصل.'}</p> : <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{classRoster.map((student) => <li key={student.id} className="rounded-lg border border-border bg-card px-3 py-2"><Link href={studentRecordBasePath ? `${studentRecordBasePath}/${student.id}` as never : '#' as never} aria-disabled={!studentRecordBasePath} className="inline-flex items-center gap-2 font-semibold text-primary hover:underline">{student.avatar ? <img src={student.avatar} alt={`صورة ${personName(student)}`} className="size-9 rounded-full border border-border bg-muted object-contain" /> : <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">{personName(student).slice(0, 1)}</span>}{personName(student)}</Link></li>)}</ul>}</td></tr>}</Fragment>)}</tbody></table></div></section>}

    {mode === 'students' && !loading && !error && <form onSubmit={searchStudents} className="print:hidden flex flex-col gap-2 sm:flex-row"><input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder={locale === 'en' ? 'Search students by name or email' : 'ابحث عن طالب بالاسم أو البريد'} className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm" /><button type="submit" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">{locale === 'en' ? 'Search' : 'بحث'}</button></form>}
    {!loading && !error && (mode === 'students' || mode === 'staff') && rows.length > 0 && <section className="overflow-x-auto rounded-xl border border-border bg-card"><table className="w-full min-w-[900px] text-start text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3">{t.name}</th><th className="px-4 py-3">{t.email}</th><th className="px-4 py-3">{t.phone}</th>{mode === 'staff' && <th className="px-4 py-3">{t.role}</th>}<th className="px-4 py-3">{t.status}</th><th className="px-4 py-3">{locale === 'en' ? 'Activity / last seen' : 'النشاط وآخر ظهور'}</th></tr></thead><tbody className="divide-y divide-border">{rows.map((row) => <tr key={row.id}><td className="px-4 py-3 font-semibold"><span className="inline-flex items-center gap-2">{row.avatar ? <img src={row.avatar} alt={`صورة ${personName(row)}`} className="size-9 rounded-full border border-border bg-muted object-contain" /> : <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">{personName(row).slice(0, 1)}</span>}{mode === 'students' && studentRecordBasePath ? <Link href={`${studentRecordBasePath}/${row.id}` as never} className="text-primary hover:underline">{personName(row)}</Link> : personName(row)}</span></td><td className="px-4 py-3">{row.email}</td><td className="px-4 py-3">{row.phone || '—'}</td>{mode === 'staff' && <td className="px-4 py-3">{t.roleLabels[row.role] || row.role}</td>}<td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs ${row.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'}`}>{row.isActive ? t.active : t.inactive}</span></td><td className="px-4 py-3"><PresenceBadge lastActiveDate={row.lastActiveDate} locale={locale} /></td></tr>)}</tbody></table></section>}
    {mode === 'students' && userMeta && userMeta.totalPages > 1 && !error && <footer className="print:hidden flex items-center justify-between gap-3 text-sm text-muted-foreground"><span>{locale === 'en' ? `Page ${userMeta.page} of ${userMeta.totalPages} · ${userMeta.total} students` : `صفحة ${userMeta.page} من ${userMeta.totalPages} · ${userMeta.total} طالب`}</span><div className="flex gap-2"><button type="button" disabled={userPage <= 1 || loading} onClick={() => setUserPage((current) => current - 1)} className="rounded-lg border border-border px-3 py-2 disabled:opacity-40">{locale === 'en' ? 'Previous' : 'السابق'}</button><button type="button" disabled={userPage >= userMeta.totalPages || loading} onClick={() => setUserPage((current) => current + 1)} className="rounded-lg border border-border px-3 py-2 disabled:opacity-40">{locale === 'en' ? 'Next' : 'التالي'}</button></div></footer>}

    {!loading && !error && mode === 'teachers' && rows.length > 0 && <section className="overflow-x-auto rounded-xl border border-border bg-card"><table className="w-full min-w-[720px] text-start text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3">{t.name}</th><th className="px-4 py-3">{t.assignedClasses}</th><th className="px-4 py-3">{t.subjects}</th><th className="px-4 py-3">{t.assignments}</th><th className="px-4 py-3">{t.graded}</th><th className="px-4 py-3">{t.grade}</th></tr></thead><tbody className="divide-y divide-border">{rows.map((row: TeacherPerformance) => <tr key={row.teacherId}><td className="px-4 py-3 font-semibold">{row.teacherName}</td><td className="px-4 py-3">{row.stats.classesCount}</td><td className="px-4 py-3">{row.stats.subjectsCount}</td><td className="px-4 py-3">{row.stats.assignmentsCreated}</td><td className="px-4 py-3">{row.stats.assignmentsGraded}</td><td className="px-4 py-3">{row.stats.avgStudentScore === null ? '—' : `${row.stats.avgStudentScore}%`}</td></tr>)}</tbody></table></section>}

    {mode === 'attendance' && !loading && !error && classes.length > 0 && <section className="space-y-4"><div className="print:hidden grid gap-4 rounded-xl border border-border bg-card p-4 lg:grid-cols-[1fr_auto]"><div><p className="mb-3 text-sm font-bold">{locale === 'en' ? 'Select stage, grade and class' : 'حدد المرحلة والصف والفصل'}</p><ClassHierarchyPicker classes={classes} value={selectedClass} onChange={setSelectedClass} locale={locale} /></div><label className="grid min-w-48 gap-1.5 text-sm font-semibold"><span>{t.date}</span><DatePicker value={date} onChange={setDate} placeholder={t.date} locale={locale} /></label></div>{attendance && <div className="overflow-x-auto rounded-xl border border-border bg-card"><div className="grid gap-3 border-b border-border p-4 sm:grid-cols-4">{(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const).map((status) => <div key={status} className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">{t.statusLabels[status]}</p><p className="mt-1 text-2xl font-bold">{attendance.records.filter((record) => record.status === status).length}</p></div>)}</div><table className="w-full min-w-[520px] text-start text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3">{t.name}</th><th className="px-4 py-3">{t.status}</th></tr></thead><tbody className="divide-y divide-border">{attendance.students.map((student) => { const status = attendance.records.find((record) => record.studentId === student.id)?.status; return <tr key={student.id}><td className="px-4 py-3 font-semibold"><span className="inline-flex items-center gap-2">{student.avatar ? <img src={student.avatar} alt={`صورة ${personName(student)}`} className="size-9 rounded-full border border-border bg-muted object-contain" /> : <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">{personName(student).slice(0, 1)}</span>}{studentRecordBasePath ? <Link href={`${studentRecordBasePath}/${student.id}` as never} className="text-primary hover:underline">{personName(student)}</Link> : personName(student)}</span></td><td className="px-4 py-3">{status ? t.statusLabels[status] || status : '—'}</td></tr> })}</tbody></table>{attendance.students.length === 0 && <p className="p-6 text-sm text-muted-foreground">{t.empty}</p>}{attendance.students.length > 0 && attendance.records.length === 0 && <p className="border-t border-border p-4 text-sm text-muted-foreground">{t.noAttendance}</p>}</div>}</section>}

    {!loading && !error && mode === 'cases' && visibleCases.length > 0 && <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((level) => <article key={level} className="rounded-xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">{t.riskLabels[level]}</p><p className="mt-2 text-2xl font-bold">{visibleCases.filter((item) => item.riskLevel === level).length}</p></article>)}</div><section className="space-y-3">{visibleCases.map((item) => <article key={`${item.className}-${item.studentId}`} className="rounded-xl border border-border bg-card p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">{item.studentName}</h2><p className="mt-1 text-xs text-muted-foreground">{t.class}: {item.className}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${riskClasses[item.riskLevel] || 'bg-muted'}`}>{t.riskLabels[item.riskLevel] || item.riskLevel}</span></div><ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">{item.alerts.map((alert, index) => <li key={`${item.studentId}-${index}`} className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" />{alert.type.replaceAll('_', ' ')} · {alert.value}</li>)}</ul></article>)}</section></>}

    {!loading && !error && mode === 'finance-report' && rows.length > 0 && <section className="overflow-hidden rounded-xl border border-border bg-card"><div className="grid gap-3 border-b border-border p-4 sm:grid-cols-2 xl:grid-cols-4">{Object.entries(financeTotals).map(([currency, total]) => <div key={currency} className="flex items-center justify-between rounded-lg bg-muted/50 p-4"><span className="text-sm text-muted-foreground">{t.totalRevenue} · {currency}</span><span className="flex items-center gap-2 text-lg font-bold"><Wallet className="h-5 w-5 text-primary" />{new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ar-SA', { style: 'currency', currency }).format(total)}</span></div>)}<div className="flex items-center justify-between rounded-lg bg-muted/50 p-4"><span className="text-sm text-muted-foreground">{t.months}</span><span className="flex items-center gap-2 text-xl font-bold"><CalendarDays className="h-5 w-5 text-primary" />{new Set(rows.map((row) => row.name)).size}</span></div></div><table className="w-full text-start text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3">{t.month}</th><th className="px-4 py-3">{t.amount}</th></tr></thead><tbody className="divide-y divide-border">{rows.map((row) => <tr key={`${row.name}-${row.currency}`}><td className="px-4 py-3 font-semibold">{row.name}</td><td className="px-4 py-3">{new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ar-SA', { style: 'currency', currency: row.currency || 'SAR' }).format(Number(row.total))}</td></tr>)}</tbody></table></section>}

    {!loading && !error && mode === 'staff-report' && staffStats && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Object.entries(staffStats).map(([key, value]) => { const labels: Record<string, string> = { total: locale === 'en' ? 'Active accounts' : 'الحسابات النشطة', students: t.students, teachers: t.teachers, parents: locale === 'en' ? 'Parents' : 'أولياء الأمور', admins: locale === 'en' ? 'Administrators' : 'مديرو النظام', principals: locale === 'en' ? 'Principals' : 'مديرو المدارس', vicePrincipals: locale === 'en' ? 'Vice principals' : 'وكلاء المدارس', counselors: locale === 'en' ? 'Student counselors' : 'المرشدون الطلابيون', supervisors: locale === 'en' ? 'Educational supervisors' : 'المشرفون التربويون', accountants: locale === 'en' ? 'Accountants' : 'المحاسبون', hr: locale === 'en' ? 'Human resources' : 'الموارد البشرية' }; return <article key={key} className="rounded-xl border border-border bg-card p-5"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{labels[key] || key}</p>{key === 'students' ? <GraduationCap className="h-5 w-5 text-primary" /> : <Users className="h-5 w-5 text-primary" />}</div><p className="mt-3 text-3xl font-bold">{value}</p></article> })}</section>}

    {!loading && !error && mode === 'supervisor-report' && rows[0] && <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">{[[t.classes, visibleSupervisorClasses.length], [t.employees, rows[0].teachers.length], [t.highCases, visibleSupervisorClasses.filter((row) => ['NEEDS_ATTENTION', 'CRITICAL'].includes(row.status)).length]].map(([label, value]) => <article key={label} className="rounded-xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-bold">{value}</p></article>)}</div>
      {visibleSupervisorClasses.length > 0 && <div className="overflow-x-auto rounded-xl border border-border bg-card"><h2 className="border-b border-border px-4 py-3 font-bold">{t.classes}</h2><table className="w-full min-w-[650px] text-start text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3">{t.class}</th><th className="px-4 py-3">{t.students}</th><th className="px-4 py-3">{t.attendance}</th><th className="px-4 py-3">{t.grade}</th><th className="px-4 py-3">{t.status}</th></tr></thead><tbody className="divide-y divide-border">{visibleSupervisorClasses.map((row) => <tr key={row.classId}><td className="px-4 py-3 font-semibold">{row.className}</td><td className="px-4 py-3">{row.studentsCount}</td><td className="px-4 py-3">{row.avgAttendance === null ? '—' : `${row.avgAttendance}%`}</td><td className="px-4 py-3">{row.avgGrade === null ? '—' : `${row.avgGrade}%`}</td><td className="px-4 py-3">{t.statusLabels[row.status] || row.status}</td></tr>)}</tbody></table></div>}
      {rows[0].teachers.length > 0 && <div className="overflow-x-auto rounded-xl border border-border bg-card"><h2 className="border-b border-border px-4 py-3 font-bold">{t.teachers}{classFilterId ? ` · ${locale === 'en' ? 'school-wide totals' : 'إجماليات على مستوى المدرسة'}` : ''}</h2><table className="w-full min-w-[760px] text-start text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3">{t.name}</th><th className="px-4 py-3">{t.assignedClasses}</th><th className="px-4 py-3">{t.subjects}</th><th className="px-4 py-3">{t.assignments}</th><th className="px-4 py-3">{t.graded}</th><th className="px-4 py-3">{t.grade}</th></tr></thead><tbody className="divide-y divide-border">{rows[0].teachers.map((row: TeacherPerformance) => <tr key={row.teacherId}><td className="px-4 py-3 font-semibold">{row.teacherName}</td><td className="px-4 py-3">{row.stats.classesCount}</td><td className="px-4 py-3">{row.stats.subjectsCount}</td><td className="px-4 py-3">{row.stats.assignmentsCreated}</td><td className="px-4 py-3">{row.stats.assignmentsGraded}</td><td className="px-4 py-3">{row.stats.avgStudentScore === null ? '—' : `${row.stats.avgStudentScore}%`}</td></tr>)}</tbody></table></div>}
    </section>}
    <ReportPrintFooter />
  </main>
}
