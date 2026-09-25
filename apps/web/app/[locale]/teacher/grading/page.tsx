'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api/client'
import { aiApi } from '@/lib/api/ai'
import {
  Check, X, Eye, Download, Sparkles, Loader2, Wand2, RefreshCw,
  ClipboardList, AlertCircle, CheckCircle2, Clock, BrainCircuit,
  Zap, ChevronDown, FileText, Award
} from 'lucide-react'

// ── AI Grading suggestion chip ─────────────────────────────
function AiSuggestionBubble({ suggestion, onAccept }: {
  suggestion: { score: number; feedback: string; confidence: number };
  onAccept: (score: number, feedback: string) => void;
}) {
  const conf = suggestion.confidence ?? 0
  const confColor = conf >= 0.85 ? '#22c55e' : conf >= 0.65 ? '#f59e0b' : '#ef4444'
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 border border-violet-200 dark:border-violet-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-violet-700 dark:text-violet-300 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> اقتراح AI
        </span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: confColor, backgroundColor: `${confColor}15` }}>
          ثقة: {Math.round(conf * 100)}%
        </span>
      </div>
      <p className="text-2xl font-extrabold text-violet-700 dark:text-violet-300 mb-1">{suggestion.score} / 100</p>
      {suggestion.feedback && (
        <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{suggestion.feedback}</p>
      )}
      <button onClick={() => onAccept(suggestion.score, suggestion.feedback)}
        className="w-full bg-violet-600 hover:bg-violet-700 text-white py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1">
        <Check className="w-3 h-3" /> قبول الاقتراح
      </button>
    </motion.div>
  )
}

// ── Grade Modal ────────────────────────────────────────────
function GradeModal({ sub, onClose, onSaved }: { sub: any; onClose: () => void; onSaved: (id: string) => void }) {
  const [score, setScore] = useState(sub.aiSuggestion?.score?.toString() ?? '')
  const [feedback, setFeedback] = useState(sub.aiSuggestion?.feedback ?? '')
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<any>(sub.aiSuggestion ?? null)

  const runAi = async () => {
    setAiLoading(true)
    try {
      const res = await aiApi.autoGrade(sub.id)
      if (res.data?.success || res.data?.data) {
        const s = res.data.data ?? res.data
        setAiSuggestion({ score: s.score, feedback: s.feedback, confidence: s.confidence ?? 0.8 })
      }
    } catch { /* ignore */ }
    finally { setAiLoading(false) }
  }

  const save = async () => {
    if (!score) return
    setLoading(true)
    try {
      const { nexusBridge } = await import('@/lib/nexusDataBridge')
      nexusBridge.gradeHomework(sub.id, Number(score), feedback)
      onSaved(sub.id)
      onClose()
    } catch (e: any) {
      alert('تعذر حفظ الدرجة')
    } finally { setLoading(false) }
  }

  const pct = score ? Math.round((Number(score) / 100) * 100) : 0
  const gradeColor = pct >= 85 ? '#22c55e' : pct >= 70 ? '#f59e0b' : '#ef4444'
  const gradeLetter = pct >= 95 ? 'A+' : pct >= 90 ? 'A' : pct >= 85 ? 'A-' : pct >= 80 ? 'B+' : pct >= 75 ? 'B' : pct >= 70 ? 'B-' : pct >= 60 ? 'C' : 'D'

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <Wand2 className="w-5 h-5" /> تصحيح الواجب
              </h3>
              <p className="text-teal-100 text-sm mt-0.5">{sub.student?.name || sub.student?.email}</p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          <p className="text-teal-200 text-xs mt-2 font-bold">{sub.assignment?.title}</p>
        </div>

        <div className="p-5 space-y-4">
          {/* AI grading button */}
          {!aiSuggestion && (
            <button onClick={runAi} disabled={aiLoading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-2xl font-bold text-sm transition-opacity disabled:opacity-60">
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
              {aiLoading ? 'AI يحلل الإجابة...' : 'تصحيح سحري بالذكاء الاصطناعي ✨'}
            </button>
          )}

          {/* AI Suggestion */}
          <AnimatePresence>
            {aiSuggestion && (
              <AiSuggestionBubble suggestion={aiSuggestion}
                onAccept={(s, f) => { setScore(s.toString()); setFeedback(f) }} />
            )}
          </AnimatePresence>

          {/* Manual grade input */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">الدرجة (من 100)</label>
            <div className="flex items-center gap-3">
              <input type="number" min={0} max={100} value={score} onChange={e => setScore(e.target.value)}
                className="flex-1 border border-border rounded-xl px-4 py-3 bg-muted text-foreground font-extrabold text-xl outline-none focus:border-teal-500 transition-colors" />
              {score && (
                <div className="flex flex-col items-center w-16 h-16 rounded-2xl border-2 justify-center font-extrabold flex-shrink-0"
                  style={{ borderColor: gradeColor, color: gradeColor, backgroundColor: `${gradeColor}10` }}>
                  <span className="text-lg">{gradeLetter}</span>
                  <span className="text-[9px]">{pct}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Grade bar */}
          {score && (
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ backgroundColor: gradeColor }}
                initial={{ width: 0 }} animate={{ width: `${pct}%` }} />
            </div>
          )}

          {/* Feedback */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">ملاحظات للطالب</label>
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={4} dir="rtl"
              placeholder="اكتب ملاحظاتك هنا... أو اقبل اقتراح AI"
              className="w-full border border-border rounded-xl px-4 py-3 bg-muted text-foreground text-sm outline-none resize-none focus:border-teal-500 leading-relaxed" />
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button onClick={save} disabled={loading || !score}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {loading ? 'جاري الحفظ...' : 'رصد الدرجة'}
            </button>
            <button onClick={onClose} className="px-5 py-3 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
              إلغاء
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main page ──────────────────────────────────────────────
export default function GradingPage() {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'graded'>('pending')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { nexusBridge } = await import('@/lib/nexusDataBridge')
      const items = nexusBridge.getHomeworkSubmissions()
      setSubmissions(items.map(s => ({
        id: s.id,
        assignment: { title: s.assignmentTitle, maxScore: 10 },
        student: { name: s.studentName, email: 'student1@nexusedu.sa' },
        submissionText: s.submissionText,
        submittedAt: s.submittedAt,
        grade: s.grade,
        status: s.status === 'reviewed' ? 'graded' : 'pending',
        feedback: s.feedback,
      })))
    } catch { setSubmissions([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSaved = (id: string) => {
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, grade: true, status: 'graded' } : s))
  }

  const filtered = submissions.filter(s => {
    if (filter === 'pending') return !s.grade && s.status !== 'graded'
    if (filter === 'graded') return s.grade || s.status === 'graded'
    return true
  })

  const pending = submissions.filter(s => !s.grade && s.status !== 'graded').length
  const graded = submissions.filter(s => s.grade || s.status === 'graded').length

  return (
    <div className="space-y-6 pb-10" dir="rtl">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-cyan-600 to-emerald-600 p-7 text-white shadow-2xl">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-teal-200 text-sm mb-1">التصحيح والدرجات</p>
            <h1 className="text-2xl font-extrabold mb-3">مركز تصحيح الواجبات ✍️</h1>
            <div className="flex gap-3 flex-wrap">
              <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                <p className="text-xl font-extrabold">{pending}</p>
                <p className="text-xs text-white/70">بانتظار التصحيح</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                <p className="text-xl font-extrabold">{graded}</p>
                <p className="text-xs text-white/70">تم تصحيحها</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                <p className="text-xl font-extrabold">{submissions.length}</p>
                <p className="text-xs text-white/70">إجمالي التسليمات</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={load}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl px-4 py-2.5 text-sm font-bold transition-colors">
              <RefreshCw className="w-4 h-4" /> تحديث القائمة
            </button>
            <div className="flex items-center gap-1 bg-white/10 rounded-xl px-3 py-2">
              <BrainCircuit className="w-4 h-4 text-yellow-300" />
              <span className="text-xs font-bold text-white/90">AI Grading متاح</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {(['all', 'pending', 'graded'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${filter === f ? 'bg-teal-600 text-white' : 'bg-card border border-border text-muted-foreground hover:bg-muted'}`}>
            {f === 'all' ? 'الكل' : f === 'pending' ? `بانتظار التصحيح (${pending})` : `تم التصحيح (${graded})`}
          </button>
        ))}
      </div>

      {/* Submissions List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 bg-card border border-border rounded-3xl text-center">
          <CheckCircle2 className="w-16 h-16 text-teal-500" />
          <p className="font-bold text-foreground text-lg">
            {filter === 'pending' ? '🎉 أحسنت! لا توجد واجبات بانتظار التصحيح' : 'لا توجد بيانات'}
          </p>
          <p className="text-muted-foreground text-sm">ستظهر التسليمات هنا فور وصولها</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-3xl overflow-hidden">
          <div className="divide-y divide-border/50">
            {filtered.map((sub, i) => {
              const isGraded = sub.grade || sub.status === 'graded'
              const timeAgo = sub.submittedAt
                ? new Date(sub.submittedAt).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '—'
              return (
                <motion.div key={sub.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {(sub.student?.name || sub.student?.email || '?')[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-foreground truncate">
                        {sub.student?.name || sub.student?.email || 'طالب'}
                      </p>
                      {sub.aiSuggestion && (
                        <span className="text-[10px] bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" /> AI جاهز
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{sub.assignment?.title || 'واجب'}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {timeAgo}
                    </p>
                  </div>

                  {/* Status / Grade */}
                  <div className="flex-shrink-0 text-center">
                    {isGraded ? (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-extrabold text-emerald-600">{sub.grade ?? '—'}</span>
                        <span className="text-xs text-muted-foreground">/ 100</span>
                        <div className="w-5 h-5 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-emerald-600" />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full font-bold">
                        ⏳ قيد الانتظار
                      </span>
                    )}
                  </div>

                  {/* Action */}
                  {!isGraded && (
                    <button onClick={() => setSelected(sub)}
                      className="flex-shrink-0 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1">
                      <Wand2 className="w-3 h-3" /> صحح
                    </button>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* Grade Modal */}
      <AnimatePresence>
        {selected && (
          <GradeModal sub={selected} onClose={() => setSelected(null)} onSaved={handleSaved} />
        )}
      </AnimatePresence>
    </div>
  )
}
