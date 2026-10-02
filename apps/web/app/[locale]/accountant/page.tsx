'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/lib/api/client'
import { Download, RefreshCw, Wallet } from 'lucide-react'

type InvoiceRow = {
  id: string
  amount: number
  currency: string
  status: string
  description: string | null
  createdAt: string
  paidAt: string | null
  student: { id: string; name: string | null; email: string }
}

type InvoiceSummary = { currency: string; status: string; amount: number; count: number }
type InvoiceResponse = {
  invoices: InvoiceRow[]
  meta: { total: number; page: number; limit: number; totalPages: number }
  summary: InvoiceSummary[]
}

const statusLabels: Record<string, string> = {
  PAID: 'مدفوعة',
  PENDING: 'معلقة',
  REQUIRES_ACTION: 'بانتظار إجراء',
  FAILED: 'فشلت',
  REFUNDED: 'مستردة',
}

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('ar-SA', { style: 'currency', currency }).format(value)
  } catch {
    return `${value.toLocaleString('ar-SA')} ${currency}`
  }
}

function exportCsv(rows: InvoiceRow[]) {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`
  const content = '\uFEFF' + [
    ['الطالب', 'الوصف', 'المبلغ', 'العملة', 'الحالة', 'تاريخ الإنشاء'],
    ...rows.map((invoice) => [invoice.student.name || invoice.student.email, invoice.description || '', String(invoice.amount), invoice.currency, statusLabels[invoice.status] || invoice.status, invoice.createdAt]),
  ].map((row) => row.map(quote).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'school-invoices.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export default function AccountantDashboard() {
  const [result, setResult] = useState<InvoiceResponse | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.get<InvoiceResponse>('/payments/school-invoices', { params: { page, limit: 25 } })
      setResult(response.data)
    } catch {
      setResult(null)
      setError('تعذر تحميل فواتير المدرسة. تحقق من صلاحية الحساب واتصاله بالمدرسة.')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { void load() }, [load])

  const currencies = Array.from(new Set((result?.summary || []).map((item) => item.currency)))

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-200 pb-5 dark:border-white/10">
        <div>
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">الحسابات المدرسية</p>
          <h1 className="mt-1 text-2xl font-black text-gray-900 dark:text-white">سجل الفواتير</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">الفواتير ومجاميعها المسجلة في قاعدة بيانات المدرسة</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} disabled={loading} title="تحديث الفواتير" className="rounded-lg border border-gray-200 p-2.5 text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"><RefreshCw className="h-4 w-4" /></button>
          <button onClick={() => result && exportCsv(result.invoices)} disabled={!result?.invoices.length} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3.5 py-2.5 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900"><Download className="h-4 w-4" /> تصدير الصفحة</button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</div>}

      <section className="space-y-3">
        {currencies.length ? currencies.map((currency) => {
          const rows = result!.summary.filter((entry) => entry.currency === currency)
          const total = rows.reduce((sum, entry) => sum + entry.amount, 0)
          const paid = rows.find((entry) => entry.status === 'PAID')
          const pending = rows.find((entry) => entry.status === 'PENDING')
          return (
            <div key={currency}>
              <h2 className="mb-2 text-xs font-bold text-gray-500">ملخص {currency}</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ['إجمالي الفواتير', total, rows.reduce((sum, entry) => sum + entry.count, 0)],
                  ['المحصل', paid?.amount ?? 0, paid?.count ?? 0],
                  ['المعلق', pending?.amount ?? 0, pending?.count ?? 0],
                ].map(([label, amount, count]) => (
                  <div key={label} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
                    <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{label}</p><Wallet className="h-4 w-4 text-emerald-600" /></div>
                    <p className="mt-3 text-xl font-black text-gray-900 dark:text-white">{money(Number(amount), currency)}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{count} فاتورة</p>
                  </div>
                ))}
              </div>
            </div>
          )
        }) : !loading && !error ? <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-white/15">لا توجد فواتير مسجلة للمدرسة.</div> : null}
      </section>

      <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#1e1e2d]">
        <table className="w-full min-w-[780px] text-right text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 dark:bg-white/5 dark:text-gray-400"><tr><th className="px-4 py-3 font-semibold">الطالب</th><th className="px-4 py-3 font-semibold">الوصف</th><th className="px-4 py-3 font-semibold">المبلغ</th><th className="px-4 py-3 font-semibold">الحالة</th><th className="px-4 py-3 font-semibold">تاريخ الإنشاء</th></tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/10">
            {result?.invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td className="px-4 py-3"><p className="font-bold text-gray-900 dark:text-white">{invoice.student.name || invoice.student.email}</p><p className="text-xs text-gray-500">{invoice.student.email}</p></td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{invoice.description || '—'}</td>
                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{money(Number(invoice.amount), invoice.currency)}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{statusLabels[invoice.status] || invoice.status}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium' }).format(new Date(invoice.createdAt))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="p-8 text-center text-sm text-gray-500">جار تحميل سجل الفواتير...</p>}
        {!loading && !error && result?.invoices.length === 0 && <p className="p-8 text-center text-sm text-gray-500">لا توجد نتائج في هذا السجل.</p>}
      </section>

      {result && result.meta.totalPages > 1 && <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300"><span>صفحة {result.meta.page} من {result.meta.totalPages} · {result.meta.total} فاتورة</span><div className="flex gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-gray-200 px-3 py-2 disabled:opacity-40 dark:border-white/10">السابق</button><button disabled={page >= result.meta.totalPages || loading} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-gray-200 px-3 py-2 disabled:opacity-40 dark:border-white/10">التالي</button></div></div>}
    </div>
  )
}
