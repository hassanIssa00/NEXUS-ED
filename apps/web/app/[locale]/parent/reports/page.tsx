'use client'

import { useEffect, useState } from 'react'
import { ParentReportView } from '@/components/analytics/parent-report-view'
import { apiClient } from '@/lib/api/client'

interface Child {
  id: string
  name: string
}

export default function ParentReportsPage() {
  const [children, setChildren] = useState<Child[]>([])
  const [studentId, setStudentId] = useState('')
  const [period, setPeriod] = useState<'week' | 'month'>('month')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiClient.get('/dashboard/parent')
      .then(({ data }) => {
        const linkedChildren = Array.isArray(data?.children)
          ? data.children.filter((child: Child) => child?.id && child?.name)
          : []
        setChildren(linkedChildren)
      })
      .catch(() => setError('تعذر تحميل الأبناء المرتبطين بالحساب.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      <header>
        <h1 className="text-2xl font-bold">تقارير الأبناء</h1>
        <p className="text-sm text-muted-foreground">تقارير من سجلات المدرسة الفعلية.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium">
          الابن أو الابنة
          <select className="w-full rounded-md border bg-background p-2.5" value={studentId} onChange={(event) => setStudentId(event.target.value)} disabled={loading || children.length === 0}>
            <option value="">{loading ? 'جارٍ تحميل الأبناء...' : 'اختر ابنًا أو ابنة'}</option>
            {children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium">
          الفترة
          <select className="w-full rounded-md border bg-background p-2.5" value={period} onChange={(event) => setPeriod(event.target.value as 'week' | 'month')}>
            <option value="week">آخر أسبوع</option>
            <option value="month">آخر شهر</option>
          </select>
        </label>
      </section>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!loading && !error && children.length === 0 && <p className="py-10 text-center text-muted-foreground">لا يوجد أبناء مرتبطون بهذا الحساب.</p>}
      {studentId && <ParentReportView key={`${studentId}-${period}`} studentId={studentId} period={period} />}
    </div>
  )
}
