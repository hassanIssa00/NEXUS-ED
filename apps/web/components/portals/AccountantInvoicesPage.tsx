'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { CircleAlert, Download, Plus, RefreshCw, Wallet, X } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

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
type InvoiceResponse = { invoices: InvoiceRow[]; meta: { total: number; page: number; limit: number; totalPages: number }; summary: InvoiceSummary[] }
type StudentOption = { id: string; name: string | null; firstName: string | null; lastName: string | null; email: string }
type StudentResponse = { data: StudentOption[]; meta: { total: number; page: number; limit: number; totalPages: number } }

const labels = {
  ar: {
    eyebrow: 'الحسابات المدرسية', title: 'الحسابات والفواتير', subtitle: 'إنشاء فواتير الرسوم ومتابعة حالتها والمبالغ المسجلة في المدرسة.', refresh: 'تحديث', export: 'تصدير الصفحة', create: 'إنشاء فاتورة',
    total: 'إجمالي المبالغ', paid: 'المحصل', pending: 'قيد السداد', other: 'حالات أخرى', invoices: 'فاتورة', empty: 'لا توجد فواتير مسجلة للمدرسة.', noRows: 'لا توجد نتائج في هذه الصفحة.', loading: 'جار تحميل الفواتير...', error: 'تعذر تحميل فواتير المدرسة.',
    student: 'الطالب', description: 'وصف الرسوم', amount: 'المبلغ', currency: 'العملة', status: 'الحالة', created: 'تاريخ الإنشاء', searchStudent: 'ابحث عن الطالب بالاسم أو البريد', selectStudent: 'اختر الطالب', chooseStudent: 'اختر طالبًا', saveInvoice: 'حفظ الفاتورة', saving: 'جار الحفظ...', cancel: 'إلغاء', invoiceCreated: 'تم إنشاء الفاتورة.', invoiceFailed: 'تعذر إنشاء الفاتورة. تحقق من البيانات وحاول مرة أخرى.', studentLoadFailed: 'تعذر تحميل قائمة الطلاب.', required: 'أكمل بيانات الفاتورة.',
    statuses: { PAID: 'مدفوعة', PENDING: 'معلقة', REQUIRES_ACTION: 'بانتظار إجراء', FAILED: 'فشلت', REFUNDED: 'مستردة' },
    table: ['الطالب', 'الوصف', 'المبلغ', 'الحالة', 'تاريخ الإنشاء'], page: (current: number, total: number, count: number) => `صفحة ${current} من ${total} · ${count} فاتورة`, previous: 'السابق', next: 'التالي',
  },
  en: {
    eyebrow: 'School finance', title: 'Accounts and invoices', subtitle: 'Create fee invoices and track their recorded status and amounts.', refresh: 'Refresh', export: 'Export page', create: 'Create invoice',
    total: 'Total invoiced', paid: 'Collected', pending: 'Awaiting payment', other: 'Other statuses', invoices: 'invoices', empty: 'No invoices are recorded for this school.', noRows: 'There are no results on this page.', loading: 'Loading invoices...', error: 'Could not load school invoices.',
    student: 'Student', description: 'Fee description', amount: 'Amount', currency: 'Currency', status: 'Status', created: 'Created on', searchStudent: 'Search student by name or email', selectStudent: 'Choose student', chooseStudent: 'Choose a student', saveInvoice: 'Save invoice', saving: 'Saving...', cancel: 'Cancel', invoiceCreated: 'Invoice created.', invoiceFailed: 'Could not create the invoice. Check the information and try again.', studentLoadFailed: 'Could not load the student list.', required: 'Complete the invoice details.',
    statuses: { PAID: 'Paid', PENDING: 'Pending', REQUIRES_ACTION: 'Action required', FAILED: 'Failed', REFUNDED: 'Refunded' },
    table: ['Student', 'Description', 'Amount', 'Status', 'Created on'], page: (current: number, total: number, count: number) => `Page ${current} of ${total} · ${count} invoices`, previous: 'Previous', next: 'Next',
  },
} as const

function staffName(person: StudentOption) {
  return person.name || [person.firstName, person.lastName].filter(Boolean).join(' ') || person.email
}

export default function AccountantInvoicesPage() {
  const locale = useLocale()
  const language = locale === 'en' ? 'en-US' : 'ar-SA'
  const t = labels[locale === 'en' ? 'en' : 'ar']
  const [result, setResult] = useState<InvoiceResponse | null>(null)
  const [students, setStudents] = useState<StudentOption[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<'SAR' | 'USD'>('SAR')
  const [description, setDescription] = useState('')

  const load = useCallback(async (refresh = false) => {
    setLoading(!refresh)
    setError(null)
    try {
      const response = await apiClient.get<InvoiceResponse>('/payments/school-invoices', { params: { page, limit: 25 } })
      setResult(response.data)
    } catch {
      setResult(null)
      setError(t.error)
    } finally {
      setLoading(false)
    }
  }, [page, t.error])

  const loadStudents = useCallback(async (search = '') => {
    try {
      const response = await apiClient.get<StudentResponse>('/payments/school-students', { params: { page: 1, limit: 100, search: search || undefined } })
      setStudents(response.data.data)
      setStudentId((current) => current && response.data.data.some((student) => student.id === current) ? current : '')
      setFormError('')
    } catch {
      setFormError(t.studentLoadFailed)
    }
  }, [t.studentLoadFailed])

  useEffect(() => { void load() }, [load])
  useEffect(() => { void loadStudents() }, [loadStudents])

  const createInvoice = async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    setNotice('')
    const numericAmount = Number(amount)
    if (!studentId || !description.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFormError(t.required)
      return
    }
    setSaving(true)
    try {
      await apiClient.post('/payments/invoices', { studentId, description: description.trim(), amount: numericAmount, currency })
      setModalOpen(false)
      setAmount('')
      setDescription('')
      setStudentId('')
      setNotice(t.invoiceCreated)
      if (page !== 1) setPage(1)
      else await load(true)
    } catch {
      setFormError(t.invoiceFailed)
    } finally {
      setSaving(false)
    }
  }

  const exportCsv = () => {
    if (!result) return
    const quote = (value: string) => `"${value.replaceAll('"', '""')}"`
    const headers = [...t.table]
    const rows = result.invoices.map((invoice) => [invoice.student.name || invoice.student.email, invoice.description || '', `${invoice.amount} ${invoice.currency}`, t.statuses[invoice.status as keyof typeof t.statuses] || invoice.status, invoice.createdAt])
    const content = '\uFEFF' + [headers, ...rows].map((row) => row.map(quote).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'school-invoices.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const currencies = Array.from(new Set((result?.summary || []).map((item) => item.currency)))
  const currencyName: Record<string, string> = { SAR: locale === 'en' ? 'Saudi riyal' : 'ريال سعودي', USD: locale === 'en' ? 'US dollar' : 'دولار أمريكي' }

  return <main className="space-y-6 pb-12" dir={locale === 'en' ? 'ltr' : 'rtl'}>
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5"><div><p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{t.eyebrow}</p><h1 className="mt-1 text-2xl font-black">{t.title}</h1><p className="mt-2 text-sm text-muted-foreground">{t.subtitle}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => void load(true)} disabled={loading} title={t.refresh} className="rounded-lg border border-border p-2.5 hover:bg-muted disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button><button onClick={() => { setModalOpen(true); setFormError(''); void loadStudents() }} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted"><Plus className="h-4 w-4" />{t.create}</button><button onClick={exportCsv} disabled={!result?.invoices.length} className="inline-flex items-center gap-2 rounded-lg bg-foreground px-3.5 py-2.5 text-sm font-bold text-background disabled:opacity-50"><Download className="h-4 w-4" />{t.export}</button></div></header>
    {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
    {notice && <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-100">{notice}</p>}
    <section className="space-y-4">{currencies.map((code) => {
      const rows = result!.summary.filter((entry) => entry.currency === code)
      const byStatus = (status: string) => rows.find((entry) => entry.status === status)
      const cards = [
        { label: t.total, amount: rows.reduce((sum, entry) => sum + Number(entry.amount), 0), count: rows.reduce((sum, entry) => sum + entry.count, 0) },
        { label: t.paid, amount: byStatus('PAID')?.amount ?? 0, count: byStatus('PAID')?.count ?? 0 },
        { label: t.pending, amount: (byStatus('PENDING')?.amount ?? 0) + (byStatus('REQUIRES_ACTION')?.amount ?? 0), count: (byStatus('PENDING')?.count ?? 0) + (byStatus('REQUIRES_ACTION')?.count ?? 0) },
        { label: t.other, amount: (byStatus('FAILED')?.amount ?? 0) + (byStatus('REFUNDED')?.amount ?? 0), count: (byStatus('FAILED')?.count ?? 0) + (byStatus('REFUNDED')?.count ?? 0) },
      ]
      return <div key={code}><h2 className="mb-2 text-xs font-bold text-muted-foreground">{currencyName[code] || code}</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <article key={card.label} className="rounded-xl border border-border bg-card p-5"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-muted-foreground">{card.label}</p><Wallet className="h-4 w-4 text-emerald-600" /></div><p className="mt-3 text-xl font-black">{new Intl.NumberFormat(language, { style: 'currency', currency: code }).format(card.amount)}</p><p className="mt-1 text-xs text-muted-foreground">{card.count} {t.invoices}</p></article>)}</div></div>
    })}{!currencies.length && !loading && !error && <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{t.empty}</div>}</section>
    <section className="overflow-x-auto rounded-xl border border-border bg-card"><table className="w-full min-w-[780px] text-start text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr>{t.table.map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead><tbody className="divide-y divide-border">{result?.invoices.map((invoice) => <tr key={invoice.id}><td className="px-4 py-3"><p className="font-bold">{invoice.student.name || invoice.student.email}</p><p className="text-xs text-muted-foreground">{invoice.student.email}</p></td><td className="px-4 py-3">{invoice.description || '—'}</td><td className="px-4 py-3 font-semibold">{new Intl.NumberFormat(language, { style: 'currency', currency: invoice.currency }).format(Number(invoice.amount))}</td><td className="px-4 py-3">{t.statuses[invoice.status as keyof typeof t.statuses] || invoice.status}</td><td className="px-4 py-3">{new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(invoice.createdAt))}</td></tr>)}</tbody></table>{loading && <p className="p-8 text-center text-sm text-muted-foreground">{t.loading}</p>}{!loading && !error && result?.invoices.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">{t.noRows}</p>}</section>
    {result && result.meta.totalPages > 1 && <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground"><span>{t.page(result.meta.page, result.meta.totalPages, result.meta.total)}</span><div className="flex gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-border px-3 py-2 disabled:opacity-40">{t.previous}</button><button disabled={page >= result.meta.totalPages || loading} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-border px-3 py-2 disabled:opacity-40">{t.next}</button></div></div>}

    {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !saving && setModalOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="new-invoice-title" className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><header className="mb-5 flex items-center justify-between gap-3"><h2 id="new-invoice-title" className="text-xl font-bold">{t.create}</h2><button type="button" onClick={() => setModalOpen(false)} disabled={saving} aria-label={t.cancel} className="rounded-md p-2 hover:bg-muted"><X className="h-4 w-4" /></button></header><form onSubmit={createInvoice} className="space-y-4">
      <label className="block space-y-1.5 text-sm font-semibold"><span>{t.student}</span><input value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} onBlur={() => { if (studentSearch.trim()) void loadStudents(studentSearch.trim()) }} placeholder={t.searchStudent} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-normal" /><select required value={studentId} onChange={(event) => setStudentId(event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5"><option value="">{t.selectStudent}</option>{students.map((student) => <option key={student.id} value={student.id}>{staffName(student)} · {student.email}</option>)}</select></label>
      <label className="block space-y-1.5 text-sm font-semibold"><span>{t.description}</span><input required maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-normal" /></label>
      <div className="grid gap-3 sm:grid-cols-[1fr_150px]"><label className="block space-y-1.5 text-sm font-semibold"><span>{t.amount}</span><input required type="number" min="0.01" max="1000000" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-normal" /></label><label className="block space-y-1.5 text-sm font-semibold"><span>{t.currency}</span><select value={currency} onChange={(event) => setCurrency(event.target.value as 'SAR' | 'USD')} className="w-full rounded-lg border border-border bg-background px-3 py-2.5"><option value="SAR">SAR</option><option value="USD">USD</option></select></label></div>
      {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}<footer className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setModalOpen(false)} disabled={saving} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold">{t.cancel}</button><button type="submit" disabled={saving || !students.length} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">{saving ? t.saving : t.saveInvoice}</button></footer>
    </form></section></div>}
  </main>
}
