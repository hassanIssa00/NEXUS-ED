'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { AlertTriangle, BookOpen, CircleAlert, ClipboardCheck, Loader2, RefreshCw, School, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { DashboardBarChart, DashboardComparisonChart } from '@/components/dashboard/analytics-charts'

type ClassActivity = { classId: string; className: string; studentsCount: number; avgAttendance: number | null; avgGrade: number | null; assignmentsCompleted: number; totalAssignments: number; status: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION' | 'CRITICAL' | 'NO_DATA' }
type TeacherPerformance = { teacherId: string; teacherName: string; stats: { classesCount: number; subjectsCount: number; assignmentsCreated: number; assignmentsGraded: number; avgStudentScore: number | null } }

const text = {
  ar: {
    title: 'لوحة الإشراف التربوي', subtitle: 'متابعة أداء المعلمين والفصول من الحضور والدرجات والواجبات المسجلة.', refresh: 'تحديث', loading: 'جار تحميل تقارير الفصول والمعلمين...', error: 'تعذر تحميل بيانات الإشراف من النظام.',
    teachers: 'المعلمون النشطون', classes: 'الفصول', attention: 'فصول تحتاج متابعة', noRecords: 'فصول بلا سجلات تقييم', teacherTitle: 'متابعة أداء المعلمين', classTitle: 'متابعة أداء الفصول',
    teacher: 'المعلم', assignedClasses: 'فصول مسندة', subjects: 'مواد', assignments: 'واجبات منشأة', graded: 'واجبات مصححة', average: 'متوسط الدرجات',
    class: 'الفصل', students: 'الطلاب', attendance: 'الحضور آخر 30 يومًا', grade: 'متوسط الدرجات', submissions: 'تسليمات الواجبات', status: 'الحالة',
    noTeachers: 'لا توجد حسابات معلمين نشطة في المدرسة.', noClasses: 'لا توجد فصول مسجلة بعد. يجب على إدارة المدرسة إضافة الفصول والمواد والطلاب لبدء المتابعة الإشرافية.', noData: 'لا توجد سجلات',
    statuses: { EXCELLENT: 'متميز', GOOD: 'مستقر', NEEDS_ATTENTION: 'يحتاج متابعة', CRITICAL: 'يحتاج تدخلًا', NO_DATA: 'لا توجد بيانات' },
    charts: { classPerformance: 'مقارنة حضور الفصول ودرجاتها', teacherScores: 'متوسط درجات الطلاب حسب المعلم', empty: 'لا توجد سجلات كافية لعرض الرسم البياني.' },
  },
  en: {
    title: 'Educational supervisor dashboard', subtitle: 'Review teacher and class performance from recorded attendance, grades, and assignments.', refresh: 'Refresh', loading: 'Loading class and teacher reports...', error: 'Could not load supervisor data from the system.',
    teachers: 'Active teachers', classes: 'Classes', attention: 'Classes needing follow-up', noRecords: 'Classes without assessment records', teacherTitle: 'Teacher performance', classTitle: 'Class performance',
    teacher: 'Teacher', assignedClasses: 'Assigned classes', subjects: 'Subjects', assignments: 'Assignments created', graded: 'Graded submissions', average: 'Average grade',
    class: 'Class', students: 'Students', attendance: 'Attendance, last 30 days', grade: 'Average grade', submissions: 'Assignment submissions', status: 'Status',
    noTeachers: 'There are no active teacher accounts at this school.', noClasses: 'No classes are registered yet. School administration must add classes, subjects, and students before supervision can start.', noData: 'No records',
    statuses: { EXCELLENT: 'Excellent', GOOD: 'On track', NEEDS_ATTENTION: 'Needs follow-up', CRITICAL: 'Needs intervention', NO_DATA: 'No data' },
    charts: { classPerformance: 'Class attendance and grades', teacherScores: 'Student average by teacher', empty: 'There are not enough records to show this chart.' },
  },
} as const

function ratio(value: number | null, locale: string) {
  return value === null ? '—' : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)}%`
}

export default function SupervisorDashboard() {
  const locale = useLocale()
  const language = locale === 'en' ? 'en-US' : 'ar-SA'
  const t = text[locale === 'en' ? 'en' : 'ar']
  const [classes, setClasses] = useState<ClassActivity[]>([])
  const [teachers, setTeachers] = useState<TeacherPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (refresh = false) => {
    setLoading(!refresh)
    setRefreshing(refresh)
    setError('')
    try {
      const [classResponse, teacherResponse] = await Promise.all([
        apiClient.get<ClassActivity[]>('/admin/dashboard/classes'),
        apiClient.get<TeacherPerformance[]>('/admin/dashboard/teachers'),
      ])
      setClasses(classResponse.data)
      setTeachers(teacherResponse.data)
    } catch {
      setError(t.error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [t.error])

  useEffect(() => { void load() }, [load])

  const needsAttention = classes.filter((item) => item.status === 'NEEDS_ATTENTION' || item.status === 'CRITICAL').length
  const noRecords = classes.filter((item) => item.status === 'NO_DATA').length
  const metrics: Array<{ label: string; value: number; icon: LucideIcon }> = [
    { label: t.teachers, value: teachers.length, icon: Users },
    { label: t.classes, value: classes.length, icon: School },
    { label: t.attention, value: needsAttention, icon: AlertTriangle },
    { label: t.noRecords, value: noRecords, icon: ClipboardCheck },
  ]
  const badge: Record<ClassActivity['status'], string> = {
    EXCELLENT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
    GOOD: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
    NEEDS_ATTENTION: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
    CRITICAL: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200',
    NO_DATA: 'bg-muted text-muted-foreground',
  }

  if (loading) return <main className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t.loading}</main>

  return <main className="mx-auto max-w-7xl space-y-6 pb-12" dir={locale === 'en' ? 'ltr' : 'rtl'}>
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5"><div><p className="text-sm font-semibold text-primary">Nexus EDU</p><h1 className="mt-1 text-3xl font-black">{t.title}</h1><p className="mt-2 text-sm text-muted-foreground">{t.subtitle}</p></div><button type="button" onClick={() => void load(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />{t.refresh}</button></header>
    {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(({ label, value, icon: Icon }) => <article key={label} className="rounded-xl border border-border bg-card p-5"><div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{label}</p><Icon className="h-5 w-5 text-primary" /></div><p className="mt-3 text-3xl font-bold tabular-nums">{value}</p></article>)}
    </section>
    <section className="grid gap-4 lg:grid-cols-2">
      <DashboardComparisonChart title={t.charts.classPerformance} emptyLabel={t.charts.empty} leftLabel={t.attendance} rightLabel={t.grade} data={classes.map((item) => ({ label: item.className, first: item.avgAttendance, second: item.avgGrade }))} />
      <DashboardBarChart title={t.charts.teacherScores} emptyLabel={t.charts.empty} suffix="%" data={teachers.filter((item) => item.stats.avgStudentScore !== null).map((item) => ({ label: item.teacherName, value: item.stats.avgStudentScore as number }))} color="#0f766e" />
    </section>
    <section className="overflow-hidden rounded-xl border border-border bg-card"><header className="flex items-center gap-2 border-b border-border px-5 py-4"><Users className="h-5 w-5 text-primary" /><h2 className="font-bold">{t.teacherTitle}</h2></header>{teachers.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-start text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3">{t.teacher}</th><th className="px-4 py-3">{t.assignedClasses}</th><th className="px-4 py-3">{t.subjects}</th><th className="px-4 py-3">{t.assignments}</th><th className="px-4 py-3">{t.graded}</th><th className="px-4 py-3">{t.average}</th></tr></thead><tbody className="divide-y divide-border">{teachers.map((teacher) => <tr key={teacher.teacherId}><td className="px-4 py-3 font-semibold">{teacher.teacherName}</td><td className="px-4 py-3">{teacher.stats.classesCount}</td><td className="px-4 py-3">{teacher.stats.subjectsCount}</td><td className="px-4 py-3">{teacher.stats.assignmentsCreated}</td><td className="px-4 py-3">{teacher.stats.assignmentsGraded}</td><td className="px-4 py-3">{ratio(teacher.stats.avgStudentScore, language)}</td></tr>)}</tbody></table></div> : <p className="p-6 text-sm text-muted-foreground">{t.noTeachers}</p>}</section>
    <section className="overflow-hidden rounded-xl border border-border bg-card"><header className="flex items-center gap-2 border-b border-border px-5 py-4"><BookOpen className="h-5 w-5 text-primary" /><h2 className="font-bold">{t.classTitle}</h2></header>{classes.length ? <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-start text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3">{t.class}</th><th className="px-4 py-3">{t.students}</th><th className="px-4 py-3">{t.attendance}</th><th className="px-4 py-3">{t.grade}</th><th className="px-4 py-3">{t.submissions}</th><th className="px-4 py-3">{t.status}</th></tr></thead><tbody className="divide-y divide-border">{classes.map((item) => <tr key={item.classId}><td className="px-4 py-3 font-semibold">{item.className}</td><td className="px-4 py-3">{item.studentsCount}</td><td className="px-4 py-3">{ratio(item.avgAttendance, language)}</td><td className="px-4 py-3">{ratio(item.avgGrade, language)}</td><td className="px-4 py-3">{item.assignmentsCompleted}/{item.totalAssignments}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge[item.status]}`}>{t.statuses[item.status]}</span></td></tr>)}</tbody></table></div> : <p className="p-6 text-sm text-muted-foreground">{t.noClasses}</p>}</section>
  </main>
}
