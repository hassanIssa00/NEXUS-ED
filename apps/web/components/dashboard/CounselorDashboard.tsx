'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocale } from 'next-intl'
import { AlertTriangle, CircleAlert, ClipboardList, HeartHandshake, Loader2, RefreshCw, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { apiClient } from '@/lib/api/client'

type RiskAlert = { type: 'GRADE_DROP' | 'LOW_ATTENDANCE' | 'MISSING_ASSIGNMENTS'; severity: 'LOW' | 'MEDIUM' | 'HIGH'; message: string; value: number; threshold: number }
type StudentWarning = { studentId: string; studentName: string; alerts: RiskAlert[]; riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }
type SchoolClass = { id: string; name: string; teacher?: { name?: string | null; email?: string | null } | null; _count?: { students?: number; subjects?: number } }
type ClassWarnings = { classInfo: SchoolClass; warnings: StudentWarning[] }

const words = {
  ar: {
    title: 'لوحة التوجيه الطلابي', subtitle: 'متابعة حالات الطلاب بناءً على الحضور والدرجات والواجبات المسجلة، مع استبيانات أولياء الأمور.', refresh: 'تحديث', loading: 'جار تحميل متابعة الطلاب...', error: 'تعذر تحميل بيانات الفصول ومؤشرات الطلاب.',
    students: 'تسجيلات الطلاب بالفصول', cases: 'طلاب لديهم مؤشرات متابعة', severe: 'حالات مرتفعة أو حرجة', classes: 'الفصول المتاحة',
    surveys: 'استبيانات أولياء الأمور', casesTitle: 'حالات تحتاج متابعة', noClasses: 'لا توجد فصول مرتبطة بالمدرسة بعد؛ اطلب من الإدارة تسجيل الفصول والطلاب.', noCases: 'لا توجد مؤشرات متابعة في السجلات المتاحة.', noStudents: 'لا يوجد طلاب مسجلون في هذا الفصل.',
    studentsInClass: 'طالب', teacher: 'المعلم', noTeacher: 'لا يوجد معلم مسجل', risks: 'مؤشرات مسجلة', risk: { LOW: 'منخفض', MEDIUM: 'متوسط', HIGH: 'مرتفع', CRITICAL: 'حرج' },
    alert: { GRADE_DROP: (v: number) => `متوسط الدرجات ${v.toFixed(1)}% أقل من الحد المسجل`, LOW_ATTENDANCE: (v: number) => `نسبة الحضور ${v.toFixed(1)}% أقل من الحد المسجل`, MISSING_ASSIGNMENTS: (v: number) => `${v} واجبات غير مسلمة` },
    setup: 'مؤشرات المتابعة تظهر عند تسجيل الحضور أو الدرجات أو الواجبات في المدرسة.',
  },
  en: {
    title: 'Student counseling dashboard', subtitle: 'Review students based on recorded attendance, grades, and assignments, alongside parent surveys.', refresh: 'Refresh', loading: 'Loading student follow-up...', error: 'Could not load classes and student indicators.',
    students: 'Student class enrollments', cases: 'Students with follow-up indicators', severe: 'High or critical cases', classes: 'Available classes',
    surveys: 'Parent surveys', casesTitle: 'Cases needing follow-up', noClasses: 'No classes are linked to this school yet. Ask school administration to add classes and students.', noCases: 'There are no follow-up indicators in the available records.', noStudents: 'No students are enrolled in this class.',
    studentsInClass: 'students', teacher: 'Teacher', noTeacher: 'No teacher assigned', risks: 'Recorded indicators', risk: { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical' },
    alert: { GRADE_DROP: (v: number) => `Average grade ${v.toFixed(1)}% is below the recorded threshold`, LOW_ATTENDANCE: (v: number) => `Attendance ${v.toFixed(1)}% is below the recorded threshold`, MISSING_ASSIGNMENTS: (v: number) => `${v} assignments not submitted` },
    setup: 'Follow-up indicators become available after attendance, grades, or assignments are recorded at the school.',
  },
} as const

export default function CounselorDashboard() {
  const locale = useLocale()
  const t = words[locale === 'en' ? 'en' : 'ar']
  const [classes, setClasses] = useState<ClassWarnings[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (refresh = false) => {
    setLoading(!refresh)
    setRefreshing(refresh)
    setError('')
    try {
      const response = await apiClient.get<SchoolClass[]>('/classes')
      const results = await Promise.all(response.data.map(async (classInfo) => {
        const warnings = await apiClient.get<StudentWarning[]>('/analytics/student/early-warnings', { params: { classId: classInfo.id } })
        return { classInfo, warnings: warnings.data }
      }))
      setClasses(results)
    } catch {
      setError(t.error)
      setClasses([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [t.error])

  useEffect(() => { void load() }, [load])

  const rows = useMemo(() => classes.flatMap((entry) => entry.warnings.map((warning) => ({ ...warning, className: entry.classInfo.name }))), [classes])
  const enrollmentCount = classes.reduce((sum, entry) => sum + (entry.classInfo._count?.students ?? 0), 0)
  const severeCount = rows.filter((row) => row.riskLevel === 'HIGH' || row.riskLevel === 'CRITICAL').length
  const metrics: Array<{ label: string; value: number; icon: LucideIcon }> = [
    { label: t.students, value: enrollmentCount, icon: Users },
    { label: t.cases, value: rows.length, icon: AlertTriangle },
    { label: t.severe, value: severeCount, icon: CircleAlert },
    { label: t.classes, value: classes.length, icon: ClipboardList },
  ]
  const badge: Record<StudentWarning['riskLevel'], string> = {
    LOW: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-200',
    MEDIUM: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
    HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
    CRITICAL: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200',
  }

  if (loading) return <main className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t.loading}</main>

  return <main className="mx-auto max-w-7xl space-y-6 pb-12" dir={locale === 'en' ? 'ltr' : 'rtl'}>
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5"><div><p className="text-sm font-semibold text-primary">Nexus EDU</p><h1 className="mt-1 text-3xl font-black">{t.title}</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">{t.subtitle}</p></div><div className="flex gap-2"><Link href="/counselor/parent-surveys" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"><HeartHandshake className="h-4 w-4" />{t.surveys}</Link><button type="button" onClick={() => void load(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />{t.refresh}</button></div></header>
    {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(({ label, value, icon: Icon }) => <article key={label} className="rounded-xl border border-border bg-card p-5"><div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{label}</p><Icon className="h-5 w-5 text-primary" /></div><p className="mt-3 text-3xl font-bold tabular-nums">{value}</p></article>)}
    </section>
    {!classes.length && !error && <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">{t.noClasses}</p>}
    {classes.map(({ classInfo, warnings }) => <section key={classInfo.id} className="overflow-hidden rounded-xl border border-border bg-card"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"><div><h2 className="font-bold">{classInfo.name}</h2><p className="mt-1 text-xs text-muted-foreground">{classInfo._count?.students ?? 0} {t.studentsInClass} · {t.teacher}: {classInfo.teacher?.name || classInfo.teacher?.email || t.noTeacher}</p></div><span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">{warnings.length} {t.risks}</span></header>{warnings.length ? <div className="divide-y divide-border">{warnings.map((warning) => <article key={warning.studentId} className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{warning.studentName}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge[warning.riskLevel]}`}>{t.risk[warning.riskLevel]}</span></div><ul className="mt-3 space-y-2">{warning.alerts.map((alert, index) => <li key={`${warning.studentId}-${alert.type}-${index}`} className="text-sm text-muted-foreground">• {t.alert[alert.type](alert.value)}</li>)}</ul></article>)}</div> : <p className="p-5 text-sm text-muted-foreground">{t.noCases}</p>}</section>)}
    {classes.length > 0 && rows.length === 0 && <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">{t.setup}</p>}
  </main>
}
