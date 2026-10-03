'use client'

import { useCallback, useEffect, useState } from 'react'
import { BookOpen, GraduationCap, RefreshCw, Shield, Users } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type UserStats = {
  total: number
  students: number
  teachers: number
  parents: number
  admins: number
}

const roles = [
  { key: 'admins', name: 'المسؤولون', icon: Shield, color: 'text-rose-600' },
  { key: 'teachers', name: 'المعلمون', icon: BookOpen, color: 'text-blue-600' },
  { key: 'students', name: 'الطلاب', icon: GraduationCap, color: 'text-emerald-600' },
  { key: 'parents', name: 'أولياء الأمور', icon: Users, color: 'text-amber-600' },
] as const

function validStats(value: unknown): value is UserStats {
  if (!value || typeof value !== 'object') return false
  return ['total', 'students', 'teachers', 'parents', 'admins'].every((key) => {
    const count = (value as Record<string, unknown>)[key]
    return typeof count === 'number' && Number.isInteger(count) && count >= 0
  })
}

export default function PermissionsPage() {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadStats = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await apiClient.get('/users/stats')
      if (!validStats(response.data)) throw new Error('Invalid user statistics response')
      setStats(response.data)
    } catch {
      setStats(null)
      setError('تعذر تحميل أعداد الحسابات من قاعدة بيانات المدرسة.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadStats() }, [loadStats])

  return (
    <div className="space-y-6" dir="rtl">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
        <div>
          <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">إدارة المدرسة</p>
          <h1 className="mt-1 text-2xl font-black">أدوار الحسابات</h1>
          <p className="mt-2 text-sm text-muted-foreground">الأعداد مأخوذة من الحسابات الفعالة المسجلة للمدرسة.</p>
        </div>
        <button type="button" onClick={() => void loadStats()} disabled={loading} title="تحديث الأعداد" aria-label="تحديث الأعداد" className="grid h-10 w-10 place-items-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {error && <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        {roles.map(({ key, name, icon: Icon, color }) => (
          <Card key={key}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${color}`} />
                <div>
                  <CardTitle>{name}</CardTitle>
                  <CardDescription>{loading ? 'جارٍ التحميل...' : stats ? `${stats[key]} حساب فعال` : 'غير متاح'}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {!loading && stats?.total === 0 && !error && (
        <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">لا توجد حسابات فعالة مسجلة في قاعدة بيانات المدرسة حتى الآن.</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>إجمالي الحسابات الفعالة</CardTitle>
          <CardDescription>المصدر: خدمة المستخدمين في النظام</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-black tabular-nums">{loading ? '—' : stats ? stats.total : '—'}</p>
          <p className="mt-2 text-sm text-muted-foreground">تُفرض صلاحيات الوصول الفعلية من الخادم بحسب الدور والمدرسة المسندة للحساب.</p>
        </CardContent>
      </Card>
    </div>
  )
}
