'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { Activity, AlertTriangle, BookOpen, CheckCircle2, CircleAlert, ClipboardList, GraduationCap, Loader2, RefreshCw, School, Users } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { apiClient } from '@/lib/api/client'
import { dashboardApi, type AdminDashboardResponse } from '@/lib/api/dashboard'
import { formatSchoolActivity } from '@/lib/dashboard-utils'
import { DashboardBarChart, DashboardComparisonChart, DashboardDonutChart } from '@/components/dashboard/analytics-charts'

type DashboardRole = 'principal' | 'vice_principal'
type Overview = {
  stats: { totalStudents: number; totalTeachers: number; totalClasses: number; totalSubjects: number; totalAssignments: number; activeUsers: number; unassignedStudents: number }
  attendance: { todayPresent: number; todayAbsent: number; todayLate: number; todayRecordCount: number; weeklyRecordCount: number; weeklyRate: number | null }
  assignments: { pending: number; submitted: number; graded: number; overdueRate: number | null; overdueCount: number; overdueTotal: number }
}
type ClassActivity = { classId: string; className: string; studentsCount: number; avgAttendance: number | null; avgGrade: number | null; assignmentsCompleted: number; totalAssignments: number; status: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION' | 'CRITICAL' | 'NO_DATA' }
type TeacherPerformance = { teacherId: string; teacherName: string; stats: { classesCount: number; subjectsCount: number; assignmentsCreated: number; assignmentsGraded: number; avgStudentScore: number | null } }

const copy = {
  ar: {
    principal: 'لوحة مدير المدرسة', vice_principal: 'لوحة وكيل المدرسة',
    principalSub: 'صورة واضحة عن التسجيل والتدريس والمتابعة في المدرسة، من السجلات الفعلية.',
    viceSub: 'متابعة الحضور اليومي والفصول والواجبات التي تحتاج إجراءً.',
    refresh: 'تحديث البيانات', loading: 'جار تحميل سجلات المدرسة...', error: 'تعذر تحميل لوحة المدرسة. تأكد من صلاحية الحساب واتصاله بالمدرسة.',
    students: 'الطلاب النشطون', teachers: 'المعلمون', classes: 'الفصول', subjects: 'المواد', assignments: 'الواجبات المنشورة',
    setupTitle: 'المدرسة تحتاج إلى استكمال إعدادها', setupBody: (students: number, classes: number, subjects: number) => {
      const missing = [
        ...(classes === 0 ? ['لا توجد فصول مسجلة'] : []),
        ...(subjects === 0 ? ['لا توجد مواد دراسية'] : []),
        ...(students > 0 ? [`${students} طالبًا بلا فصل`] : []),
      ]
      return `${missing.join('، ')}. أكمل إعداد الفصول والمواد واربط الطلاب بها حتى تظهر بيانات المتابعة.`
    },
    reports: 'التقارير المدرسية',
    operations: 'متابعة اليوم', attendance: 'سجلات الحضور اليوم', present: 'حاضرون', absent: 'غائبون', late: 'متأخرون', noAttendance: 'لم تُسجل سجلات حضور اليوم.',
    assignmentQueue: 'متابعة الواجبات', waitingGrade: 'تسليمات بانتظار التصحيح', overdue: 'واجبات متأخرة بلا تسليم', noOverdue: 'لا توجد واجبات متأخرة في السجلات.',
    classesTitle: 'أداء الفصول', class: 'الفصل', classStudents: 'الطلاب', classAttendance: 'الحضور خلال 30 يومًا', classGrade: 'متوسط الدرجات', classWork: 'تسليمات الواجبات',
    noClasses: 'لا توجد فصول لعرض أدائها.', noData: 'لا توجد سجلات كافية بعد', status: { EXCELLENT: 'متميز', GOOD: 'مستقر', NEEDS_ATTENTION: 'يحتاج متابعة', CRITICAL: 'يحتاج تدخلًا', NO_DATA: 'لا توجد بيانات' },
    teachersTitle: 'أداء المعلمين', teacher: 'المعلم', teacherClasses: 'الفصول', teacherSubjects: 'المواد', teacherAssignments: 'الواجبات', teacherGrading: 'تم تصحيحها', teacherAverage: 'متوسط الدرجات', noTeachers: 'لا توجد حسابات معلمين نشطة.',
    schoolSnapshot: 'ملخص المدرسة', activeAccounts: 'الحسابات النشطة', weeklyAttendance: 'الحضور خلال 7 أيام', noWeekly: 'لا توجد سجلات حضور خلال آخر 7 أيام.', completion: 'نسبة إنجاز الواجبات', activity: 'آخر نشاط مسجل', noActivity: 'لا يوجد نشاط مسجل بعد.',
    partial: 'تعذر تحميل بعض التفاصيل. الأرقام المعروضة مأخوذة من مصادرها المتاحة.',
    attendanceChart: 'توزيع حضور اليوم', assignmentChart: 'متابعة التسليمات والتصحيح', classChart: 'مقارنة الحضور والدرجات حسب الفصل', enrollmentChart: 'التسجيلات الطلابية عبر الوقت', chartEmpty: 'لا توجد سجلات كافية لعرض الرسم البياني.',
  },
  en: {
    principal: 'Principal dashboard', vice_principal: 'Vice principal dashboard',
    principalSub: 'A clear view of enrollment, teaching, and school follow-up from recorded school data.',
    viceSub: 'Daily attendance, class operations, and assignments that need attention.',
    refresh: 'Refresh data', loading: 'Loading school records...', error: 'Could not load the school dashboard. Check this account’s school access.',
    students: 'Active students', teachers: 'Teachers', classes: 'Classes', subjects: 'Subjects', assignments: 'Published assignments',
    setupTitle: 'School setup needs attention', setupBody: (students: number, classes: number, subjects: number) => {
      const missing = [
        ...(classes === 0 ? ['No classes are registered'] : []),
        ...(subjects === 0 ? ['No subjects are registered'] : []),
        ...(students > 0 ? [`${students} students are not assigned to a class`] : []),
      ]
      return `${missing.join('; ')}. Complete class and subject setup and assign students to enable academic follow-up.`
    },
    reports: 'School reports',
    operations: 'Today’s operations', attendance: 'Attendance records today', present: 'Present', absent: 'Absent', late: 'Late', noAttendance: 'No attendance records have been entered today.',
    assignmentQueue: 'Assignment follow-up', waitingGrade: 'Submissions awaiting grading', overdue: 'Overdue assignments without submissions', noOverdue: 'No overdue assignments in the records.',
    classesTitle: 'Class performance', class: 'Class', classStudents: 'Students', classAttendance: 'Attendance in the last 30 days', classGrade: 'Average grade', classWork: 'Assignment submissions',
    noClasses: 'There are no classes to show.', noData: 'No records yet', status: { EXCELLENT: 'Excellent', GOOD: 'On track', NEEDS_ATTENTION: 'Needs follow-up', CRITICAL: 'Needs intervention', NO_DATA: 'No data' },
    teachersTitle: 'Teacher performance', teacher: 'Teacher', teacherClasses: 'Classes', teacherSubjects: 'Subjects', teacherAssignments: 'Assignments', teacherGrading: 'Graded', teacherAverage: 'Average grade', noTeachers: 'There are no active teacher accounts.',
    schoolSnapshot: 'School snapshot', activeAccounts: 'Active accounts', weeklyAttendance: 'Attendance in the last 7 days', noWeekly: 'No attendance records in the last 7 days.', completion: 'Assignment completion rate', activity: 'Recent recorded activity', noActivity: 'No activity has been recorded yet.',
    partial: 'Some details could not be loaded. Displayed figures come from the available sources.',
    attendanceChart: 'Today’s attendance', assignmentChart: 'Submission and grading status', classChart: 'Attendance and grades by class', enrollmentChart: 'Student enrollment over time', chartEmpty: 'There are not enough records to show this chart.',
  },
} as const

function Tile({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Users }) {
  return <article className="rounded-xl border border-border bg-card p-5"><div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{label}</p><Icon className="h-5 w-5 text-primary" /></div><p className="mt-3 text-3xl font-bold tabular-nums">{value}</p></article>
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg bg-muted/60 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold tabular-nums">{value}</p></div>
}

function percent(value: number | null, language: string) {
  return value === null ? '—' : `${new Intl.NumberFormat(language, { maximumFractionDigits: 0 }).format(value)}%`
}

export default function SchoolLeadershipDashboard({ role }: { role: DashboardRole }) {
  const locale = useLocale()
  const language = locale === 'en' ? 'en-US' : 'ar-SA'
  const t = copy[locale === 'en' ? 'en' : 'ar']
  const [overview, setOverview] = useState<Overview | null>(null)
  const [snapshot, setSnapshot] = useState<AdminDashboardResponse | null>(null)
  const [classes, setClasses] = useState<ClassActivity[]>([])
  const [teachers, setTeachers] = useState<TeacherPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [partial, setPartial] = useState(false)

  const load = useCallback(async (refresh = false) => {
    setLoading(!refresh)
    setRefreshing(refresh)
    setError('')
    const results = await Promise.allSettled([
      apiClient.get<Overview>('/admin/dashboard/overview'),
      dashboardApi.getAdminDashboard(),
      apiClient.get<ClassActivity[]>('/admin/dashboard/classes'),
      role === 'principal' ? apiClient.get<TeacherPerformance[]>('/admin/dashboard/teachers') : Promise.resolve(null),
    ])
    const [overviewResult, snapshotResult, classResult, teacherResult] = results
    if (overviewResult.status === 'fulfilled') setOverview(overviewResult.value.data)
    if (snapshotResult.status === 'fulfilled') setSnapshot(snapshotResult.value)
    if (classResult.status === 'fulfilled') setClasses(classResult.value.data)
    if (teacherResult.status === 'fulfilled' && teacherResult.value) setTeachers(teacherResult.value.data)
    setPartial(results.some((result) => result.status === 'rejected'))
    if (overviewResult.status === 'rejected' && snapshotResult.status === 'rejected') setError(t.error)
    setLoading(false)
    setRefreshing(false)
  }, [t.error])

  useEffect(() => { void load() }, [load])

  const stats = overview?.stats
  const studentCount = stats?.totalStudents ?? snapshot?.kpis.totalStudents ?? '—'
  const teacherCount = stats?.totalTeachers ?? snapshot?.kpis.totalTeachers ?? '—'
  const classCount = stats?.totalClasses ?? snapshot?.kpis.totalClasses ?? '—'
  const subjectCount = stats?.totalSubjects ?? snapshot?.kpis.totalSubjects ?? '—'
  const assignmentCount = stats?.totalAssignments ?? '—'
  const needsSetup = overview !== null && (overview.stats.totalClasses === 0 || overview.stats.unassignedStudents > 0 || overview.stats.totalSubjects === 0)
  const needsGrading = overview?.assignments.pending ?? '—'
  const overdueCount = overview?.assignments.overdueCount ?? '—'
  const overdueRate = overview?.assignments.overdueRate
  const weeklyRate = overview?.attendance.weeklyRate
  const weekRecords = overview?.attendance.weeklyRecordCount ?? 0
  const classStatusClass: Record<ClassActivity['status'], string> = {
    EXCELLENT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
    GOOD: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
    NEEDS_ATTENTION: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
    CRITICAL: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200',
    NO_DATA: 'bg-muted text-muted-foreground',
  }

  if (loading) return <main className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t.loading}</main>

  return <main className="mx-auto max-w-7xl space-y-6 pb-12" dir={locale === 'en' ? 'ltr' : 'rtl'}>
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div><p className="text-sm font-semibold text-primary">Nexus EDU</p><h1 className="mt-1 text-3xl font-black">{t[role]}</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">{role === 'principal' ? t.principalSub : t.viceSub}</p></div>
      <button type="button" onClick={() => void load(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />{t.refresh}</button>
    </header>

    {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
    {partial && !error && <p role="status" className="rounded-lg border border-amber-300/40 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-100">{t.partial}</p>}

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Tile label={t.students} value={studentCount} icon={GraduationCap} />
      <Tile label={t.teachers} value={teacherCount} icon={Users} />
      <Tile label={t.classes} value={classCount} icon={School} />
      <Tile label={t.subjects} value={subjectCount} icon={BookOpen} />
      <Tile label={t.assignments} value={assignmentCount} icon={ClipboardList} />
    </section>

    <section className="grid gap-4 lg:grid-cols-2">
      <DashboardDonutChart title={t.attendanceChart} emptyLabel={t.chartEmpty} data={overview?.attendance ? [
        { label: t.present, value: overview.attendance.todayPresent, color: '#0f766e' },
        { label: t.absent, value: overview.attendance.todayAbsent, color: '#dc2626' },
        { label: t.late, value: overview.attendance.todayLate, color: '#d97706' },
      ] : []} />
      <DashboardDonutChart title={t.assignmentChart} emptyLabel={t.chartEmpty} data={overview?.assignments ? [
        { label: t.waitingGrade, value: overview.assignments.pending, color: '#d97706' },
        { label: t.teacherGrading, value: overview.assignments.graded, color: '#0f766e' },
      ] : []} />
      <DashboardComparisonChart title={t.classChart} emptyLabel={t.chartEmpty} leftLabel={t.classAttendance} rightLabel={t.classGrade} data={classes.map((item) => ({ label: item.className, first: item.avgAttendance, second: item.avgGrade }))} />
      <DashboardBarChart title={t.enrollmentChart} emptyLabel={t.chartEmpty} color="#0f766e" data={(snapshot?.enrollmentSeries || []).map((item) => ({ label: item.label, value: item.value }))} />
    </section>

    {needsSetup && <section className="rounded-xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-700/50 dark:bg-amber-900/20"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" /><div className="flex-1"><h2 className="font-bold text-amber-950 dark:text-amber-100">{t.setupTitle}</h2><p className="mt-1 text-sm text-amber-900/80 dark:text-amber-100/80">{t.setupBody(overview?.stats.unassignedStudents ?? 0, overview?.stats.totalClasses ?? 0, overview?.stats.totalSubjects ?? 0)}</p>{role === 'principal' && <div className="mt-4"><Link className="rounded-md border border-amber-800/30 px-3 py-2 text-sm font-semibold hover:bg-amber-100 dark:border-amber-200/30 dark:hover:bg-amber-900/30" href="/principal/analytics">{t.reports}</Link></div>}</div></div></section>}

    {role === 'vice_principal' ? <>
      <section className="rounded-xl border border-border bg-card p-5"><div className="mb-4 flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /><h2 className="text-lg font-bold">{t.operations}</h2></div>{overview?.attendance.todayRecordCount ? <div className="grid gap-3 sm:grid-cols-3"><Stat label={t.present} value={overview.attendance.todayPresent} /><Stat label={t.absent} value={overview.attendance.todayAbsent} /><Stat label={t.late} value={overview.attendance.todayLate} /></div> : <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">{t.noAttendance}</p>}</section>
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-border bg-card p-5"><h2 className="font-bold">{t.assignmentQueue}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><Stat label={t.waitingGrade} value={needsGrading} /><Stat label={t.overdue} value={overdueRate === null || overdueRate === undefined ? '—' : overdueCount} /></div>{overview?.assignments.overdueRate === null && <p className="mt-3 text-xs text-muted-foreground">{t.noOverdue}</p>}<p className="mt-3 text-xs text-muted-foreground">{overdueRate !== null && overdueRate !== undefined ? `${percent(overdueRate, language)} · ${overview?.assignments.overdueTotal ?? 0}` : ''}</p></article>
        <article className="rounded-xl border border-border bg-card p-5"><h2 className="font-bold">{t.schoolSnapshot}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><Stat label={t.activeAccounts} value={snapshot?.kpis.activeUsers ?? '—'} /><Stat label={t.weeklyAttendance} value={weekRecords ? percent(weeklyRate ?? null, language) : t.noData} /></div></article>
      </section>
    </> : <section className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-xl border border-border bg-card p-5"><h2 className="font-bold">{t.schoolSnapshot}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><Stat label={t.activeAccounts} value={snapshot?.kpis.activeUsers ?? '—'} /><Stat label={t.weeklyAttendance} value={weekRecords ? percent(weeklyRate ?? null, language) : t.noWeekly} /><Stat label={t.waitingGrade} value={needsGrading} /><Stat label={t.overdue} value={overdueRate === null || overdueRate === undefined ? t.noData : `${overdueCount} · ${percent(overdueRate, language)}`} /></div></article>
      <article className="rounded-xl border border-border bg-card p-5"><h2 className="font-bold">{t.activity}</h2>{snapshot?.recentActivity.length ? <ul className="mt-3 divide-y divide-border">{snapshot.recentActivity.slice(0, 5).map((item) => <li key={item.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{item.actor} · {formatSchoolActivity(item.action, locale)}</span><time className="text-xs text-muted-foreground">{new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(item.createdAt))}</time></li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">{t.noActivity}</p>}</article>
    </section>}

    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-5 py-4"><School className="h-5 w-5 text-primary" /><h2 className="font-bold">{t.classesTitle}</h2></header>
      {classes.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-start text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3">{t.class}</th><th className="px-4 py-3">{t.classStudents}</th><th className="px-4 py-3">{t.classAttendance}</th><th className="px-4 py-3">{t.classGrade}</th><th className="px-4 py-3">{t.classWork}</th><th className="px-4 py-3">{t.status.EXCELLENT}</th></tr></thead><tbody className="divide-y divide-border">{classes.map((item) => <tr key={item.classId}><td className="px-4 py-3 font-semibold">{item.className}</td><td className="px-4 py-3">{item.studentsCount}</td><td className="px-4 py-3">{item.avgAttendance === null ? t.noData : percent(item.avgAttendance, language)}</td><td className="px-4 py-3">{item.avgGrade === null ? t.noData : percent(item.avgGrade, language)}</td><td className="px-4 py-3">{item.assignmentsCompleted}/{item.totalAssignments}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classStatusClass[item.status]}`}>{t.status[item.status]}</span></td></tr>)}</tbody></table></div> : <p className="p-6 text-sm text-muted-foreground">{t.noClasses}</p>}
    </section>

    {role === 'principal' && <section className="overflow-hidden rounded-xl border border-border bg-card"><header className="flex items-center gap-2 border-b border-border px-5 py-4"><Users className="h-5 w-5 text-primary" /><h2 className="font-bold">{t.teachersTitle}</h2></header>{teachers.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-start text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3">{t.teacher}</th><th className="px-4 py-3">{t.teacherClasses}</th><th className="px-4 py-3">{t.teacherSubjects}</th><th className="px-4 py-3">{t.teacherAssignments}</th><th className="px-4 py-3">{t.teacherGrading}</th><th className="px-4 py-3">{t.teacherAverage}</th></tr></thead><tbody className="divide-y divide-border">{teachers.map((teacher) => <tr key={teacher.teacherId}><td className="px-4 py-3 font-semibold">{teacher.teacherName}</td><td className="px-4 py-3">{teacher.stats.classesCount}</td><td className="px-4 py-3">{teacher.stats.subjectsCount}</td><td className="px-4 py-3">{teacher.stats.assignmentsCreated}</td><td className="px-4 py-3">{teacher.stats.assignmentsGraded}</td><td className="px-4 py-3">{teacher.stats.avgStudentScore === null ? t.noData : percent(teacher.stats.avgStudentScore, language)}</td></tr>)}</tbody></table></div> : <p className="p-6 text-sm text-muted-foreground">{t.noTeachers}</p>}</section>}
  </main>
}
