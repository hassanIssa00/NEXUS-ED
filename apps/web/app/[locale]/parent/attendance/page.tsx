'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { Calendar, CheckCircle2, Clock, XCircle, CircleHelp } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

interface Child {
  id: string
  name: string
  attendanceRate: number | null
  attendanceRecordCount: number
  attendance: { present: number; absent: number; late: number; excused: number } | null
  attendanceHistory: { date: string; status: string; className: string | null }[]
}

const labels = { ar: { PRESENT: 'حاضر', ABSENT: 'غائب', LATE: 'متأخر', EXCUSED: 'بعذر' }, en: { PRESENT: 'Present', ABSENT: 'Absent', LATE: 'Late', EXCUSED: 'Excused' } }
const icons: Record<string, typeof CheckCircle2> = { PRESENT: CheckCircle2, ABSENT: XCircle, LATE: Clock, EXCUSED: CircleHelp }

export default function ParentAttendancePage() {
  const isEnglish = useLocale() === 'en'
  const t = (ar: string, en: string) => isEnglish ? en : ar
  const [children, setChildren] = useState<Child[]>([])
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
      .catch(() => setError(t('تعذر تحميل سجل الحضور.', 'Could not load the attendance record.')))
      .finally(() => setLoading(false))
  }, [isEnglish])

  const child = children.find((item) => item.id === selectedId)

  if (loading) return <p className="py-16 text-center text-sm text-muted-foreground">{t('جارٍ تحميل سجل الحضور...', 'Loading attendance records...')}</p>
  if (error) return <p role="alert" className="py-16 text-center text-sm text-destructive">{error}</p>
  if (children.length === 0) return <p className="py-16 text-center text-sm text-muted-foreground">{t('لا يوجد أبناء مرتبطون بهذا الحساب.', 'No children are linked to this account.')}</p>

  return (
    <main className="mx-auto max-w-5xl space-y-7 pb-12" dir={isEnglish ? 'ltr' : 'rtl'}>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-5">
        <div><h1 className="text-2xl font-bold">{t('سجل الحضور', 'Attendance record')}</h1><p className="mt-1 text-sm text-muted-foreground">{t('سجلات المدرسة الفعلية للطالب.', 'Student attendance records from the school.')}</p></div>
        <label className="space-y-2 text-sm font-medium">{t('ملف الطالب', 'Student profile')}
          <select className="block min-w-56 rounded-md border bg-background p-2.5" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
            {children.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      </header>

      {child && <>
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="border-b pb-4"><p className="text-sm text-muted-foreground">{t('نسبة الحضور المسجلة', 'Recorded attendance rate')}</p><p className="mt-1 text-3xl font-bold">{child.attendanceRate === null ? '—' : `${child.attendanceRate}%`}</p><p className="mt-1 text-xs text-muted-foreground">{t('من', 'Across')} {child.attendanceRecordCount} {t('سجل', 'records')}</p></div>
          {child.attendance ? <>
            <div className="border-b pb-4"><p className="text-sm text-muted-foreground">{t('حاضر', 'Present')}</p><p className="mt-1 text-3xl font-bold text-emerald-700">{child.attendance.present}</p></div>
            <div className="border-b pb-4"><p className="text-sm text-muted-foreground">{t('غائب', 'Absent')}</p><p className="mt-1 text-3xl font-bold text-rose-700">{child.attendance.absent}</p></div>
            <div className="border-b pb-4"><p className="text-sm text-muted-foreground">{t('متأخر', 'Late')}</p><p className="mt-1 text-3xl font-bold text-amber-700">{child.attendance.late}</p></div>
            <div className="border-b pb-4"><p className="text-sm text-muted-foreground">{t('بعذر', 'Excused')}</p><p className="mt-1 text-3xl font-bold">{child.attendance.excused}</p></div>
          </> : <p className="self-center text-sm text-muted-foreground">{t('لا توجد سجلات حضور حتى الآن.', 'No attendance records yet.')}</p>}
        </section>

        <section className="border-t pt-6">
          <h2 className="flex items-center gap-2 font-bold"><Calendar className="h-4 w-4" />{t('التفاصيل المسجلة', 'Attendance details')}</h2>
          {child.attendanceHistory.length ? <ul className="mt-3 divide-y">
            {child.attendanceHistory.map((record, index) => {
              const status = record.status.toUpperCase()
              const Icon = icons[status] || CircleHelp
              return <li key={`${record.date}-${index}`} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div className="flex items-center gap-3"><Icon className="h-4 w-4 text-emerald-700" /><div><p className="font-medium">{new Date(record.date).toLocaleDateString(isEnglish ? 'en-US' : 'ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p><p className="text-xs text-muted-foreground">{record.className || t('الفصل', 'Class')}</p></div></div>
                <span>{labels[isEnglish ? 'en' : 'ar'][status as keyof typeof labels.ar] || t('غير معروف', 'Unknown')}</span>
              </li>
            })}
          </ul> : <p className="py-8 text-center text-sm text-muted-foreground">{t('لا توجد سجلات حضور بعد.', 'No attendance records yet.')}</p>}
        </section>
      </>}
    </main>
  )
}
