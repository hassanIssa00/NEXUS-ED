'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { ArrowRight, BookOpen, CalendarDays, ClipboardCheck, Download, FileText, GraduationCap, Heart, Loader2, RefreshCw, UserRound } from 'lucide-react'
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
    answers?: Record<string, unknown>
  }>
  smartProfile?: { learningStyle: string; strengthSubjects: string[]; weakSubjects: string[]; performanceTrend: string } | null
  skillMasteries: Array<{ id: string; masteryLevel: string; skillNode: { name: string; subject: { name: string } } }>
}

const copy = {
  ar: {
    title: 'ملف الطالب', back: 'العودة للفصل', loading: 'جار تحميل ملف الطالب...', error: 'تعذر تحميل ملف الطالب من سجلات المدرسة.', forbidden: 'لا تملك صلاحية عرض ملف هذا الطالب.', notFound: 'لم يتم العثور على ملف الطالب في سجلات المدرسة.', refresh: 'إعادة المحاولة',
    account: 'البيانات الأساسية', grade: 'الصف الدراسي', nationalId: 'رقم الهوية', birthDate: 'تاريخ الميلاد', joined: 'تاريخ التسجيل', status: 'حالة الحساب', active: 'نشط', inactive: 'غير نشط',
    classes: 'الفصول المسجل بها', academicYear: 'العام الدراسي', teacher: 'المعلم المسؤول', enrolledAt: 'تاريخ التسجيل بالفصل', noClasses: 'لا توجد تسجيلات فصول لهذا الطالب.', guardians: 'أولياء الأمور المرتبطون', relationship: 'صلة القرابة', noGuardians: 'لا توجد حسابات أولياء أمور مرتبطة.',
    attendance: 'سجل الحضور', date: 'التاريخ', class: 'الفصل', attendanceStatus: 'الحالة', notes: 'ملاحظات', noAttendance: 'لا توجد سجلات حضور.', present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'بعذر', grades: 'الدرجات والتقييمات', subject: 'المادة', assessment: 'التقييم', score: 'الدرجة', feedback: 'ملاحظات المعلم', noGrades: 'لا توجد درجات مسجلة.', entrance: 'نتائج الاختبارات التأسيسية', correct: 'إجابة صحيحة', noEntrance: 'لا توجد اختبارات مسجلة.', fullReport: 'فتح ملف الإجابات الكامل', downloadPdf: 'تنزيل PDF', questions: 'سؤال محفوظ', weakAreas: 'نقاط تحتاج متابعة', accuracy: 'نسبة الإجابة الصحيحة', surveys: 'استبيانات الطالب والأسرة', noSurveys: 'لم يُسجَّل استبيان أسري لهذا الطالب حتى الآن.', surveyInstructions: 'يظهر الاستبيان هنا بعد أن يربط ولي الأمر حسابه بالطالب ويرسل إجاباته من بوابة ولي الأمر.', surveySavedOnly: 'الاستبيان محفوظ، لكن تفاصيل الإجابات غير متاحة لهذا الدور.', surveyNoAnswers: 'لا توجد إجابات محفوظة لهذا الاستبيان.', otherSurveyAnswer: 'إجابة أخرى', respondent: 'مجيب الاستبيان', parent: 'ولي الأمر', student: 'الطالب', learning: 'ملف التعلم والمهارات', style: 'أسلوب التعلم', strengths: 'نقاط القوة', needsWork: 'مهارات تحتاج متابعة', masteredSkills: 'المهارات المسجلة', noSkills: 'لا توجد مهارات مسجلة بعد.', unknown: 'غير محدد', relationshipLabels: { FATHER: 'الأب', MOTHER: 'الأم', GUARDIAN: 'ولي أمر' } as Record<string, string>,
  },
  en: {
    title: 'Student record', back: 'Back to class', loading: 'Loading student record…', error: 'Could not load this student record from school records.', forbidden: 'You do not have permission to view this student record.', notFound: 'This student record was not found at the school.', refresh: 'Try again',
    account: 'Basic information', grade: 'Grade', nationalId: 'National ID', birthDate: 'Date of birth', joined: 'Account created', status: 'Account status', active: 'Active', inactive: 'Inactive',
    classes: 'Enrolled classes', academicYear: 'Academic year', teacher: 'Assigned teacher', enrolledAt: 'Enrolled on', noClasses: 'No class enrollment is recorded.', guardians: 'Linked guardians', relationship: 'Relationship', noGuardians: 'No guardian accounts are linked.',
    attendance: 'Attendance', date: 'Date', class: 'Class', attendanceStatus: 'Status', notes: 'Notes', noAttendance: 'No attendance records.', present: 'Present', absent: 'Absent', late: 'Late', excused: 'Excused', grades: 'Grades and assessments', subject: 'Subject', assessment: 'Assessment', score: 'Score', feedback: 'Teacher notes', noGrades: 'No grades are recorded.', entrance: 'Placement assessment results', correct: 'Correct answers', noEntrance: 'No assessment results are recorded.', fullReport: 'Open full answer report', downloadPdf: 'Download PDF', questions: 'saved questions', weakAreas: 'Areas to follow up', accuracy: 'Accuracy', surveys: 'Student and family surveys', noSurveys: 'No family survey is linked to this student yet.', surveyInstructions: 'This section appears after a parent links their account to the student and submits the survey from the parent portal.', surveySavedOnly: 'The survey is saved, but detailed answers are not available for this role.', surveyNoAnswers: 'No answers are saved for this survey.', otherSurveyAnswer: 'Other response', respondent: 'Respondent', parent: 'Parent', student: 'Student', learning: 'Learning profile and skills', style: 'Learning style', strengths: 'Strengths', needsWork: 'Skills to follow up', masteredSkills: 'Recorded skills', noSkills: 'No skills are recorded yet.', unknown: 'Not specified', relationshipLabels: { FATHER: 'Father', MOTHER: 'Mother', GUARDIAN: 'Guardian' } as Record<string, string>,
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

function formatSurveyAnswer(value: unknown) {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(formatSurveyAnswer).filter(Boolean).join('، ')
  if (value && typeof value === 'object') return JSON.stringify(value)
  return '—'
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] || character)
}

function surveyPdfImageUrl(value: string | null | undefined) {
  if (!value) return ''
  if (/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value) && value.length <= 7_000_000) return value
  try {
    const parsed = new URL(value, window.location.origin)
    if (parsed.protocol !== 'https:' && parsed.origin !== window.location.origin) return ''
    return parsed.href
  } catch {
    return ''
  }
}

function downloadSurveyPdf(record: StudentRecord, survey: NonNullable<StudentRecord['parentSurveys']>[number], locale: 'ar' | 'en') {
  const popup = window.open('', '_blank')
  if (!popup) {
    window.alert(locale === 'en' ? 'Allow pop-ups to create the survey PDF.' : 'اسمح بالنوافذ المنبثقة لإنشاء ملف الاستبيان PDF.')
    return
  }

  const english = locale === 'en'
  const studentName = displayName(record)
  const date = formatDate(survey.updatedAt || survey.createdAt, locale)
  const answers = Object.entries(survey.answers || {})
  const avatar = surveyPdfImageUrl(record.avatar)
  const schoolLogo = new URL('/second_logo.webp', window.location.origin).href
  const nexusLogo = new URL('/logo_new.webp', window.location.origin).href
  const emblem = new URL('/nexus_emblem_transparent.png', window.location.origin).href
  const questionLabels = surveyQuestions[locale]
  const rows = answers.map(([questionId, answer], index) => `
    <tr>
      <td class="number">${index + 1}</td>
      <th scope="row">${escapeHtml(questionLabels[questionId] || `${english ? 'Question' : 'السؤال'} (${questionId})`)}</th>
      <td>${escapeHtml(formatSurveyAnswer(answer))}</td>
    </tr>`).join('')
  const id = survey.surveyId || survey.id || '—'
  const dateText = english ? 'Submission date' : 'تاريخ الإرسال'
  const studentText = english ? 'Student' : 'الطالب'
  const gradeText = english ? 'Grade' : 'الصف الدراسي'
  const respondentText = survey.respondentRole.toUpperCase() === 'STUDENT'
    ? (english ? 'Student response' : 'إجابة الطالب')
    : (english ? 'Parent response' : 'إجابة ولي الأمر')

  popup.document.open()
  popup.document.write(`<!doctype html>
  <html lang="${locale}" dir="${english ? 'ltr' : 'rtl'}">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(english ? `Family survey · ${studentName}` : `استبيان أسري · ${studentName}`)}</title>
      <style>
        @page { size: A4 portrait; margin: 12mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { margin: 0; background: #e9eef2; color: #142a43; font-family: Arial, Tahoma, sans-serif; font-size: 12px; line-height: 1.7; }
        .toolbar { display: flex; justify-content: center; gap: 10px; padding: 12px; background: #12665c; }
        .toolbar button { border: 0; border-radius: 9px; padding: 9px 18px; background: #b28b49; color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
        .toolbar button.secondary { background: #fff; color: #12665c; }
        .page { position: relative; width: 186mm; min-height: 273mm; margin: 10mm auto; padding: 10mm; background: #fff; border: 1px solid #d6e0e7; box-shadow: 0 9px 30px #152b491f; }
        .page::before { position: absolute; content: ''; inset: 4mm; border: 1.5px double #0f8e78; pointer-events: none; }
        .page::after { position: absolute; content: ''; inset: 6mm; border: 1px solid #d6a84f; pointer-events: none; }
        .content { position: relative; z-index: 1; }
        header { display: grid; grid-template-columns: 1fr 1.4fr 1fr; align-items: center; gap: 8px; padding: 10px 8px; border: 1px solid #d7e0e7; border-bottom: 5px solid #10a88a; border-radius: 10px; background: #effaf6; }
        .school,.platform { display: flex; align-items: center; gap: 6px; min-width: 0; }
        .school img { width: 42px; height: 42px; object-fit: contain; background: white; border: 2px double #d6a84f; border-radius: 50%; }
        .school strong,.school span { display: block; font-size: 9px; line-height: 1.5; }
        .school span { color: #64748b; font-size: 8px; }
        .heading { text-align: center; }
        .heading p { margin: 0; color: #0f8e78; font-size: 8px; font-weight: 700; }
        .heading h1 { margin: 2px 0; color: #0d594f; font-size: 16px; line-height: 1.45; }
        .heading span { color: #64748b; font-size: 8px; }
        .platform { justify-content: end; }
        .platform > img { width: 75px; max-height: 42px; object-fit: contain; background: white; }
        .platform-mark { display: grid; place-items: center; width: 40px; height: 40px; border: 3px double #0f8e78; border-radius: 50%; color: #0f8e78; font-size: 7px; font-weight: 900; }
        .platform-mark img { width: 16px; height: 16px; object-fit: contain; }
        .meta { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin: 12px 0 9px; padding: 9px 11px; border: 1px solid #dbe4eb; border-radius: 9px; background: #f8fafc; }
        .identity { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .identity img,.identity .no-photo { display: grid; place-items: center; width: 54px; height: 54px; flex: 0 0 54px; border: 2px solid #d6a84f; border-radius: 50%; background: white; object-fit: contain; color: #0f8e78; font-weight: 800; }
        .identity h2 { margin: 0; font-size: 16px; }
        .identity p,.meta-date { margin: 0; color: #64748b; font-size: 9px; }
        .badge { padding: 4px 8px; border: 1px solid #a9d8d0; border-radius: 999px; background: #effaf7; color: #17695f; font-size: 8px; font-weight: 800; white-space: nowrap; }
        .facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; margin: 8px 0 12px; }
        .fact { padding: 7px 9px; border: 1px solid #e0e7ee; border-radius: 8px; background: #f8fafc; }
        .fact span { display: block; color: #64748b; font-size: 8px; }
        .fact strong { display: block; overflow-wrap: anywhere; font-size: 10px; }
        h3 { margin: 12px 0 6px; padding-bottom: 4px; border-bottom: 1.5px solid #10a88a; color: #0d594f; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th,td { padding: 7px 8px; border: 1px solid #dfe6ed; text-align: start; vertical-align: top; overflow-wrap: anywhere; }
        thead th { background: #12665c; color: #fff; font-size: 9px; }
        tbody tr:nth-child(even) { background: #f2f8f6; }
        tbody th { width: 42%; background: #f8fafc; font-size: 10px; }
        td.number { width: 8%; text-align: center; font-weight: 800; }
        .empty { padding: 18px; border: 1px dashed #cbd5e1; border-radius: 8px; color: #64748b; text-align: center; }
        footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 14px; padding-top: 9px; border-top: 1px solid #d7e0e7; color: #64748b; font-size: 8px; }
        .stamp { display: flex; align-items: center; gap: 8px; color: #0f766e; font-weight: 800; }
        .stamp img { width: 38px; height: 38px; padding: 3px; border: 3px double #d6a84f; border-radius: 50%; object-fit: contain; }
        .nexus-final-stamp { display: flex; align-items: center; justify-content: center; gap: 8px; width: max-content; max-width: 100%; margin: 12px auto 4px; padding: 6px 16px; border: 3px double #d6a84f; border-radius: 999px; background: #effaf6; color: #0f766e; font-weight: 800; }
        .nexus-final-stamp img { width: 38px; height: 38px; object-fit: contain; }
        .nexus-final-stamp small { display: block; color: #64748b; font-size: 8px; font-weight: 500; }
        tbody tr,.fact,.meta { break-inside: avoid; page-break-inside: avoid; }
        @media print { body { background: #fff; } .toolbar { display: none; } .page { width: auto; min-height: 0; margin: 0; padding: 9mm; border: 0; box-shadow: none; break-after: auto; } .page::before,.page::after { display: none; } body:has(.page)::after { position: fixed; content: ''; inset: 3mm; z-index: 99; border: 1.5px double #d6a84f; pointer-events: none; } thead { display: table-header-group; } }
      </style>
    </head>
    <body>
      <div class="toolbar"><button onclick="window.print()">${english ? 'Print / Save PDF' : 'طباعة / حفظ PDF'}</button><button class="secondary" onclick="window.close()">${english ? 'Close' : 'إغلاق'}</button></div>
      <main class="page"><div class="content">
        <header>
          <div class="school"><img src="${escapeHtml(schoolLogo)}" alt="${english ? 'School seal' : 'ختم المدرسة'}" /><div><strong>${english ? 'Al-Ikhlas Private Schools' : 'مدارس الإخلاص الأهلية'}</strong><span>${english ? 'Jeddah · Saudi Arabia' : 'جدة · المملكة العربية السعودية'}</span></div></div>
          <div class="heading"><p>${english ? 'OFFICIAL SCHOOL REPORT' : 'تقرير مدرسي إلكتروني'}</p><h1>${english ? 'Student and Family Survey' : 'تقرير استبيان الطالب والأسرة'}</h1><span>${escapeHtml(respondentText)}</span></div>
          <div class="platform"><img src="${escapeHtml(nexusLogo)}" alt="Nexus EDU" /><div class="platform-mark"><img src="${escapeHtml(emblem)}" alt="" />NEXUS</div></div>
        </header>
        <div class="meta"><div class="identity">${avatar ? `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(studentName)}" />` : '<span class="no-photo">NEXUS</span>'}<div><h2>${escapeHtml(studentName)}</h2><p>${studentText}: ${escapeHtml(studentName)}</p></div></div><span class="badge">${english ? 'Saved school record' : 'محفوظ في ملف الطالب'}</span></div>
        <div class="facts"><div class="fact"><span>${gradeText}</span><strong>${escapeHtml(String(record.studentProfile?.gradeLevel ?? '—'))}</strong></div><div class="fact"><span>${dateText}</span><strong>${escapeHtml(date)}</strong></div><div class="fact"><span>${english ? 'Survey reference' : 'رقم الاستبيان'}</span><strong>${escapeHtml(id)}</strong></div></div>
        <h3>${english ? `Recorded answers (${answers.length})` : `الإجابات المحفوظة (${answers.length})`}</h3>
        ${answers.length ? `<table><thead><tr><th>${english ? '#' : 'م'}</th><th>${english ? 'Question' : 'السؤال'}</th><th>${english ? 'Response' : 'الإجابة'}</th></tr></thead><tbody>${rows}</tbody></table>` : `<div class="empty">${english ? 'No answers were stored for this survey.' : 'لا توجد إجابات محفوظة لهذا الاستبيان.'}</div>`}
        <div class="nexus-final-stamp"><img src="${escapeHtml(emblem)}" alt="" /><span>${english ? 'Nexus EDU · Platform seal' : 'منصة نكسس التعليمية · ختم المنصة'}<small>${english ? 'Issued from the saved student record' : 'تقرير مستخرج من ملف الطالب المحفوظ'}</small></span></div>
        <footer><div class="stamp"><img src="${escapeHtml(schoolLogo)}" alt="" /><span>${english ? 'Official school record' : 'ختم مدارس الإخلاص الأهلية'}<br /><small>Nexus EDU · ${english ? 'Issued from student file' : 'مستخرج من ملف الطالب'}</small></span></div><span>${english ? 'Confidential student information' : 'بيانات الطالب سرية'}</span><span>${date}</span></footer>
      </div></main>
      <script>window.addEventListener('load',()=>{const images=[...document.images];Promise.all(images.map(image=>image.decode?.().catch(()=>undefined))).then(()=>setTimeout(()=>window.print(),250))})</script>
    </body>
  </html>`)
  popup.document.close()
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
  const [downloadError, setDownloadError] = useState('')
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null)

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

  async function downloadAssessmentPdf(attemptId: string) {
    setDownloadingReportId(attemptId)
    setDownloadError('')
    try {
      const { data } = await apiClient.get<Blob>(`/assessments/placement/reports/${encodeURIComponent(attemptId)}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `NEXUS-${attemptId.slice(-8).toUpperCase()}-assessment-report.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setDownloadError(locale === 'en' ? 'Could not download the full PDF report. Please retry.' : 'تعذر تنزيل تقرير الاختبار بصيغة PDF. حاول مرة أخرى.')
    } finally {
      setDownloadingReportId(null)
    }
  }

  return <main className="mx-auto max-w-6xl space-y-5 pb-12" dir={locale === 'en' ? 'ltr' : 'rtl'}>
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
      <div><Link href={basePath as never} className="mb-2 inline-flex items-center gap-2 text-sm text-primary hover:underline"><ArrowRight className="h-4 w-4" />{t.back}</Link><h1 className="text-2xl font-black">{t.title}</h1></div>
      {!loading && <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"><RefreshCw className="h-4 w-4" />{t.refresh}</button>}
    </header>
    {loading && <div className="flex min-h-44 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t.loading}</div>}
    {error && !loading && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}
    {downloadError && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{downloadError}</div>}
    {record && !loading && <>
      <section className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-5">
        {record.avatar ? <img src={record.avatar} alt={`صورة ${displayName(record)}`} className="h-20 w-20 rounded-full border border-border bg-muted object-contain" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary"><GraduationCap className="h-9 w-9" /></div>}
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
      <Section title={t.entrance} icon={ClipboardCheck}>{record.placementAssessmentAttempts.length ? <div className="space-y-3">{record.placementAssessmentAttempts.map((item) => <article key={item.id} className="rounded-lg bg-muted/40 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold">{item.assessmentKey}</h3><p className="text-sm text-muted-foreground">{t.grade}: {item.gradeLevel} · {t.correct}: {item.correctCount} / {item.questionCount}</p><p className="text-xs text-muted-foreground">{formatDate(item.completedAt, locale)}</p></div><strong>{Math.round(item.score)}%</strong></div>{item.weakAreas?.length ? <div className="mt-3 border-t border-border pt-3"><p className="mb-2 text-sm font-semibold">{t.weakAreas}</p><div className="flex flex-wrap gap-2">{item.weakAreas.map((area) => <span key={area.category} className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">{area.category}: {area.incorrect} · {t.accuracy} {area.accuracy}%</span>)}</div></div> : null}<div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"><span className="text-xs text-muted-foreground">{item.answers?.length ?? item.questionCount} {t.questions}</span><div className="flex flex-wrap gap-2"><Link href={`/assessment/reports/${encodeURIComponent(item.id)}?returnTo=${encodeURIComponent(`${basePath === '/teacher/classes' ? '/teacher/students' : basePath}/${record.id}`)}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"><FileText className="h-4 w-4" />{t.fullReport}</Link><button type="button" onClick={() => void downloadAssessmentPdf(item.id)} disabled={downloadingReportId === item.id} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-800 disabled:cursor-wait disabled:opacity-60">{downloadingReportId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{t.downloadPdf}</button></div></div></article>)}</div> : <p className="text-sm text-muted-foreground">{t.noEntrance}</p>}</Section>
        <Section title={t.learning} icon={GraduationCap}><dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">{t.style}</dt><dd className="mt-1 font-semibold">{record.smartProfile?.learningStyle || '—'}</dd></div><div><dt className="text-muted-foreground">{t.masteredSkills}</dt><dd className="mt-1 font-semibold">{record.skillMasteries.length}</dd></div><div><dt className="text-muted-foreground">{t.strengths}</dt><dd className="mt-1">{record.smartProfile?.strengthSubjects.join('، ') || '—'}</dd></div><div><dt className="text-muted-foreground">{t.needsWork}</dt><dd className="mt-1">{record.smartProfile?.weakSubjects.join('، ') || '—'}</dd></div></dl>{record.skillMasteries.length > 0 && <ul className="mt-4 grid gap-2 border-t border-border pt-3 sm:grid-cols-2">{record.skillMasteries.map((item) => <li key={item.id} className="text-sm"><span className="font-semibold">{item.skillNode.name}</span><span className="text-muted-foreground"> · {item.skillNode.subject.name} · {item.masteryLevel}</span></li>)}</ul>}{!record.skillMasteries.length && <p className="mt-3 text-sm text-muted-foreground">{t.noSkills}</p>}</Section>
      </div>

      <Section title={t.surveys} icon={ClipboardCheck}>{record.parentSurveys?.length ? <div className="space-y-3">{record.parentSurveys.map((survey) => {
        const surveyKey = survey.surveyId || survey.id || survey.createdAt
        const hasAnswerDetails = survey.answers !== undefined
        const entries = Object.entries(survey.answers || {})
        return <article key={surveyKey} className="rounded-lg bg-muted/40 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">{survey.respondentRole.toUpperCase() === 'STUDENT' ? t.student : t.parent}</h3><p className="text-sm text-muted-foreground">{t.date}: {formatDate(survey.updatedAt || survey.createdAt, locale)}</p></div><div className="flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground">{hasAnswerDetails ? (entries.length ? `${entries.length} ${locale === 'en' ? 'answers' : 'إجابة'}` : t.surveyNoAnswers) : t.surveySavedOnly}</span>{hasAnswerDetails && <button type="button" onClick={() => downloadSurveyPdf(record, survey, locale)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-teal-700 px-3 text-xs font-bold text-white hover:bg-teal-800"><Download className="h-4 w-4" />{locale === 'en' ? 'Download PDF report' : 'تنزيل تقرير PDF'}</button>}</div></div>{entries.length > 0 && <dl className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-2">{entries.map(([questionId, answer]) => <div key={questionId}><dt className="text-xs text-muted-foreground">{surveyQuestions[locale][questionId] || `${t.otherSurveyAnswer} (${questionId})`}</dt><dd className="mt-1 whitespace-pre-wrap text-sm font-semibold">{formatSurveyAnswer(answer)}</dd></div>)}</dl>}</article>
      })}</div> : <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4"><p className="text-sm font-semibold">{t.noSurveys}</p><p className="mt-1 text-sm text-muted-foreground">{t.surveyInstructions}</p></div>}</Section>
    </>}
  </main>
}
