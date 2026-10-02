'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Activity, BookOpen, CalendarCheck, FileText, Users } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useAuth } from '@/contexts/auth-context'

interface ChildData {
  id: string
  name: string
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
      .catch(() => setError('تعذر تحميل بيانات الحساب. حاول تحديث الصفحة.'))
      .finally(() => setLoading(false))
  }, [])

  const selected = useMemo(() => children.find((child) => child.id === selectedId), [children, selectedId])
  const pendingAssignments = selected?.upcomingAssignments.filter((assignment) => !assignment.submitted) || []

  if (loading) return <div className="py-20 text-center text-sm text-muted-foreground">جارٍ تحميل بيانات الأبناء...</div>

  if (error) return <div role="alert" className="py-16 text-center text-sm text-destructive">{error}</div>

  if (children.length === 0) return (
    <main className="mx-auto max-w-3xl py-16 text-center" dir="rtl">
      <Users className="mx-auto mb-4 h-8 w-8 text-gray-400" />
      <h1 className="text-xl font-bold">لا يوجد أبناء مرتبطون بالحساب</h1>
      <p className="mt-2 text-sm text-muted-foreground">أدخل رمز الربط الذي يصدره الطالب من حسابه لإضافة ملفه إلى بوابتك.</p>
      <Link href="/student/new?flow=parent" className="mt-5 inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"><Users className="h-4 w-4" />ربط طالب</Link>
    </main>
  )

  return (
    <main className="mx-auto max-w-6xl space-y-7 pb-12" dir="rtl">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-200 pb-5 dark:border-white/10">
        <div>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">بوابة ولي الأمر</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">مرحبًا {profile?.full_name || 'ولي الأمر'}</h1>
        </div>
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link className="inline-flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted" href="/student/new?flow=parent"><Users className="h-4 w-4" />ربط طالب</Link>
          <Link className="inline-flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted" href="/parent/reports"><FileText className="h-4 w-4" />التقارير</Link>
          <Link className="inline-flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted" href="/parent/schedule"><CalendarCheck className="h-4 w-4" />الجدول</Link>
          <Link className="inline-flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted" href="/parent/messages"><Activity className="h-4 w-4" />الرسائل</Link>
        </nav>
      </header>

      <section className="max-w-sm">
        <label className="space-y-2 text-sm font-medium">
          ملف الطالب
          <select className="w-full rounded-md border bg-background p-2.5" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
            {children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}
          </select>
        </label>
      </section>

      {selected && <>
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{selected.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{selected.className || 'لا يوجد فصل مسجل'}</p>
            <div className="mt-4 grid gap-x-8 sm:grid-cols-2">
              <Metric label="متوسط الدرجات" value={selected.averageGrade === null ? '—' : `${selected.averageGrade}%`} detail={`${selected.gradeRecordCount} سجل درجات`} icon={BookOpen} />
              <Metric label="الحضور المسجل" value={selected.attendanceRate === null ? '—' : `${selected.attendanceRate}%`} detail={`${selected.attendanceRecordCount} سجل حضور`} icon={CalendarCheck} />
              <Metric label="واجبات قادمة غير مسلمة" value={String(pendingAssignments.length)} detail={`من ${selected.upcomingAssignments.length} واجب قادم مسجل`} icon={FileText} />
              <Metric label="أفراد مرتبطون" value={String(children.length)} detail="ملفات طلاب مرتبطة بحساب ولي الأمر" icon={Users} />
            </div>
          </div>

          <aside className="border-r border-gray-200 pr-5 dark:border-white/10">
            <h2 className="font-bold">الحضور خلال آخر السجلات</h2>
            {selected.attendance ? (
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between"><dt>حاضر</dt><dd>{selected.attendance.present}</dd></div>
                <div className="flex justify-between"><dt>غائب</dt><dd>{selected.attendance.absent}</dd></div>
                <div className="flex justify-between"><dt>متأخر</dt><dd>{selected.attendance.late}</dd></div>
                <div className="flex justify-between"><dt>بعذر</dt><dd>{selected.attendance.excused}</dd></div>
              </dl>
            ) : <p className="mt-3 text-sm text-muted-foreground">لا توجد سجلات حضور حتى الآن.</p>}
          </aside>
        </section>

        <section className="grid gap-8 border-t border-gray-200 pt-6 lg:grid-cols-2 dark:border-white/10">
          <div>
            <h2 className="font-bold">آخر الدرجات المسجلة</h2>
            {selected.recentGrades.length ? <ul className="mt-3 divide-y divide-gray-200 dark:divide-white/10">
              {selected.recentGrades.map((grade, index) => <li key={`${grade.subject}-${grade.date}-${index}`} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div><p className="font-medium">{grade.subject}</p><p className="text-xs text-muted-foreground">{new Date(grade.date).toLocaleDateString('ar-SA')}</p></div>
                <span className="font-bold">{grade.recordedScore} / {grade.recordedMaximum} ({grade.score}%)</span>
              </li>)}
            </ul> : <p className="mt-3 text-sm text-muted-foreground">لا توجد درجات مسجلة بعد.</p>}
          </div>
          <div>
            <h2 className="font-bold">الواجبات القادمة</h2>
            {selected.upcomingAssignments.length ? <ul className="mt-3 divide-y divide-gray-200 dark:divide-white/10">
              {selected.upcomingAssignments.map((assignment) => <li key={assignment.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div><p className="font-medium">{assignment.title}</p><p className="text-xs text-muted-foreground">{assignment.subject}{assignment.dueDate ? ` · ${new Date(assignment.dueDate).toLocaleDateString('ar-SA')}` : ''}</p></div>
                <span className={assignment.submitted ? 'text-emerald-700' : 'text-amber-700'}>{assignment.submitted ? 'تم التسليم' : 'لم يسلم'}</span>
              </li>)}
            </ul> : <p className="mt-3 text-sm text-muted-foreground">لا توجد واجبات قادمة مسجلة.</p>}
          </div>
        </section>
      </>}
    </main>
  )
}
