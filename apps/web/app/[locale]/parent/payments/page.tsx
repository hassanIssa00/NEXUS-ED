'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  CreditCard, CheckCircle2, Clock, AlertTriangle,
  Receipt, Download, Sparkles, ShieldCheck
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Invoice {
  id: string
  title: string
  amount: number
  dueDate: string
  paidDate?: string
  status: 'paid' | 'pending' | 'upcoming'
  category: string
  receiptNumber: string
}

const DEFAULT_INVOICES: Invoice[] = [
  {
    id: 'inv-01',
    title: 'رسوم الفصل الدراسي الأول 2025/2026',
    amount: 2500,
    dueDate: '2025-09-01',
    paidDate: '2025-08-28',
    status: 'paid',
    category: 'رسوم دراسية',
    receiptNumber: 'REC-2025-9841',
  },
  {
    id: 'inv-02',
    title: 'حقيبة الكتب المدرسية والوسائل التعليمية',
    amount: 450,
    dueDate: '2025-09-10',
    paidDate: '2025-09-05',
    status: 'paid',
    category: 'كتب ومقررات',
    receiptNumber: 'REC-2025-9920',
  },
  {
    id: 'inv-03',
    title: 'رسوم الأنشطة الصفية واللاصفية والرحلات العلمية',
    amount: 350,
    dueDate: '2025-10-15',
    status: 'pending',
    category: 'أنشطة مدرسية',
    receiptNumber: 'INV-2025-1044',
  },
  {
    id: 'inv-04',
    title: 'رسوم الفصل الدراسي الثاني (مقدم)',
    amount: 2500,
    dueDate: '2026-01-15',
    status: 'upcoming',
    category: 'رسوم دراسية',
    receiptNumber: 'INV-2026-0012',
  },
]

export default function ParentPaymentsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>(DEFAULT_INVOICES)

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((a, b) => a + b.amount, 0)
  const totalPending = invoices.filter(i => i.status === 'pending').reduce((a, b) => a + b.amount, 0)

  const handlePay = (id: string) => {
    alert('جاري الانتقال إلى بوابة الدفع الإلكتروني الآمنة (مدى / فيزا / أبل باي)...')
    setInvoices(prev =>
      prev.map(inv =>
        inv.id === id
          ? { ...inv, status: 'paid', paidDate: new Date().toISOString().split('T')[0] }
          : inv
      )
    )
  }

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      {/* ── HERO BANNER ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#b45309] via-[#d97706] to-[#F59E0B] p-8 md:p-10 text-white shadow-[0_24px_70px_rgba(245,158,11,0.32)]"
      >
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/10 blur-3xl"
          />
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md mb-4 shadow-sm border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-yellow-200 animate-pulse" />
            <span className="text-xs font-bold text-amber-100">بوابة الإدارة المالية وولي الأمر</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black mb-3 tracking-tight">المدفوعات والرسوم الدراسية 💳</h1>
          <p className="text-amber-100 text-sm md:text-base max-w-2xl font-medium leading-relaxed">
            سجل العمليات المالية، الفواتير، الرسوم المقررة وإيصالات السداد المعتمدة للطالب أحمد فيصل.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="bg-white/10 border border-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-sm">
              <p className="text-[10px] text-amber-200 font-bold uppercase">إجمالي المدفوع</p>
              <p className="text-xl font-black">{totalPaid.toLocaleString('ar-SA')} ريال</p>
            </div>
            <div className="bg-white/10 border border-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-sm">
              <p className="text-[10px] text-amber-200 font-bold uppercase">مستحقات حالية</p>
              <p className="text-xl font-black text-yellow-200">{totalPending.toLocaleString('ar-SA')} ريال</p>
            </div>
            <div className="bg-white/10 border border-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-sm">
              <p className="text-[10px] text-amber-200 font-bold uppercase">حالة الحساب</p>
              <p className="text-base font-black text-emerald-300">سليم ومنتظم ✓</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── INVOICES LIST ── */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
          <Receipt className="w-5 h-5 text-amber-600" />
          قائمة الفواتير والإيصالات
        </h2>

        {invoices.map((inv, i) => {
          const isPaid = inv.status === 'paid'
          const isPending = inv.status === 'pending'

          return (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${
                    isPaid
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600'
                      : isPending
                      ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600'
                      : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600'
                  }`}
                >
                  <Receipt className="w-7 h-7" />
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-black text-gray-900 dark:text-white text-base">{inv.title}</h3>
                    <Badge className="bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 border-0 text-[10px]">
                      {inv.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="font-mono text-[11px]">رقم السند: {inv.receiptNumber}</span>
                    <span>•</span>
                    {isPaid ? (
                      <span className="text-emerald-600 font-bold">تم السداد في: {inv.paidDate}</span>
                    ) : (
                      <span>تاريخ الاستحقاق: {inv.dueDate}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-5 border-t md:border-t-0 pt-4 md:pt-0 border-gray-100 dark:border-white/5">
                <div className="text-right md:text-left">
                  <div className="text-2xl font-black text-gray-900 dark:text-white">
                    {inv.amount.toLocaleString('ar-SA')} <span className="text-xs font-bold text-gray-400">ريال</span>
                  </div>
                  {isPaid ? (
                    <Badge className="bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-0 text-xs font-black">
                      مدفوع بالكامل ✓
                    </Badge>
                  ) : isPending ? (
                    <Badge className="bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-0 text-xs font-black">
                      مستحق السداد ⏳
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-gray-400 border-gray-200 dark:border-white/10 font-bold">
                      قادم
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isPaid ? (
                    <button
                      onClick={() => alert(`جاري تحميل إيصال السداد ${inv.receiptNumber} بصيغة PDF...`)}
                      className="px-4 py-2.5 rounded-2xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      إيصال PDF
                    </button>
                  ) : isPending ? (
                    <button
                      onClick={() => handlePay(inv.id)}
                      className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      سداد إلكتروني
                    </button>
                  ) : null}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
