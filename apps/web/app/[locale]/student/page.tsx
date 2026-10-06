'use client'

import { useCallback, useEffect, useState } from 'react'
import { Link } from '@/i18n/routing'
import { dashboardApi, type StudentDashboardResponse } from '@/lib/api/dashboard'
import { useRealtimeAssignments, useRealtimeNotifications } from '@/lib/providers/socket-provider'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  Award,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Flame,
  GraduationCap,
  RefreshCw,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const weekdayLabels: Record<string, string> = {
  Sun: 'الأحد',
  Mon: 'الاثنين',
  Tue: 'الثلاثاء',
  Wed: 'الأربعاء',
  Thu: 'الخميس',
  Fri: 'الجمعة',
  Sat: 'السبت',
}

function formatDate(value?: string | null) {
  if (!value) return 'موعد التسليم غير محدد'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'موعد التسليم غير محدد'
  return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium' }).format(date)
}

function Stat({ icon: Icon, label, value, detail, tone }: {
  icon: typeof BookOpen
  label: string
  value: string | number
  detail: string
  tone: string
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1e1e2d]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{value}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{detail}</p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  )
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-gray-300 px-5 text-center text-sm text-gray-500 dark:border-white/15 dark:text-gray-400">
      {children}
    </div>
  )
}

export default function StudentDashboardPage() {
  const [data, setData] = useState<StudentDashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [liveNotif, setLiveNotif] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    setError(null)
    try {
      const result = await dashboardApi.getStudentDashboard()
      setData(result)
    } catch (requestError: any) {
      const status = requestError?.response?.status;
      if (status === 401) {
        setError('انتهت جلسة الدخول. سجّل الدخول مرة أخرى لإكمال تحميل بياناتك.');
      } else if (status === 403) {
        setError('الحساب غير مرتبط بصلاحية الطالب في المدرسة. تواصل مع إدارة المدرسة.');
      } else if (status === 404) {
        setError('لم يُعثر على سجل الطالب في قاعدة بيانات المدرسة. أعد استكمال ملفك الدراسي.');
      } else {
        setError('تعذر الاتصال بخدمة لوحة الطالب. تحقق من الاتصال ثم أعد المحاولة.');
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  useRealtimeAssignments(() => {
    void loadDashboard()
    setLiveNotif('تم تحديث الواجبات من النظام')
    window.setTimeout(() => setLiveNotif(null), 4500)
  })

  useRealtimeNotifications((notification: any) => {
    const message = notification?.message || notification?.title
    if (!message) return
    setLiveNotif(message)
    window.setTimeout(() => setLiveNotif(null), 4500)
  })

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-gray-500">جار تحميل بياناتك...</div>
  }

  if (!data) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-4 text-center" dir="rtl">
        <AlertCircle className="h-10 w-10 text-rose-500" />
        <p className="font-bold text-gray-800 dark:text-white">{error || 'لا تتوفر بيانات للعرض.'}</p>
        <button onClick={() => { setLoading(true); void loadDashboard() }} className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-800">
          <RefreshCw className="h-4 w-4" /> إعادة المحاولة
        </button>
      </div>
    )
  }

  const { student, summary, attendance, upcomingAssignments, subjectPerformance, weeklyActivity, gamification, achievements } = data
  const gradedSubjects = subjectPerformance.filter((subject) => subject.averageGrade !== null)
  const weeklyData = weeklyActivity.map((day) => ({
    name: weekdayLabels[day.label] ?? day.label,
    'تسليمات': day.submissions,
    'أيام الحضور': day.attended,
  }))
  const hasWeeklyRecords = weeklyActivity.some((day) => day.submissions > 0 || day.attended > 0)

  return (
    <div className="space-y-7 pb-12" dir="rtl">
      {liveNotif && (
        <div role="status" className="fixed left-1/2 top-5 z-50 -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-lg">
          {liveNotif}
        </div>
      )}

      <section className="rounded-2xl bg-gradient-to-l from-violet-950 to-violet-800 p-6 text-white md:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-semibold text-violet-200">لوحة الطالب</p>
            <h1 className="mt-2 text-2xl font-black md:text-3xl">أهلًا، {student.name}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-violet-100">
              <span className="inline-flex items-center gap-2"><GraduationCap className="h-4 w-4" /> {summary.totalSubjects} مادة مسجلة</span>
              <span className="inline-flex items-center gap-2"><Flame className="h-4 w-4" /> {gamification.streakDays} يوم تتابع مسجل</span>
              <span className="inline-flex items-center gap-2"><Zap className="h-4 w-4" /> {gamification.totalXP.toLocaleString('ar-SA')} نقطة خبرة</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/student/new?flow=student" className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10">
              <Users className="h-4 w-4" /> رمز ولي الأمر
            </Link>
            <Link href="/student/assignments" className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-violet-900 hover:bg-violet-50">
              <ClipboardList className="h-4 w-4" /> الواجبات
            </Link>
            <Link href="/student/attendance" className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10">
              <CalendarClock className="h-4 w-4" /> سجل الحضور
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={BookOpen} label="المواد" value={summary.totalSubjects} detail="حسب تسجيلك الدراسي" tone="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" />
        <Stat icon={ClipboardList} label="واجبات مفتوحة" value={summary.pendingAssignments} detail="واجبات لم يتم تسليمها" tone="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" />
        <Stat icon={CheckCircle2} label="واجبات تم تسليمها" value={summary.completedAssignments} detail="من بيانات الواجبات والتسليمات" tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" />
        <Stat icon={Award} label="المعدل المسجل" value={summary.averageGrade === null ? '—' : `${summary.averageGrade}%`} detail={summary.averageGrade === null ? 'لا توجد درجات مسجلة بعد' : 'محسوب من درجات المواد المسجلة'} tone="bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-gray-900 dark:text-white">الفصول المسجل بها</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">بيانات التسجيل الحالية</p>
            </div>
            <Users className="h-5 w-5 text-violet-600" />
          </div>
          {student.classes.length ? (
            <div className="divide-y divide-gray-100 dark:divide-white/10">
              {student.classes.map((classItem) => (
                <div key={classItem.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{classItem.name}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{classItem.teacher ? `معلم الفصل: ${classItem.teacher}` : 'لم يتم تعيين معلم فصل'}</p>
                  </div>
                  <GraduationCap className="h-4 w-4 shrink-0 text-gray-400" />
                </div>
              ))}
            </div>
          ) : <EmptyState>لا يوجد فصل مرتبط بحسابك حاليًا.</EmptyState>}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-gray-900 dark:text-white">ملخص الحضور</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">سجلات الفصول المسجل بها</p>
            </div>
            <CalendarClock className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex items-end gap-3">
            <p className="text-3xl font-black text-gray-900 dark:text-white">{summary.attendanceRate === null ? '—' : `${summary.attendanceRate}%`}</p>
            <p className="pb-1 text-xs text-gray-500 dark:text-gray-400">{data.attendanceRecordCount} سجل حضور</p>
          </div>
          {data.attendanceRecordCount > 0 ? (
            <div className="mt-5 grid grid-cols-4 gap-2 text-center">
              {[
                ['حاضر', attendance.present], ['غائب', attendance.absent], ['متأخر', attendance.late], ['بعذر', attendance.excused],
              ].map(([label, count]) => (
                <div key={label} className="rounded-lg bg-gray-50 p-2 dark:bg-white/5">
                  <p className="text-lg font-black text-gray-900 dark:text-white">{count}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">{label}</p>
                </div>
              ))}
            </div>
          ) : <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">لا توجد سجلات حضور حتى الآن.</p>}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-black text-gray-900 dark:text-white">الواجبات المفتوحة</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">من واجبات موادك المسجلة</p>
            </div>
            <Link href="/student/assignments" className="text-sm font-bold text-violet-700 hover:underline dark:text-violet-300">كل الواجبات</Link>
          </div>
          {upcomingAssignments.length ? (
            <div className="space-y-3">
              {upcomingAssignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 p-4 dark:border-white/10">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-gray-900 dark:text-white">{assignment.title}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{assignment.subject.name} · {formatDate(assignment.dueDate)}</p>
                  </div>
                  <Link href="/student/assignments" aria-label={`فتح واجب ${assignment.title}`} className="shrink-0 rounded-lg bg-violet-700 px-3 py-2 text-xs font-bold text-white hover:bg-violet-800">فتح</Link>
                </div>
              ))}
            </div>
          ) : <EmptyState>لا توجد واجبات مفتوحة مسجلة حاليًا.</EmptyState>}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-black text-gray-900 dark:text-white">المواد والنتائج</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">الدرجات المسجلة لكل مادة</p>
            </div>
            <BookOpen className="h-5 w-5 text-violet-600" />
          </div>
          {subjectPerformance.length ? (
            <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto dark:divide-white/10">
              {subjectPerformance.map((subject) => (
                <div key={subject.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-gray-900 dark:text-white">{subject.name}</p>
                    <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{subject.teacher ? `المعلم: ${subject.teacher} · ` : ''}{subject.totalLessons} درس مسجل</p>
                  </div>
                  <div className="text-left">
                    <p className="font-black text-gray-900 dark:text-white">{subject.averageGrade === null ? '—' : `${subject.averageGrade}%`}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{subject.averageGrade === null ? 'لا توجد درجات' : `${subject.submittedAssignments}/${subject.totalAssignments} واجب`}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyState>لا توجد مواد مرتبطة بتسجيلك الحالي.</EmptyState>}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <h2 className="font-black text-gray-900 dark:text-white">نشاط آخر 7 أيام</h2>
          <p className="mb-4 mt-1 text-xs text-gray-500 dark:text-gray-400">التسليمات والحضور المسجلان</p>
          {hasWeeklyRecords ? (
            <div className="h-64" role="img" aria-label="مخطط نشاط التسليم والحضور خلال آخر سبعة أيام">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="تسليمات" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.18} />
                  <Area type="monotone" dataKey="أيام الحضور" stroke="#059669" fill="#059669" fillOpacity={0.12} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState>لا توجد أنشطة مسجلة خلال الأيام السبعة الماضية.</EmptyState>}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <h2 className="font-black text-gray-900 dark:text-white">الدرجات حسب المادة</h2>
          <p className="mb-4 mt-1 text-xs text-gray-500 dark:text-gray-400">يعرض المواد التي لها درجات فعلية فقط</p>
          {gradedSubjects.length ? (
            <div className="h-64" role="img" aria-label="مخطط متوسط الدرجات المسجلة حسب المادة">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradedSubjects.map((subject) => ({ name: subject.name, الدرجة: subject.averageGrade }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="الدرجة" radius={[5, 5, 0, 0]}>
                    {gradedSubjects.map((subject) => <Cell key={subject.id} fill="#7c3aed" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState>ستظهر النتائج هنا بعد تسجيل الدرجات في النظام.</EmptyState>}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"><Trophy className="h-5 w-5" /></span>
            <div>
              <h2 className="font-black text-gray-900 dark:text-white">الأوسمة المسجلة</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{achievements.length} وسام محفوظ في حسابك</p>
            </div>
          </div>
          {achievements.length ? (
            <div className="mt-4 space-y-3">
              {achievements.slice(0, 4).map((achievement) => (
                <div key={achievement.id} className="rounded-lg bg-gray-50 p-3 dark:bg-white/5">
                  <p className="font-bold text-gray-900 dark:text-white">{achievement.name}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{achievement.description}</p>
                  <p className="mt-2 text-[11px] text-gray-400">تاريخ الإضافة: {formatDate(achievement.unlockedAt)}</p>
                </div>
              ))}
            </div>
          ) : <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">لا توجد أوسمة مسجلة بعد.</p>}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <h2 className="font-black text-gray-900 dark:text-white">ملخص التقدم المسجل</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/5">
              <p className="text-xs text-gray-500 dark:text-gray-400">المستوى المحفوظ</p>
              <p className="mt-2 text-xl font-black text-gray-900 dark:text-white">{gamification.level}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/5">
              <p className="text-xs text-gray-500 dark:text-gray-400">نقاط الخبرة المحفوظة</p>
              <p className="mt-2 text-xl font-black text-gray-900 dark:text-white">{gamification.totalXP.toLocaleString('ar-SA')}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/5">
              <p className="text-xs text-gray-500 dark:text-gray-400">أيام التتابع المحفوظة</p>
              <p className="mt-2 text-xl font-black text-gray-900 dark:text-white">{gamification.streakDays}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/student/courses" className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5">المقررات</Link>
            <Link href="/student/analytics" className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5">تقارير الأداء</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
