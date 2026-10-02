'use client'

import { useCallback, useEffect, useState } from 'react'
import { Award, BookOpen, CalendarCheck, GraduationCap, RefreshCw, Star, Trophy } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

interface StudentDashboardData {
  student?: { id?: string; name?: string; email?: string; classes?: { id: string; name: string; teacher?: string }[] }
  summary?: { averageGrade?: number | null; attendanceRate?: number | null; completedAssignments?: number; pendingAssignments?: number }
  gamification?: { level?: number; totalXP?: number; streakDays?: number }
  achievements?: { id: string; name: string; description?: string; unlockedAt?: string }[]
  subjectPerformance?: { id?: string; name: string; averageGrade?: number | null; teacher?: string }[]
}

export default function SmartProfilePage() {
  const [data, setData] = useState<StudentDashboardData | null>(null)
  const [gradeLevel, setGradeLevel] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [dashboard, profile] = await Promise.all([
        apiClient.get('/dashboard/student'),
        apiClient.get('/users/me/student-profile').catch(() => ({ data: null })),
      ])
      setData(dashboard.data)
      setGradeLevel(typeof profile.data?.gradeLevel === 'number' ? profile.data.gradeLevel : null)
    } catch {
      setError('تعذر تحميل الملف الدراسي. حاول تحديث الصفحة.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return <div className="flex min-h-64 items-center justify-center text-sm text-gray-500">جارٍ تحميل الملف الدراسي...</div>
  if (error) return <div className="mx-auto max-w-xl p-8 text-center"><p role="alert" className="text-sm text-rose-600">{error}</p><button onClick={() => void load()} className="mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm"><RefreshCw className="h-4 w-4" /> إعادة المحاولة</button></div>

  const summary = data?.summary ?? {}
  const gamification = data?.gamification ?? {}
  const stats = [
    { label: 'متوسط الدرجات', value: typeof summary.averageGrade === 'number' ? `${summary.averageGrade}%` : '—', icon: Star },
    { label: 'نسبة الحضور', value: typeof summary.attendanceRate === 'number' ? `${summary.attendanceRate}%` : '—', icon: CalendarCheck },
    { label: 'واجبات مكتملة', value: summary.completedAssignments ?? 0, icon: BookOpen },
    { label: 'الإنجازات', value: data?.achievements?.length ?? 0, icon: Trophy },
  ]

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-6" dir="rtl">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-8 w-8 text-emerald-700" />
          <div>
            <h1 className="text-xl font-bold">الملف الدراسي</h1>
            <p className="text-sm text-muted-foreground">{data?.student?.name || data?.student?.email || 'حساب الطالب'}</p>
          </div>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm" aria-label="تحديث الملف"><RefreshCw className="h-4 w-4" /> تحديث</button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="ملخص الملف الدراسي">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-3 border-b p-4">
            <Icon className="h-5 w-5 text-emerald-700" />
            <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-base font-bold">البيانات الدراسية</h2>
          <div className="divide-y rounded-lg border px-4">
            <p className="py-3 text-sm">الصف المسجل: {gradeLevel == null ? 'غير مسجل' : gradeLevel === 0 ? 'رياض الأطفال / التمهيدي' : `الصف ${gradeLevel}`}</p>
            {(data?.student?.classes ?? []).length === 0
              ? <p className="py-3 text-sm text-muted-foreground">لا يوجد فصل مرتبط بالحساب بعد.</p>
              : data?.student?.classes?.map((item) => <p key={item.id} className="py-3 text-sm">{item.name}{item.teacher ? ` · ${item.teacher}` : ''}</p>)}
          </div>
          <div className="mt-5">
            <h2 className="mb-3 text-base font-bold">أداء المواد المسجل</h2>
            {(data?.subjectPerformance ?? []).length === 0
              ? <p className="rounded-lg border p-4 text-sm text-muted-foreground">لا توجد سجلات أداء للمواد بعد.</p>
              : <div className="divide-y rounded-lg border px-4">{data?.subjectPerformance?.map((subject, index) => <div key={subject.id || `${subject.name}-${index}`} className="flex justify-between gap-4 py-3 text-sm"><span>{subject.name}</span><span>{typeof subject.averageGrade === 'number' ? `${subject.averageGrade}%` : 'لا توجد درجة مسجلة'}</span></div>)}</div>}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2"><Award className="h-5 w-5 text-amber-600" /><h2 className="text-base font-bold">الإنجازات المسجلة</h2></div>
          {(data?.achievements ?? []).length === 0
            ? <p className="rounded-lg border p-4 text-sm text-muted-foreground">لا توجد إنجازات مسجلة بعد.</p>
            : <div className="divide-y rounded-lg border px-4">{data?.achievements?.map((item) => <div key={item.id} className="py-3"><p className="text-sm font-semibold">{item.name}</p>{item.description && <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>}{item.unlockedAt && <p className="mt-1 text-xs text-muted-foreground">{new Date(item.unlockedAt).toLocaleDateString('ar-SA')}</p>}</div>)}</div>}
          <div className="mt-5 rounded-lg border p-4">
            <p className="text-sm font-semibold">الخبرة والمستوى</p>
            <p className="mt-2 text-sm text-muted-foreground">{gamification.totalXP ?? 0} نقطة خبرة · المستوى {gamification.level ?? 0} · التتابع {gamification.streakDays ?? 0} يوم</p>
          </div>
        </div>
      </section>
    </main>
  )
}
