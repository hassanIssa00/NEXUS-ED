'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { ArrowRight, BookOpen, CalendarDays, ClipboardCheck, GraduationCap, Heart, Loader2, RefreshCw, UserRound } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { apiClient } from '@/lib/api/client'

type StudentRecord = {
  id: string
  name?: string | null
  firstName?: string | null
  lastName?: string | null
  email: string
  phone?: string | null
  avatar?: string | null
  isActive: boolean
  createdAt: string
  studentProfile?: { gradeLevel: number; nationalId?: string | null; dateOfBirth?: string | null } | null
  enrollments: Array<{ enrolledAt: string; class: { id: string; name: string; academicYear?: string | null; teacher?: { id: string; name?: string | null } | null } }>
  attendance: Array<{ id: string; date: string; status: string; notes?: string | null; class: { id: string; name: string } }>
  studentGrades: Array<{ id: string; score: number; grade: number; maxScore: number; comments?: string | null; createdAt: string; subject: { id: string; name: string }; assignment?: { id: string; title: string } | null }>
  parents: Array<{ relationship?: string | null; parent: { id: string; name?: string | null; email: string; phone?: string | null } }>
  placementAssessmentAttempts: Array<{
    id: string
    gradeLevel: number
    assessmentKey: string
    correctCount: number
    questionCount: number
    score: number
    completedAt: string
    answers?: Array<{ id: string; category: string; prompt: string; selectedAnswer: string | null; correctAnswer: string | null; isCorrect: boolean; explanation: string }>
    weakAreas?: Array<{ category: string; total: number; correct: number; incorrect: number; accuracy: number }>
  }>
  parentSurveys?: Array<{
    surveyId?: string
    id?: string
    respondentRole: string
    consentedAt: string
    createdAt: string
    updatedAt: string
    answers?: Record<string, string>
  }>
  smartProfile?: { learningStyle: string; strengthSubjects: string[]; weakSubjects: string[]; performanceTrend: string } | null
  skillMasteries: Array<{ id: string; masteryLevel: string; skillNode: { name: string; subject: { name: string } } }>
}

const copy = {
  ar: {
    title: 'ملف الطالب', back: 'العودة للفصل', loading: 'جار تحميل ملف الطالب...', error: 'تعذر تحميل ملف الطالب من سجلات المدرسة.', forbidden: 'لا تملك صلاحية عرض ملف هذا الطالب.', notFound: 'لم يتم العثور على ملف الطالب في سجلات المدرسة.', refresh: 'إعادة المحاولة',
    account: 'البيانات الأساسية', grade: 'الصف الدراسي', nationalId: 'رقم الهوية', birthDate: 'تاريخ الميلاد', joined: 'تاريخ التسجيل', status: 'حالة الحساب', active: 'نشط', inactive: 'غير نشط',
    classes: 'الفصول المسجل بها', academicYear: 'العام الدراسي', teacher: 'المعلم المسؤول', enrolledAt: 'تاريخ التسجيل بالفصل', noClasses: 'لا توجد تسجيلات فصول لهذا الطالب.', guardians: 'أولياء الأمور المرتبطون', relationship: 'صلة القرابة', noGuardians: 'لا توجد حسابات أولياء أمور مرتبطة.',
    attendance: 'سجل الحضور', date: 'التاريخ', class: 'الفصل', attendanceStatus: 'الحالة', notes: 'ملاحظات', noAttendance: 'لا توجد سجلات حضور.', present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'بعذر', grades: 'الدرجات والتقييمات', subject: 'المادة', assessment: 'التقييم', score: 'الدرجة', feedback: 'ملاحظات المعلم', noGrades: 'لا توجد درجات مسجلة.', entrance: 'نتائج الاختبارات التأسيسية', correct: 'إجابة صحيحة', noEntrance: 'لا توجد اختبارات مسجلة.', answerDetails: 'إجابات الاختبار', selectedAnswer: 'إجابة الطالب', correctAnswer: 'الإجابة الصحيحة', noAnswer: 'لم تُسجل إجابة', explanation: 'التوضيح', weakAreas: 'نقاط تحتاج متابعة', accuracy: 'نسبة الإجابة الصحيحة', surveys: 'استبيانات الطالب والأسرة', noSurveys: 'لا توجد استبيانات محفوظة.', surveySavedOnly: 'الاستبيان محفوظ، لكن تفاصيل الإجابات غير متاحة لهذا الدور.', respondent: 'مجيب الاستبيان', parent: 'ولي الأمر', student: 'الطالب', learning: 'ملف التعلم والمهارات', style: 'أسلوب التعلم', strengths: 'نقاط القوة', needsWork: 'مهارات تحتاج متابعة', masteredSkills: 'المهارات المسجلة', noSkills: 'لا توجد مهارات مسجلة بعد.', unknown: 'غير محدد', relationshipLabels: { FATHER: 'الأب', MOTHER: 'الأم', GUARDIAN: 'ولي أمر' } as Record<string, string>,
  },
  en: {
    title: 'Student record', back: 'Back to class', loading: 'Loading student record…', error: 'Could not load this student record from school records.', forbidden: 'You do not have permission to view this student record.', notFound: 'This student record was not found at the school.', refresh: 'Try again',
    account: 'Basic information', grade: 'Grade', nationalId: 'National ID', birthDate: 'Date of birth', joined: 'Account created', status: 'Account status', active: 'Active', inactive: 'Inactive',
    classes: 'Enrolled classes', academicYear: 'Academic year', teacher: 'Assigned teacher', enrolledAt: 'Enrolled on', noClasses: 'No class enrollment is recorded.', guardians: 'Linked guardians', relationship: 'Relationship', noGuardians: 'No guardian accounts are linked.',
    attendance: 'Attendance', date: 'Date', class: 'Class', attendanceStatus: 'Status', notes: 'Notes', noAttendance: 'No attendance records.', present: 'Present', absent: 'Absent', late: 'Late', excused: 'Excused', grades: 'Grades and assessments', subject: 'Subject', assessment: 'Assessment', score: 'Score', feedback: 'Teacher notes', noGrades: 'No grades are recorded.', entrance: 'Placement assessment results', correct: 'Correct answers', noEntrance: 'No assessment results are recorded.', answerDetails: 'Assessment answers', selectedAnswer: 'Student answer', correctAnswer: 'Correct answer', noAnswer: 'No answer recorded', explanation: 'Explanation', weakAreas: 'Areas to follow up', accuracy: 'Accuracy', surveys: 'Student and family surveys', noSurveys: 'No surveys are recorded.', surveySavedOnly: 'The survey is saved, but detailed answers are not available for this role.', respondent: 'Respondent', parent: 'Parent', student: 'Student', learning: 'Learning profile and skills', style: 'Learning style', strengths: 'Strengths', needsWork: 'Skills to follow up', masteredSkills: 'Recorded skills', noSkills: 'No skills are recorded yet.', unknown: 'Not specified', relationshipLabels: { FATHER: 'Father', MOTHER: 'Mother', GUARDIAN: 'Guardian' } as Record<string, string>,
  },
}

const surveyQuestions = {
  ar: {
    q1: 'عمر الطالب', q2: 'حالة صحية أو حساسية', q3: 'متوسط النوم', q4: 'وقت الشاشة',
    q5: 'التعبير عن النفس', q6: 'الاهتمام بالقراءة', q7: 'نطق الحروف', q8: 'الاندماج مع الزملاء',
    q9: 'الاستجابة للتوجيهات', q10: 'انتظار الدور', q11: 'التركيز في نشاط تعليمي', q12: 'التعامل مع الصعوبة',
    q13: 'الالتزام بالروتين', q14: 'متابعة الواجبات', q15: 'هدف الأسرة للفصل',
  } as Record<string, string>,
  en: {
    q1: 'Student age', q2: 'Health condition or allergy', q3: 'Average sleep', q4: 'Screen time',
    q5: 'Self-expression', q6: 'Interest in reading', q7: 'Pronunciation', q8: 'Peer interaction',
    q9: 'Following directions', q10: 'Taking turns', q11: 'Focus during learning', q12: 'Handling challenges',
    q13: 'Daily routine', q14: 'Homework follow-up', q15: 'Family goal for the term',
  } as Record<string, string>,
}

function displayName(student: StudentRecord) {
  return student.name || [student.firstName, student.lastName].filter(Boolean).join(' ') || student.email
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(locale === 'en' ? 'en-SA' : 'ar-EG-u-ca-gregory')
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof UserRound; children: ReactNode }) {
  return <section className="overflow-hidden rounded-xl border border-border bg-card">
    <div className="flex items-center gap-2 border-b border-border px-4 py-3"><Icon className="h-5 w-5 text-primary" /><h2 className="font-bold">{title}</h2></div>
    <div className="p-4">{children}</div>
  </section>
}

export default function StudentRecordPage({ basePath }: { basePath: string }) {
  const params = useParams<{ id: string }>()
  const locale = useLocale() === 'en' ? 'en' : 'ar'
  const t = copy[locale]
  const [record, setRecord] = useState<StudentRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const response = await apiClient.get<StudentRecord>(`/users/students/${params.id}/record`)
      setRecord(response.data)
    } catch (reason: any) {
      const status = reason?.response?.status
      setError(status === 403 ? t.forbidden : status === 404 ? t.notFound : t.error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (params.id) void load() }, [params.id])

  return <main className="mx-auto max-w-6xl space-y-5 pb-12" dir={locale === 'en' ? 'ltr' : 'rtl'}>
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
      <div><Link href={basePath as never} className="mb-2 inline-flex items-center gap-2 text-sm text-primary hover:underline"><ArrowRight className="h-4 w-4" />{t.back}</Link><h1 className="text-2xl font-black">{t.title}</h1></div>
      {!loading && <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"><RefreshCw className="h-4 w-4" />{t.refresh}</button>}
    </header>
    {loading && <div className="flex min-h-44 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t.loading}</div>}
    {error && !loading && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}
    {record && !loading && <>
      <section className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-5">
        {record.avatar ? <img src={record.avatar} alt="" className="h-20 w-20 rounded-full border border-border object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary"><GraduationCap className="h-9 w-9" /></div>}
        <div className="min-w-0 flex-1"><h2 className="text-xl font-black">{displayName(record)}</h2><p className="mt-1 text-sm text-muted-foreground">{record.email}</p><p className="mt-1 text-sm text-muted-foreground">{record.phone || '—'}</p></div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${record.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'}`}>{record.isActive ? t.active : t.inactive}</span>
      </section>

      <Section title={t.account} icon={UserRound}><dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-muted-foreground">{t.grade}</dt><dd className="mt-1 font-semibold">{record.studentProfile?.gradeLevel ?? '—'}</dd></div>
        <div><dt className="text-muted-foreground">{t.nationalId}</dt><dd className="mt-1 font-semibold">{record.studentProfile?.nationalId || '—'}</dd></div>
        <div><dt className="text-muted-foreground">{t.birthDate}</dt><dd className="mt-1 font-semibold">{formatDate(record.studentProfile?.dateOfBirth, locale)}</dd></div>
        <div><dt className="text-muted-foreground">{t.joined}</dt><dd className="mt-1 font-semibold">{formatDate(record.createdAt, locale)}</dd></div>
      </dl></Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title={t.classes} icon={BookOpen}>{record.enrollments.length ? <div className="space-y-3">{record.enrollments.map((item) => <article key={item.class.id} className="rounded-lg bg-muted/40 p-3"><h3 className="font-bold">{item.class.name}</h3><p className="mt-1 text-sm text-muted-foreground">{t.academicYear}: {item.class.academicYear || '—'} · {t.teacher}: {item.class.teacher?.name || '—'}</p><p className="mt-1 text-xs text-muted-foreground">{t.enrolledAt}: {formatDate(item.enrolledAt, locale)}</p></article>)}</div> : <p className="text-sm text-muted-foreground">{t.noClasses}</p>}</Section>
        <Section title={t.guardians} icon={Heart}>{record.parents.length ? <div className="space-y-3">{record.parents.map((item) => <article key={item.parent.id} className="rounded-lg bg-muted/40 p-3"><h3 className="font-bold">{item.parent.name || '—'}</h3><p className="mt-1 text-sm text-muted-foreground">{t.relationship}: {item.relationship ? t.relationshipLabels[item.relationship.toUpperCase()] || item.relationship : t.unknown}</p><p className="mt-1 text-sm text-muted-foreground">{item.parent.phone || item.parent.email}</p></article>)}</div> : <p className="text-sm text-muted-foreground">{t.noGuardians}</p>}</Section>
      </div>

      <Section title={t.attendance} icon={CalendarDays}>{record.attendance.length ? <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-start text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-3 py-2">{t.date}</th><th className="px-3 py-2">{t.class}</th><th className="px-3 py-2">{t.attendanceStatus}</th><th className="px-3 py-2">{t.notes}</th></tr></thead><tbody className="divide-y divide-border">{record.attendance.map((item) => <tr key={item.id}><td className="px-3 py-2">{formatDate(item.date, locale)}</td><td className="px-3 py-2">{item.class.name}</td><td className="px-3 py-2">{({ PRESENT: t.present, ABSENT: t.absent, LATE: t.late, EXCUSED: t.excused } as Record<string, string>)[item.status] || item.status}</td><td className="px-3 py-2">{item.notes || '—'}</td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">{t.noAttendance}</p>}</Section>

      <Section title={t.grades} icon={ClipboardCheck}>{record.studentGrades.length ? <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-start text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-3 py-2">{t.subject}</th><th className="px-3 py-2">{t.assessment}</th><th className="px-3 py-2">{t.score}</th><th className="px-3 py-2">{t.feedback}</th><th className="px-3 py-2">{t.date}</th></tr></thead><tbody className="divide-y divide-border">{record.studentGrades.map((item) => <tr key={item.id}><td className="px-3 py-2">{item.subject.name}</td><td className="px-3 py-2">{item.assignment?.title || '—'}</td><td className="px-3 py-2">{item.grade ?? item.score} / {item.maxScore}</td><td className="px-3 py-2">{item.comments || '—'}</td><td className="px-3 py-2">{formatDate(item.createdAt, locale)}</td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">{t.noGrades}</p>}</Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title={t.entrance} icon={ClipboardCheck}>{record.placementAssessmentAttempts.length ? <div className="space-y-3">{record.placementAssessmentAttempts.map((item) => <article key={item.id} className="rounded-lg bg-muted/40 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold">{item.assessmentKey}</h3><p className="text-sm text-muted-foreground">{t.grade}: {item.gradeLevel} · {t.correct}: {item.correctCount} / {item.questionCount}</p><p className="text-xs text-muted-foreground">{formatDate(item.completedAt, locale)}</p></div><strong>{Math.round(item.score)}%</strong></div>{item.weakAreas?.length ? <div className="mt-3 border-t border-border pt-3"><p className="mb-2 text-sm font-semibold">{t.weakAreas}</p><div className="flex flex-wrap gap-2">{item.weakAreas.map((area) => <span key={area.category} className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">{area.category}: {area.incorrect} · {t.accuracy} {area.accuracy}%</span>)}</div></div> : null}{item.answers?.length ? <details className="mt-3 border-t border-border pt-3"><summary className="cursor-pointer text-sm font-semibold text-primary">{t.answerDetails} ({item.answers.length})</summary><ol className="mt-3 space-y-3">{item.answers.map((answer, index) => <li key={answer.id} className="rounded-lg border border-border bg-background p-3"><p className="text-xs font-semibold text-muted-foreground">{index + 1}. {answer.category}</p><p className="mt-1 font-semibold">{answer.prompt}</p><p className="mt-2 text-sm">{t.selectedAnswer}: <span className={answer.isCorrect ? 'font-semibold text-emerald-700 dark:text-emerald-300' : 'font-semibold text-rose-700 dark:text-rose-300'}>{answer.selectedAnswer || t.noAnswer}</span></p>{answer.correctAnswer && <p className="mt-1 text-sm">{t.correctAnswer}: <span className="font-semibold">{answer.correctAnswer}</span></p>}{answer.explanation && <p className="mt-1 text-sm text-muted-foreground">{t.explanation}: {answer.explanation}</p>}</li>)}</ol></details> : null}</article>)}</div> : <p className="text-sm text-muted-foreground">{t.noEntrance}</p>}</Section>
        <Section title={t.learning} icon={GraduationCap}><dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">{t.style}</dt><dd className="mt-1 font-semibold">{record.smartProfile?.learningStyle || '—'}</dd></div><div><dt className="text-muted-foreground">{t.masteredSkills}</dt><dd className="mt-1 font-semibold">{record.skillMasteries.length}</dd></div><div><dt className="text-muted-foreground">{t.strengths}</dt><dd className="mt-1">{record.smartProfile?.strengthSubjects.join('، ') || '—'}</dd></div><div><dt className="text-muted-foreground">{t.needsWork}</dt><dd className="mt-1">{record.smartProfile?.weakSubjects.join('، ') || '—'}</dd></div></dl>{record.skillMasteries.length > 0 && <ul className="mt-4 grid gap-2 border-t border-border pt-3 sm:grid-cols-2">{record.skillMasteries.map((item) => <li key={item.id} className="text-sm"><span className="font-semibold">{item.skillNode.name}</span><span className="text-muted-foreground"> · {item.skillNode.subject.name} · {item.masteryLevel}</span></li>)}</ul>}{!record.skillMasteries.length && <p className="mt-3 text-sm text-muted-foreground">{t.noSkills}</p>}</Section>
      </div>

      <Section title={t.surveys} icon={ClipboardCheck}>{record.parentSurveys?.length ? <div className="space-y-3">{record.parentSurveys.map((survey) => {
        const surveyKey = survey.surveyId || survey.id || survey.createdAt
        const entries = Object.entries(survey.answers || {}).filter(([questionId]) => surveyQuestions[locale][questionId])
        return <article key={surveyKey} className="rounded-lg bg-muted/40 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold">{survey.respondentRole.toUpperCase() === 'STUDENT' ? t.student : t.parent}</h3><p className="text-sm text-muted-foreground">{t.date}: {formatDate(survey.updatedAt || survey.createdAt, locale)}</p></div><span className="text-xs text-muted-foreground">{entries.length ? `${entries.length} ${locale === 'en' ? 'answers' : 'إجابة'}` : t.surveySavedOnly}</span></div>{entries.length > 0 && <dl className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-2">{entries.map(([questionId, answer]) => <div key={questionId}><dt className="text-xs text-muted-foreground">{surveyQuestions[locale][questionId]}</dt><dd className="mt-1 text-sm font-semibold">{answer}</dd></div>)}</dl>}</article>
      })}</div> : <p className="text-sm text-muted-foreground">{t.noSurveys}</p>}</Section>
    </>}
  </main>
}
