'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/lib/api/client'
import { AlertTriangle, Download, RefreshCw, Users } from 'lucide-react'

type RiskAlert = {
  type: 'GRADE_DROP' | 'LOW_ATTENDANCE' | 'MISSING_ASSIGNMENTS'
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  message: string
  value: number
  threshold: number
}

type StudentWarning = {
  studentId: string
  studentName: string
  alerts: RiskAlert[]
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

type SchoolClass = {
  id: string
  name: string
  teacher?: { name?: string | null; email?: string | null } | null
  _count?: { students?: number; subjects?: number }
}

type ClassWarnings = { classInfo: SchoolClass; warnings: StudentWarning[] }

const riskLabels: Record<StudentWarning['riskLevel'], string> = {
  CRITICAL: 'حرج',
  HIGH: 'مرتفع',
  MEDIUM: 'متوسط',
  LOW: 'منخفض',
}

function exportWarnings(rows: Array<StudentWarning & { className: string }>) {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`
  const content = '\uFEFF' + [
    ['الفصل', 'الطالب', 'درجة الخطر', 'المؤشرات المسجلة'],
    ...rows.map((row) => [row.className, row.studentName, riskLabels[row.riskLevel], row.alerts.map((alert) => alert.message).join(' | ')]),
  ].map((row) => row.map(quote).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'student-early-warnings.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export function ClassRiskMonitor({ title, description }: { title: string; description: string }) {
  const [data, setData] = useState<ClassWarnings[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const classesResponse = await apiClient.get<SchoolClass[]>('/classes')
      const results = await Promise.all(classesResponse.data.map(async (classInfo) => {
        const response = await apiClient.get<StudentWarning[]>('/analytics/student/early-warnings', { params: { classId: classInfo.id } })
        return { classInfo, warnings: response.data }
      }))
      setData(results)
    } catch {
      setError('تعذر تحميل الفصول أو مؤشرات الطلاب من النظام.')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const rows = useMemo(() => data.flatMap(({ classInfo, warnings }) => warnings.map((warning) => ({ ...warning, className: classInfo.name }))), [data])
  const criticalCount = rows.filter((row) => row.riskLevel === 'CRITICAL' || row.riskLevel === 'HIGH').length
  const monitoredCount = data.reduce((total, item) => total + (item.classInfo._count?.students ?? 0), 0)

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-200 pb-5 dark:border-white/10">
        <div><p className="text-sm font-semibold text-amber-700 dark:text-amber-300">متابعة طلاب المدرسة</p><h1 className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{title}</h1><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{description}</p></div>
        <div className="flex gap-2">
          <button onClick={() => void load()} disabled={loading} title="تحديث المؤشرات" className="rounded-lg border border-gray-200 p-2.5 text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"><RefreshCw className="h-4 w-4" /></button>
          <button onClick={() => exportWarnings(rows)} disabled={!rows.length} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3.5 py-2.5 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900"><Download className="h-4 w-4" /> تصدير المؤشرات</button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</div>}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]"><div className="flex items-center gap-2 text-sm text-gray-500"><Users className="h-4 w-4" /> الطلاب في الفصول</div><p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{loading ? '—' : monitoredCount}</p></div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]"><div className="flex items-center gap-2 text-sm text-gray-500"><AlertTriangle className="h-4 w-4" /> طلاب لديهم مؤشرات</div><p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{loading ? '—' : rows.length}</p></div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]"><p className="text-sm text-gray-500">مؤشرات مرتفعة أو حرجة</p><p className="mt-2 text-2xl font-black text-rose-700 dark:text-rose-300">{loading ? '—' : criticalCount}</p></div>
      </section>

      {loading ? <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 dark:border-white/10 dark:bg-[#1e1e2d]">جار تحميل بيانات الفصول...</div> : data.length ? (
        <div className="space-y-5">
          {data.map(({ classInfo, warnings }) => (
            <section key={classInfo.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#1e1e2d]">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-4 dark:border-white/10"><div><h2 className="font-black text-gray-900 dark:text-white">{classInfo.name}</h2><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{classInfo._count?.students ?? 0} طالب · {classInfo.teacher?.name || 'لا يوجد معلم فصل مسجل'}</p></div><span className="text-sm font-bold text-gray-600 dark:text-gray-300">{warnings.length} مؤشر</span></header>
              {warnings.length ? <div className="divide-y divide-gray-100 dark:divide-white/10">{warnings.map((warning) => <article key={warning.studentId} className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold text-gray-900 dark:text-white">{warning.studentName}</h3><span className={`rounded-md px-2.5 py-1 text-xs font-bold ${warning.riskLevel === 'CRITICAL' || warning.riskLevel === 'HIGH' ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200'}`}>مؤشر {riskLabels[warning.riskLevel]}</span></div><ul className="mt-3 space-y-2">{warning.alerts.map((alert, index) => <li key={`${alert.type}-${index}`} className="text-sm text-gray-600 dark:text-gray-300"><span className="ml-2 text-gray-400">•</span>{alert.message}</li>)}</ul></article>)}</div> : <p className="p-5 text-sm text-gray-500">لا توجد مؤشرات مسجلة لهذا الفصل.</p>}
            </section>
          ))}
        </div>
      ) : !error ? <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-white/15">لا توجد فصول متاحة لهذا الحساب.</div> : null}
    </div>
  )
}
