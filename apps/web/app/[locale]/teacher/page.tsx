'use client'

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Suspense } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import { useAuth } from '@/contexts/auth-context'
import { dashboardApi, type TeacherDashboardResponse } from '@/lib/api/dashboard'
import { useRealtimeAssignments, useRealtimeNotifications } from '@/lib/providers/socket-provider'
import NexusToolsTab from './_components/NexusToolsTab'
import { DashboardBarChart, DashboardDonutChart } from '@/components/dashboard/analytics-charts'
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Camera,
  CalendarCheck,
  ClipboardList,
  FilePlus2,
  Loader2,
  RefreshCw,
  Users,
} from 'lucide-react'
import { uploadService } from '@/lib/services/upload.service'
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
  { href: '/teacher/classes', ar: 'فصولي والطلاب', en: 'My classes and students', icon: Users },
  { href: '/teacher/assignments/create', ar: 'إنشاء واجب', en: 'Create assignment', icon: FilePlus2 },
  { href: '/teacher/attendance', ar: 'تسجيل الحضور', en: 'Record attendance', icon: CalendarCheck },
  { href: '/teacher/grading', ar: 'قائمة التصحيح', en: 'Grading queue', icon: ClipboardList },
  { href: '/teacher/reports', ar: 'تقارير الطلاب', en: 'Student reports', icon: BarChart3 },
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

function TeacherDashboardContent() {
  const locale = useLocale()
  const isEnglish = locale === 'en'
  const t = (ar: string, en: string) => isEnglish ? en : ar
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab')
  const { profile, refreshProfile } = useAuth()
  const [data, setData] = useState<TeacherDashboardResponse | null>(null)
  const [loading, setLoading] = useState(activeTab !== 'tools')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setAvatarError(null)
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setAvatarError(t('اختر صورة JPEG أو PNG أو WebP لا تتجاوز 5 ميجابايت.', 'Choose a JPEG, PNG, or WebP image no larger than 5 MB.'))
      event.target.value = ''
      return
    }

    setAvatarUploading(true)
    try {
      await uploadService.uploadProfileAvatar(file)
      await refreshProfile()
      setNotice(t('تم حفظ صورة المعلم وتحديث الملف الشخصي.', 'Teacher photo saved and profile updated.'))
      window.setTimeout(() => setNotice(null), 4000)
    } catch (uploadError: any) {
      setAvatarError(uploadError?.message || t('تعذر رفع صورة المعلم. حاول مرة أخرى.', 'Could not upload the teacher photo. Please try again.'))
    } finally {
      setAvatarUploading(false)
      event.target.value = ''
    }
  }

  const load = useCallback(async () => {
    setError(null)
    try {
      setData(await dashboardApi.getTeacherDashboard())
    } catch {
      setError(t('تعذر تحميل بياناتك من النظام. حاول تحديث الصفحة.', 'Could not load your data. Please refresh the page.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'tools') {
      setLoading(false)
      return
    }
    setLoading(true)
    void load()
  }, [activeTab, load])

  useRealtimeAssignments(() => {
    if (activeTab !== 'tools') void load()
    setNotice(t('تم تحديث بيانات الواجبات', 'Assignment data updated'))
    window.setTimeout(() => setNotice(null), 4000)
  })

  useRealtimeNotifications((notification: any) => {
    const message = notification?.message || notification?.title
    if (!message) return
    setNotice(message)
    window.setTimeout(() => setNotice(null), 4000)
  })

  if (activeTab === 'tools') return <NexusToolsTab />

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-sm text-gray-500">{t('جار تحميل لوحة المعلم...', 'Loading teacher dashboard...')}</div>

  if (!data) return (
    <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-4 text-center" dir={isEnglish ? 'ltr' : 'rtl'}>
      <AlertCircle className="h-10 w-10 text-rose-500" />
      <p className="font-bold text-gray-800 dark:text-white">{error || t('لا تتوفر بيانات.', 'No data is available.')}</p>
      <button onClick={() => { setLoading(true); void load() }} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-800"><RefreshCw className="h-4 w-4" /> {t('إعادة المحاولة', 'Try again')}</button>
    </div>
  )

  const { teacher, summary, classPerformance, recentAssignments, attendanceSummary, interventionAlerts, gradingQueue } = data
  const gradedClasses = classPerformance.filter((classItem) => classItem.averageGrade !== null)

  return (
    <div className="space-y-6 pb-12" dir={isEnglish ? 'ltr' : 'rtl'}>
      {notice && <div role="status" className="fixed left-1/2 top-5 z-50 -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-lg">{notice}</div>}

      <header className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-teal-100 bg-gradient-to-l from-teal-50 via-white to-blue-50 p-5 dark:border-white/10 dark:from-teal-950/30 dark:via-[#1e1e2d] dark:to-blue-950/20 sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-white bg-teal-100 shadow-md dark:border-white/10 dark:bg-teal-900">
            {profile?.avatar_url
              ? <Image src={profile.avatar_url} alt={t(`صورة ${teacher.name}`, `Photo of ${teacher.name}`)} width={80} height={80} unoptimized className="h-full w-full bg-white object-contain" />
              : <span className="flex h-full w-full items-center justify-center text-2xl font-black text-teal-800 dark:text-teal-200">{teacher.name.trim().slice(0, 1) || 'م'}</span>}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">{t('بوابة المعلم', 'Teacher Portal')}</p>
            <h1 className="mt-1 truncate text-xl font-black text-gray-900 dark:text-white sm:text-2xl">{t('أهلًا،', 'Welcome,')} {teacher.name}</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{t('ملخص مباشر للفصول والواجبات والسجلات المرتبطة بحسابك.', 'A live summary of the classes, assignments, and records linked to your account.')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
          <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading} className="inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-white px-3 py-2.5 text-sm font-bold text-teal-800 hover:bg-teal-50 disabled:opacity-60 dark:border-teal-800 dark:bg-white/5 dark:text-teal-200 dark:hover:bg-teal-950/30">
            {avatarUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {avatarUploading ? t('جار رفع الصورة...', 'Uploading photo...') : profile?.avatar_url ? t('تغيير الصورة', 'Change photo') : t('رفع صورة المعلم', 'Upload teacher photo')}
          </button>
          <Link href="/teacher/classes" className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-800">{t('فصولي والطلاب', 'My classes and students')}</Link>
          <button onClick={() => { setLoading(true); void load() }} title={t('تحديث البيانات', 'Refresh data')} className="rounded-lg border border-gray-200 bg-white/80 p-2.5 text-gray-600 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"><RefreshCw className="h-4 w-4" /></button>
        </div>
      </header>
      {avatarError && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{avatarError}</div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label={t('الفصول', 'Classes')} value={summary.totalClasses} detail={t('فصول مرتبطة بحسابك', 'Classes linked to your account')} icon={BookOpen} />
        <Metric label={t('الطلاب', 'Students')} value={summary.totalStudents} detail={t('حسب قوائم الفصول', 'Based on class rosters')} icon={Users} />
        <Metric label={t('بانتظار التصحيح', 'Awaiting grading')} value={summary.pendingSubmissions} detail={t('تسليمات لم تسجل درجتها', 'Submissions without a recorded grade')} icon={ClipboardList} />
        <Metric label={t('الحضور المسجل', 'Recorded attendance')} value={summary.attendanceRate === null ? '—' : `${summary.attendanceRate}%`} detail={summary.attendanceRate === null ? t('لا توجد سجلات خلال آخر 30 يومًا', 'No records in the past 30 days') : t(`${attendanceSummary.totalRecords} سجلًا خلال آخر 30 يومًا`, `${attendanceSummary.totalRecords} records in the past 30 days`)} icon={CalendarCheck} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <div className="mb-4 flex items-center justify-between"><div><h2 className="font-black text-gray-900 dark:text-white">{t('فصولك', 'Your classes')}</h2><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('أعداد الطلاب والدرجات المسجلة', 'Student counts and recorded grades')}</p></div><Users className="h-5 w-5 text-teal-700" /></div>
          {classPerformance.length ? <div className="divide-y divide-gray-100 dark:divide-white/10">{classPerformance.map((classItem) => <div key={classItem.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"><div><p className="font-bold text-gray-900 dark:text-white">{classItem.name}</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{classItem.studentCount} {t('طالب', 'students')} · {classItem.subjectCount} {t('مادة', 'subjects')}</p></div><span className="text-sm font-black text-gray-800 dark:text-gray-200">{classItem.averageGrade === null ? t('لا توجد درجات', 'No grades') : `${classItem.averageGrade}%`}</span></div>)}</div> : <div className="py-8 text-center"><p className="text-sm text-gray-500">{t('لا توجد فصول مرتبطة بهذا الحساب حتى الآن.', 'No classes are linked to this account yet.')}</p><Link href="/teacher/classes" className="mt-3 inline-flex rounded-lg border border-teal-200 px-3 py-2 text-sm font-bold text-teal-800 hover:bg-teal-50 dark:border-teal-800 dark:text-teal-200 dark:hover:bg-teal-950/30">{t('فتح فصولي والطلاب', 'Open my classes and students')}</Link></div>}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <h2 className="font-black text-gray-900 dark:text-white">{t('متوسط الدرجات المسجلة', 'Recorded grade averages')}</h2>
          <p className="mb-3 mt-1 text-xs text-gray-500 dark:text-gray-400">{t('مقارنة بين الفصول التي لها سجلات درجات', 'Comparison across classes with grade records')}</p>
          {gradedClasses.length ? <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={gradedClasses.map((classItem) => ({ name: classItem.name, average: classItem.averageGrade }))}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} /><Tooltip /><Bar dataKey="average" name={t('المعدل', 'Average')} radius={[5, 5, 0, 0]}>{gradedClasses.map((classItem) => <Cell key={classItem.id} fill="#35556B" />)}</Bar></BarChart></ResponsiveContainer></div> : <p className="flex h-64 items-center justify-center text-sm text-gray-500">{t('لا توجد درجات مسجلة للمقارنة.', 'No grades are available for comparison.')}</p>}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <DashboardDonutChart title={t('توزيع سجلات الحضور خلال 30 يومًا', 'Attendance records in the last 30 days')} emptyLabel={t('لا توجد سجلات حضور كافية لعرض الرسم.', 'There are no attendance records to chart.')} data={[
          { label: t('حاضر', 'Present'), value: attendanceSummary.present, color: '#0f766e' },
          { label: t('متأخر', 'Late'), value: attendanceSummary.late, color: '#d97706' },
          { label: t('غائب', 'Absent'), value: attendanceSummary.absent, color: '#dc2626' },
        ]} />
        <DashboardBarChart title={t('التسليمات في أحدث الواجبات', 'Submissions on recent assignments')} emptyLabel={t('لا توجد واجبات حديثة لعرضها.', 'There are no recent assignments to chart.')} color="#0f766e" data={recentAssignments.map((assignment) => ({ label: assignment.title, value: assignment.submissions }))} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-black text-gray-900 dark:text-white">{t('قائمة التصحيح', 'Grading queue')}</h2><Link href="/teacher/grading" className="text-sm font-bold text-teal-700 hover:underline dark:text-teal-300">{t('فتح التصحيح', 'Open grading')}</Link></div>
          {gradingQueue.length ? <div className="divide-y divide-gray-100 dark:divide-white/10">{gradingQueue.map((submission) => <div key={submission.id} className="flex items-center justify-between gap-4 py-3"><div className="min-w-0"><p className="truncate font-bold text-gray-900 dark:text-white">{submission.student.name || submission.student.email}</p><p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{submission.assignment.title}</p></div><Link href="/teacher/grading" className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 dark:border-white/10 dark:text-gray-200">{t('فتح', 'Open')}</Link></div>)}</div> : <p className="py-8 text-center text-sm text-gray-500">{t('لا توجد تسليمات تنتظر التصحيح.', 'No submissions are waiting for grading.')}</p>}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-black text-gray-900 dark:text-white">{t('أحدث الواجبات', 'Recent assignments')}</h2><Link href="/teacher/assignments" className="text-sm font-bold text-teal-700 hover:underline dark:text-teal-300">{t('كل الواجبات', 'All assignments')}</Link></div>
          {recentAssignments.length ? <div className="divide-y divide-gray-100 dark:divide-white/10">{recentAssignments.map((assignment) => <div key={assignment.id} className="flex items-center justify-between gap-4 py-3"><div className="min-w-0"><p className="truncate font-bold text-gray-900 dark:text-white">{assignment.title}</p><p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{assignment.subject}</p></div><span className="shrink-0 text-xs text-gray-500">{assignment.submissions} {t('تسليم', 'submissions')}</span></div>)}</div> : <p className="py-8 text-center text-sm text-gray-500">{t('لا توجد واجبات مسندة من حسابك.', 'No assignments have been assigned from your account.')}</p>}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1.5fr]">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <h2 className="font-black text-gray-900 dark:text-white">{t('اختصارات العمل', 'Quick actions')}</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">{shortcuts.map(({ href, ar, en, icon: Icon }) => <Link key={href} href={href} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"><Icon className="h-4 w-4 text-teal-700 dark:text-teal-300" />{t(ar, en)}</Link>)}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <h2 className="font-black text-gray-900 dark:text-white">{t('تنبيهات التدخل المبكر', 'Early intervention alerts')}</h2>
          {interventionAlerts?.length ? <div className="mt-3 space-y-2">{interventionAlerts.map((alert) => <article key={alert.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/5"><p className="text-sm font-bold text-gray-900 dark:text-white">{isEnglish ? ((alert as any).titleEn || alert.title) : alert.title}</p><p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{isEnglish ? ((alert as any).bodyEn || alert.body) : alert.body}</p></article>)}</div> : <p className="mt-3 text-sm text-gray-500">{t('لا توجد تنبيهات تدخل مسجلة.', 'No intervention alerts have been recorded.')}</p>}
        </div>
      </section>
    </div>
  )
}

export default function TeacherDashboardPage() {
  const isEnglish = useLocale() === 'en'
  return (
      <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-sm text-gray-500">{isEnglish ? 'Loading teacher dashboard...' : 'جار تحميل لوحة المعلم...'}</div>}>
      <TeacherDashboardContent />
    </Suspense>
  )
}
