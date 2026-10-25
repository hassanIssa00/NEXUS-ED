'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, Sparkles, BookOpen, ClipboardCheck } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useRouter } from '@/i18n/routing'
import { useLocale } from 'next-intl'

type StudentAssignment = {
  id: string
  title: string
  description: string
  dueDate: string | null
  maxScore: number
  subjectName: string
  status: 'pending' | 'submitted' | 'graded'
  grade: number | null
  submission: { content: string; feedback: string } | null
  deliveryMode: 'AI_QUESTIONS' | 'BOOK_PAGES'
  curriculumSlug: string | null
  curriculumPageFrom: number | null
  curriculumPageTo: number | null
  questionCount: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function displayText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return fallback
}

function displayNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return fallback
}

function normalizeAssignments(payload: unknown, locale: 'ar' | 'en'): StudentAssignment[] {
  const root = isRecord(payload) ? payload : null
  const rows = Array.isArray(payload)
    ? payload
    : root && Array.isArray(root.data)
      ? root.data
      : []

  return rows.filter(isRecord).map((row, index) => {
    const rawSubmission = isRecord(row.submission) ? row.submission : null
    const rawSubject = row.subject
    const subject = isRecord(rawSubject) ? rawSubject : null
    const rawStatus = displayText(row.status).toLowerCase()
    const status: StudentAssignment['status'] = rawStatus === 'graded' || Boolean(rawSubmission?.gradedAt)
      ? 'graded'
      : rawStatus === 'submitted' || rawSubmission
        ? 'submitted'
        : 'pending'
    const dueDateValue = displayText(row.dueDate)
    const dueDate = dueDateValue && Number.isFinite(new Date(dueDateValue).getTime()) ? dueDateValue : null
    const gradeValue = row.grade == null ? null : displayNumber(row.grade, Number.NaN)

    return {
      id: displayText(row.id, `assignment-${index}`),
      title: displayText(row.title, locale === 'en' ? 'Untitled assignment' : 'واجب بدون عنوان'),
      description: displayText(row.description),
      dueDate,
      maxScore: displayNumber(row.maxScore),
      subjectName: typeof rawSubject === 'string'
        ? rawSubject
        : displayText(subject?.name, locale === 'en' ? 'Unspecified subject' : 'مادة غير محددة'),
      status,
      grade: gradeValue !== null && Number.isFinite(gradeValue) ? gradeValue : null,
      submission: rawSubmission
        ? {
            content: displayText(rawSubmission.content),
            feedback: displayText(rawSubmission.feedback),
          }
        : null,
      deliveryMode: row.deliveryMode === 'BOOK_PAGES' ? 'BOOK_PAGES' : 'AI_QUESTIONS',
      curriculumSlug: displayText(row.curriculumSlug) || null,
      curriculumPageFrom: row.curriculumPageFrom == null ? null : displayNumber(row.curriculumPageFrom, 0) || null,
      curriculumPageTo: row.curriculumPageTo == null ? null : displayNumber(row.curriculumPageTo, 0) || null,
      questionCount: Array.isArray(row.questions) ? row.questions.length : 0,
    }
  })
}

export default function StudentAssignmentsPage() {
  const locale = useLocale() === 'en' ? 'en' : 'ar'
  const isEnglish = locale === 'en'
  const t = useCallback((ar: string, en: string) => isEnglish ? en : ar, [isEnglish])
  const router = useRouter()
  const [assignments, setAssignments] = useState<StudentAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted'>('all')
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    try {
      const response = await apiClient.get('/assignments/student')
      setAssignments(normalizeAssignments(response.data, locale))
    } catch (err) {
      setError(t('تعذر تحميل الواجبات من النظام.', 'Could not load assignments from the system.'))
    } finally {
      setLoading(false)
    }
  }, [locale, t])

  useEffect(() => {
    loadData()
    window.addEventListener('nexus:data-changed', loadData)
    return () => window.removeEventListener('nexus:data-changed', loadData)
  }, [loadData])

  const filteredAssignments = assignments.filter((assignment) => {
    if (filter === 'pending') return assignment.status === 'pending'
    if (filter === 'submitted') return assignment.status !== 'pending'
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
    <div className="space-y-8 pb-16" dir={isEnglish ? 'ltr' : 'rtl'}>
      {/* HERO */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 p-8 text-white shadow-2xl">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-3">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span className="text-xs font-bold text-amber-100">{t('بوابة الطالب • الواجبات المدرسية', 'Student portal • Assignments')}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">{t('الواجبات المدرسية 📝', 'School assignments 📝')}</h1>
          <p className="text-amber-100 text-sm max-w-xl font-medium">
            {t('استعرض واجباتك المقررة، أرسل إجاباتك إلكترونيًا، وتابع تقييمات المعلم وملاحظاته.', 'Review assigned work, submit your answers, and follow your teacher’s grades and feedback.')}
          </p>
        </div>
      </motion.div>

      {/* FILTERS */}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2 bg-gray-100/80 dark:bg-white/5 p-1.5 rounded-2xl w-fit">
        {[
          { key: 'all', label: `${t('جميع الواجبات', 'All assignments')} (${assignments.length})` },
          { key: 'pending', label: `${t('بانتظار التسليم', 'Not submitted')} (${assignments.filter((assignment) => assignment.status === 'pending').length})` },
          { key: 'submitted', label: `${t('تم تسليمها', 'Submitted')} (${assignments.filter((assignment) => assignment.status !== 'pending').length})` },
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
            <h3 className="font-black text-lg text-gray-900 dark:text-white mb-1">{t('لا توجد واجبات في هذا التصنيف', 'No assignments in this category')}</h3>
            <p className="text-sm text-gray-400">{t('لا توجد واجبات مسندة تطابق هذا التصنيف.', 'No assigned work matches this category.')}</p>
          </div>
        ) : (
          filteredAssignments.map((hw, i) => {
            const submission = hw.submission
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
                          {hw.subjectName}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 font-medium leading-relaxed max-w-xl">{hw.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold">
                        {hw.deliveryMode === 'BOOK_PAGES' && hw.curriculumPageFrom && hw.curriculumPageTo ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2.5 py-1 text-teal-800">
                            <BookOpen className="size-3.5" /> {t('صفحات الكتاب', 'Book pages')} {hw.curriculumPageFrom}–{hw.curriculumPageTo}
                          </span>
                        ) : hw.questionCount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2.5 py-1 text-violet-800">
                            <ClipboardCheck className="size-3.5" /> {hw.questionCount} {t('أسئلة مطلوبة', 'questions required')}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 font-medium">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5" /> {t('موعد التسليم:', 'Due date:')} {hw.dueDate ? new Date(hw.dueDate).toLocaleDateString(isEnglish ? 'en-US' : 'ar-SA') : t('غير محدد', 'Not set')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {submission ? (
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-xs font-black border border-emerald-200/50">
                          <CheckCircle2 className="w-4 h-4" /> {t('تم التسليم', 'Submitted')}
                        </span>
                        {hw.grade !== null && hw.grade !== undefined && (
                          <p className="text-xs font-black text-emerald-600 mt-1">{t('الدرجة:', 'Grade:')} {hw.grade}/{hw.maxScore}</p>
                        )}
                      </div>
                    ) : (
                      <button onClick={() => router.push(`/student/assignments/submit?id=${encodeURIComponent(hw.id)}`)}
                        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2">
                        <span>{t('ابدأ حل الواجب ✏️', 'Start assignment ✏️')}</span>
                      </button>
                    )}
                  </div>
                </div>

                {submission && (submission.content || submission.feedback) && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 grid md:grid-cols-2 gap-3 text-xs">
                    {submission.content && (
                      <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-3">
                        <span className="font-bold text-gray-500 block mb-1">{t('إجابتك المسلمة:', 'Your submitted answer:')}</span>
                        <p className="text-gray-800 dark:text-gray-200">{submission.content}</p>
                      </div>
                    )}
                    {submission.feedback && (
                      <div className="bg-emerald-50/50 dark:bg-emerald-500/5 rounded-2xl p-3 border border-emerald-100 dark:border-emerald-500/20">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-1">{t('ملاحظة المعلم:', 'Teacher feedback:')}</span>
                        <p className="text-emerald-800 dark:text-emerald-300 font-medium">{submission.feedback}</p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )
          })
        )}
      </div>

    </div>
  )
}
