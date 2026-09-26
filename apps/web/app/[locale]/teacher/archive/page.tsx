'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Archive, Calendar, Users, Sparkles, CheckCircle2, XCircle, Clock } from 'lucide-react'
import type { DailyAttendanceRecord } from '@/lib/nexusDataBridge'

export default function TeacherArchivePage() {
  const [attendance, setAttendance] = useState<DailyAttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    const load = async () => {
      try {
        const { nexusBridge } = await import('@/lib/nexusDataBridge')
        setAttendance(nexusBridge.getTodayAttendance())
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
    window.addEventListener('nexus:data-changed', load as any)
    return () => window.removeEventListener('nexus:data-changed', load as any)
  }, [])

  const presentCount = attendance.filter(a => a.overallStatus === 'present').length
  const absentCount = attendance.filter(a => a.overallStatus === 'absent').length
  const lateCount = attendance.filter(a => a.overallStatus === 'late').length

  const STATUS_MAP: Record<string, { label: string; IconComp: any; color: string; bg: string }> = {
    present: { label: 'حاضر', IconComp: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    absent: { label: 'غائب', IconComp: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10' },
    late: { label: 'متأخر', IconComp: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  }

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1d4ed8] via-[#2563eb] to-[#3B82F6] p-8 text-white shadow-[0_20px_60px_rgba(59,130,246,0.3)]">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-blue-300/20 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-4">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
            <span className="text-xs font-bold text-blue-100">الأرشيف اليومي الشامل</span>
          </div>
          <h1 className="text-4xl font-black mb-2 tracking-tight">الأرشيف المدرسي اليومي 🗂️</h1>
          <p className="text-blue-100 text-sm font-medium">سجل يومي شامل للحضور والواجبات والاختبارات</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {[{ label: 'حاضر', value: presentCount, color: 'text-emerald-400' }, { label: 'غائب', value: absentCount, color: 'text-red-400' }, { label: 'متأخر', value: lateCount, color: 'text-amber-400' }].map((s, i) => (
              <div key={i} className="bg-white/10 border border-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl">
                <p className="text-[10px] text-blue-200 font-medium">{s.label}</p>
                <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-5 shadow-sm flex items-center gap-4">
        <Calendar className="w-5 h-5 text-blue-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-xs font-black text-gray-500 mb-1">تصفح أرشيف تاريخ محدد</p>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            className="text-sm font-bold text-gray-900 dark:text-white bg-transparent border-none focus:outline-none" />
        </div>
      </div>

      <div className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-white/5">
          <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            سجل حضور — {new Date(selectedDate).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
          </div>
        ) : attendance.length === 0 ? (
          <div className="text-center py-12 text-gray-500 font-bold">لا توجد سجلات حضور لهذا اليوم</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {attendance.map((rec, i) => {
              const st = STATUS_MAP[rec.overallStatus] || STATUS_MAP.late
              const IconComp = st.IconComp
              return (
                <motion.div key={rec.studentId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className="px-5 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center font-black text-blue-700 dark:text-blue-300">
                    {rec.studentName[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-gray-900 dark:text-white">{rec.studentName}</p>
                    <p className="text-xs text-gray-400">الصف الأول الابتدائي — فصل د. إسماعيل عيسى</p>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${st.bg}`}>
                    <IconComp className={`w-4 h-4 ${st.color}`} />
                    <span className={`text-xs font-black ${st.color}`}>{st.label}</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
