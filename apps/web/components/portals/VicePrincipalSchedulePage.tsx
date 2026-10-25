'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { apiClient } from '@/lib/api/client'
import { CalendarDays, CircleAlert, Download, Loader2, RefreshCw, School } from 'lucide-react'
import ScheduleWeekView from '@/components/schedule/ScheduleWeekView'

type SchoolClass = { id: string; name: string }
type ScheduleEntry = { id: string; dayOfWeek: number; periodNumber?: number; startTime: string; endTime: string; room: string | null; subject: { id: string; name: string; code?: string | null } | null }
type ScheduleResponse = { success?: boolean; data?: Record<string, ScheduleEntry[]> }

const days = {
  ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
}

export default function VicePrincipalSchedulePage() {
  const locale = useLocale() === 'en' ? 'en' : 'ar'
  const t = locale === 'en'
    ? { title: 'Class timetables', subtitle: 'Review the lesson schedule saved for each class.', loading: 'Loading school timetable…', loadError: 'Could not load the timetable from the school system.', classesError: 'Could not load the school classes.', choose: 'Choose a class', emptyClasses: 'No classes are registered at this school yet.', emptySchedule: 'No lessons are scheduled for this class.', refresh: 'Refresh', export: 'Export CSV', subject: 'Subject', period: 'Period', time: 'Time', room: 'Room', class: 'Class' }
    : { title: 'الجداول الدراسية', subtitle: 'استعراض جدول الحصص المسجل لكل فصل في المدرسة.', loading: 'جار تحميل الجدول الدراسي...', loadError: 'تعذر تحميل الجدول من النظام.', classesError: 'تعذر تحميل فصول المدرسة.', choose: 'اختر فصلًا', emptyClasses: 'لا توجد فصول مسجلة في المدرسة حتى الآن.', emptySchedule: 'لا توجد حصص مجدولة لهذا الفصل.', refresh: 'تحديث', export: 'تصدير CSV', subject: 'المادة', period: 'الحصة', time: 'الوقت', room: 'القاعة', class: 'الفصل' }
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [schedule, setSchedule] = useState<Record<string, ScheduleEntry[]>>({})
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [loadingSchedule, setLoadingSchedule] = useState(false)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)

  const loadClasses = useCallback(async () => {
    setLoadingClasses(true)
    setError('')
    try {
      const response = await apiClient.get<SchoolClass[]>('/classes')
      setClasses(response.data)
      setSelectedClass((current) => current && response.data.some((item) => item.id === current) ? current : response.data[0]?.id || '')
    } catch {
      setClasses([])
      setError(t.classesError)
    } finally {
      setLoadingClasses(false)
    }
  }, [t.classesError])

  useEffect(() => { void loadClasses() }, [loadClasses])

  useEffect(() => {
    if (!selectedClass) { setSchedule({}); return }
    let active = true
    setLoadingSchedule(true)
    setError('')
    apiClient.get<ScheduleResponse>(`/schedule/classes/${selectedClass}`)
      .then((response) => { if (active) setSchedule(response.data.data || {}) })
      .catch(() => { if (active) { setSchedule({}); setError(t.loadError) } })
      .finally(() => { if (active) setLoadingSchedule(false) })
    return () => { active = false }
  }, [revision, selectedClass, t.loadError])

  const entries = Object.values(schedule).flat()
  const exportCsv = () => {
    const quote = (value: string) => `"${value.replaceAll('"', '""')}"`
    const header = locale === 'en' ? ['Day', 'Period', 'Subject', 'Time', 'Room'] : ['اليوم', 'الحصة', 'المادة', 'الوقت', 'القاعة']
    const rows = Object.entries(schedule).flatMap(([day, items]) => items.map((item) => [days[locale][Number(day)] || day, String(item.periodNumber || ''), item.subject?.name || '', `${item.startTime} - ${item.endTime}`, item.room || '']))
    const content = '\uFEFF' + [header, ...rows].map((row) => row.map((value) => quote(String(value))).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'class-timetable.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return <main className="mx-auto max-w-7xl space-y-6 pb-12" dir={locale === 'en' ? 'ltr' : 'rtl'}>
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5"><div><p className="text-sm font-semibold text-primary">Nexus EDU</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">{t.title}</h1><p className="mt-2 text-sm text-muted-foreground">{t.subtitle}</p></div><div className="flex gap-2"><button type="button" onClick={() => setRevision((current) => current + 1)} disabled={!selectedClass || loadingSchedule} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loadingSchedule ? 'animate-spin' : ''}`} />{t.refresh}</button><button type="button" onClick={exportCsv} disabled={!entries.length} className="inline-flex items-center gap-2 rounded-lg bg-foreground px-3 py-2 text-sm font-bold text-background disabled:opacity-50"><Download className="h-4 w-4" />{t.export}</button></div></header>
    {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><CircleAlert className="h-4 w-4" />{error}</div>}
    <section className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"><label className="grid min-w-56 flex-1 gap-1.5 text-sm font-semibold"><span>{t.class}</span><select value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)} disabled={loadingClasses || !classes.length} className="rounded-lg border border-border bg-background px-3 py-2.5"><option value="">{t.choose}</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="text-sm text-muted-foreground"><School className="me-2 inline h-4 w-4" />{classes.length} {t.class}</div></section>
    {loadingClasses || loadingSchedule ? <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t.loading}</div> : !classes.length ? <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">{t.emptyClasses}</div> : !entries.length ? <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground"><CalendarDays className="mx-auto mb-3 h-7 w-7" />{t.emptySchedule}</div> : <ScheduleWeekView schedule={schedule} />}
  </main>
}
