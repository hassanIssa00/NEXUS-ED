'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { paymentApi, type Invoice } from '@/lib/api/payment'
import { AlertCircle, CreditCard, Download, Loader2, Receipt, RefreshCw, X } from 'lucide-react'

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_KEY ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY) : null

function formatMoney(value: number, currency: string, isEnglish: boolean) {
  try { return new Intl.NumberFormat(isEnglish ? 'en-US' : 'ar-SA', { style: 'currency', currency }).format(value) }
  catch { return `${value.toLocaleString(isEnglish ? 'en-US' : 'ar-SA')} ${currency}` }
}

function exportInvoices(invoices: Invoice[], isEnglish: boolean) {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`
  const content = '\uFEFF' + [
    isEnglish ? ['Student', 'Invoice number', 'Description', 'Amount', 'Currency', 'Status', 'Created at', 'Paid at'] : ['الطالب', 'رقم الفاتورة', 'الوصف', 'المبلغ', 'العملة', 'الحالة', 'تاريخ الإنشاء', 'تاريخ السداد'],
    ...invoices.map((invoice) => [invoice.student.name || invoice.student.email, invoice.id, invoice.description || '', String(invoice.amount), invoice.currency, invoice.status, invoice.createdAt, invoice.paidAt || '']),
  ].map((row) => row.map(quote).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'payment-invoices.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function InvoiceCheckoutForm({ invoice, onPaid }: { invoice: Invoice; onPaid: () => void }) {
  const isEnglish = useLocale() === 'en'
  const t = (ar: string, en: string) => isEnglish ? en : ar
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!stripe || !elements) return
    setProcessing(true)
    setError(null)
    const result = await stripe.confirmPayment({ elements, redirect: 'if_required' })
    if (result.error) {
      setError(isEnglish ? (result.error.message || 'Could not complete the payment.') : (result.error.message || 'تعذر إتمام عملية الدفع.'))
      setProcessing(false)
      return
    }
    if (result.paymentIntent?.status === 'succeeded') onPaid()
    else {
      setError(t('تم إرسال العملية، ولم يصل تأكيد السداد النهائي بعد.', 'Payment was submitted, but final confirmation has not arrived yet.'))
      setProcessing(false)
    }
  }

  return <form onSubmit={submit} className="space-y-4"><PaymentElement />{error && <p role="alert" className="text-sm text-rose-600">{error}</p>}<button disabled={!stripe || processing} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} {t('تأكيد دفع', 'Confirm payment')} {formatMoney(Number(invoice.amount), invoice.currency, isEnglish)}</button></form>
}

export default function ParentPaymentsPage() {
  const isEnglish = useLocale() === 'en'
  const t = (ar: string, en: string) => isEnglish ? en : ar
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const response = await paymentApi.getHistory()
      setInvoices(response.data)
    } catch {
      setError(t('تعذر تحميل الفواتير المرتبطة بحسابك.', 'Could not load invoices linked to your account.'))
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const totals = new Map<string, { paid: number; due: number }>()
  for (const invoice of invoices) {
    const item = totals.get(invoice.currency) || { paid: 0, due: 0 }
    if (invoice.status === 'PAID') item.paid += Number(invoice.amount)
    else if (['PENDING', 'REQUIRES_ACTION', 'FAILED'].includes(invoice.status)) item.due += Number(invoice.amount)
    totals.set(invoice.currency, item)
  }

  const startPayment = async (invoice: Invoice) => {
    setBusyId(invoice.id)
    setError(null)
    setNotice(null)
    try {
      const response = await paymentApi.createIntent(invoice.id)
      if (!response.data.clientSecret) throw new Error('Payment provider did not return a checkout session')
      setSelectedInvoice(invoice)
      setClientSecret(response.data.clientSecret)
    } catch {
      setError(t('تعذر بدء الدفع. تأكد من إعداد مزود الدفع ومن صلاحية الفاتورة.', 'Could not start payment. Check the payment provider setup and invoice status.'))
    } finally {
      setBusyId(null)
    }
  }

  const closeCheckout = () => { setSelectedInvoice(null); setClientSecret(null) }
  const paid = () => {
    closeCheckout()
    setNotice(t('تم تأكيد عملية الدفع. سيتم تحديث حالة الفاتورة من سجل مزود الدفع.', 'Payment is confirmed. The invoice status will update from the payment provider record.'))
    void load()
  }

  return (
    <div className="space-y-6 pb-12" dir={isEnglish ? 'ltr' : 'rtl'}>
      {selectedInvoice && clientSecret && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#1e1e2d]"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-black text-gray-900 dark:text-white">{t('سداد فاتورة', 'Pay invoice')}</h2><p className="mt-1 text-sm text-gray-500">{selectedInvoice.description || selectedInvoice.id}</p></div><button onClick={closeCheckout} title={t('إغلاق', 'Close')} className="rounded-lg border border-gray-200 p-2 dark:border-white/10"><X className="h-4 w-4" /></button></div>{stripePromise ? <Elements stripe={stripePromise} options={{ clientSecret, locale: isEnglish ? 'en' : 'ar' }}><InvoiceCheckoutForm invoice={selectedInvoice} onPaid={paid} /></Elements> : <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{t('مفتاح Stripe العام غير مضبوط للواجهة.', 'The Stripe publishable key is not configured for the web app.')}</p>}</div></div>}

      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-200 pb-5 dark:border-white/10"><div><p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{t('حساب ولي الأمر', 'Parent account')}</p><h1 className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{t('الفواتير والمدفوعات', 'Invoices and payments')}</h1><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('الفواتير الفعلية المرتبطة بأبنائك المسجلين.', 'Invoices linked to your registered children.')}</p></div><div className="flex gap-2"><button onClick={() => void load()} disabled={loading} title={t('تحديث الفواتير', 'Refresh invoices')} className="rounded-lg border border-gray-200 p-2.5 dark:border-white/10"><RefreshCw className="h-4 w-4" /></button><button onClick={() => exportInvoices(invoices, isEnglish)} disabled={!invoices.length} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-bold text-white disabled:opacity-40 dark:bg-white dark:text-gray-900"><Download className="h-4 w-4" /> {t('تصدير السجل', 'Export history')}</button></div></header>

      {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p>}

      {totals.size > 0 && <section className="grid gap-3 sm:grid-cols-2">{Array.from(totals).map(([currency, amounts]) => <div key={currency} className="grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#1e1e2d]"><div><p className="text-xs text-gray-500">{t('المدفوع', 'Paid')} · {currency}</p><p className="mt-1 font-black text-emerald-700 dark:text-emerald-300">{formatMoney(amounts.paid, currency, isEnglish)}</p></div><div><p className="text-xs text-gray-500">{t('المستحق', 'Due')} · {currency}</p><p className="mt-1 font-black text-amber-700 dark:text-amber-300">{formatMoney(amounts.due, currency, isEnglish)}</p></div></div>)}</section>}

      <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-black text-gray-900 dark:text-white"><Receipt className="h-5 w-5 text-violet-700" />{t('سجل الفواتير', 'Invoice history')}</h2><span className="text-xs text-gray-500">{invoices.length} {t('فاتورة', 'invoices')}</span></div>
        {loading ? <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-white/10 dark:bg-[#1e1e2d]">{t('جار تحميل السجل...', 'Loading invoice history...')}</div> : invoices.length ? invoices.map((invoice) => {
          const paidInvoice = invoice.status === 'PAID'
          const payable = ['PENDING', 'REQUIRES_ACTION', 'FAILED'].includes(invoice.status)
          return <article key={invoice.id} className="flex flex-col justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 sm:flex-row sm:items-center dark:border-white/10 dark:bg-[#1e1e2d]"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-gray-900 dark:text-white">{invoice.description || t('فاتورة مدرسية', 'School invoice')}</h3><span className={`rounded-md px-2 py-1 text-xs font-semibold ${paidInvoice ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200'}`}>{paidInvoice ? t('مدفوعة', 'Paid') : invoice.status === 'FAILED' ? t('تعذر الدفع', 'Payment failed') : t('مستحقة', 'Due')}</span></div><p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{invoice.student.name || invoice.student.email} · {t('فاتورة', 'Invoice')} {invoice.id.slice(0, 8)} · {new Intl.DateTimeFormat(isEnglish ? 'en-US' : 'ar-SA', { dateStyle: 'medium' }).format(new Date(invoice.createdAt))}</p>{invoice.paidAt && <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">{t('تاريخ السداد:', 'Paid on:')} {new Intl.DateTimeFormat(isEnglish ? 'en-US' : 'ar-SA', { dateStyle: 'medium' }).format(new Date(invoice.paidAt))}</p>}</div><div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-3 sm:border-0 sm:pt-0 dark:border-white/10"><p className="text-lg font-black text-gray-900 dark:text-white">{formatMoney(Number(invoice.amount), invoice.currency, isEnglish)}</p>{payable && <button onClick={() => void startPayment(invoice)} disabled={busyId === invoice.id} className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-violet-800 disabled:opacity-50">{busyId === invoice.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} {t('سداد', 'Pay')}</button>}</div></article>
        }) : !error && <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-white/15">{t('لا توجد فواتير مرتبطة بأبنائك حتى الآن.', 'No invoices are linked to your children yet.')}</div>}
      </section>
    </div>
  )
}
