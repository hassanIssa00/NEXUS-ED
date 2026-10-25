'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, ArrowRight, CheckCircle2, CircleHelp, Download, FileText, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import { ReportPrintFooter, ReportPrintIdentity } from '@/components/reports/report-print-tools'
import { apiClient } from '@/lib/api/client'

type AssessmentAnswer = {
  id: string
  category: string
  prompt: string
  selectedAnswer: string | null
  correctAnswer: string | null
  isCorrect: boolean
  explanation: string
}

type AssessmentReport = {
  id: string
  studentId: string
  studentName: string
  studentAvatar?: string | null
  gradeLevel: number
  assessmentKey: string
  score: number
  correctCount: number
  questionCount: number
  completedAt: string
  answers: AssessmentAnswer[]
  weakAreas: Array<{ category: string; total: number; correct: number; incorrect: number; accuracy: number }>
}

function gradeName(level: number, isEnglish: boolean) {
  if (level === 0) return isEnglish ? 'Kindergarten' : 'رياض الأطفال'
  if (level >= 1 && level <= 6) return isEnglish ? `Grade ${level} · Primary` : `الصف ${level} الابتدائي`
  if (level >= 7 && level <= 9) return isEnglish ? `Grade ${level - 6} · Middle school` : `الصف ${level - 6} المتوسط`
  return isEnglish ? `Grade ${level - 9} · Secondary` : `الصف ${level - 9} الثانوي`
}

function assessmentName(key: string, isEnglish: boolean) {
  const names: Record<string, [string, string]> = {
    kg: ['اختبار تأسيسي · رياض الأطفال', 'Foundation assessment · Kindergarten'],
    general: ['الاختبار التأسيسي · الصف الأول', 'Foundation assessment · Grade 1'],
    g2: ['الاختبار التأسيسي · الصف الثاني', 'Foundation assessment · Grade 2'],
    g3: ['الاختبار التأسيسي · الصف الثالث', 'Foundation assessment · Grade 3'],
    g4: ['الاختبار التأسيسي · الصف الرابع', 'Foundation assessment · Grade 4'],
    g5: ['الاختبار التأسيسي · الصف الخامس', 'Foundation assessment · Grade 5'],
    g6: ['الاختبار التأسيسي · الصف السادس', 'Foundation assessment · Grade 6'],
    m1: ['الاختبار التأسيسي · المرحلة المتوسطة', 'Foundation assessment · Middle school'],
    s1: ['الاختبار التأسيسي · المرحلة الثانوية', 'Foundation assessment · Secondary school'],
  }
  return names[key]?.[isEnglish ? 1 : 0] || key
}

function messageFrom(error: any, isEnglish: boolean) {
  const message = error?.response?.data?.message ?? error?.message
  if (Array.isArray(message)) return message.join(isEnglish ? ', ' : '، ')
  return message || (isEnglish ? 'The full assessment report could not be loaded.' : 'تعذر تحميل ملف الاختبار الكامل.')
}

export function PlacementAssessmentReportDocument({ attemptId }: { attemptId: string }) {
  const locale = useLocale()
  const isEnglish = locale === 'en'
  const [report, setReport] = useState<AssessmentReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadError, setDownloadError] = useState('')
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [studentAvatarFailed, setStudentAvatarFailed] = useState(false)
  const [returnTo, setReturnTo] = useState('/assessment/reports')

  const loadReport = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await apiClient.get(`/assessments/placement/reports/${encodeURIComponent(attemptId)}`)
      setReport(data)
    } catch (requestError) {
      setError(messageFrom(requestError, isEnglish))
    } finally {
      setLoading(false)
    }
  }, [attemptId, isEnglish])

  useEffect(() => { void loadReport() }, [loadReport])

  useEffect(() => {
    const candidate = new URLSearchParams(window.location.search).get('returnTo')
    const allowedPortalRecordPath = /^\/(?:admin|teacher|principal|vice_principal|counselor|supervisor|accountant|hr)\/students\/[a-zA-Z0-9-]+$/
    if (candidate && allowedPortalRecordPath.test(candidate)) setReturnTo(candidate)
  }, [])

  useEffect(() => {
    if (!report) return
    const previousTitle = document.title
    document.title = `${isEnglish ? 'Assessment report' : 'تقرير الاختبار'} - ${report.studentName}`
    return () => { document.title = previousTitle }
  }, [isEnglish, report])

  async function downloadPdf() {
    setDownloadingPdf(true)
    setDownloadError('')
    try {
      const { data } = await apiClient.get<Blob>(`/assessments/placement/reports/${encodeURIComponent(attemptId)}/pdf?locale=${isEnglish ? 'en' : 'ar'}`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `NEXUS-${attemptId.slice(-8).toUpperCase()}-assessment-report.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setDownloadError(isEnglish ? 'Could not download the PDF report. Please retry.' : 'تعذر تنزيل تقرير الاختبار بصيغة PDF. حاول مرة أخرى.')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const labels = isEnglish ? {
    title: 'Full placement assessment report', subtitle: 'Saved student responses and assessment details', back: 'Assessment reports',
    loading: 'Loading the saved report…', retry: 'Retry', reportNumber: 'Report number', student: 'Student', grade: 'Grade', assessment: 'Assessment',
    downloadPdf: 'Download PDF',
    completed: 'Completed', questions: 'Questions', correct: 'Correct answers', incorrect: 'Other responses', score: 'Score',
    answerLog: 'Complete answer record', answerLogHelp: 'Each question, the saved student response, the correct response, and the stored explanation.',
    question: 'Question', studentAnswer: 'Student response', correctAnswer: 'Correct response', noAnswer: 'No response recorded',
    correctStatus: 'Correct', incorrectStatus: 'Needs review', unansweredStatus: 'Unanswered', explanation: 'Explanation',
    focusAreas: 'Areas to follow up',
    missingAnswers: 'The saved record has no detailed answer list.', secureNote: 'This report is generated from the saved assessment attempt in the school records.',
  } : {
    title: 'ملف تقرير الاختبار التأسيسي', subtitle: 'إجابات الطالب المحفوظة وتفاصيل التقييم', back: 'تقارير الاختبارات',
    loading: 'جارٍ تحميل التقرير المحفوظ…', retry: 'إعادة المحاولة', reportNumber: 'رقم التقرير', student: 'الطالب', grade: 'الصف الدراسي', assessment: 'الاختبار',
    downloadPdf: 'تنزيل PDF',
    completed: 'تاريخ الإكمال', questions: 'عدد الأسئلة', correct: 'الإجابات الصحيحة', incorrect: 'إجابات تحتاج مراجعة', score: 'النتيجة',
    answerLog: 'سجل الإجابات الكامل', answerLogHelp: 'كل سؤال، وإجابة الطالب المحفوظة، والإجابة الصحيحة، والتوضيح المسجل.',
    question: 'السؤال', studentAnswer: 'إجابة الطالب', correctAnswer: 'الإجابة الصحيحة', noAnswer: 'لم تُسجل إجابة',
    correctStatus: 'إجابة صحيحة', incorrectStatus: 'تحتاج مراجعة', unansweredStatus: 'بلا إجابة', explanation: 'التوضيح',
    focusAreas: 'مجالات تحتاج متابعة',
    missingAnswers: 'لا يحتوي السجل المحفوظ على تفاصيل الإجابات.', secureNote: 'أُنشئ هذا التقرير من محاولة الاختبار المحفوظة في سجلات المدرسة.',
  }

  const answers = report?.answers ?? []
  const unansweredCount = answers.filter((answer) => !answer.selectedAnswer).length
  const incorrectCount = Math.max(0, (report?.questionCount ?? answers.length) - (report?.correctCount ?? 0) - unansweredCount)
  const reportNumber = report ? `NEXUS-${report.id.slice(-8).toUpperCase()}` : ''
  const scoreLabel = report ? `${new Intl.NumberFormat(isEnglish ? 'en-US' : 'ar-SA', { maximumFractionDigits: 2 }).format(report.score)}%` : ''
  const completedLabel = report
    ? new Intl.DateTimeFormat(isEnglish ? 'en-US' : 'ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(report.completedAt))
    : ''

  return (
    <main className="report-print-root placement-assessment-report mx-auto max-w-5xl space-y-5 p-4 py-7 md:p-8" dir={isEnglish ? 'ltr' : 'rtl'}>
      <ReportPrintIdentity title={labels.title} subtitle={labels.subtitle} />

      <nav className="print:hidden flex flex-wrap items-center justify-between gap-3">
        <Link href={returnTo as never} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground hover:bg-muted">
          <ArrowRight className="h-4 w-4" />{labels.back}
        </Link>
        {report && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void downloadPdf()} disabled={downloadingPdf} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-wait disabled:opacity-60">{downloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{labels.downloadPdf}</button></div>}
      </nav>

      {downloadError && <div role="alert" className="print:hidden rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{downloadError}</div>}

      {loading && <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-muted-foreground" role="status"><Loader2 className="h-5 w-5 animate-spin" />{labels.loading}</div>}

      {!loading && error && <section role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"><AlertCircle className="h-5 w-5 shrink-0" /><span className="flex-1">{error}</span><button type="button" onClick={() => void loadReport()} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-rose-300 bg-white px-3 font-semibold"><RefreshCw className="h-4 w-4" />{labels.retry}</button></section>}

      {!loading && !error && report && <>
        <header className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800"><FileText className="h-4 w-4" />{labels.answerLog}</div>
              <div className="mt-3 flex items-center gap-3" dir="rtl">{report.studentAvatar && !studentAvatarFailed ? <img src={report.studentAvatar} alt={isEnglish ? `${report.studentName} profile photo` : `صورة الطالب ${report.studentName}`} loading="eager" referrerPolicy="no-referrer" onError={() => setStudentAvatarFailed(true)} className="size-14 rounded-full border-2 border-teal-600 bg-muted object-contain shadow-sm" /> : <span className="grid size-14 place-items-center rounded-full border-2 border-teal-600 bg-teal-50 text-xl font-black text-teal-800">{report.studentName.slice(0, 1)}</span>}<h1 className="text-2xl font-black text-foreground md:text-3xl">{report.studentName}</h1></div>
              <p className="mt-1 text-sm text-muted-foreground">{gradeName(report.gradeLevel, isEnglish)} · {assessmentName(report.assessmentKey, isEnglish)}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-start">
              <span className="block text-xs text-muted-foreground">{labels.reportNumber}</span>
              <strong className="mt-1 block font-mono text-sm tracking-wide">{reportNumber}</strong>
            </div>
          </div>

          <dl className="grid gap-3 pt-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              [labels.student, report.studentName],
              [labels.grade, gradeName(report.gradeLevel, isEnglish)],
              [labels.assessment, assessmentName(report.assessmentKey, isEnglish)],
              [labels.completed, completedLabel],
              [labels.questions, String(report.questionCount)],
              [labels.score, scoreLabel],
            ].map(([label, value]) => <div key={label} className="rounded-lg bg-muted/30 p-3"><dt className="text-xs font-medium text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-bold text-foreground">{value}</dd></div>)}
          </dl>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900"><CheckCircle2 className="h-5 w-5 shrink-0" /><div><span className="block text-xs">{labels.correct}</span><strong className="text-lg tabular-nums">{report.correctCount} / {report.questionCount}</strong></div></div>
            <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900"><CircleHelp className="h-5 w-5 shrink-0" /><div><span className="block text-xs">{labels.incorrect}</span><strong className="text-lg tabular-nums">{incorrectCount + unansweredCount}</strong></div></div>
            <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-primary"><FileText className="h-5 w-5 shrink-0" /><div><span className="block text-xs">{labels.questions}</span><strong className="text-lg tabular-nums">{answers.length} / {report.questionCount}</strong></div></div>
          </div>
        </header>

        {report.weakAreas?.length > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
          <h2 className="text-lg font-bold text-amber-950">{labels.focusAreas}</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {report.weakAreas.map((area) => <li key={area.category} className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white p-3 text-sm"><span className="font-semibold">{area.category}</span><span className="shrink-0 text-xs tabular-nums text-muted-foreground">{area.correct}/{area.total} · {area.accuracy}%</span></li>)}
          </ul>
        </section>}

        <section aria-labelledby="assessment-answer-log" className="space-y-4">
          <header className="border-b border-border pb-3">
            <h2 id="assessment-answer-log" className="text-xl font-black text-foreground">{labels.answerLog}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{labels.answerLogHelp}</p>
          </header>
          {answers.length === 0 ? <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{labels.missingAnswers}</p> : <ol className="space-y-3">
            {answers.map((answer, index) => {
              const unanswered = !answer.selectedAnswer
              const stateLabel = unanswered ? labels.unansweredStatus : answer.isCorrect ? labels.correctStatus : labels.incorrectStatus
              const stateClass = unanswered ? 'border-slate-200 bg-slate-100 text-slate-700' : answer.isCorrect ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'
              const StateIcon = unanswered ? CircleHelp : answer.isCorrect ? CheckCircle2 : XCircle
              return <li key={answer.id} className="report-print-card overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-sm font-black text-teal-800">{index + 1}</span><span className="text-sm font-bold text-foreground">{answer.category}</span></div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${stateClass}`}><StateIcon className="h-3.5 w-3.5" />{stateLabel}</span>
                </div>
                <div className="space-y-3 p-4 md:p-5">
                  <div><p className="text-xs font-semibold text-muted-foreground">{labels.question}</p><p className="mt-1 whitespace-pre-wrap text-sm font-bold leading-7 text-foreground">{answer.prompt}</p></div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className={`rounded-lg border p-3 ${unanswered ? 'border-slate-200 bg-slate-50' : answer.isCorrect ? 'border-emerald-200 bg-emerald-50/60' : 'border-rose-200 bg-rose-50/60'}`}><p className="text-xs font-semibold text-muted-foreground">{labels.studentAnswer}</p><p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-foreground">{answer.selectedAnswer || labels.noAnswer}</p></div>
                    <div className="rounded-lg border border-teal-200 bg-teal-50/70 p-3"><p className="text-xs font-semibold text-muted-foreground">{labels.correctAnswer}</p><p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-foreground">{answer.correctAnswer || '—'}</p></div>
                  </div>
                  {answer.explanation ? <div className="border-t border-border pt-3"><p className="text-xs font-semibold text-muted-foreground">{labels.explanation}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{answer.explanation}</p></div> : null}
                </div>
              </li>
            })}
          </ol>}
        </section>

        <p className="text-center text-xs text-muted-foreground">{labels.secureNote}</p>
      </>}

      <ReportPrintFooter />
    </main>
  )
}
