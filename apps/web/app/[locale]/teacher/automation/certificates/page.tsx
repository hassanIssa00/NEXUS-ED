'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocale } from 'next-intl'
import { Award, BadgeCheck, BookOpenCheck, Check, Download, HeartHandshake, Medal, RefreshCw, ShieldCheck, Star, Trophy } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

type ClassItem = { id: string; name: string }
type Student = { id: string; name?: string; email: string }
type Certificate = { id: string; serial: string; title: string; description?: string; createdAt: string; student: { id: string; name?: string; email: string } }

const certificateTypes = [
  { id: 'academic', label: 'تميز أكاديمي', labelEn: 'Academic excellence', title: 'شهادة تميز أكاديمي', titleEn: 'Certificate of Academic Excellence', description: 'تقديرًا للجهد والمثابرة والتميز في المسيرة التعليمية.', descriptionEn: 'In recognition of effort, perseverance, and excellence in learning.', icon: Trophy },
  { id: 'attendance', label: 'مواظبة', labelEn: 'Attendance', title: 'شهادة مواظبة والتزام', titleEn: 'Certificate of Attendance and Commitment', description: 'تقديرًا للالتزام والمواظبة والحرص على الحضور.', descriptionEn: 'In recognition of commitment, consistency, and excellent attendance.', icon: Check },
  { id: 'participation', label: 'مشاركة فاعلة', labelEn: 'Active participation', title: 'شهادة مشاركة فاعلة', titleEn: 'Certificate of Active Participation', description: 'تقديرًا للمشاركة الإيجابية والتفاعل البنّاء داخل الصف.', descriptionEn: 'In recognition of positive participation and constructive classroom engagement.', icon: HeartHandshake },
  { id: 'mastery', label: 'إتقان مهارة', labelEn: 'Skill mastery', title: 'شهادة إتقان مهارة', titleEn: 'Certificate of Skill Mastery', description: 'تقديرًا لإتقان مهارة تعليمية وبذل الجهد في تطويرها.', descriptionEn: 'In recognition of mastering a learning skill and working to develop it.', icon: BookOpenCheck },
  { id: 'achievement', label: 'إنجاز مميز', labelEn: 'Outstanding achievement', title: 'شهادة إنجاز مميز', titleEn: 'Certificate of Outstanding Achievement', description: 'احتفاءً بإنجاز يستحق التقدير ومواصلة التقدم.', descriptionEn: 'Celebrating a noteworthy achievement and continued progress.', icon: Medal },
  { id: 'appreciation', label: 'شكر وتقدير', labelEn: 'Appreciation', title: 'شهادة شكر وتقدير', titleEn: 'Certificate of Appreciation', description: 'شكرًا للعطاء والتعاون والروح الإيجابية.', descriptionEn: 'With thanks for generosity, cooperation, and a positive spirit.', icon: Star },
] as const

export default function TeacherCertificatesPage() {
  const isEnglish = useLocale() === 'en'
  const tr = (ar: string, en: string) => isEnglish ? en : ar
  const getError = () => tr('تعذر إتمام الطلب.', 'Could not complete the request.')
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [classId, setClassId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [templateId, setTemplateId] = useState<(typeof certificateTypes)[number]['id']>('academic')
  const [title, setTitle] = useState<string>(() => isEnglish ? certificateTypes[0].titleEn : certificateTypes[0].title)
  const [description, setDescription] = useState<string>(() => isEnglish ? certificateTypes[0].descriptionEn : certificateTypes[0].description)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const selectedStudent = useMemo(() => students.find((student) => student.id === studentId), [students, studentId])

  const load = useCallback(async () => {
    setError('')
    try {
      const [classResponse, certificateResponse] = await Promise.all([
        apiClient.get<ClassItem[]>('/workspace/teacher/classes'),
        apiClient.get<Certificate[]>('/workspace/teacher/certificates'),
      ])
      setClasses(classResponse.data || [])
      setCertificates(certificateResponse.data || [])
    } catch {
      setError(getError())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const changeClass = async (id: string) => {
    setClassId(id)
    setStudentId('')
    setStudents([])
    setError('')
    if (!id) return
    try {
      const response = await apiClient.get<Student[]>(`/workspace/teacher/classes/${encodeURIComponent(id)}/students`)
      setStudents(response.data || [])
    } catch {
      setError(getError())
    }
  }

  const chooseTemplate = (id: (typeof certificateTypes)[number]['id']) => {
    const option = certificateTypes.find((item) => item.id === id)
    if (!option) return
    setTemplateId(option.id)
    setTitle(isEnglish ? option.titleEn : option.title)
    setDescription(isEnglish ? option.descriptionEn : option.description)
  }

  const issue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await apiClient.post('/workspace/teacher/certificates', { classId, studentId, title, description })
      setSuccess(isEnglish ? `“${title}” was issued and saved to the student's profile.` : `صدرت شهادة «${title}» وحُفظت في ملف الطالب.`)
      await load()
    } catch {
      setError(getError())
    } finally {
      setBusy(false)
    }
  }

  const download = async (certificate: Certificate) => {
    setError('')
    try {
      const response = await apiClient.get(`/workspace/certificates/${encodeURIComponent(certificate.id)}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${certificate.serial}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setError(getError())
    }
  }

  return <main dir={isEnglish ? 'ltr' : 'rtl'} className="mx-auto max-w-7xl space-y-6 p-4 pb-12 md:p-7">
    <header className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-l from-[#152b49] via-[#214d6a] to-[#177c70] p-6 text-white shadow-lg md:p-8">
      <div aria-hidden="true" className="absolute -left-8 -top-16 size-56 rounded-full border-[30px] border-white/5" />
      <div aria-hidden="true" className="absolute bottom-[-84px] right-[36%] size-48 rounded-full bg-[#e9b64c]/15 blur-2xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-2xl border border-white/15 bg-white/10"><Award className="size-7 text-[#f3c96e]" /></div>
          <div><p className="text-sm font-bold text-sky-100">Nexus EDU · Al-Ikhlas Private Schools</p><h1 className="mt-1 text-2xl font-black md:text-3xl">{tr('الشهادات والإنجازات', 'Certificates and achievements')}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-200">{tr('أصدر شهادة بهوية المدرسة، راجع معاينتها، واحفظها مباشرةً في ملف الطالب مع رمز تحقق إلكتروني.', 'Issue a school-branded certificate, preview it, and save it to the student profile with an electronic verification code.')}</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/10 px-4 py-3"><div className="grid size-10 place-items-center rounded-xl bg-white"><img src="/second_logo.webp" alt={tr('مدارس الإخلاص الأهلية', 'Al-Ikhlas Private Schools')} className="size-8 object-contain" /></div><div className="grid size-10 place-items-center rounded-xl bg-white"><img src="/logo_new.webp" alt="Nexus EDU" className="size-8 object-contain" /></div><div className="ms-1"><strong className="block text-xl font-black">{certificates.length}</strong><span className="text-xs text-slate-200">{tr('شهادة صادرة', 'Certificates issued')}</span></div></div>
      </div>
    </header>

    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</p>}
    {success && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"><BadgeCheck className="size-5 shrink-0" />{success}</p>}

    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(430px,0.92fr)]">
      <section className="rounded-[1.5rem] border border-slate-200 bg-card p-5 shadow-sm md:p-6">
        <div className="mb-5 flex items-center gap-3"><div className="grid size-11 place-items-center rounded-xl bg-amber-50 text-amber-700"><Trophy className="size-5" /></div><div><h2 className="text-lg font-black">{tr('إصدار شهادة جديدة', 'Issue a new certificate')}</h2><p className="text-sm text-muted-foreground">{tr('اختر نوع التكريم ثم خصّص العنوان والعبارة.', 'Choose a recognition type, then customize the title and message.')}</p></div></div>
        <form onSubmit={issue} className="space-y-5">
          <fieldset><legend className="mb-2 text-sm font-bold">{tr('نوع الشهادة', 'Certificate type')}</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{certificateTypes.map((item) => { const Icon = item.icon; const selected = item.id === templateId; return <button key={item.id} type="button" onClick={() => chooseTemplate(item.id)} aria-pressed={selected} className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2 text-start text-xs font-bold transition ${selected ? 'border-[#177c70] bg-[#e9f6f2] text-[#145f58] ring-1 ring-[#177c70]/20' : 'border-slate-200 bg-background text-slate-700 hover:border-slate-300 hover:bg-slate-50'}`}><Icon className="size-4 shrink-0" />{isEnglish ? item.labelEn : item.label}</button> })}</div></fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm"><span className="font-bold">{tr('الفصل', 'Class')}</span><select required value={classId} onChange={(event) => void changeClass(event.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-3"><option value="">{tr('اختر الفصل', 'Select a class')}</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="block space-y-1.5 text-sm"><span className="font-bold">{tr('الطالب', 'Student')}</span><select required disabled={!classId || !students.length} value={studentId} onChange={(event) => setStudentId(event.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-3 disabled:cursor-not-allowed disabled:bg-muted"><option value="">{!classId ? tr('اختر الفصل أولاً', 'Select a class first') : students.length ? tr('اختر الطالب', 'Select a student') : tr('لا يوجد طلاب بهذا الفصل', 'No students in this class')}</option>{students.map((item) => <option key={item.id} value={item.id}>{item.name || item.email}</option>)}</select></label>
          </div>
          <label className="block space-y-1.5 text-sm"><span className="font-bold">{tr('عنوان الشهادة', 'Certificate title')}</span><input required value={title} maxLength={160} onChange={(event) => setTitle(event.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-3" /></label>
          <label className="block space-y-1.5 text-sm"><span className="font-bold">{tr('عبارة التقدير', 'Recognition message')}</span><textarea value={description} maxLength={1000} rows={3} onChange={(event) => setDescription(event.target.value)} className="w-full rounded-xl border border-input bg-background p-3 leading-6" /></label>
          <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#177c70]" /><p>{tr('بعد الإصدار تُحفظ الشهادة في ملف الطالب، ويمكن للطالب تنزيلها والتحقق من صحتها باستخدام الرمز الموجود في PDF.', 'After issuing, the certificate is saved to the student profile. The student can download it and verify it using the code in the PDF.')}</p></div>
          <button disabled={busy || loading || !classId || !studentId} className="h-12 w-full rounded-xl bg-gradient-to-l from-[#177c70] to-[#214d6a] px-4 font-bold text-white shadow-md shadow-[#214d6a]/15 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50">{busy ? tr('جارٍ إصدار الشهادة…', 'Issuing certificate…') : tr('إصدار الشهادة وحفظها في ملف الطالب', 'Issue certificate and save to student profile')}</button>
        </form>
      </section>

      <section aria-label={tr('معاينة الشهادة', 'Certificate preview')} className="space-y-3 xl:sticky xl:top-5">
        <div className="flex items-center justify-between"><div><h2 className="text-lg font-black">{tr('معاينة مباشرة', 'Live preview')}</h2><p className="text-sm text-muted-foreground">{tr('تتحدث المعاينة مع تعديلاتك', 'The preview updates as you edit')}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">{tr('نسخة المدرسة', 'School version')}</span></div>
        <article className="relative isolate min-h-[360px] overflow-hidden rounded-[1.75rem] border border-[#d8e3e6] bg-[#fbfcfc] p-5 shadow-[0_22px_65px_-38px_rgba(17,48,72,0.5)] sm:p-7">
          <div aria-hidden="true" className="absolute inset-[9px] -z-10 rounded-[1.35rem] border border-[#d2b36d]/70" />
          <div aria-hidden="true" className="absolute -left-12 top-24 -z-10 size-44 rounded-full bg-[#e9b64c]/10 blur-2xl" />
          <div aria-hidden="true" className="absolute -right-16 bottom-6 -z-10 size-56 rounded-full bg-[#159a91]/10 blur-2xl" />
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2"><span className="grid size-11 place-items-center rounded-xl border border-slate-100 bg-white shadow-sm"><img src="/second_logo.webp" alt={tr('شعار مدارس الإخلاص الأهلية', 'Al-Ikhlas Private Schools logo')} className="size-9 object-contain" /></span><span className="grid size-11 place-items-center rounded-xl border border-slate-100 bg-white shadow-sm"><img src="/logo_new.webp" alt="Nexus EDU logo" className="size-9 object-contain" /></span></div>
            <div className="text-start"><p className="text-xs font-black text-[#214d6a]">{tr('مدارس الإخلاص الأهلية', 'Al-Ikhlas Private Schools')}</p><p className="mt-1 text-[10px] font-semibold tracking-wide text-slate-500">NEXUS EDU · {tr('شهادة رقمية', 'Digital certificate')}</p></div>
          </div>
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full border border-amber-200 bg-gradient-to-br from-amber-50 to-white text-amber-600 shadow-sm"><Award className="size-6" /></div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-[#177c70]">{tr('شهادة تقدير وإنجاز', 'Certificate of Recognition and Achievement')}</p>
            <h3 className="mx-auto mt-2 max-w-lg text-xl font-black leading-snug text-[#152b49] sm:text-2xl">{title.trim() || tr('عنوان الشهادة', 'Certificate title')}</h3>
            <p className="mt-4 text-xs text-slate-500">{tr('تُمنح بكل فخر واعتزاز إلى', 'Proudly presented to')}</p>
            <p className="mx-auto mt-2 inline-block max-w-full rounded-xl border border-[#b9e5dc] bg-[#e9f7f4] px-5 py-2 text-lg font-black text-[#137968] sm:text-xl">{selectedStudent?.name || tr('اسم الطالب', 'Student name')}</p>
            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-600">{description.trim() || tr('تظهر هنا عبارة التقدير المختارة للشهادة.', 'The selected recognition message will appear here.')}</p>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3 border-t border-slate-200 pt-3">
            <div><p className="text-[10px] font-semibold text-slate-500">{tr('جهة الإصدار', 'Issued by')}</p><p className="mt-1 text-xs font-bold text-slate-800">{tr('مدارس الإخلاص الأهلية · الإدارة المدرسية', 'Al-Ikhlas Private Schools · School Administration')}</p></div>
            <div className="flex items-center gap-2 rounded-full bg-[#152b49] px-3 py-2 text-[10px] font-bold text-white"><ShieldCheck className="size-4 text-[#f3c96e]" />{tr('رمز تحقق إلكتروني داخل PDF', 'Electronic verification code in PDF')}</div>
          </div>
        </article>
      </section>
    </div>

    <section className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-card p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">{tr('سجل الشهادات', 'Certificate history')}</h2><p className="text-sm text-muted-foreground">{tr('الشهادات التي أصدرتها لفصولك', 'Certificates you issued to your classes')}</p></div><div className="flex items-center gap-3"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{certificates.length} {tr('شهادة', 'certificate(s)')}</span><button onClick={() => void load()} aria-label={tr('تحديث سجل الشهادات', 'Refresh certificate history')} className="grid size-10 place-items-center rounded-xl border border-slate-200 hover:bg-slate-50"><RefreshCw className="size-4" /></button></div></div>
      {loading ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><RefreshCw className="size-4 animate-spin" />{tr('جارٍ تحميل السجل…', 'Loading history…')}</div> : certificates.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-10 text-center"><Award className="mx-auto size-9 text-slate-400" /><p className="mt-3 font-bold">{tr('لا توجد شهادات صادرة حتى الآن', 'No certificates have been issued yet')}</p><p className="mt-1 text-sm text-muted-foreground">{tr('ابدأ بإصدار شهادة، وستظهر هنا وفي ملف الطالب.', 'Issue a certificate and it will appear here and in the student profile.')}</p></div> : <div className="grid gap-3 md:grid-cols-2">{certificates.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-[#a8c8c3] hover:shadow-sm">
        <div className="flex min-w-0 items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><Award className="size-5" /></div><div className="min-w-0"><h3 className="font-bold text-slate-900">{item.title}</h3><p className="mt-1 truncate text-sm text-slate-600">{item.student.name || item.student.email}</p><p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleDateString(isEnglish ? 'en-US' : 'ar-SA')}</p><p className="mt-1 font-mono text-[10px] text-slate-500" dir="ltr">{item.serial}</p></div></div>
        <button onClick={() => void download(item)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-[#214d6a] transition hover:border-[#214d6a] hover:bg-slate-50"><Download className="size-4" />{tr('تنزيل PDF', 'Download PDF')}</button>
      </article>)}</div>}
    </section>
  </main>
}
