'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import { BookOpen, BriefcaseBusiness, GraduationCap, HeartHandshake, RefreshCw, Shield, Users } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type UserStats = {
  total: number
  students: number
  teachers: number
  parents: number
  admins: number
  principals: number
  vicePrincipals: number
  counselors: number
  supervisors: number
  accountants: number
  hr: number
}

const statKeys = ['total', 'students', 'teachers', 'parents', 'admins', 'principals', 'vicePrincipals', 'counselors', 'supervisors', 'accountants', 'hr'] as const

const roleCards = [
  { key: 'admins', ar: 'مديرو النظام', en: 'Administrators', icon: Shield, color: 'text-rose-600' },
  { key: 'principals', ar: 'مديرو المدارس', en: 'Principals', icon: BriefcaseBusiness, color: 'text-violet-600' },
  { key: 'vicePrincipals', ar: 'وكلاء المدارس', en: 'Vice principals', icon: BriefcaseBusiness, color: 'text-pink-600' },
  { key: 'counselors', ar: 'المرشدون الطلابيون', en: 'Student counselors', icon: HeartHandshake, color: 'text-teal-600' },
  { key: 'supervisors', ar: 'المشرفون التربويون', en: 'Educational supervisors', icon: GraduationCap, color: 'text-indigo-600' },
  { key: 'accountants', ar: 'المحاسبون', en: 'Accountants', icon: BriefcaseBusiness, color: 'text-emerald-600' },
  { key: 'hr', ar: 'الموارد البشرية', en: 'Human resources', icon: Users, color: 'text-orange-600' },
  { key: 'teachers', ar: 'المعلمون', en: 'Teachers', icon: BookOpen, color: 'text-blue-600' },
  { key: 'students', ar: 'الطلاب', en: 'Students', icon: GraduationCap, color: 'text-cyan-600' },
  { key: 'parents', ar: 'أولياء الأمور', en: 'Parents', icon: Users, color: 'text-amber-600' },
] as const

function validStats(value: unknown): value is UserStats {
  if (!value || typeof value !== 'object') return false
  return statKeys.every((key) => {
    const count = (value as Record<string, unknown>)[key]
    return typeof count === 'number' && Number.isInteger(count) && count >= 0
  })
}

export default function PermissionsPage() {
  const locale = useLocale() === 'en' ? 'en' : 'ar'
  const english = locale === 'en'
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const t = english
    ? { eyebrow: 'School administration', title: 'Accounts by role', description: 'Active school accounts grouped by their assigned role.', loading: 'Loading account totals…', unavailable: 'Could not load account totals from the school database.', refresh: 'Refresh totals', active: 'active accounts', empty: 'There are no active accounts registered for this school yet.', total: 'Total active accounts', source: 'Source: school user service', policy: 'Access is enforced by the API according to each account role and school assignment.', manage: 'Manage accounts' }
    : { eyebrow: 'إدارة المدرسة', title: 'الحسابات حسب الدور', description: 'الحسابات النشطة في المدرسة مجمعة حسب الدور المسند لكل حساب.', loading: 'جارٍ تحميل أعداد الحسابات...', unavailable: 'تعذر تحميل أعداد الحسابات من قاعدة بيانات المدرسة.', refresh: 'تحديث الأعداد', active: 'حساب نشط', empty: 'لا توجد حسابات نشطة مسجلة في قاعدة بيانات المدرسة حتى الآن.', total: 'إجمالي الحسابات النشطة', source: 'المصدر: خدمة مستخدمي المدرسة', policy: 'يفرض الخادم صلاحيات الوصول بحسب دور الحساب والمدرسة المسندة إليه.', manage: 'إدارة الحسابات' }

  const loadStats = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await apiClient.get<UserStats>('/users/stats')
      if (!validStats(response.data)) throw new Error('Invalid user statistics response')
      setStats(response.data)
    } catch {
      setStats(null)
      setError(t.unavailable)
    } finally {
      setLoading(false)
    }
  }, [t.unavailable])

  useEffect(() => { void loadStats() }, [loadStats])

  return (
    <main className="space-y-6 pb-10" dir={english ? 'ltr' : 'rtl'}>
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
        <div>
          <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">{t.eyebrow}</p>
          <h1 className="mt-1 text-2xl font-black">{t.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t.description}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void loadStats()} disabled={loading} title={t.refresh} aria-label={t.refresh} className="grid h-10 w-10 place-items-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link href="/admin/users" className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90">{t.manage}</Link>
        </div>
      </header>

      {error && <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {roleCards.map(({ key, ar, en, icon: Icon, color }) => (
          <Card key={key}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${color}`} />
                <div>
                  <CardTitle>{english ? en : ar}</CardTitle>
                  <CardDescription>{loading ? t.loading : stats ? `${stats[key]} ${t.active}` : '—'}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </section>

      {!loading && stats?.total === 0 && !error && <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{t.empty}</div>}

      <Card>
        <CardHeader>
          <CardTitle>{t.total}</CardTitle>
          <CardDescription>{t.source}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-black tabular-nums">{loading ? '—' : stats ? stats.total : '—'}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t.policy}</p>
        </CardContent>
      </Card>
    </main>
  )
}
