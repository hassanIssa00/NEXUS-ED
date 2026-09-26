'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, Sparkles, CheckCircle2, Star, BookOpen, UserCheck } from 'lucide-react'
import type { StudentWeeklyReport } from '@/lib/nexusDataBridge'

export default function TeacherReportsPage() {
  const [reports, setReports] = useState<StudentWeeklyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const loadReports = async () => {
    try {
      const { nexusBridge } = await import('@/lib/nexusDataBridge')
      setReports(nexusBridge.getWeeklyReports())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    loadReports()
    window.addEventListener('nexus:data-changed', loadReports)
    return () => window.removeEventListener('nexus:data-changed', loadReports)
  }, [])

  const handleGenerateAll = async () => {
    setGenerating(true)
    try {
      const { nexusBridge } = await import('@/lib/nexusDataBridge')
      const newReports = nexusBridge.generateAllWeeklyReports()
      setReports(newReports)
      setGenerated(true)
      setTimeout(() => setGenerated(false), 3000)
    } catch (e) { console.error(e) }
    finally { setGenerating(false) }
  }

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1d4ed8] via-[#2563eb] to-[#3B82F6] p-8 text-white shadow-[0_20px_60px_rgba(59,130,246,0.3)]">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-blue-300/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-4">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
              <span className="text-xs font-bold text-blue-100">التقارير الدورية</span>
            </div>
            <h1 className="text-4xl font-black mb-2 tracking-tight">التقارير الأسبوعية الشاملة 📋</h1>
            <p className="text-blue-100 text-sm font-medium">إصدار وإرسال التقارير الأكاديمية لجميع طلاب الفصل</p>
            <div className="mt-4">
              <div className="bg-white/10 border border-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl inline-block">
                <p className="text-[10px] text-blue-200">طلاب الفصل</p>
                <p className="text-lg font-black">{reports.length || 8}</p>
              </div>
            </div>
          </div>
          <button onClick={handleGenerateAll} disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-blue-700 hover:bg-blue-50 font-black text-sm shadow-lg disabled:opacity-50">
            {generating ? <div className="w-4 h-4 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" /> : generated ? <><CheckCircle2 className="w-4 h-4" />تم الإرسال!</> : <><Send className="w-4 h-4" />إرسال التقارير للجميع</>}
          </button>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="text-6xl">📋</div>
          <p className="text-gray-500 font-bold">لا توجد تقارير بعد</p>
          <button onClick={handleGenerateAll}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black">
            <Send className="w-4 h-4" />توليد التقارير الآن
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {reports.map((rep, i) => (
            <motion.div key={rep.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              whileHover={{ y: -2 }} onClick={() => setSelectedId(selectedId === rep.id ? null : rep.id)}
              className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-5 shadow-sm cursor-pointer">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center font-black text-blue-700 dark:text-blue-300 text-lg">
                  {rep.studentName[0]}
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-gray-900 dark:text-white">{rep.studentName}</h3>
                  <p className="text-xs text-gray-500">{rep.overallGrade}</p>
                </div>
                <p className="text-2xl font-black text-blue-600">{rep.behaviorScore}%</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'الحضور', value: rep.attendanceRate, c: 'text-emerald-500' },
                  { label: 'الواجبات', value: rep.homeworkRate, c: 'text-blue-500' },
                  { label: 'السلوك', value: rep.behaviorScore, c: 'text-amber-500' }
                ].map((m, mi) => (
                  <div key={mi} className="bg-gray-50 dark:bg-white/5 rounded-xl p-2.5 text-center">
                    <p className={`text-base font-black ${m.c}`}>{m.value}%</p>
                    <p className="text-[10px] text-gray-500 font-bold">{m.label}</p>
                  </div>
                ))}
              </div>
              {selectedId === rep.id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 space-y-3">
                  <div className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl p-4">
                    <p className="text-xs font-black text-gray-500 mb-1">ملاحظات المعلم:</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{rep.teacherNotes}</p>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl p-4">
                    <p className="text-xs font-black text-gray-500 mb-1">التوصية:</p>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">{rep.recommendation}</p>
                  </div>
                  <p className="text-xs text-gray-400 text-center">{rep.reportNumber}</p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
