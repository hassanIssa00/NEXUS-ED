'use client'

import { useCallback, useEffect, useState } from 'react'
import { Link } from '@/i18n/routing'
import { useLocale } from 'next-intl'
import { dashboardApi, type StudentDashboardResponse } from '@/lib/api/dashboard'
import Image from 'next/image'
import CurrentScheduleCard from '@/components/schedule/CurrentScheduleCard'
import ParentLinkCodeButton from '@/components/student/parent-link-code-button'
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

const weekdayLabels: Record<string, Record<'ar' | 'en', string>> = {
  Sun: { ar: 'الأحد', en: 'Sunday' }, Mon: { ar: 'الاثنين', en: 'Monday' },
  Tue: { ar: 'الثلاثاء', en: 'Tuesday' }, Wed: { ar: 'الأربعاء', en: 'Wednesday' },
  Thu: { ar: 'الخميس', en: 'Thursday' }, Fri: { ar: 'الجمعة', en: 'Friday' },
  Sat: { ar: 'السبت', en: 'Saturday' },
}

function formatDate(value: string | null | undefined, locale: 'ar' | 'en') {
  if (!value) return locale === 'en' ? 'Due date not set' : 'موعد التسليم غير محدد'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return locale === 'en' ? 'Due date not set' : 'موعد التسليم غير محدد'
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ar-SA', { dateStyle: 'medium' }).format(date)
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
  const locale = useLocale() === 'en' ? 'en' : 'ar'
  const isEnglish = locale === 'en'
  const text = useCallback((ar: string, en: string) => isEnglish ? en : ar, [isEnglish])
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
        setError(text('انتهت جلسة الدخول. سجّل الدخول مرة أخرى لإكمال تحميل بياناتك.', 'Your session has expired. Sign in again to finish loading your dashboard.'));
      } else if (status === 403) {
        setError(text('الحساب غير مرتبط بصلاحية الطالب في المدرسة. تواصل مع إدارة المدرسة.', 'This account does not have student access at the school. Contact the school administration.'));
      } else if (status === 404) {
        setError(text('لم يُعثر على سجل الطالب في قاعدة بيانات المدرسة. أعد استكمال ملفك الدراسي.', 'Your student record was not found in the school database. Complete your student profile again.'));
      } else {
        setError(text('تعذر الاتصال بخدمة لوحة الطالب. تحقق من الاتصال ثم أعد المحاولة.', 'Could not connect to the student dashboard. Check your connection and try again.'));
      }
    } finally {
      setLoading(false)
    }
  }, [text])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  useRealtimeAssignments(() => {
    void loadDashboard()
    setLiveNotif(text('تم تحديث الواجبات من النظام', 'Assignments have been updated'))
    window.setTimeout(() => setLiveNotif(null), 4500)
  })

  useRealtimeNotifications((notification: any) => {
    const message = notification?.message || notification?.title
    if (!message) return
    setLiveNotif(message)
    window.setTimeout(() => setLiveNotif(null), 4500)
  })

  if (loading) {
    return <div dir={isEnglish ? 'ltr' : 'rtl'} className="flex min-h-[50vh] items-center justify-center text-sm text-gray-500">{text('جار تحميل بياناتك...', 'Loading your dashboard…')}</div>
  }

  if (!data) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-4 text-center" dir={isEnglish ? 'ltr' : 'rtl'}>
        <AlertCircle className="h-10 w-10 text-rose-500" />
        <p className="font-bold text-gray-800 dark:text-white">{error || text('لا تتوفر بيانات للعرض.', 'No dashboard data is available.')}</p>
        <button onClick={() => { setLoading(true); void loadDashboard() }} className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-800">
          <RefreshCw className="h-4 w-4" /> {text('إعادة المحاولة', 'Try again')}
        </button>
      </div>
    )
  }

  const { student, summary, attendance, upcomingAssignments, subjectPerformance, weeklyActivity, gamification, achievements } = data
  const gradedSubjects = subjectPerformance.filter((subject) => subject.averageGrade !== null)
  const weeklyData = weeklyActivity.map((day) => ({
    name: weekdayLabels[day.label]?.[locale] ?? day.label,
    [text('تسليمات', 'Submissions')]: day.submissions,
    [text('أيام الحضور', 'Attendance days')]: day.attended,
  }))
  const hasWeeklyRecords = weeklyActivity.some((day) => day.submissions > 0 || day.attended > 0)

  return (
    <div className="space-y-7 pb-12" dir={isEnglish ? 'ltr' : 'rtl'}>
      {liveNotif && (
        <div role="status" className="fixed left-1/2 top-5 z-50 -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-lg">
          {liveNotif}
        </div>
      )}

      <section className="rounded-2xl bg-gradient-to-l from-violet-950 to-violet-800 p-6 text-white md:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-white/80 bg-white/15 shadow-sm md:h-20 md:w-20">
              {student.avatar
                ? <Image src={student.avatar} alt={`${text('صورة', 'Photo of')} ${student.name}`} fill unoptimized sizes="80px" className="object-contain" />
                : <div className="flex h-full w-full items-center justify-center"><GraduationCap className="h-8 w-8 text-white/75" /></div>}
            </div>
            <div>
              <p className="text-sm font-semibold text-violet-200">{text('لوحة الطالب', 'Student dashboard')}</p>
              <h1 style={{ color: '#fff' }} className="mt-2 text-2xl font-black md:text-3xl">{text('أهلًا،', 'Welcome,')} {student.name}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-violet-100">
                <span className="inline-flex items-center gap-2"><GraduationCap className="h-4 w-4" /> {summary.totalSubjects} {text('مادة مسجلة', 'subjects enrolled')}</span>
                <span className="inline-flex items-center gap-2"><Flame className="h-4 w-4" /> {gamification.streakDays} {text('يوم تتابع مسجل', 'day streak')}</span>
                <span className="inline-flex items-center gap-2"><Zap className="h-4 w-4" /> {gamification.totalXP.toLocaleString(isEnglish ? 'en-US' : 'ar-SA')} {text('نقطة خبرة', 'XP')}</span>
              </div>
            </div>
          <div className="flex flex-wrap gap-2">
            <ParentLinkCodeButton />
            <Link href="/student/assignments" className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-violet-900 hover:bg-violet-50">
              <ClipboardList className="h-4 w-4" /> {text('الواجبات', 'Assignments')}
            </Link>
            <Link href="/student/attendance" className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10">
              <CalendarClock className="h-4 w-4" /> {text('سجل الحضور', 'Attendance')}
            </Link>
          </div>
        </div>
      </section>

      <CurrentScheduleCard />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={BookOpen} label={text('المواد', 'Subjects')} value={summary.totalSubjects} detail={text('حسب تسجيلك الدراسي', 'Based on your enrollment')} tone="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" />
        <Stat icon={ClipboardList} label={text('واجبات مفتوحة', 'Open assignments')} value={summary.pendingAssignments} detail={text('واجبات لم يتم تسليمها', 'Assignments not yet submitted')} tone="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" />
        <Stat icon={CheckCircle2} label={text('واجبات تم تسليمها', 'Submitted assignments')} value={summary.completedAssignments} detail={text('من بيانات الواجبات والتسليمات', 'From assignment and submission records')} tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" />
        <Stat icon={Award} label={text('المعدل المسجل', 'Recorded average')} value={summary.averageGrade === null ? '—' : `${summary.averageGrade}%`} detail={summary.averageGrade === null ? text('لا توجد درجات مسجلة بعد', 'No grades have been recorded yet') : text('محسوب من درجات المواد المسجلة', 'Calculated from recorded subject grades')} tone="bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-gray-900 dark:text-white">{text('الفصول المسجل بها', 'Enrolled classes')}</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{text('بيانات التسجيل الحالية', 'Current enrollment')}</p>
            </div>
            <Users className="h-5 w-5 text-violet-600" />
          </div>
          {student.classes.length ? (
            <div className="divide-y divide-gray-100 dark:divide-white/10">
              {student.classes.map((classItem) => (
                <div key={classItem.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{classItem.name}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{classItem.teacher ? `${text('معلم الفصل:', 'Class teacher:')} ${classItem.teacher}` : text('لم يتم تعيين معلم فصل', 'No class teacher assigned')}</p>
                  </div>
                  <GraduationCap className="h-4 w-4 shrink-0 text-gray-400" />
                </div>
              ))}
            </div>
          ) : <EmptyState>{text('لا يوجد فصل مرتبط بحسابك حاليًا.', 'No class is linked to your account yet.')}</EmptyState>}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-gray-900 dark:text-white">{text('ملخص الحضور', 'Attendance summary')}</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{text('سجلات الفصول المسجل بها', 'Records from your enrolled classes')}</p>
            </div>
            <CalendarClock className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex items-end gap-3">
            <p className="text-3xl font-black text-gray-900 dark:text-white">{summary.attendanceRate === null ? '—' : `${summary.attendanceRate}%`}</p>
            <p className="pb-1 text-xs text-gray-500 dark:text-gray-400">{data.attendanceRecordCount} {text('سجل حضور', 'attendance records')}</p>
          </div>
          {data.attendanceRecordCount > 0 ? (
            <div className="mt-5 grid grid-cols-4 gap-2 text-center">
              {[
                [text('حاضر', 'Present'), attendance.present], [text('غائب', 'Absent'), attendance.absent], [text('متأخر', 'Late'), attendance.late], [text('بعذر', 'Excused'), attendance.excused],
              ].map(([label, count]) => (
                <div key={label} className="rounded-lg bg-gray-50 p-2 dark:bg-white/5">
                  <p className="text-lg font-black text-gray-900 dark:text-white">{count}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">{label}</p>
                </div>
              ))}
            </div>
          ) : <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">{text('لا توجد سجلات حضور حتى الآن.', 'No attendance records yet.')}</p>}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-black text-gray-900 dark:text-white">{text('الواجبات المفتوحة', 'Open assignments')}</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{text('من واجبات موادك المسجلة', 'From your enrolled subjects')}</p>
            </div>
            <Link href="/student/assignments" className="text-sm font-bold text-violet-700 hover:underline dark:text-violet-300">{text('كل الواجبات', 'All assignments')}</Link>
          </div>
          {upcomingAssignments.length ? (
            <div className="space-y-3">
              {upcomingAssignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 p-4 dark:border-white/10">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-gray-900 dark:text-white">{assignment.title}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{assignment.subject.name} · {formatDate(assignment.dueDate, locale)}</p>
                  </div>
                  <Link href="/student/assignments" aria-label={`${text('فتح واجب', 'Open assignment')} ${assignment.title}`} className="shrink-0 rounded-lg bg-violet-700 px-3 py-2 text-xs font-bold text-white hover:bg-violet-800">{text('فتح', 'Open')}</Link>
                </div>
              ))}
            </div>
          ) : <EmptyState>{text('لا توجد واجبات مفتوحة مسجلة حاليًا.', 'There are no open assignments right now.')}</EmptyState>}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-black text-gray-900 dark:text-white">{text('المواد والنتائج', 'Subjects and results')}</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{text('الدرجات المسجلة لكل مادة', 'Recorded grades for each subject')}</p>
            </div>
            <BookOpen className="h-5 w-5 text-violet-600" />
          </div>
          {subjectPerformance.length ? (
            <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto dark:divide-white/10">
              {subjectPerformance.map((subject) => (
                <div key={subject.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-gray-900 dark:text-white">{subject.name}</p>
                    <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{subject.teacher ? `${text('المعلم:', 'Teacher:')} ${subject.teacher} · ` : ''}{subject.totalLessons} {text('درس مسجل', 'lessons recorded')}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-black text-gray-900 dark:text-white">{subject.averageGrade === null ? '—' : `${subject.averageGrade}%`}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{subject.averageGrade === null ? text('لا توجد درجات', 'No grades') : `${subject.submittedAssignments}/${subject.totalAssignments} ${text('واجب', 'assignments')}`}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyState>{text('لا توجد مواد مرتبطة بتسجيلك الحالي.', 'No subjects are linked to your current enrollment.')}</EmptyState>}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <h2 className="font-black text-gray-900 dark:text-white">{text('نشاط آخر 7 أيام', 'Activity over the last 7 days')}</h2>
          <p className="mb-4 mt-1 text-xs text-gray-500 dark:text-gray-400">{text('التسليمات والحضور المسجلان', 'Recorded submissions and attendance')}</p>
          {hasWeeklyRecords ? (
            <div className="h-64" role="img" aria-label={text('مخطط نشاط التسليم والحضور خلال آخر سبعة أيام', 'Chart of submissions and attendance over the last seven days')}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey={text('تسليمات', 'Submissions')} stroke="#234A65" fill="#234A65" fillOpacity={0.18} />
                  <Area type="monotone" dataKey={text('أيام الحضور', 'Attendance days')} stroke="#059669" fill="#059669" fillOpacity={0.12} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState>{text('لا توجد أنشطة مسجلة خلال الأيام السبعة الماضية.', 'No activity has been recorded in the last seven days.')}</EmptyState>}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <h2 className="font-black text-gray-900 dark:text-white">{text('الدرجات حسب المادة', 'Grades by subject')}</h2>
          <p className="mb-4 mt-1 text-xs text-gray-500 dark:text-gray-400">{text('يعرض المواد التي لها درجات فعلية فقط', 'Only subjects with recorded grades are shown')}</p>
          {gradedSubjects.length ? (
            <div className="h-64" role="img" aria-label={text('مخطط متوسط الدرجات المسجلة حسب المادة', 'Chart of recorded average grades by subject')}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradedSubjects.map((subject) => ({ name: subject.name, [text('الدرجة', 'Grade')]: subject.averageGrade }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey={text('الدرجة', 'Grade')} radius={[5, 5, 0, 0]}>
                    {gradedSubjects.map((subject) => <Cell key={subject.id} fill="#234A65" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState>{text('ستظهر النتائج هنا بعد تسجيل الدرجات في النظام.', 'Results will appear here once grades have been recorded.')}</EmptyState>}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"><Trophy className="h-5 w-5" /></span>
            <div>
              <h2 className="font-black text-gray-900 dark:text-white">{text('الأوسمة المسجلة', 'Earned badges')}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{achievements.length} {text('وسام محفوظ في حسابك', 'badges saved to your account')}</p>
            </div>
          </div>
          {achievements.length ? (
            <div className="mt-4 space-y-3">
              {achievements.slice(0, 4).map((achievement) => (
                <div key={achievement.id} className="rounded-lg bg-gray-50 p-3 dark:bg-white/5">
                  <p className="font-bold text-gray-900 dark:text-white">{achievement.name}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{achievement.description}</p>
                  <p className="mt-2 text-[11px] text-gray-400">{text('تاريخ الإضافة:', 'Earned:')} {formatDate(achievement.unlockedAt, locale)}</p>
                </div>
              ))}
            </div>
          ) : <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{text('لا توجد أوسمة مسجلة بعد.', 'No badges have been earned yet.')}</p>}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <h2 className="font-black text-gray-900 dark:text-white">{text('ملخص التقدم المسجل', 'Learning progress')}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/5">
              <p className="text-xs text-gray-500 dark:text-gray-400">{text('المستوى المحفوظ', 'Current level')}</p>
              <p className="mt-2 text-xl font-black text-gray-900 dark:text-white">{gamification.level}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/5">
              <p className="text-xs text-gray-500 dark:text-gray-400">{text('نقاط الخبرة المحفوظة', 'Experience points')}</p>
              <p className="mt-2 text-xl font-black text-gray-900 dark:text-white">{gamification.totalXP.toLocaleString(isEnglish ? 'en-US' : 'ar-SA')}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/5">
              <p className="text-xs text-gray-500 dark:text-gray-400">{text('أيام التتابع المحفوظة', 'Current streak')}</p>
              <p className="mt-2 text-xl font-black text-gray-900 dark:text-white">{gamification.streakDays}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/student/courses" className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5">{text('المقررات', 'Courses')}</Link>
            <Link href="/student/analytics" className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5">{text('تقارير الأداء', 'Performance reports')}</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
