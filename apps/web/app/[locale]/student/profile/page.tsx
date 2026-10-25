'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
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
  const isEnglish = useLocale() === 'en'
  const t = (ar: string, en: string) => isEnglish ? en : ar
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
      setError(t('تعذر تحميل الملف الدراسي. حاول تحديث الصفحة.', 'Could not load your academic profile. Try refreshing the page.'))
    } finally {
      setLoading(false)
    }
  }, [isEnglish])

  useEffect(() => { void load() }, [load])

  if (loading) return <div className="flex min-h-64 items-center justify-center text-sm text-gray-500">{t('جارٍ تحميل الملف الدراسي...', 'Loading academic profile...')}</div>
  if (error) return <div className="mx-auto max-w-xl p-8 text-center"><p role="alert" className="text-sm text-rose-600">{error}</p><button onClick={() => void load()} className="mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm"><RefreshCw className="h-4 w-4" />{t('إعادة المحاولة', 'Try again')}</button></div>

  const summary = data?.summary ?? {}
  const gamification = data?.gamification ?? {}
  const stats = [
    { label: t('متوسط الدرجات', 'Average grade'), value: typeof summary.averageGrade === 'number' ? `${summary.averageGrade}%` : '—', icon: Star },
    { label: t('نسبة الحضور', 'Attendance rate'), value: typeof summary.attendanceRate === 'number' ? `${summary.attendanceRate}%` : '—', icon: CalendarCheck },
    { label: t('واجبات مكتملة', 'Completed assignments'), value: summary.completedAssignments ?? 0, icon: BookOpen },
    { label: t('الإنجازات', 'Achievements'), value: data?.achievements?.length ?? 0, icon: Trophy },
  ]

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-6" dir={isEnglish ? 'ltr' : 'rtl'}>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-8 w-8 text-emerald-700" />
          <div>
            <h1 className="text-xl font-bold">{t('الملف الدراسي', 'Academic profile')}</h1>
            <p className="text-sm text-muted-foreground">{data?.student?.name || data?.student?.email || t('حساب الطالب', 'Student account')}</p>
          </div>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm" aria-label={t('تحديث الملف', 'Refresh profile')}><RefreshCw className="h-4 w-4" />{t('تحديث', 'Refresh')}</button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label={t('ملخص الملف الدراسي', 'Academic profile summary')}>
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-3 border-b p-4">
            <Icon className="h-5 w-5 text-emerald-700" />
            <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-base font-bold">{t('البيانات الدراسية', 'Academic details')}</h2>
          <div className="divide-y rounded-lg border px-4">
            <p className="py-3 text-sm">{t('الصف المسجل:', 'Enrolled grade:')} {gradeLevel == null ? t('غير مسجل', 'Not enrolled') : gradeLevel === 0 ? t('رياض الأطفال / التمهيدي', 'Kindergarten / Preparatory') : `${t('الصف', 'Grade')} ${gradeLevel}`}</p>
            {(data?.student?.classes ?? []).length === 0
              ? <p className="py-3 text-sm text-muted-foreground">{t('لا يوجد فصل مرتبط بالحساب بعد.', 'No class is linked to this account yet.')}</p>
              : data?.student?.classes?.map((item) => <p key={item.id} className="py-3 text-sm">{item.name}{item.teacher ? ` · ${item.teacher}` : ''}</p>)}
          </div>
          <div className="mt-5">
            <h2 className="mb-3 text-base font-bold">{t('أداء المواد المسجل', 'Recorded subject performance')}</h2>
            {(data?.subjectPerformance ?? []).length === 0
              ? <p className="rounded-lg border p-4 text-sm text-muted-foreground">{t('لا توجد سجلات أداء للمواد بعد.', 'No subject performance records yet.')}</p>
              : <div className="divide-y rounded-lg border px-4">{data?.subjectPerformance?.map((subject, index) => <div key={subject.id || `${subject.name}-${index}`} className="flex justify-between gap-4 py-3 text-sm"><span>{subject.name}</span><span>{typeof subject.averageGrade === 'number' ? `${subject.averageGrade}%` : t('لا توجد درجة مسجلة', 'No grade recorded')}</span></div>)}</div>}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2"><Award className="h-5 w-5 text-amber-600" /><h2 className="text-base font-bold">{t('الإنجازات المسجلة', 'Recorded achievements')}</h2></div>
          {(data?.achievements ?? []).length === 0
            ? <p className="rounded-lg border p-4 text-sm text-muted-foreground">{t('لا توجد إنجازات مسجلة بعد.', 'No achievements have been recorded yet.')}</p>
            : <div className="divide-y rounded-lg border px-4">{data?.achievements?.map((item) => <div key={item.id} className="py-3"><p className="text-sm font-semibold">{item.name}</p>{item.description && <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>}{item.unlockedAt && <p className="mt-1 text-xs text-muted-foreground">{new Date(item.unlockedAt).toLocaleDateString(isEnglish ? 'en-US' : 'ar-SA')}</p>}</div>)}</div>}
          <div className="mt-5 rounded-lg border p-4">
            <p className="text-sm font-semibold">{t('الخبرة والمستوى', 'Experience and level')}</p>
            <p className="mt-2 text-sm text-muted-foreground">{gamification.totalXP ?? 0} {t('نقطة خبرة', 'XP')} · {t('المستوى', 'Level')} {gamification.level ?? 0} · {t('التتابع', 'Streak')} {gamification.streakDays ?? 0} {t('يوم', 'days')}</p>
          </div>
        </div>
      </section>
    </main>
  )
}
