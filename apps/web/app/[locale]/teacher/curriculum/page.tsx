'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import type { CurriculumSubject } from '@/lib/nexusDataBridge'

export default function TeacherCurriculumPage() {
  const [curricula, setCurricula] = useState<CurriculumSubject[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSlug, setExpandedSlug] = useState<string | null>('lughati')

  useEffect(() => {
    const load = async () => {
      try {
        const { nexusBridge } = await import('@/lib/nexusDataBridge')
        setCurricula(nexusBridge.getCurricula())
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1d4ed8] via-[#2563eb] to-[#3B82F6] p-8 text-white shadow-[0_20px_60px_rgba(59,130,246,0.3)]">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-blue-300/20 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-4">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
            <span className="text-xs font-bold text-blue-100">المنهج الدراسي المعتمد</span>
          </div>
          <h1 className="text-4xl font-black mb-2 tracking-tight">المناهج والخطط الدراسية 📚</h1>
          <p className="text-blue-100 text-sm font-medium">جميع مواد الصف الأول الابتدائي — الفصل الدراسي الأول 1448هـ</p>
          <div className="mt-5">
            <div className="bg-white/10 border border-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl inline-block">
              <p className="text-[10px] text-blue-200">عدد المواد</p>
              <p className="text-lg font-black">{curricula.length} مادة</p>
            </div>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {curricula.map((c, i) => (
            <motion.div key={c.slug} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl shadow-sm overflow-hidden">
              <button onClick={() => setExpandedSlug(expandedSlug === c.slug ? null : c.slug)}
                className="w-full flex items-center gap-4 p-5 text-right hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${c.color}, ${c.accent})` }}>
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 text-right">
                  <h3 className="font-black text-gray-900 dark:text-white">{c.title}</h3>
                  <p className="text-xs text-gray-500">{c.subtitle}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold" style={{ color: c.accent }}>{c.badge}</span>
                    <span className="text-xs text-gray-400">• {c.pageCount} صفحة • {c.term}</span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {expandedSlug === c.slug ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
              </button>
              <AnimatePresence>
                {expandedSlug === c.slug && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-100 dark:border-white/5 px-5 pb-5 overflow-hidden">
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mt-4 mb-4">{c.promise}</p>
                    <div className="space-y-2">
                      <p className="text-xs font-black text-gray-500 mb-2">الوحدات الدراسية:</p>
                      {c.units.map((unit, ui) => (
                        <div key={ui} className="flex items-center gap-3 bg-gray-50 dark:bg-white/5 rounded-2xl p-3">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                            style={{ backgroundColor: c.accent }}>
                            {ui + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{unit.title}</p>
                            <p className="text-[11px] text-gray-400">ص {unit.fromPage} — {unit.toPage}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
