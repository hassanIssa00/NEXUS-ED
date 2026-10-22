'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import { apiClient } from '@/lib/api/client'
import { ArrowUpRight, CircleAlert, RefreshCw, Users } from 'lucide-react'

type UserStats = { total: number; students: number; teachers: number; parents: number; admins: number; principals: number; vicePrincipals: number; counselors: number; supervisors: number; accountants: number; hr: number }

export default function HRDashboard() {
  const locale = useLocale() === 'en' ? 'en' : 'ar'
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const t = locale === 'en'
    ? { title: 'Human resources dashboard', subtitle: 'Staff directory and active account totals by role at this school.', refresh: 'Refresh', loading: 'Loading school accounts…', error: 'Could not load school account statistics.', staff: 'Staff directory', reports: 'HR summary', total: 'Active accounts', teachers: 'Teachers', students: 'Students', parents: 'Parents', admins: 'Administrators', principals: 'Principals', vicePrincipals: 'Vice principals', counselors: 'Student counselors', supervisors: 'Educational supervisors', accountants: 'Accountants', hr: 'Human resources' }
    : { title: 'لوحة الموارد البشرية', subtitle: 'دليل العاملين وأعداد الحسابات النشطة في المدرسة حسب الدور.', refresh: 'تحديث', loading: 'جار تحميل حسابات المدرسة...', error: 'تعذر تحميل إحصاءات الحسابات.', staff: 'دليل الموظفين', reports: 'ملخص الموارد البشرية', total: 'الحسابات النشطة', teachers: 'المعلمون', students: 'الطلاب', parents: 'أولياء الأمور', admins: 'مديرو النظام', principals: 'مديرو المدارس', vicePrincipals: 'وكلاء المدارس', counselors: 'المرشدون الطلابيون', supervisors: 'المشرفون التربويون', accountants: 'المحاسبون', hr: 'الموارد البشرية' }
  const load = useCallback(async () => {
    setError('')
    try { const response = await apiClient.get<UserStats>('/users/stats'); setStats(response.data) }
    catch { setStats(null); setError(t.error) }
    finally { setLoading(false); setRefreshing(false) }
  }, [t.error])
  useEffect(() => { void load() }, [load])

  return <main className="mx-auto max-w-7xl space-y-6 pb-12" dir={locale === 'en' ? 'ltr' : 'rtl'}>
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5"><div><p className="text-sm font-semibold text-orange-700">Nexus EDU · {locale === 'en' ? 'Human resources' : 'الموارد البشرية'}</p><h1 className="mt-1 text-3xl font-black">{t.title}</h1><p className="mt-2 text-sm text-muted-foreground">{t.subtitle}</p></div><button type="button" onClick={() => { setRefreshing(true); void load() }} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />{t.refresh}</button></header>
    {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><CircleAlert className="h-4 w-4" />{error}</div>}
    {loading ? <p className="py-16 text-center text-sm text-muted-foreground">{t.loading}</p> : stats && <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
        [t.total, stats.total], [t.admins, stats.admins], [t.principals, stats.principals], [t.vicePrincipals, stats.vicePrincipals],
        [t.counselors, stats.counselors], [t.supervisors, stats.supervisors], [t.accountants, stats.accountants], [t.hr, stats.hr],
        [t.teachers, stats.teachers], [t.students, stats.students], [t.parents, stats.parents],
      ].map(([label, value]) => <article key={label} className="rounded-xl border border-border bg-card p-5"><div className="flex items-center justify-between gap-2"><p className="text-sm text-muted-foreground">{label}</p><Users className="h-5 w-5 text-primary" /></div><p className="mt-3 text-3xl font-bold">{value}</p></article>)}</section>
      <section className="grid gap-4 md:grid-cols-2"><Link href="/hr/employees" className="group rounded-xl border border-border bg-card p-5 hover:border-primary/50"><div className="flex items-center justify-between"><h2 className="font-bold">{t.staff}</h2><ArrowUpRight className="h-5 w-5 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div><p className="mt-2 text-sm text-muted-foreground">{locale === 'en' ? 'Search the school staff directory and export the current results.' : 'البحث في دليل موظفي المدرسة وتصدير النتائج المعروضة.'}</p></Link><Link href="/hr/reports" className="group rounded-xl border border-border bg-card p-5 hover:border-primary/50"><div className="flex items-center justify-between"><h2 className="font-bold">{t.reports}</h2><ArrowUpRight className="h-5 w-5 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div><p className="mt-2 text-sm text-muted-foreground">{locale === 'en' ? 'Review active account counts by the categories provided by the school system.' : 'عرض أعداد الحسابات النشطة حسب الفئات المتاحة في النظام.'}</p></Link></section>
    </>}
  </main>
}
