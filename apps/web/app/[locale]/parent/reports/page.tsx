'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Calendar, Star, CheckCircle2, Award, BookOpen, UserCheck } from 'lucide-react'
import type { StudentWeeklyReport } from '@/lib/nexusDataBridge'

export default function ParentReportsPage() {
  const [report, setReport] = useState<StudentWeeklyReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { nexusBridge } = await import('@/lib/nexusDataBridge')
        let linkedStudentId = 'cls-std-2'
        try {
          const stored = localStorage.getItem('nexus_user')
          if (stored) {
            const acc = JSON.parse(stored)
            if (acc.linkedStudentId) linkedStudentId = acc.linkedStudentId
          }
        } catch {}
        const reports = nexusBridge.getWeeklyReports(linkedStudentId)
        if (reports.length > 0) setReport(reports[0])
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
    window.addEventListener('nexus:data-changed', load as any)
    return () => window.removeEventListener('nexus:data-changed', load as any)
  }, [])

  const metrics = report ? [
    { label: 'نسبة الحضور', value: report.attendanceRate, icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', bar: 'bg-emerald-500' },
    { label: 'إنجاز الواجبات', value: report.homeworkRate, icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', bar: 'bg-blue-500' },
    { label: 'التفاعل والسلوك', value: report.behaviorScore, icon: Star, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', bar: 'bg-amber-500' },
  ] : []

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#b45309] via-[#d97706] to-[#F59E0B] p-8 text-white shadow-[0_20px_60px_rgba(245,158,11,0.3)]">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-amber-300/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-4">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
              <span className="text-xs font-bold text-amber-100">التقرير الأكاديمي الشامل</span>
            </div>
            <h1 className="text-4xl font-black mb-2 tracking-tight">تقرير تقدم ابنك 📋</h1>
            <p className="text-amber-100 text-sm font-medium">متابعة دقيقة وشاملة لأداء وتقدم ابنك بفصل د. إسماعيل عيسى</p>
          </div>
          <button onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 border border-white/20 text-white font-bold text-sm transition-colors backdrop-blur-md disabled:opacity-50 flex-shrink-0">
            🖨️ طباعة التقرير
          </button>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
        </div>
      ) : !report ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-4xl">📋</div>
          <p className="text-gray-500 font-bold">لا يوجد تقرير منشور بعد</p>
          <p className="text-xs text-gray-400">سيظهر التقرير هنا فور إصداره من د. إسماعيل عيسى</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl shadow-sm p-7">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
              <div>
                <h2 className="font-black text-2xl text-gray-900 dark:text-white">{report.studentName}</h2>
                <p className="text-sm text-gray-500">الصف الأول الابتدائي — فصل د. إسماعيل عيسى</p>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(report.date).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Award className="w-10 h-10 text-white" />
                </div>
                <p className="text-xs font-black text-amber-600 mt-2">{report.overallGrade}</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {metrics.map((m, i) => (
                <div key={i} className={`${m.bg} rounded-2xl p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    <m.icon className={`w-5 h-5 ${m.color}`} />
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{m.label}</p>
                  </div>
                  <p className={`text-3xl font-black ${m.color}`}>{m.value}%</p>
                  <div className="mt-2 h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full ${m.bar} rounded-full`} style={{ width: `${m.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl shadow-sm p-7">
            <h3 className="font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />ملاحظات د. إسماعيل عيسى
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm bg-amber-50 dark:bg-amber-500/10 rounded-2xl p-4">
              &ldquo;{report.teacherNotes}&rdquo;
            </p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-500/30 rounded-3xl p-6">
            <h3 className="font-black text-emerald-800 dark:text-emerald-300 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />التوصية والتوجيه
            </h3>
            <p className="text-emerald-700 dark:text-emerald-300 text-sm leading-relaxed">{report.recommendation}</p>
          </div>

          <div className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-5 text-center">
            <p className="text-xs text-gray-500">رقم التقرير: <span className="font-bold text-gray-700 dark:text-gray-300">{report.reportNumber}</span></p>
            <p className="text-xs text-gray-400 mt-1">صادر من: {report.doctorName} — مدارس نكسس التعليمية</p>
          </div>
        </motion.div>
      )}
    </div>
  )
}
