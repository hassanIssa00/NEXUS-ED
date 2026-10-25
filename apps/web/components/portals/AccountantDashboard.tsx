'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import { apiClient } from '@/lib/api/client'
import { ArrowUpRight, CircleAlert, FileText, RefreshCw, Wallet } from 'lucide-react'
import { DashboardBarChart, DashboardDonutChart } from '@/components/dashboard/analytics-charts'

type InvoiceSummary = { currency: string; status: string; amount: number; count: number }
type InvoiceRow = { id: string; amount: number; currency: string; status: string; createdAt: string; description: string | null; student: { name: string | null; email: string } }
type InvoiceResponse = { invoices: InvoiceRow[]; meta: { total: number }; summary: InvoiceSummary[] }

export default function AccountantDashboard() {
  const locale = useLocale() === 'en' ? 'en' : 'ar'
  const [data, setData] = useState<InvoiceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const t = locale === 'en'
    ? { title: 'Finance dashboard', subtitle: 'Review invoices and collections recorded for your school.', total: 'Total invoices', paid: 'Collected', pending: 'Awaiting payment', recent: 'Recent invoices', view: 'Open invoice register', reports: 'Financial reports', loading: 'Loading financial records…', error: 'Could not load school invoices.', refresh: 'Refresh', empty: 'There are no invoices recorded yet.', statusChart: 'Invoices by status', amountChart: (currency: string) => `Invoice amounts · ${currency}`, noChart: 'There are no invoice records to chart.', statuses: { PAID: 'Paid', PENDING: 'Pending', REQUIRES_ACTION: 'Action required', FAILED: 'Failed', REFUNDED: 'Refunded' } }
    : { title: 'لوحة الشؤون المالية', subtitle: 'متابعة الفواتير والتحصيلات المسجلة في المدرسة.', total: 'إجمالي الفواتير', paid: 'المبالغ المحصلة', pending: 'قيد السداد', recent: 'أحدث الفواتير', view: 'فتح سجل الفواتير', reports: 'التقارير المالية', loading: 'جار تحميل السجلات المالية...', error: 'تعذر تحميل فواتير المدرسة.', refresh: 'تحديث', empty: 'لا توجد فواتير مسجلة حتى الآن.', statusChart: 'الفواتير حسب الحالة', amountChart: (currency: string) => `مبالغ الفواتير · ${currency}`, noChart: 'لا توجد سجلات فواتير لعرضها في الرسم.', statuses: { PAID: 'مدفوعة', PENDING: 'قيد السداد', REQUIRES_ACTION: 'تحتاج إجراء', FAILED: 'فشلت', REFUNDED: 'مستردة' } }

  const load = useCallback(async () => {
    setError('')
    try {
      const response = await apiClient.get<InvoiceResponse>('/payments/school-invoices', { params: { page: 1, limit: 5 } })
      setData(response.data)
    } catch {
      setData(null)
      setError(t.error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [t.error])
  useEffect(() => { void load() }, [load])

  const totals = (data?.summary || []).reduce<Record<string, { amount: number; count: number }>>((result, item) => {
    const bucket = result[item.currency] || (result[item.currency] = { amount: 0, count: 0 })
    bucket.amount += Number(item.amount)
    bucket.count += item.count
    return result
  }, {})
  const invoiceStatuses = ['PAID', 'PENDING', 'REQUIRES_ACTION', 'FAILED', 'REFUNDED'] as const
  const currencies = [...new Set((data?.summary || []).map((item) => item.currency))]
  const formatAmount = (currency: string, amount: number) => new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ar-SA', { style: 'currency', currency }).format(amount)

  return <main className="mx-auto max-w-7xl space-y-6 pb-12" dir={locale === 'en' ? 'ltr' : 'rtl'}>
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5"><div><p className="text-sm font-semibold text-emerald-700">Nexus EDU · {locale === 'en' ? 'Finance' : 'المالية'}</p><h1 className="mt-1 text-3xl font-black">{t.title}</h1><p className="mt-2 text-sm text-muted-foreground">{t.subtitle}</p></div><button type="button" onClick={() => { setRefreshing(true); void load() }} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />{t.refresh}</button></header>
    {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><CircleAlert className="h-4 w-4" />{error}</div>}
    {loading ? <p className="py-16 text-center text-sm text-muted-foreground">{t.loading}</p> : data && <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[
        { title: t.total, status: null, icon: FileText }, { title: t.paid, status: 'PAID', icon: Wallet }, { title: t.pending, status: 'PENDING', icon: ArrowUpRight },
      ].map(({ title, status, icon: Icon }) => <article key={title} className="rounded-xl border border-border bg-card p-5"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{title}</p><Icon className="h-5 w-5 text-primary" /></div>{Object.entries(totals).length ? <div className="mt-3 space-y-1">{Object.entries(totals).map(([currency, total]) => { const amount = status ? data.summary.filter((item) => item.currency === currency && item.status === status).reduce((sum, item) => sum + Number(item.amount), 0) : total.amount; const count = status ? data.summary.filter((item) => item.currency === currency && item.status === status).reduce((sum, item) => sum + item.count, 0) : total.count; return <p key={currency} className="text-xl font-bold">{formatAmount(currency, amount)} <span className="text-xs font-normal text-muted-foreground">· {count}</span></p> })}</div> : <p className="mt-3 text-2xl font-bold">0</p>}</article>)}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <DashboardDonutChart title={t.statusChart} emptyLabel={t.noChart} data={invoiceStatuses.map((status) => ({
          label: t.statuses[status], value: (data.summary || []).filter((item) => item.status === status).reduce((sum, item) => sum + item.count, 0),
          color: status === 'PAID' ? '#0f766e' : status === 'PENDING' ? '#d97706' : status === 'FAILED' ? '#dc2626' : status === 'REFUNDED' ? '#7c3aed' : '#2563eb',
        }))} />
        {currencies.length ? currencies.map((currency) => <DashboardBarChart key={currency} title={t.amountChart(currency)} emptyLabel={t.noChart} suffix={` ${currency}`} color="#0f766e" data={invoiceStatuses.map((status) => ({
          label: t.statuses[status], value: (data.summary || []).filter((item) => item.currency === currency && item.status === status).reduce((sum, item) => sum + Number(item.amount), 0),
        }))} />) : <DashboardBarChart title={t.amountChart('')} emptyLabel={t.noChart} data={[]} />}
      </section>
      <section className="overflow-hidden rounded-xl border border-border bg-card"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5"><h2 className="font-bold">{t.recent}</h2><Link href="/accountant/invoices" className="text-sm font-semibold text-primary hover:underline">{t.view}</Link></header>{data.invoices.length ? <div className="divide-y divide-border">{data.invoices.map((invoice) => <article key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-semibold">{invoice.student.name || invoice.student.email}</p><p className="mt-1 text-xs text-muted-foreground">{invoice.description || '—'} · {new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ar-SA', { dateStyle: 'medium' }).format(new Date(invoice.createdAt))}</p></div><p className="font-bold">{formatAmount(invoice.currency, Number(invoice.amount))}</p></article>)}</div> : <p className="p-8 text-center text-sm text-muted-foreground">{t.empty}</p>}</section>
      <Link href="/accountant/reports" className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-semibold hover:bg-muted"><Wallet className="h-4 w-4" />{t.reports}<ArrowUpRight className="h-4 w-4" /></Link>
    </>}
  </main>
}
