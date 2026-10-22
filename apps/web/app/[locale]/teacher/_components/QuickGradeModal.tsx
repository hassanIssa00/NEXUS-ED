'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api/client'
import { X, Users, BookOpen, Award, Sparkles, Loader2 } from 'lucide-react'

export function QuickGradeModal({ submission, onClose, onGraded }: { submission: any; onClose: () => void; onGraded: () => void }) {
  const [score, setScore] = useState('')
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const maxScore = Number(submission.assignment?.maxScore ?? 100)
  const pct = score && maxScore > 0 ? Math.min((Number(score) / maxScore) * 100, 100) : 0
  const grade = pct >= 90 ? { label: 'ممتاز', color: '#10b981' } : pct >= 80 ? { label: 'جيد جداً', color: '#4A687C' } : pct >= 70 ? { label: 'جيد', color: '#f59e0b' } : { label: 'مقبول', color: '#ef4444' }

  const submit = async () => {
    const numericScore = Number(score)
    if (!score || !Number.isFinite(numericScore) || numericScore < 0 || numericScore > maxScore) {
      setErrorMessage(`أدخل درجة من 0 إلى ${maxScore}.`)
      return
    }
    setLoading(true)
    setErrorMessage('')
    try {
      await apiClient.patch(`/assignments/submissions/${submission.id}/grade`, { score: numericScore, feedback })
      onGraded(); onClose()
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'تعذر حفظ الدرجة. حاول مرة أخرى.')
    } finally { setLoading(false) }
  }

  const handleAiGrade = async () => {
    setAiLoading(true)
    setErrorMessage('')
    try {
      const res = await apiClient.post(`/ai/grade/${submission.id}`)
      if (res.data?.data) {
        setScore(String(res.data.data.score))
        setFeedback(res.data.data.feedback || '')
      } else setErrorMessage('لم يرجع التصحيح الآلي درجة قابلة للاستخدام.')
    } catch (err) {
      console.error('AI Grading failed', err)
      setErrorMessage('تعذر اقتراح درجة بالذكاء الاصطناعي. يمكنك إدخال الدرجة يدويًا.')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/10 rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-extrabold text-gray-900 dark:text-white text-lg flex items-center gap-2">
            <Award className="w-5 h-5 text-teal-500" /> تصحيح الواجب
          </h3>
          <div className="flex gap-2">
            <button onClick={handleAiGrade} disabled={aiLoading} className="flex items-center gap-1.5 bg-violet-100 hover:bg-violet-200 dark:bg-violet-500/20 dark:hover:bg-violet-500/30 text-violet-700 dark:text-violet-300 px-3 py-1.5 rounded-xl font-bold text-xs transition-colors">
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              تصحيح بـ AI
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-gray-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5 mb-6">
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">{submission.assignment?.title}</p>
          <p className="text-xs text-gray-500 flex items-center gap-2">
            <Users className="w-3 h-3" /> {submission.student?.name || submission.student?.email}
            <BookOpen className="w-3 h-3 mr-1" /> {new Date(submission.submittedAt).toLocaleDateString('ar-SA')}
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm font-bold text-gray-900 dark:text-white mb-2 block">الدرجة (من {maxScore})</label>
            <div className="relative">
              <input type="number" min={0} max={maxScore} step="any" value={score} onChange={e => { setScore(e.target.value); setErrorMessage('') }} placeholder={`مثال: ${maxScore}`}
                className="w-full border-2 border-gray-100 dark:border-white/10 rounded-xl px-4 py-3 bg-white dark:bg-[#12121a] text-gray-900 dark:text-white text-lg font-black outline-none focus:border-teal-500 transition-colors text-center pr-20" />
              {score && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: `${grade.color}15`, color: grade.color }}>
                  {grade.label}
                </div>
              )}
            </div>
            {score && (
              <div className="mt-2 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ backgroundColor: grade.color }}
                  animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-bold text-gray-900 dark:text-white mb-2 block">ملاحظات (اختياري)</label>
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={3} placeholder="اكتب ملاحظاتك وتعليقاتك للطالب..."
              className="w-full border-2 border-gray-100 dark:border-white/10 rounded-xl px-4 py-3 bg-white dark:bg-[#12121a] text-gray-900 dark:text-white text-sm font-medium outline-none resize-none focus:border-teal-500 transition-colors" />
          </div>
        </div>

        {errorMessage && <p role="alert" className="mb-4 text-sm font-medium text-red-600">{errorMessage}</p>}

        <div className="flex gap-3">
          <button onClick={submit} disabled={loading || !score}
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-3.5 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-teal-500/30 disabled:opacity-50">
            {loading ? 'جاري الحفظ...' : '✅ اعتماد الدرجة'}
          </button>
          <button onClick={onClose} className="px-6 py-3.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl font-bold text-sm text-gray-700 dark:text-gray-300 transition-colors">إلغاء</button>
        </div>
      </motion.div>
    </motion.div>
  )
}
