'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from '@/i18n/routing'
import { QuickGradeModal } from './QuickGradeModal'
import { ClipboardList, BookOpen, Clock, CheckCircle2, ChevronLeft, Users } from 'lucide-react'
import { useLocale } from 'next-intl'

export function GradingQueue({ queue, onRefresh }: { queue: any[]; onRefresh: () => void }) {
  const isEnglish = useLocale() === 'en'
  const [selected, setSelected] = useState<any>(null)
  return (
    <>
      <div className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] overflow-hidden shadow-sm flex flex-col">
        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 dark:border-white/5 bg-amber-50/50 dark:bg-amber-900/5">
          <h3 className="font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-amber-500" /> {isEnglish ? 'Pending grading' : 'مهام التصحيح المعلقة'}
            {queue.length > 0 && <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{queue.length}</span>}
          </h3>
          <Link href="/teacher/grading" className="text-xs text-teal-600 dark:text-teal-400 font-bold flex items-center gap-1 hover:gap-2 transition-all px-3 py-1.5 rounded-full hover:bg-teal-50 dark:hover:bg-teal-500/10">
            {isEnglish ? 'View all' : 'عرض الكل'} <ChevronLeft className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-white/5 flex-1 overflow-y-auto min-h-[300px]">
          {queue.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <div className="w-16 h-16 bg-teal-50 dark:bg-teal-500/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-teal-500" />
              </div>
              <p className="text-lg font-extrabold text-teal-700 dark:text-teal-400 mb-1">{isEnglish ? 'You are all caught up!' : 'أنجزت جميع المهام!'}</p>
              <p className="text-xs text-gray-500">{isEnglish ? 'No assignments are waiting to be graded.' : 'لا توجد واجبات بانتظار التصحيح.'}</p>
            </div>
          )}
          {queue.slice(0, 8).map((sub: any, i) => (
            <motion.div key={sub.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="flex items-center gap-4 px-7 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-white font-black text-lg flex-shrink-0 shadow-sm">
                {(sub.student?.name || sub.student?.email || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900 dark:text-white truncate group-hover:text-teal-600 transition-colors mb-0.5">
                  {sub.student?.name || sub.student?.email}
                </p>
                <p className="text-xs text-gray-500 font-medium flex items-center gap-1"><BookOpen className="w-3 h-3" /> {sub.assignment?.title}</p>
              </div>
              <div className="flex-shrink-0 flex flex-col items-end gap-2">
                <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(sub.submittedAt).toLocaleDateString(isEnglish ? 'en-US' : 'ar-SA')}</p>
                <button onClick={() => setSelected(sub)}
                  className="text-xs bg-teal-50 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 px-4 py-1.5 rounded-lg font-bold hover:bg-teal-600 hover:text-white transition-all shadow-sm">
                  {isEnglish ? 'Grade now' : 'صحح الآن'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <QuickGradeModal submission={selected} onClose={() => setSelected(null)}
            onGraded={() => { onRefresh(); setSelected(null) }} />
        )}
      </AnimatePresence>
    </>
  )
}
