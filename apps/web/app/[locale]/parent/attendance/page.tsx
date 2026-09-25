'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, CheckCircle2, Clock, ShieldCheck, Sparkles, User, AlertCircle, XCircle } from 'lucide-react'

export default function ParentAttendancePage() {
  const [todayStatus, setTodayStatus] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { nexusBridge } = await import('@/lib/nexusDataBridge')
        const att = nexusBridge.getTodayAttendance()
        const myAtt = att.find(a => a.studentId === 'cls-std-2')
        setTodayStatus(myAtt || { overallStatus: 'present', date: new Date().toISOString() })

        const hist = []
        const today = new Date()
        for (let i = 0; i < 15; i++) {
          const d = new Date()
          d.setDate(today.getDate() - i)
          if (d.getDay() !== 5 && d.getDay() !== 6) {
            hist.push({
              date: d.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
              status: i === 7 ? 'late' : i === 12 ? 'absent' : 'present',
              checkIn: i === 7 ? '07:20 ص' : '06:48 ص',
              checkOut: '12:40 م',
              method: 'بصمة الوجه الذكية (Face ID)',
            })
          }
        }
        setHistory(hist)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      {/* HERO */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-600 via-teal-600 to-green-700 p-8 text-white shadow-2xl">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-3">
            <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
            <span className="text-xs font-bold text-emerald-100">فصل د. إسماعيل عيسى</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">سجل الحضور والانضباط 📅</h1>
          <p className="text-emerald-100 text-sm max-w-xl font-medium">
            متابعة دقيقة لحضور ابنك الطالب <span className="font-bold underline">أحمد فيصل الغامدي</span> بالبصمة الذكية في الفترات السبع
          </p>
        </div>
      </motion.div>

      {/* TODAY BANNER */}
      <div className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-emerald-100 dark:border-white/5 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-2xl text-emerald-600 flex-shrink-0">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-gray-900 dark:text-white text-base">حالة حضور اليوم</h3>
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-xs font-black">
                حاضر بالبصمة ✅
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">تم التحقق من الحضور عبر بوابة Face ID الذكية عند الساعة 06:48 ص</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="text-center px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-200/50">
            <p className="text-xl font-black text-emerald-600">97%</p>
            <p className="text-[10px] text-gray-500 font-bold">نسبة الحضور</p>
          </div>
          <div className="text-center px-4 py-2 bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-200/50">
            <p className="text-xl font-black text-blue-600">175</p>
            <p className="text-[10px] text-gray-500 font-bold">يوم حضور</p>
          </div>
          <div className="text-center px-4 py-2 bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-200/50">
            <p className="text-xl font-black text-amber-600">3</p>
            <p className="text-[10px] text-gray-500 font-bold">تأخير</p>
          </div>
        </div>
      </div>

      {/* RECENT DAYS TABLE */}
      <div className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-6 shadow-sm">
        <h3 className="font-black text-gray-900 dark:text-white text-base mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-500" />
          سجل الحصص والأيام السابقة
        </h3>

        <div className="space-y-3">
          {history.map((record, i) => (
            <div key={i} className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  record.status === 'present' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600' :
                  record.status === 'late' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600' :
                  'bg-rose-100 dark:bg-rose-500/10 text-rose-600'
                }`}>
                  {record.status === 'present' ? <CheckCircle2 className="w-5 h-5" /> : record.status === 'late' ? <Clock className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white">{record.date}</h4>
                  <p className="text-xs text-gray-400 mt-0.5">{record.method} • 7 حصص</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="text-gray-500">الدخول: <span className="font-mono text-gray-800 dark:text-gray-200">{record.checkIn}</span></span>
                <span className="text-gray-500">الانصراف: <span className="font-mono text-gray-800 dark:text-gray-200">{record.checkOut}</span></span>
                <span className={`px-3 py-1 rounded-xl font-black ${
                  record.status === 'present' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                  record.status === 'late' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
                  'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                }`}>
                  {record.status === 'present' ? 'حاضر' : record.status === 'late' ? 'متأخر' : 'غائب'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
