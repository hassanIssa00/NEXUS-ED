'use client'

import { useCallback, useEffect, useState } from 'react'
import { ParentReportView } from '@/components/analytics/parent-report-view'
import { apiClient } from '@/lib/api/client'
import { useLocale } from 'next-intl'

interface Child {
  id: string
  name: string
}

export default function ParentReportsPage() {
  const isEnglish = useLocale() === 'en'
  const t = useCallback((ar: string, en: string) => isEnglish ? en : ar, [isEnglish])
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
      .catch(() => setError(t('تعذر تحميل الأبناء المرتبطين بالحساب.', 'Could not load the children linked to this account.')))
      .finally(() => setLoading(false))
  }, [t])

  return (
    <div className="space-y-6 pb-12" dir={isEnglish ? 'ltr' : 'rtl'}>
      <header>
        <h1 className="text-2xl font-bold">{t('تقارير الأبناء', 'Children’s reports')}</h1>
        <p className="text-sm text-muted-foreground">{t('تقارير من سجلات المدرسة الفعلية.', 'Reports based on the school’s records.')}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium">
          {t('الابن أو الابنة', 'Child')}
          <select className="w-full rounded-md border bg-background p-2.5" value={studentId} onChange={(event) => setStudentId(event.target.value)} disabled={loading || children.length === 0}>
            <option value="">{loading ? t('جارٍ تحميل الأبناء...', 'Loading children…') : t('اختر ابنًا أو ابنة', 'Select a child')}</option>
            {children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium">
          {t('الفترة', 'Period')}
          <select className="w-full rounded-md border bg-background p-2.5" value={period} onChange={(event) => setPeriod(event.target.value as 'week' | 'month')}>
            <option value="week">{t('آخر أسبوع', 'Past week')}</option>
            <option value="month">{t('آخر شهر', 'Past month')}</option>
          </select>
        </label>
      </section>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!loading && !error && children.length === 0 && <p className="py-10 text-center text-muted-foreground">{t('لا يوجد أبناء مرتبطون بهذا الحساب.', 'No children are linked to this account.')}</p>}
      {studentId && <ParentReportView key={`${studentId}-${period}`} studentId={studentId} period={period} />}
    </div>
  )
}
