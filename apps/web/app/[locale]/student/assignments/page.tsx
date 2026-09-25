'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, CheckCircle2, Clock, Sparkles, X, Send, Award, FileText } from 'lucide-react'

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted'>('all')
  const [selectedHw, setSelectedHw] = useState<any | null>(null)
  const [hwAnswer, setHwAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [studentId, setStudentId] = useState('cls-std-2')
  const [studentName, setStudentName] = useState('أحمد فيصل الغامدي')

  const loadData = async () => {
    try {
      const { nexusBridge } = await import('@/lib/nexusDataBridge')
      let sId = 'cls-std-2'
      let sName = 'أحمد فيصل الغامدي'
      try {
        const stored = localStorage.getItem('nexus_user')
        if (stored) {
          const acc = JSON.parse(stored)
          if (acc.linkedStudentId) sId = acc.linkedStudentId
          if (acc.name) sName = acc.name
        }
      } catch {}

      setStudentId(sId)
      setStudentName(sName)

      const hw = nexusBridge.getHomework()
      const subs = nexusBridge.getHomeworkSubmissions()
      setAssignments(hw)
      setSubmissions(subs)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    window.addEventListener('nexus:data-changed', loadData)
    return () => window.removeEventListener('nexus:data-changed', loadData)
  }, [])

  const handleHwSubmit = async () => {
    if (!selectedHw || !hwAnswer.trim()) return
    setSubmitting(true)
    try {
      const { nexusBridge } = await import('@/lib/nexusDataBridge')
      nexusBridge.submitHomework({
        assignmentId: selectedHw.id,
        studentId,
        studentName,
        assignmentTitle: selectedHw.title,
        submissionText: hwAnswer,
      })
      setSelectedHw(null)
      setHwAnswer('')
      await loadData()
      window.dispatchEvent(new CustomEvent('nexus:data-changed'))
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredAssignments = assignments.filter(hw => {
    const isSubmitted = submissions.some(s => s.assignmentId === hw.id && s.studentId === studentId)
    if (filter === 'pending') return !isSubmitted
    if (filter === 'submitted') return isSubmitted
    return true
  })

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      {/* HERO */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 p-8 text-white shadow-2xl">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-3">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span className="text-xs font-bold text-amber-100">فصل د. إسماعيل عيسى</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">الواجبات المدرسية 📝</h1>
          <p className="text-amber-100 text-sm max-w-xl font-medium">
            استعرض واجباتك المقررة، أرسل إجاباتك إلكترونياً، وتابع تقييمات وملاحظات المعلم فورياً
          </p>
        </div>
      </motion.div>

      {/* FILTERS */}
      <div className="flex gap-2 bg-gray-100/80 dark:bg-white/5 p-1.5 rounded-2xl w-fit">
        {[
          { key: 'all', label: `جميع الواجبات (${assignments.length})` },
          { key: 'pending', label: `بانتظار التسليم (${assignments.filter(h => !submissions.some(s => s.assignmentId === h.id && s.studentId === studentId)).length})` },
          { key: 'submitted', label: `تم تسليمها (${assignments.filter(h => submissions.some(s => s.assignmentId === h.id && s.studentId === studentId)).length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setFilter(t.key as any)}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
              filter === t.key ? 'bg-white dark:bg-[#1e1e2d] text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ASSIGNMENTS LIST */}
      <div className="space-y-4">
        {filteredAssignments.length === 0 ? (
          <div className="bg-white/80 dark:bg-[#1e1e2d]/80 rounded-3xl p-16 text-center border border-gray-100 dark:border-white/5">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
            <h3 className="font-black text-lg text-gray-900 dark:text-white mb-1">لا توجد واجبات في هذا التصنيف</h3>
            <p className="text-sm text-gray-400">لقد أنجزت جميع واجباتك المطلوبة بنجاح!</p>
          </div>
        ) : (
          filteredAssignments.map((hw, i) => {
            const submission = submissions.find(s => s.assignmentId === hw.id && s.studentId === studentId)
            return (
              <motion.div key={hw.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                whileHover={{ y: -2 }}
                className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-2xl flex-shrink-0 text-amber-600">
                      📖
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-black text-gray-900 dark:text-white text-base">{hw.title}</h3>
                        <span className="px-2.5 py-0.5 rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400 text-xs font-bold">
                          {hw.subject}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 font-medium leading-relaxed max-w-xl">{hw.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 font-medium">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5" /> موعد التسليم: {hw.dueDate}
                        </span>
                        <span>•</span>
                        <span>معلم المادة: د. إسماعيل عيسى</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {submission ? (
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-xs font-black border border-emerald-200/50">
                          <CheckCircle2 className="w-4 h-4" /> مُسلَّم ومكتمل
                        </span>
                        {submission.grade && (
                          <p className="text-xs font-black text-emerald-600 mt-1">الدرجة: {submission.grade}/100 ⭐</p>
                        )}
                      </div>
                    ) : (
                      <button onClick={() => setSelectedHw(hw)}
                        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2">
                        <span>حل وتسليم الواجب ✏️</span>
                      </button>
                    )}
                  </div>
                </div>

                {submission && (submission.submissionText || submission.teacherComment) && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 grid md:grid-cols-2 gap-3 text-xs">
                    {submission.submissionText && (
                      <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-3">
                        <span className="font-bold text-gray-500 block mb-1">إجابتك المسلمة:</span>
                        <p className="text-gray-800 dark:text-gray-200">{submission.submissionText}</p>
                      </div>
                    )}
                    {submission.teacherComment && (
                      <div className="bg-emerald-50/50 dark:bg-emerald-500/5 rounded-2xl p-3 border border-emerald-100 dark:border-emerald-500/20">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-1">ملاحظة د. إسماعيل:</span>
                        <p className="text-emerald-800 dark:text-emerald-300 font-medium">💬 {submission.teacherComment}</p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )
          })
        )}
      </div>

      {/* SUBMISSION MODAL */}
      <AnimatePresence>
        {selectedHw && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelectedHw(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1e1e2d] w-full max-w-lg p-6 rounded-[2rem] shadow-2xl border border-gray-100 dark:border-white/10 space-y-4"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-4">
                <div>
                  <h3 className="font-black text-lg text-gray-900 dark:text-white">{selectedHw.title}</h3>
                  <p className="text-xs text-gray-500">{selectedHw.subject} • موعد التسليم: {selectedHw.dueDate}</p>
                </div>
                <button onClick={() => setSelectedHw(null)} className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-amber-50 dark:bg-amber-500/10 p-4 rounded-2xl border border-amber-200 dark:border-amber-500/20 text-xs">
                <span className="font-bold text-amber-800 dark:text-amber-300 block mb-1">تعليمات د. إسماعيل:</span>
                <p className="text-amber-700 dark:text-amber-200">{selectedHw.description}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-2">إجابة الطالب:</label>
                <textarea value={hwAnswer} onChange={e => setHwAnswer(e.target.value)} rows={4}
                  placeholder="اكتب إجابتك هنا بوضوح..."
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
              </div>

              <button onClick={handleHwSubmit} disabled={!hwAnswer.trim() || submitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {submitting ? 'جارٍ الإرسال والتسجيل...' : <><Send className="w-4 h-4" /> تأكيد تسليم الواجب للمعلم</>}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
