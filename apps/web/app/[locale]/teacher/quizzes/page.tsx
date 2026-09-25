'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Plus, Users, CheckCircle2, Clock, Trophy, Target,
  ChevronDown, ChevronUp, Trash2, Save, Play, BarChart3, Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ClassQuiz, QuizSubmission } from '@/lib/nexusDataBridge'

const SUBJECTS = ['اللغة العربية', 'القرآن الكريم', 'الرياضيات', 'العلوم']

type Tab = 'bank' | 'create' | 'results'

interface NewQuestion {
  questionText: string
  options: [string, string, string, string]
  correctAnswer: number
  points: number
}

export default function TeacherQuizzesPage() {
  const [tab, setTab] = useState<Tab>('bank')
  const [quizzes, setQuizzes] = useState<ClassQuiz[]>([])
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Create form state
  const [newTitle, setNewTitle] = useState('')
  const [newSubject, setNewSubject] = useState(SUBJECTS[0])
  const [newDuration, setNewDuration] = useState(30)
  const [questions, setQuestions] = useState<NewQuestion[]>([
    { questionText: '', options: ['', '', '', ''], correctAnswer: 0, points: 10 }
  ])

  useEffect(() => {
    const load = async () => {
      try {
        const { nexusBridge } = await import('@/lib/nexusDataBridge')
        setQuizzes(nexusBridge.getQuizzes())
        setSubmissions(nexusBridge.getQuizSubmissions ? nexusBridge.getQuizSubmissions() : [])
      } catch (e) {
        console.error('quizzes load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
    window.addEventListener('nexus:data-changed', load as any)
    return () => window.removeEventListener('nexus:data-changed', load as any)
  }, [])

  const addQuestion = () => {
    if (questions.length < 10) {
      setQuestions(q => [...q, { questionText: '', options: ['', '', '', ''], correctAnswer: 0, points: 10 }])
    }
  }

  const removeQuestion = (i: number) => setQuestions(q => q.filter((_, idx) => idx !== i))

  const updateQuestion = (i: number, field: string, value: any) => {
    setQuestions(q => q.map((item, idx) => {
      if (idx !== i) return item
      if (field === 'option') {
        const [, optIdx, val] = value
        const options = [...item.options] as [string, string, string, string]
        options[optIdx] = val
        return { ...item, options }
      }
      return { ...item, [field]: value }
    }))
  }

  const handleSaveQuiz = async () => {
    if (!newTitle.trim() || questions.some(q => !q.questionText.trim())) return
    setSaving(true)
    try {
      const { nexusBridge } = await import('@/lib/nexusDataBridge')
      const newQuiz: ClassQuiz = {
        id: `quiz-${Date.now()}`,
        title: newTitle,
        subject: newSubject,
        durationMinutes: newDuration,
        totalPoints: questions.reduce((acc, q) => acc + q.points, 0),
        questions: questions.map((q, i) => ({
          id: `q-${Date.now()}-${i}`,
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          points: q.points,
        })),
        submissionsCount: 0,
        createdAt: new Date().toISOString(),
      }
      nexusBridge.saveQuiz(newQuiz)
      setQuizzes(prev => [newQuiz, ...prev])
      setNewTitle('')
      setNewSubject(SUBJECTS[0])
      setNewDuration(30)
      setQuestions([{ questionText: '', options: ['', '', '', ''], correctAnswer: 0, points: 10 }])
      setSaved(true)
      setTimeout(() => { setSaved(false); setTab('bank') }, 1200)
    } catch (e) {
      console.error('save quiz error:', e)
    } finally {
      setSaving(false)
    }
  }

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: 'bank', label: 'بنك الاختبارات', icon: BookOpen },
    { key: 'create', label: 'إنشاء اختبار', icon: Plus },
    { key: 'results', label: 'نتائج الطلاب', icon: BarChart3 },
  ]

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      {/* HERO */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#c2410c] via-[#ea580c] to-[#f97316] p-8 text-white shadow-[0_20px_60px_rgba(234,88,12,0.3)]">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-orange-300/20 blur-3xl" />
          <motion.div animate={{ rotate: -360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            className="absolute -bottom-24 -left-16 w-80 h-80 rounded-full bg-red-400/20 blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-4">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
            <span className="text-xs font-bold text-orange-100">مركز الاختبارات والتقييمات المدرسية</span>
          </div>
          <h1 className="text-4xl font-black mb-2 tracking-tight">الاختبارات والتقييم 📝</h1>
          <p className="text-orange-100 text-sm font-medium">أنشئ اختبارات تفاعلية وتابع نتائج طلاب فصل د. إسماعيل عيسى لحظياً</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {[
              { label: 'اختبارات منشورة', value: quizzes.length },
              { label: 'إجمالي التسليمات', value: submissions.length },
              { label: 'متوسط الدرجات', value: submissions.length > 0 ? `${Math.round(submissions.reduce((acc, s) => acc + (s.score / s.totalPoints) * 100, 0) / submissions.length)}%` : '96%' }
            ].map((s, i) => (
              <div key={i} className="bg-white/10 border border-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl">
                <p className="text-[10px] text-orange-200 font-medium leading-none">{s.label}</p>
                <p className="text-lg font-black leading-tight">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* TABS */}
      <div className="flex gap-2 bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
              tab === t.key
                ? 'bg-white dark:bg-[#1e1e2d] text-orange-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── BANK TAB ── */}
        {tab === 'bank' && (
          <motion.div key="bank" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin" />
              </div>
            ) : quizzes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center text-4xl">📝</div>
                <p className="text-gray-500 font-bold">لا توجد اختبارات بعد — أنشئ أول اختبار!</p>
                <Button onClick={() => setTab('create')} className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold">
                  <Plus className="w-4 h-4 ml-2" />إنشاء اختبار جديد
                </Button>
              </div>
            ) : (
              quizzes.map((quiz, i) => (
                <motion.div key={quiz.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  whileHover={{ y: -2 }}
                  className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl shadow-sm overflow-hidden">
                  <div className="p-6 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-7 h-7 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-gray-900 dark:text-white text-base truncate">{quiz.title}</h3>
                      <p className="text-sm text-gray-500 font-medium mt-0.5">{quiz.subject}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-center hidden sm:block">
                        <p className="text-xl font-black text-orange-600">{quiz.questions.length}</p>
                        <p className="text-[10px] text-gray-500 font-bold">سؤال</p>
                      </div>
                      <div className="text-center hidden sm:block">
                        <p className="text-xl font-black text-emerald-600">{quiz.submissionsCount}</p>
                        <p className="text-[10px] text-gray-500 font-bold">تسليم</p>
                      </div>
                      <Badge className="rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 font-bold border-0">
                        <Clock className="w-3 h-3 ml-1" />{quiz.durationMinutes} د
                      </Badge>
                      <button onClick={() => setExpandedQuizId(expandedQuizId === quiz.id ? null : quiz.id)}
                        className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center hover:bg-orange-100 dark:hover:bg-orange-500/10 transition-colors">
                        {expandedQuizId === quiz.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <AnimatePresence>
                    {expandedQuizId === quiz.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-100 dark:border-white/5 px-6 pb-6">
                        <div className="pt-5 space-y-3">
                          {quiz.questions.map((q, qi) => (
                            <div key={q.id} className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4">
                              <p className="font-bold text-sm text-gray-900 dark:text-white mb-3">{qi + 1}. {q.questionText}</p>
                              <div className="grid grid-cols-2 gap-2">
                                {q.options.map((opt, oi) => (
                                  <div key={oi} className={`text-xs px-3 py-2 rounded-xl font-medium border ${
                                    oi === q.correctAnswer
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400'
                                      : 'bg-white border-gray-100 text-gray-600 dark:bg-white/5 dark:border-white/5 dark:text-gray-400'
                                  }`}>
                                    {oi === q.correctAnswer && '✓ '}{opt}
                                  </div>
                                ))}
                              </div>
                              <p className="text-[10px] text-gray-400 mt-2 font-bold">{q.points} نقطة</p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {/* ── CREATE TAB ── */}
        {tab === 'create' && (
          <motion.div key="create" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-7 shadow-sm space-y-6">
            <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
                <Plus className="w-5 h-5 text-orange-500" />
              </div>
              إنشاء اختبار جديد
            </h2>
            {/* Quiz Info */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-black text-gray-500 dark:text-gray-400 mb-2 block">عنوان الاختبار</label>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="مثال: اختبار درس المد الطبيعي وحروف الهجاء"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
              </div>
              <div>
                <label className="text-xs font-black text-gray-500 dark:text-gray-400 mb-2 block">المادة</label>
                <select value={newSubject} onChange={e => setNewSubject(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50">
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-black text-gray-500 dark:text-gray-400 mb-2 block">المدة (دقيقة)</label>
                <input type="number" min={5} max={120} value={newDuration} onChange={e => setNewDuration(+e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
              </div>
            </div>
            {/* Questions Builder */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-gray-900 dark:text-white text-sm">الأسئلة ({questions.length}/10)</h3>
                <Button onClick={addQuestion} disabled={questions.length >= 10} size="sm" className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold">
                  <Plus className="w-3.5 h-3.5 ml-1" />إضافة سؤال
                </Button>
              </div>
              {questions.map((q, qi) => (
                <div key={qi} className="bg-gray-50 dark:bg-white/5 rounded-2xl p-5 border border-gray-100 dark:border-white/5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-500/20 text-orange-600 flex items-center justify-center text-xs font-black flex-shrink-0">{qi + 1}</div>
                    <div className="flex-1">
                      <input value={q.questionText} onChange={e => updateQuestion(qi, 'questionText', e.target.value)}
                        placeholder="نص السؤال..."
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1e1e2d] text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                    </div>
                    <button onClick={() => removeQuestion(qi)} className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-colors flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className={`flex items-center gap-2 rounded-xl border p-2.5 ${
                        oi === q.correctAnswer ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500/30' : 'border-gray-200 dark:border-white/5'
                      }`}>
                        <button onClick={() => updateQuestion(qi, 'correctAnswer', oi)}
                          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
                            oi === q.correctAnswer ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
                          }`}>
                          {oi === q.correctAnswer && <div className="w-2 h-2 rounded-full bg-white m-auto mt-0.5" />}
                        </button>
                        <input value={opt} onChange={e => updateQuestion(qi, 'option', [null, oi, e.target.value])}
                          placeholder={`الخيار ${oi + 1}`}
                          className="flex-1 bg-transparent text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none min-w-0" />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500">النقاط:</span>
                    <input type="number" min={1} max={100} value={q.points} onChange={e => updateQuestion(qi, 'points', +e.target.value)}
                      className="w-16 px-2 py-1 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1e1e2d] text-xs font-bold text-center focus:outline-none" />
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={handleSaveQuiz} disabled={saving || !newTitle.trim()}
              className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-base py-6 shadow-lg shadow-orange-500/30">
              {saving ? <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" /> : saved ? <><CheckCircle2 className="w-5 h-5 ml-2" />تم الحفظ بنجاح!</> : <><Save className="w-5 h-5 ml-2" />حفظ ونشر الاختبار</>}
            </Button>
          </motion.div>
        )}

        {/* ── RESULTS TAB ── */}
        {tab === 'results' && (
          <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="space-y-6">
            {submissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center text-4xl">📊</div>
                <p className="text-gray-500 font-bold">لم يُسلّم أي طالب اختباراً بعد.</p>
              </div>
            ) : (
              quizzes.map(quiz => {
                const quizSubs = submissions.filter(s => s.quizId === quiz.id)
                if (quizSubs.length === 0) return null
                const avgScore = Math.round(quizSubs.reduce((acc, s) => acc + (s.score / s.totalPoints) * 100, 0) / quizSubs.length)
                return (
                  <motion.div key={quiz.id} whileHover={{ y: -2 }}
                    className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
                        <BarChart3 className="w-6 h-6 text-orange-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-black text-gray-900 dark:text-white">{quiz.title}</h3>
                        <p className="text-xs text-gray-500">{quiz.subject} • {quizSubs.length} تسليم</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-black" style={{ color: avgScore >= 80 ? '#10b981' : avgScore >= 60 ? '#f59e0b' : '#ef4444' }}>{avgScore}%</p>
                        <p className="text-[10px] text-gray-500 font-bold">المتوسط</p>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-white/5">
                      {quizSubs.map(sub => {
                        const pct = Math.round((sub.score / sub.totalPoints) * 100)
                        return (
                          <div key={sub.id} className="px-6 py-4 flex items-center gap-4">
                            <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center font-black text-violet-600 text-sm">
                              {sub.studentName[0]}
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-sm text-gray-900 dark:text-white">{sub.studentName}</p>
                              <p className="text-[11px] text-gray-400">{new Date(sub.submittedAt).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="font-black text-sm" style={{ color: pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444' }}>{sub.score}/{sub.totalPoints}</p>
                                <p className="text-[10px] text-gray-400">{pct}%</p>
                              </div>
                              <Badge className={`rounded-xl font-bold border-0 text-xs ${
                                pct >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                : pct >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                              }`}>
                                {pct >= 80 ? 'ممتاز' : pct >= 60 ? 'جيد' : 'يحتاج دعم'}
                              </Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )
              }).filter(Boolean)
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
