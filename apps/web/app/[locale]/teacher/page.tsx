'use client'

import { useCallback, useEffect, useState } from 'react'
import { Link } from '@/i18n/routing'
import { dashboardApi, type TeacherDashboardResponse } from '@/lib/api/dashboard'
import { useRealtimeAssignments, useRealtimeNotifications } from '@/lib/providers/socket-provider'
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  FilePlus2,
  RefreshCw,
  Users,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const shortcuts = [
  { href: '/teacher/assignments/create', label: 'إنشاء واجب', icon: FilePlus2 },
  { href: '/teacher/attendance', label: 'تسجيل الحضور', icon: CalendarCheck },
  { href: '/teacher/grading', label: 'قائمة التصحيح', icon: ClipboardList },
  { href: '/teacher/reports', label: 'تقارير الطلاب', icon: BarChart3 },
]

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: typeof Users }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
      <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{label}</p><Icon className="h-5 w-5 text-teal-700 dark:text-teal-300" /></div>
      <p className="mt-3 text-2xl font-black text-gray-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{detail}</p>
    </div>
  )
}

export default function TeacherDashboardPage() {
  const [data, setData] = useState<TeacherDashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      setData(await dashboardApi.getTeacherDashboard())
    } catch {
      setError('تعذر تحميل بياناتك من النظام. حاول تحديث الصفحة.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  useRealtimeAssignments(() => {
    void load()
    setNotice('تم تحديث بيانات الواجبات')
    window.setTimeout(() => setNotice(null), 4000)
  })

  useRealtimeNotifications((notification: any) => {
    const message = notification?.message || notification?.title
    if (!message) return
    setNotice(message)
    window.setTimeout(() => setNotice(null), 4000)
  })

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-sm text-gray-500">جار تحميل لوحة المعلم...</div>

  if (!data) return (
    <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-4 text-center" dir="rtl">
      <AlertCircle className="h-10 w-10 text-rose-500" />
      <p className="font-bold text-gray-800 dark:text-white">{error || 'لا تتوفر بيانات.'}</p>
      <button onClick={() => { setLoading(true); void load() }} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-800"><RefreshCw className="h-4 w-4" /> إعادة المحاولة</button>
    </div>
  )

  const { teacher, summary, classPerformance, recentAssignments, attendanceSummary, interventionAlerts, gradingQueue } = data
  const gradedClasses = classPerformance.filter((classItem) => classItem.averageGrade !== null)

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {notice && <div role="status" className="fixed left-1/2 top-5 z-50 -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-lg">{notice}</div>}

      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-200 pb-5 dark:border-white/10">
        <div>
          <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">بوابة المعلم</p>
          <h1 className="mt-1 text-2xl font-black text-gray-900 dark:text-white">أهلًا، {teacher.name}</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">ملخص مباشر للفصول والواجبات والسجلات المرتبطة بحسابك.</p>
        </div>
        <button onClick={() => { setLoading(true); void load() }} title="تحديث البيانات" className="rounded-lg border border-gray-200 p-2.5 text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"><RefreshCw className="h-4 w-4" /></button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="الفصول" value={summary.totalClasses} detail="فصول مرتبطة بحسابك" icon={BookOpen} />
        <Metric label="الطلاب" value={summary.totalStudents} detail="حسب قوائم الفصول" icon={Users} />
        <Metric label="بانتظار التصحيح" value={summary.pendingSubmissions} detail="تسليمات لم تسجل درجتها" icon={ClipboardList} />
        <Metric label="الحضور المسجل" value={summary.attendanceRate === null ? '—' : `${summary.attendanceRate}%`} detail={summary.attendanceRate === null ? 'لا توجد سجلات خلال آخر 30 يومًا' : `${attendanceSummary.totalRecords} سجلًا خلال آخر 30 يومًا`} icon={CalendarCheck} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <div className="mb-4 flex items-center justify-between"><div><h2 className="font-black text-gray-900 dark:text-white">فصولك</h2><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">أعداد الطلاب والدرجات المسجلة</p></div><Users className="h-5 w-5 text-teal-700" /></div>
          {classPerformance.length ? <div className="divide-y divide-gray-100 dark:divide-white/10">{classPerformance.map((classItem) => <div key={classItem.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"><div><p className="font-bold text-gray-900 dark:text-white">{classItem.name}</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{classItem.studentCount} طالب · {classItem.subjectCount} مادة</p></div><span className="text-sm font-black text-gray-800 dark:text-gray-200">{classItem.averageGrade === null ? 'لا توجد درجات' : `${classItem.averageGrade}%`}</span></div>)}</div> : <p className="py-8 text-center text-sm text-gray-500">لا توجد فصول مرتبطة بحسابك.</p>}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <h2 className="font-black text-gray-900 dark:text-white">متوسط الدرجات المسجلة</h2>
          <p className="mb-3 mt-1 text-xs text-gray-500 dark:text-gray-400">مقارنة بين الفصول التي لها سجلات درجات</p>
          {gradedClasses.length ? <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={gradedClasses.map((classItem) => ({ name: classItem.name, average: classItem.averageGrade }))}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} /><Tooltip /><Bar dataKey="average" name="المعدل" radius={[5, 5, 0, 0]}>{gradedClasses.map((classItem) => <Cell key={classItem.id} fill="#0f766e" />)}</Bar></BarChart></ResponsiveContainer></div> : <p className="flex h-64 items-center justify-center text-sm text-gray-500">لا توجد درجات مسجلة للمقارنة.</p>}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-black text-gray-900 dark:text-white">قائمة التصحيح</h2><Link href="/teacher/grading" className="text-sm font-bold text-teal-700 hover:underline dark:text-teal-300">فتح التصحيح</Link></div>
          {gradingQueue.length ? <div className="divide-y divide-gray-100 dark:divide-white/10">{gradingQueue.map((submission) => <div key={submission.id} className="flex items-center justify-between gap-4 py-3"><div className="min-w-0"><p className="truncate font-bold text-gray-900 dark:text-white">{submission.student.name || submission.student.email}</p><p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{submission.assignment.title}</p></div><Link href="/teacher/grading" className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 dark:border-white/10 dark:text-gray-200">فتح</Link></div>)}</div> : <p className="py-8 text-center text-sm text-gray-500">لا توجد تسليمات تنتظر التصحيح.</p>}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-black text-gray-900 dark:text-white">أحدث الواجبات</h2><Link href="/teacher/assignments" className="text-sm font-bold text-teal-700 hover:underline dark:text-teal-300">كل الواجبات</Link></div>
          {recentAssignments.length ? <div className="divide-y divide-gray-100 dark:divide-white/10">{recentAssignments.map((assignment) => <div key={assignment.id} className="flex items-center justify-between gap-4 py-3"><div className="min-w-0"><p className="truncate font-bold text-gray-900 dark:text-white">{assignment.title}</p><p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{assignment.subject}</p></div><span className="shrink-0 text-xs text-gray-500">{assignment.submissions} تسليم</span></div>)}</div> : <p className="py-8 text-center text-sm text-gray-500">لا توجد واجبات مسندة من حسابك.</p>}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1.5fr]">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <h2 className="font-black text-gray-900 dark:text-white">اختصارات العمل</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">{shortcuts.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"><Icon className="h-4 w-4 text-teal-700 dark:text-teal-300" />{label}</Link>)}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <h2 className="font-black text-gray-900 dark:text-white">تنبيهات التدخل المبكر</h2>
          {interventionAlerts?.length ? <div className="mt-3 space-y-2">{interventionAlerts.map((alert) => <article key={alert.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/5"><p className="text-sm font-bold text-gray-900 dark:text-white">{alert.title}</p><p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{alert.body}</p></article>)}</div> : <p className="mt-3 text-sm text-gray-500">لا توجد تنبيهات تدخل مسجلة.</p>}
        </div>
      </section>
    </div>
  )
}
