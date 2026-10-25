'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { AlertCircle, CalendarClock, Check, ChevronLeft, Clock3, Copy, Loader2, Plus, Radio, Users, Video, X } from 'lucide-react'
import { DatePicker, dateInputValue } from '@/components/ui/date-picker'
import { TimeSelect } from '@/components/ui/time-select'

type Member = { id: string; name: string; role: string; avatar?: string | null }
type ClassItem = { id: string; name: string }
type ParentContact = { id: string; name: string; phone?: string | null; studentName: string }
type StudentRosterItem = { id: string; name: string; parents: Array<{ id: string; name: string; phone?: string | null }> }
type Meeting = {
  id: string
  title: string
  description?: string | null
  scheduledAt: string
  startedAt?: string | null
  endedAt?: string | null
  meetingType: 'CLASS' | 'PARENT' | 'STAFF' | string
  classroom?: { id: string; name: string } | null
  status: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED' | string
  host: Member
  participants: Array<{ userId: string; joinedAt?: string | null; leftAt?: string | null; user: Member }>
}

function errorMessage(error: unknown, fallback: string) {
  const candidate = error as { response?: { data?: { message?: string | string[] } }; message?: string }
  const message = candidate?.response?.data?.message
  return Array.isArray(message) ? message.join('، ') : message || candidate?.message || fallback
}

function nextMeetingSlot(now: Date) {
  const minuteOfDay = now.getHours() * 60 + now.getMinutes() + 1
  const rounded = Math.ceil(minuteOfDay / 15) * 15
  if (rounded >= 24 * 60) return '24:00'
  return `${String(Math.floor(rounded / 60)).padStart(2, '0')}:${String(rounded % 60).padStart(2, '0')}`
}

function defaultMeetingSlot(date: string, now: Date) {
  return date === dateInputValue(now) ? nextMeetingSlot(now) : '09:00'
}

export default function NexusMeetingsPage() {
  const locale = useLocale() === 'en' ? 'en' : 'ar'
  const isEnglish = locale === 'en'
  const router = useRouter()
  const { profile } = useAuth()
  const role = profile?.role || ''
  const isTeacher = role === 'teacher'
  const isSchoolManager = role === 'principal' || role === 'hr'
  const canCreate = isTeacher || isSchoolManager

  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [meetingType, setMeetingType] = useState<'CLASS' | 'PARENT' | 'STAFF'>(isTeacher ? 'CLASS' : 'STAFF')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [meetingDate, setMeetingDate] = useState('')
  const [meetingTime, setMeetingTime] = useState('')
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [classId, setClassId] = useState('')
  const [roster, setRoster] = useState<StudentRosterItem[]>([])
  const [rosterLoading, setRosterLoading] = useState(false)
  const [selectedParentIds, setSelectedParentIds] = useState<string[]>([])
  const [error, setError] = useState('')
  const [actionMeeting, setActionMeeting] = useState<string | null>(null)
  const [copiedMeeting, setCopiedMeeting] = useState<string | null>(null)
  const [clockNow, setClockNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const earliestMeetingTime = meetingDate === dateInputValue(clockNow) ? nextMeetingSlot(clockNow) : undefined

  const refresh = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get<Meeting[]>('/meetings')
      setMeetings(response.data || [])
      setError('')
    } catch (requestError) {
      setError(errorMessage(requestError, isEnglish ? 'Could not load meetings.' : 'تعذر تحميل الاجتماعات.'))
    } finally { setLoading(false) }
  }

  useEffect(() => { void refresh() }, [])

  useEffect(() => {
    if (!isTeacher) { setClasses([]); return }
    let active = true
    apiClient.get<ClassItem[]>('/workspace/teacher/classes')
      .then(({ data }) => { if (active) setClasses(data || []) })
      .catch((requestError) => { if (active) setError(errorMessage(requestError, isEnglish ? 'Could not load your classes.' : 'تعذر تحميل فصولك الدراسية.')) })
    return () => { active = false }
  }, [isTeacher, isEnglish])

  useEffect(() => {
    if (!isTeacher || !classId) { setRoster([]); setSelectedParentIds([]); return }
    const controller = new AbortController()
    setRosterLoading(true)
    apiClient.get<StudentRosterItem[]>(`/workspace/teacher/classes/${encodeURIComponent(classId)}/students`, { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setRoster(data || []) })
      .catch((requestError) => { if (!controller.signal.aborted) setError(errorMessage(requestError, isEnglish ? 'Could not load the class roster.' : 'تعذر تحميل قائمة الفصل.')) })
      .finally(() => { if (!controller.signal.aborted) setRosterLoading(false) })
    return () => controller.abort()
  }, [classId, isTeacher, isEnglish])

  const parents = useMemo(() => {
    const byId = new Map<string, ParentContact>()
    roster.forEach((student) => student.parents.forEach((parent) => {
      const previous = byId.get(parent.id)
      const studentName = student.name || (isEnglish ? 'Student' : 'طالب')
      byId.set(parent.id, { ...parent, studentName: previous ? `${previous.studentName}، ${studentName}` : studentName })
    }))
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, locale))
  }, [roster, isEnglish, locale])

  const sortedMeetings = useMemo(() => [...meetings].sort((left, right) => {
    const statusOrder = (meeting: Meeting) => meeting.status === 'LIVE' ? 0 : meeting.status === 'SCHEDULED' ? 1 : 2
    return statusOrder(left) - statusOrder(right) || new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime()
  }), [meetings])

  const resetForm = () => {
    setTitle(''); setDescription(''); setMeetingDate(''); setMeetingTime(''); setClassId(''); setRoster([]); setSelectedParentIds([])
    setMeetingType(isTeacher ? 'CLASS' : 'STAFF'); setShowCreate(false)
  }

  const submitMeeting = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!meetingDate || !meetingTime || !title.trim()) return
    if (meetingType !== 'STAFF' && !classId) { setError(isEnglish ? 'Choose the class for this meeting.' : 'اختر الفصل المرتبط بالاجتماع.'); return }
    if (meetingType === 'PARENT' && !selectedParentIds.length) { setError(isEnglish ? 'Choose at least one parent.' : 'اختر ولي أمر واحدًا على الأقل.'); return }
    const year = Number(meetingDate.slice(0, 4))
    const month = Number(meetingDate.slice(5, 7))
    const day = Number(meetingDate.slice(8, 10))
    const hour = Number(meetingTime.slice(0, 2))
    const minute = Number(meetingTime.slice(3, 5))
    const scheduledAt = new Date(year, month - 1, day, hour, minute, 0, 0)
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getFullYear() !== year || scheduledAt.getMonth() !== month - 1 || scheduledAt.getDate() !== day) {
      setError(isEnglish ? 'Choose a valid meeting date and time.' : 'اختر تاريخًا ووقتًا صحيحين للاجتماع.')
      return
    }
    if (scheduledAt.getTime() <= Date.now()) {
      setError(isEnglish ? 'Choose a time later than the current time on your device.' : 'اختر وقتًا لاحقًا للوقت الحالي الظاهر على جهازك.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await apiClient.post('/meetings', {
        meetingType,
        ...(meetingType !== 'STAFF' ? { classId } : {}),
        title: title.trim(),
        description: description.trim() || undefined,
        scheduledAt: scheduledAt.toISOString(),
        ...(meetingType === 'PARENT' ? { participantIds: selectedParentIds } : {}),
      })
      resetForm()
      await refresh()
    } catch (requestError) {
      setError(errorMessage(requestError, isEnglish ? 'Could not schedule the meeting.' : 'تعذر جدولة الاجتماع.'))
    } finally { setSaving(false) }
  }

  const runMeetingAction = async (meeting: Meeting, action: 'join' | 'cancel') => {
    setActionMeeting(meeting.id)
    setError('')
    try {
      if (action === 'join') {
        if (meeting.status === 'SCHEDULED' && meeting.host.id !== profile?.id) {
          setError(isEnglish ? 'Waiting for the meeting host to open the room.' : 'الاجتماع لم يبدأ بعد؛ انتظر المنظم ليفتح الغرفة.')
          return
        }
        router.push(`/meetings/${meeting.id}` as never)
        return
      }
      await apiClient.post(`/meetings/${meeting.id}/cancel`)
      await refresh()
    } catch (requestError) {
      setError(errorMessage(requestError, isEnglish ? 'The meeting action could not be completed.' : 'تعذر تنفيذ الإجراء على الاجتماع.'))
    } finally { setActionMeeting(null) }
  }

  const copyInviteLink = async (meeting: Meeting) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${locale}/meetings/${meeting.id}`)
      setCopiedMeeting(meeting.id)
      window.setTimeout(() => setCopiedMeeting(null), 1800)
    } catch { setError(isEnglish ? 'This browser does not allow copying the link.' : 'المتصفح لم يسمح بنسخ الرابط.') }
  }

  const formatDate = (value: string) => new Intl.DateTimeFormat(isEnglish ? 'en' : 'ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  const typeLabel = (type: string) => ({ CLASS: isEnglish ? 'Online class' : 'حصة مع طلاب الفصل', PARENT: isEnglish ? 'Parent meeting' : 'اجتماع أولياء الأمور', STAFF: isEnglish ? 'All school staff' : 'اجتماع جميع موظفي المدرسة' }[type] || type)
  const statusText = (status: string) => ({ LIVE: isEnglish ? 'Live now' : 'مباشر الآن', SCHEDULED: isEnglish ? 'Scheduled' : 'مجدول', ENDED: isEnglish ? 'Ended' : 'انتهى', CANCELLED: isEnglish ? 'Cancelled' : 'ملغي' }[status] || status)

  return <main className="mx-auto w-full max-w-7xl space-y-6" dir={isEnglish ? 'ltr' : 'rtl'}>
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#193d53] via-[#234a65] to-[#356079] p-6 text-white shadow-lg sm:p-8">
      <div className="pointer-events-none absolute -left-12 -top-20 h-64 w-64 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute -left-2 -top-10 h-44 w-44 rounded-full border border-white/10" />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90"><Video className="h-4 w-4" />{isEnglish ? 'Private school meeting rooms' : 'غرف اجتماعات نكسس الداخلية'}</div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{isEnglish ? 'Nexus meetings' : 'قاعات الاجتماعات'}</h1>
          <p className="mt-2 text-sm leading-7 text-white/75 sm:text-base">{isEnglish ? 'Run online classes, meet parents, or bring all school staff together in a secure Nexus room.' : 'ابدأ حصة مباشرة، أو اجتمع بأولياء الأمور، أو اجمع موظفي المدرسة في غرفة نكسس آمنة.'}</p>
        </div>
        {canCreate && <button onClick={() => { setError(''); setShowCreate((value) => !value) }} className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#193d53] shadow transition hover:-translate-y-0.5 hover:shadow-md">
          {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{showCreate ? (isEnglish ? 'Close' : 'إغلاق') : (isEnglish ? 'Create meeting' : 'إنشاء اجتماع')}
        </button>}
      </div>
      <div className="relative mt-7 flex flex-wrap gap-2 text-xs text-white/75">
        <span className="rounded-full bg-black/10 px-3 py-1.5">{isEnglish ? 'Signed-in school accounts only' : 'الدخول لحسابات المنصة المسجلة فقط'}</span>
        <span className="rounded-full bg-black/10 px-3 py-1.5">{isEnglish ? 'Camera stays off until enabled' : 'الكاميرا لا تعمل إلا باختيارك'}</span>
        <span className="rounded-full bg-black/10 px-3 py-1.5">{isEnglish ? 'Invitation opens the room directly' : 'الدعوة تفتح غرفة الاجتماع مباشرة'}</span>
      </div>
    </section>

    {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><p>{error}</p><button onClick={() => setError('')} aria-label={isEnglish ? 'Dismiss' : 'إغلاق'} className="ms-auto"><X className="h-4 w-4" /></button></div>}

    {showCreate && canCreate && <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-start gap-3"><div className="rounded-xl bg-[#234a65]/10 p-2.5 text-[#234a65]"><CalendarClock className="h-5 w-5" /></div><div><h2 className="font-bold">{isEnglish ? 'Create a Nexus room' : 'إعداد اجتماع جديد'}</h2><p className="mt-1 text-sm text-muted-foreground">{isTeacher ? (isEnglish ? 'Choose a class and invite its students or their parents.' : 'اختر الفصل ثم ادعُ طلابه لحصة أو أولياء أمورهم للاجتماع.') : (isEnglish ? 'This meeting will be sent to every active staff account in your school.' : 'سيصل الاجتماع إلى جميع حسابات موظفي المدرسة النشطة.')}</p></div></div>
      <form onSubmit={submitMeeting} className="space-y-4">
        {isTeacher && <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => { setMeetingType('CLASS'); setSelectedParentIds([]) }} className={`rounded-xl border p-4 text-start transition ${meetingType === 'CLASS' ? 'border-[#234a65] bg-[#234a65]/5 ring-1 ring-[#234a65]' : 'hover:bg-muted/50'}`}><span className="flex items-center gap-2 font-semibold"><Video className="h-4 w-4 text-[#234a65]" />{isEnglish ? 'Online class' : 'حصة مع الطلاب'}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{isEnglish ? 'Invite all students enrolled in the selected class.' : 'تتم دعوة الطلاب المسجلين في الفصل تلقائيًا.'}</span></button>
          <button type="button" onClick={() => setMeetingType('PARENT')} className={`rounded-xl border p-4 text-start transition ${meetingType === 'PARENT' ? 'border-[#234a65] bg-[#234a65]/5 ring-1 ring-[#234a65]' : 'hover:bg-muted/50'}`}><span className="flex items-center gap-2 font-semibold"><Users className="h-4 w-4 text-[#234a65]" />{isEnglish ? 'Meet parents' : 'اجتماع مع أولياء الأمور'}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{isEnglish ? 'Select the parent accounts linked to students in this class.' : 'اختر حساب ولي الأمر المرتبط بطالب أو أكثر في الفصل.'}</span></button>
        </div>}
        {isSchoolManager && <div className="rounded-xl border border-[#234a65]/20 bg-[#234a65]/5 p-4"><div className="flex items-center gap-2 font-semibold"><Users className="h-4 w-4 text-[#234a65]" />{typeLabel('STAFF')}</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{isEnglish ? 'Only the principal or HR can create this school-wide meeting.' : 'إنشاء الاجتماع العام متاح لمدير المدرسة أو الشؤون الإدارية فقط، وتصل الدعوة لكل الموظفين.'}</p></div>}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm"><span className="font-medium">{isEnglish ? 'Meeting title' : 'عنوان الاجتماع'}</span><input required minLength={3} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={meetingType === 'CLASS' ? (isEnglish ? 'e.g. Mathematics lesson' : 'مثال: حصة الرياضيات') : meetingType === 'PARENT' ? (isEnglish ? 'e.g. Follow-up meeting' : 'مثال: لقاء متابعة الطلاب') : (isEnglish ? 'e.g. Staff coordination' : 'مثال: اجتماع تنسيق موظفي المدرسة')} className="h-11 w-full rounded-xl border bg-background px-3 outline-none ring-offset-background focus:ring-2 focus:ring-[#356079]/30" /></label>
          <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 text-sm"><span className="font-medium">{isEnglish ? 'Date' : 'تاريخ الاجتماع'}</span><DatePicker value={meetingDate} onChange={(date) => { setMeetingDate(date); setMeetingTime(date ? defaultMeetingSlot(date, new Date()) : '') }} placeholder={isEnglish ? 'Choose a date' : 'اختر التاريخ'} locale={locale} minDate={clockNow} /></label><label className="space-y-1.5 text-sm"><span className="font-medium">{isEnglish ? 'Time (24-hour)' : 'وقت الاجتماع (بنظام 24 ساعة)'}</span><TimeSelect value={meetingTime} onChange={setMeetingTime} minValue={earliestMeetingTime} placeholder={isEnglish ? 'Choose a time' : 'اختر الوقت'} disabled={!meetingDate || earliestMeetingTime === '24:00'} /></label></div>
        </div>

        {meetingType !== 'STAFF' && <label className="block space-y-1.5 text-sm"><span className="font-medium">{isEnglish ? 'Class' : 'الفصل'}</span><select required value={classId} onChange={(event) => { setClassId(event.target.value); setRoster([]); setSelectedParentIds([]) }} className="h-11 w-full rounded-xl border bg-background px-3 outline-none focus:ring-2 focus:ring-[#356079]/30"><option value="">{isEnglish ? 'Select a class' : 'اختر الفصل الدراسي'}</option>{classes.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}</select>{!classes.length && <span className="text-xs text-amber-700">{isEnglish ? 'No classes are assigned to this teacher account.' : 'لا توجد فصول مسندة إلى حساب المعلم.'}</span>}</label>}

        {meetingType === 'CLASS' && classId && <div className="flex items-center gap-3 rounded-xl border bg-muted/30 px-4 py-3 text-sm"><Users className="h-4 w-4 text-[#234a65]" /><span>{rosterLoading ? (isEnglish ? 'Loading class students…' : 'جارٍ تحميل طلاب الفصل…') : (isEnglish ? `${roster.length} students will be invited automatically.` : `ستصل الدعوة تلقائيًا إلى ${roster.length} طالبًا في الفصل.`)}</span></div>}

        {meetingType === 'PARENT' && classId && <div className="space-y-2 rounded-xl border p-4"><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold">{isEnglish ? 'Select parent accounts' : 'اختر أولياء الأمور المدعوين'}</span><span className="text-xs text-muted-foreground">{selectedParentIds.length} {isEnglish ? 'selected' : 'محدد'}</span></div>{rosterLoading ? <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{isEnglish ? 'Loading parent accounts…' : 'جارٍ تحميل أولياء الأمور…'}</div> : parents.length === 0 ? <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800">{isEnglish ? 'No active parent accounts are linked to students in this class.' : 'لا توجد حسابات أولياء أمور نشطة مرتبطة بطلاب هذا الفصل.'}</p> : <div className="max-h-56 divide-y overflow-y-auto rounded-lg border">{parents.map((parent) => <label key={parent.id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted/50"><input type="checkbox" checked={selectedParentIds.includes(parent.id)} onChange={(event) => setSelectedParentIds((current) => event.target.checked ? [...current, parent.id] : current.filter((id) => id !== parent.id))} className="h-4 w-4 rounded border-input accent-[#234a65]" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{parent.name || (isEnglish ? 'Parent account' : 'ولي أمر')}</span><span className="block truncate text-xs text-muted-foreground">{isEnglish ? 'Parent of' : 'ولي أمر'} {parent.studentName}</span></span><Check className={`h-4 w-4 shrink-0 ${selectedParentIds.includes(parent.id) ? 'text-emerald-600' : 'text-transparent'}`} /></label>)}</div>}</div>}

        <label className="block space-y-1.5 text-sm"><span className="font-medium">{isEnglish ? 'Agenda / notes' : 'جدول الأعمال / ملاحظات'}</span><textarea maxLength={1200} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder={isEnglish ? 'Add a short description for invitees.' : 'أضف وصفًا مختصرًا يظهر للمدعوين.'} className="w-full resize-y rounded-xl border bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#356079]/30" /></label>
        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={resetForm} className="h-10 rounded-xl border px-4 text-sm font-medium">{isEnglish ? 'Cancel' : 'إلغاء'}</button><button disabled={saving || (isTeacher && !classes.length) || rosterLoading} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#234a65] px-5 text-sm font-bold text-white disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{isEnglish ? 'Create and send invitations' : 'إنشاء الاجتماع وإرسال الدعوات'}</button></div>
      </form>
    </section>}

    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3"><div><h2 className="text-lg font-bold">{isEnglish ? 'Your meetings' : 'اجتماعاتك'}</h2><p className="mt-1 text-sm text-muted-foreground">{isEnglish ? 'Meetings organized by you or sent to your school account.' : 'الاجتماعات التي أنشأتها أو وصلتك دعوتها على حسابك.'}</p></div><span className="rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground">{meetings.length} {isEnglish ? 'meetings' : 'اجتماع'}</span></div>
      {loading ? <div className="flex min-h-48 items-center justify-center gap-2 rounded-2xl border bg-card text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{isEnglish ? 'Loading meetings…' : 'جارٍ تحميل الاجتماعات…'}</div>
        : sortedMeetings.length === 0 ? <div className="rounded-2xl border border-dashed bg-card px-6 py-14 text-center"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#234a65]/10 text-[#234a65]"><Video className="h-5 w-5" /></div><h3 className="font-semibold">{isEnglish ? 'No meetings yet' : 'لا توجد اجتماعات حتى الآن'}</h3><p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{isEnglish ? 'Invitations sent to your account will appear here.' : 'ستظهر هنا الاجتماعات التي تنشئها أو تتم دعوتك إليها.'}</p>{canCreate && <button onClick={() => setShowCreate(true)} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#234a65] px-4 text-sm font-bold text-white"><Plus className="h-4 w-4" />{isEnglish ? 'Create a meeting' : 'إنشاء اجتماع'}</button>}</div>
          : <div className="grid gap-4 xl:grid-cols-2">{sortedMeetings.map((meeting) => {
            const isHost = meeting.host.id === profile?.id
            const canManage = isHost || isSchoolManager
            const ended = meeting.status === 'ENDED' || meeting.status === 'CANCELLED'
            const joinDisabled = ended || (meeting.status === 'SCHEDULED' && !isHost)
            return <article key={meeting.id} className="rounded-2xl border bg-card p-5 shadow-sm transition hover:border-[#234a65]/30 hover:shadow-md">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="mb-2 flex flex-wrap items-center gap-2"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meeting.status === 'LIVE' ? 'bg-emerald-100 text-emerald-800' : meeting.status === 'SCHEDULED' ? 'bg-blue-50 text-blue-800' : 'bg-muted text-muted-foreground'}`}>{meeting.status === 'LIVE' ? <Radio className="h-3.5 w-3.5 animate-pulse" /> : <Clock3 className="h-3.5 w-3.5" />}{statusText(meeting.status)}</span><span className="rounded-full bg-[#234a65]/8 px-2.5 py-1 text-xs font-medium text-[#234a65]">{typeLabel(meeting.meetingType)}{meeting.classroom?.name ? ` · ${meeting.classroom.name}` : ''}</span>{isHost && <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">{isEnglish ? 'Organizer' : 'أنت المنظم'}</span>}</div><h3 className="truncate text-base font-bold">{meeting.title}</h3><p className="mt-1 text-sm text-muted-foreground">{formatDate(meeting.scheduledAt)}</p></div><div className="shrink-0 rounded-xl bg-[#234a65]/10 p-2.5 text-[#234a65]"><Video className="h-5 w-5" /></div></div>
              {meeting.description && <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{meeting.description}</p>}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3"><div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground"><Users className="h-4 w-4 shrink-0" /><span className="truncate">{meeting.host.name} · {meeting.participants.length} {isEnglish ? 'invited accounts' : 'حساب مدعو'}</span></div><div className="flex flex-wrap items-center gap-2">{!ended && <button onClick={() => void copyInviteLink(meeting)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium"><Copy className="h-3.5 w-3.5" />{copiedMeeting === meeting.id ? (isEnglish ? 'Copied' : 'تم النسخ') : (isEnglish ? 'Copy link' : 'نسخ رابط الدعوة')}</button>}{canManage && meeting.status === 'SCHEDULED' && <button disabled={actionMeeting === meeting.id} onClick={() => void runMeetingAction(meeting, 'cancel')} className="h-9 rounded-lg border px-3 text-xs font-medium text-muted-foreground disabled:opacity-50">{isEnglish ? 'Cancel' : 'إلغاء الاجتماع'}</button>}{!ended && <button disabled={actionMeeting === meeting.id || joinDisabled} onClick={() => void runMeetingAction(meeting, 'join')} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#234a65] px-3.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">{actionMeeting === meeting.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Video className="h-3.5 w-3.5" />}{meeting.status === 'LIVE' ? (isEnglish ? 'Join now' : 'انضم الآن') : meeting.status === 'SCHEDULED' ? (isEnglish ? 'Open room' : 'فتح الغرفة') : (isEnglish ? 'View' : 'عرض')}<ChevronLeft className="h-3.5 w-3.5" /></button>}</div></div>
            </article>
          })}</div>}
    </section>
  </main>
}
