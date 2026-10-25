'use client'

import { useEffect, useMemo, useState } from 'react'
import { Link } from '@/i18n/routing'
import { useLocale } from 'next-intl'
import { Activity, BookOpen, CalendarCheck, FileText, Users } from 'lucide-react'
import Image from 'next/image'
import { apiClient } from '@/lib/api/client'
import { useAuth } from '@/contexts/auth-context'
import CurrentScheduleCard from '@/components/schedule/CurrentScheduleCard'

interface ChildData {
  id: string
  name: string
  avatar?: string | null
  className: string | null
  averageGrade: number | null
  gradeRecordCount: number
  attendanceRate: number | null
  attendanceRecordCount: number
  attendance: { present: number; absent: number; late: number; excused: number } | null
  recentGrades: { subject: string; score: number; recordedScore: number; recordedMaximum: number; date: string }[]
  upcomingAssignments: { id: string; title: string; subject: string; dueDate: string | null; submitted: boolean }[]
}

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Activity }) {
  return (
    <div className="border-b border-gray-200 py-4 last:border-b-0 dark:border-white/10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="mt-1 text-xs text-gray-500">{detail}</p>
        </div>
        <Icon className="h-5 w-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
      </div>
    </div>
  )
}

export default function ParentDashboard() {
  const locale = useLocale()
  const isEnglish = locale === 'en'
  const t = (ar: string, en: string) => isEnglish ? en : ar
  const { profile } = useAuth()
  const [children, setChildren] = useState<ChildData[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiClient.get('/dashboard/parent')
      .then(({ data }) => {
        const records = Array.isArray(data?.children) ? data.children : []
        setChildren(records)
        setSelectedId(records[0]?.id || '')
      })
      .catch(() => setError(t('تعذر تحميل بيانات الحساب. حاول تحديث الصفحة.', 'Could not load account data. Please refresh the page.')))
      .finally(() => setLoading(false))
  }, [])

  const selected = useMemo(() => children.find((child) => child.id === selectedId), [children, selectedId])
  const pendingAssignments = selected?.upcomingAssignments.filter((assignment) => !assignment.submitted) || []

  if (loading) return <div className="py-20 text-center text-sm text-muted-foreground">{t('جارٍ تحميل بيانات الأبناء...', 'Loading linked students...')}</div>

  if (error) return <div role="alert" className="py-16 text-center text-sm text-destructive">{error}</div>

  if (children.length === 0) return (
    <main className="mx-auto max-w-3xl py-16 text-center" dir={isEnglish ? 'ltr' : 'rtl'}>
      <Users className="mx-auto mb-4 h-8 w-8 text-gray-400" />
      <h1 className="text-xl font-bold">{t('لا يوجد أبناء مرتبطون بالحساب', 'No students are linked to this account')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('أدخل رمز الربط الذي يصدره الطالب من حسابه لإضافة ملفه إلى بوابتك.', 'Enter the link code generated from a student account to add their profile to your portal.')}</p>
      <Link href="/student/new?flow=parent" className="mt-5 inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"><Users className="h-4 w-4" />{t('ربط طالب', 'Link a student')}</Link>
    </main>
  )

  return (
    <main className="mx-auto max-w-6xl space-y-7 pb-12" dir={isEnglish ? 'ltr' : 'rtl'}>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-200 pb-5 dark:border-white/10">
        <div>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{t('بوابة ولي الأمر', 'Parent Portal')}</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{t('مرحبًا', 'Welcome')}, {profile?.full_name || t('ولي الأمر', 'Parent')}</h1>
        </div>
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link className="inline-flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted" href="/student/new?flow=parent"><Users className="h-4 w-4" />{t('ربط طالب', 'Link a student')}</Link>
          <Link className="inline-flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted" href="/parent/reports"><FileText className="h-4 w-4" />{t('التقارير', 'Reports')}</Link>
          <Link className="inline-flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted" href="/parent/schedule"><CalendarCheck className="h-4 w-4" />{t('الجدول', 'Schedule')}</Link>
          <Link className="inline-flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted" href="/parent/messages"><Activity className="h-4 w-4" />{t('الرسائل', 'Messages')}</Link>
        </nav>
      </header>

      <section className="max-w-sm">
        <label className="space-y-2 text-sm font-medium">
          {t('ملف الطالب', 'Student profile')}
          <select className="w-full rounded-md border bg-background p-2.5" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
            {children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}
          </select>
        </label>
      </section>

      {selected && <>
        <CurrentScheduleCard studentId={selected.id} />

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="flex items-center gap-3">
              {selected.avatar ? <Image src={selected.avatar} alt={t(`صورة ${selected.name}`, `Photo of ${selected.name}`)} width={56} height={56} unoptimized className="h-14 w-14 rounded-full bg-white object-contain" /> : <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500"><Users className="h-6 w-6" /></div>}
              <div><h2 className="text-lg font-bold text-gray-900 dark:text-white">{selected.name}</h2><p className="mt-1 text-sm text-muted-foreground">{selected.className || t('لا يوجد فصل مسجل', 'No class is registered')}</p></div>
            </div>
            <div className="mt-4 grid gap-x-8 sm:grid-cols-2">
              <Metric label={t('متوسط الدرجات', 'Average grade')} value={selected.averageGrade === null ? '—' : `${selected.averageGrade}%`} detail={t(`${selected.gradeRecordCount} سجل درجات`, `${selected.gradeRecordCount} grade records`)} icon={BookOpen} />
              <Metric label={t('الحضور المسجل', 'Recorded attendance')} value={selected.attendanceRate === null ? '—' : `${selected.attendanceRate}%`} detail={t(`${selected.attendanceRecordCount} سجل حضور`, `${selected.attendanceRecordCount} attendance records`)} icon={CalendarCheck} />
              <Metric label={t('واجبات قادمة غير مسلمة', 'Upcoming assignments not submitted')} value={String(pendingAssignments.length)} detail={t(`من ${selected.upcomingAssignments.length} واجب قادم مسجل`, `of ${selected.upcomingAssignments.length} upcoming assignments`)} icon={FileText} />
              <Metric label={t('أفراد مرتبطون', 'Linked students')} value={String(children.length)} detail={t('ملفات طلاب مرتبطة بحساب ولي الأمر', 'Student profiles linked to this parent account')} icon={Users} />
            </div>
          </div>

          <aside className="border-r border-gray-200 pr-5 dark:border-white/10">
            <h2 className="font-bold">{t('ملخص الحضور', 'Attendance summary')}</h2>
            {selected.attendance ? (
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between"><dt>{t('حاضر', 'Present')}</dt><dd>{selected.attendance.present}</dd></div>
                <div className="flex justify-between"><dt>{t('غائب', 'Absent')}</dt><dd>{selected.attendance.absent}</dd></div>
                <div className="flex justify-between"><dt>{t('متأخر', 'Late')}</dt><dd>{selected.attendance.late}</dd></div>
                <div className="flex justify-between"><dt>{t('بعذر', 'Excused')}</dt><dd>{selected.attendance.excused}</dd></div>
              </dl>
            ) : <p className="mt-3 text-sm text-muted-foreground">{t('لا توجد سجلات حضور حتى الآن.', 'No attendance records yet.')}</p>}
          </aside>
        </section>

        <section className="grid gap-8 border-t border-gray-200 pt-6 lg:grid-cols-2 dark:border-white/10">
          <div>
            <h2 className="font-bold">{t('آخر الدرجات المسجلة', 'Recent grades')}</h2>
            {selected.recentGrades.length ? <ul className="mt-3 divide-y divide-gray-200 dark:divide-white/10">
              {selected.recentGrades.map((grade, index) => <li key={`${grade.subject}-${grade.date}-${index}`} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div><p className="font-medium">{grade.subject}</p><p className="text-xs text-muted-foreground">{new Date(grade.date).toLocaleDateString(isEnglish ? 'en-US' : 'ar-SA')}</p></div>
                <span className="font-bold">{grade.recordedScore} / {grade.recordedMaximum} ({grade.score}%)</span>
              </li>)}
            </ul> : <p className="mt-3 text-sm text-muted-foreground">{t('لا توجد درجات مسجلة بعد.', 'No grades have been recorded yet.')}</p>}
          </div>
          <div>
            <h2 className="font-bold">{t('الواجبات القادمة', 'Upcoming assignments')}</h2>
            {selected.upcomingAssignments.length ? <ul className="mt-3 divide-y divide-gray-200 dark:divide-white/10">
              {selected.upcomingAssignments.map((assignment) => <li key={assignment.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div><p className="font-medium">{assignment.title}</p><p className="text-xs text-muted-foreground">{assignment.subject}{assignment.dueDate ? ` · ${new Date(assignment.dueDate).toLocaleDateString(isEnglish ? 'en-US' : 'ar-SA')}` : ''}</p></div>
                <span className={assignment.submitted ? 'text-emerald-700' : 'text-amber-700'}>{assignment.submitted ? t('تم التسليم', 'Submitted') : t('لم يسلم', 'Not submitted')}</span>
              </li>)}
            </ul> : <p className="mt-3 text-sm text-muted-foreground">{t('لا توجد واجبات قادمة مسجلة.', 'No upcoming assignments.')}</p>}
          </div>
        </section>
      </>}
    </main>
  )
}
