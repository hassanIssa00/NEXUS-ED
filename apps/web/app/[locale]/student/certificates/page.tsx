'use client'

import { useCallback, useEffect, useState } from 'react'
import { Award, RefreshCw } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

interface Achievement {
  id: string
  name: string
  description?: string | null
  unlockedAt?: string
}

export default function StudentCertificatesPage() {
  const [studentName, setStudentName] = useState('')
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await apiClient.get('/dashboard/student')
      setStudentName(data?.student?.name || data?.student?.email || '')
      setAchievements(Array.isArray(data?.achievements) ? data.achievements : [])
    } catch {
      setError('تعذر تحميل سجل الإنجازات.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 md:p-6" dir="rtl">
      <header className="flex items-center justify-between gap-3 border-b pb-4"><div className="flex items-center gap-3"><Award className="h-7 w-7 text-amber-600" /><div><h1 className="text-xl font-bold">الإنجازات المسجلة</h1><p className="text-sm text-muted-foreground">{studentName || 'ملف الطالب'}</p></div></div><button onClick={() => void load()} aria-label="تحديث" className="rounded-lg border p-2"><RefreshCw className="h-4 w-4" /></button></header>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {loading ? <p className="py-12 text-center text-sm text-muted-foreground">جارٍ تحميل السجل...</p>
        : achievements.length === 0 ? <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">لا توجد إنجازات مسجلة في ملفك بعد. لا توجد شهادات صادرة من النظام حتى الآن.</p>
          : <div className="divide-y rounded-lg border">{achievements.map((item) => <article key={item.id} className="flex items-start gap-3 p-4"><Award className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /><div><h2 className="font-semibold">{item.name}</h2>{item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}{item.unlockedAt && <time className="mt-2 block text-xs text-muted-foreground">{new Date(item.unlockedAt).toLocaleDateString('ar-SA')}</time>}</div></article>)}</div>}
    </main>
  )
}
