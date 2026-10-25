'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { apiClient } from '@/lib/api/client';
import { AlertCircle, CalendarPlus, Check, Clock3, MapPin, RefreshCw, UserRound, Video } from 'lucide-react';
import { DatePicker, dateInputValue } from '@/components/ui/date-picker';
import { TimeSelect } from '@/components/ui/time-select';

type ClassItem = { id: string; name: string };
type ClassStudent = { id: string; name: string; parents?: Array<{ id: string; name?: string; phone?: string | null }> };
type ParentOption = { key: string; parentId: string; studentId: string; parentName: string; studentName: string; phone?: string | null };
type Booking = { id: string; status: string; parent?: { name?: string; phone?: string }; student?: { name?: string } };
type Meeting = { id: string; title: string; description?: string; startsAt: string; endsAt: string; mode: string; location?: string; meetingUrl?: string; isOpen: boolean; maxBookings: number; class: { name: string }; bookings: Booking[] };

const formatError = (error: any, isEnglish: boolean) => {
  const message = Array.isArray(error?.response?.data?.message)
    ? error.response.data.message.join(isEnglish ? ', ' : '، ')
    : error?.response?.data?.message || error?.message;
  if (!message) return isEnglish ? 'Could not complete the request.' : 'تعذر إتمام الطلب.';
  if (isEnglish && /[\u0600-\u06ff]/.test(String(message))) return 'Could not complete the request. Please try again.';
  return message;
};

function timeWithMinutes(value: string, minutesToAdd: number, locale: string) {
  const [hour, minute] = value.split(':').map(Number);
  const date = new Date(2020, 0, 1, hour, minute + minutesToAdd);
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ar-EG', { hour: 'numeric', minute: '2-digit' }).format(date);
}

export default function TeacherMeetingsPage() {
  const locale = useLocale() === 'en' ? 'en' : 'ar';
  const isEnglish = locale === 'en';
  const t = (ar: string, en: string) => isEnglish ? en : ar;
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [classId, setClassId] = useState('');
  const [classLoading, setClassLoading] = useState(false);
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [selectedContact, setSelectedContact] = useState('');
  const [title, setTitle] = useState(() => t('لقاء ولي أمر', 'Parent meeting'));
  const [description, setDescription] = useState('');
  const [meetingDate, setMeetingDate] = useState(() => dateInputValue(new Date()));
  const [meetingTime, setMeetingTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [mode, setMode] = useState<'IN_PERSON' | 'ONLINE'>('IN_PERSON');
  const [location, setLocation] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const selectedParent = useMemo(() => parents.find((parent) => parent.key === selectedContact), [parents, selectedContact]);
  const startTime = useMemo(() => {
    if (!meetingDate || !meetingTime) return null;
    const value = new Date(`${meetingDate}T${meetingTime}:00`);
    return Number.isNaN(value.getTime()) ? null : value;
  }, [meetingDate, meetingTime]);

  const load = useCallback(async () => {
    setError('');
    try {
      const [classResponse, meetingResponse] = await Promise.all([
        apiClient.get<ClassItem[]>('/workspace/teacher/classes'),
        apiClient.get<Meeting[]>('/workspace/teacher/meetings'),
      ]);
      setClasses(classResponse.data || []);
      setMeetings(meetingResponse.data || []);
    } catch (caught) { setError(formatError(caught, isEnglish)); }
  }, [isEnglish]);

  useEffect(() => { void load(); }, [load]);

  const selectClass = async (nextClassId: string) => {
    setClassId(nextClassId);
    setSelectedContact('');
    setParents([]);
    if (!nextClassId) return;
    setClassLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get<ClassStudent[]>(`/workspace/teacher/classes/${encodeURIComponent(nextClassId)}/students`);
      const options = new Map<string, ParentOption>();
      for (const student of data || []) {
        for (const parent of student.parents || []) {
          if (!parent.id) continue;
          const key = `${parent.id}__${student.id}`;
          options.set(key, {
            key,
            parentId: parent.id,
            studentId: student.id,
            parentName: parent.name?.trim() || t('ولي أمر', 'Parent'),
            studentName: student.name?.trim() || t('طالب', 'Student'),
            phone: parent.phone,
          });
        }
      }
      setParents([...options.values()].sort((left, right) => left.parentName.localeCompare(right.parentName, locale)));
    } catch (caught) { setError(formatError(caught, isEnglish)); }
    finally { setClassLoading(false); }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedParent || !startTime) return setError(t('اختر الفصل وولي الأمر والتاريخ والوقت أولاً.', 'Select a class, parent, date, and time first.'));
    if (startTime.getTime() <= Date.now()) return setError(t('اختر موعدًا في المستقبل.', 'Choose a future date and time.'));
    setBusy(true);
    setError('');
    const endsAt = new Date(startTime.getTime() + durationMinutes * 60_000);
    try {
      await apiClient.post('/workspace/teacher/meetings', {
        classId,
        parentId: selectedParent.parentId,
        studentId: selectedParent.studentId,
        title,
        description,
        startsAt: startTime.toISOString(),
        durationMinutes,
        mode,
        location: mode === 'IN_PERSON' ? location : undefined,
        meetingUrl: mode === 'ONLINE' ? meetingUrl : undefined,
      });
      setSelectedContact('');
      setDescription('');
      setMeetingTime('');
      setLocation('');
      setMeetingUrl('');
      await load();
    } catch (caught) { setError(formatError(caught, isEnglish)); }
    finally { setBusy(false); }
  };

  const toggle = async (meeting: Meeting) => {
    try { await apiClient.patch(`/workspace/teacher/meetings/${meeting.id}/open`, { isOpen: !meeting.isOpen }); await load(); }
    catch (caught) { setError(formatError(caught, isEnglish)); }
  };

  return (
    <main dir={isEnglish ? 'ltr' : 'rtl'} className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">{t('لقاءات أولياء الأمور', 'Parent meetings')}</h1><p className="mt-1 text-sm text-muted-foreground">{t('اختر الفصل ثم ولي الأمر وحدد موعد اللقاء؛ سيصل الحجز مباشرة إلى حسابه.', 'Choose a class and parent, then schedule a meeting. The booking will appear in the parent’s account.')}</p></div>
        <button type="button" onClick={() => void load()} className="inline-flex h-10 items-center gap-2 rounded-xl border bg-card px-3 text-sm shadow-sm transition hover:bg-muted"><RefreshCw className="h-4 w-4" /> {t('تحديث', 'Refresh')}</button>
      </header>

      {error && <p role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="h-4 w-4 shrink-0" />{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)]">
        <section className="h-fit overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="border-b bg-gradient-to-l from-teal-50 via-white to-sky-50 p-5">
            <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-teal-700 text-white shadow-sm"><CalendarPlus className="size-5" /></span><div><h2 className="font-bold">{t('جدولة لقاء خاص', 'Schedule a meeting')}</h2><p className="mt-1 text-xs text-muted-foreground">{t('خطوات واضحة، ووقت تختاره من القائمة.', 'Choose a class, a parent, and an available time.')}</p></div></div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-teal-900"><span className="rounded-lg bg-white/90 px-2 py-2 ring-1 ring-teal-100">{t('١ · الفصل', '1 · Class')}</span><span className="rounded-lg bg-white/90 px-2 py-2 ring-1 ring-teal-100">{t('٢ · ولي الأمر', '2 · Parent')}</span><span className="rounded-lg bg-white/90 px-2 py-2 ring-1 ring-teal-100">{t('٣ · الموعد', '3 · Time')}</span></div>
          </div>
          <form onSubmit={submit} className="space-y-4 p-5">
            <label className="block space-y-1.5 text-sm"><span className="font-semibold">{t('الفصل', 'Class')}</span><select required value={classId} onChange={(event) => void selectClass(event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 shadow-sm outline-none focus:ring-2 focus:ring-teal-600/20"><option value="">{t('اختر الفصل أولاً', 'Choose a class first')}</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>

            {classId && <label className="block space-y-1.5 text-sm"><span className="font-semibold">{t('ولي الأمر والطالب', 'Parent and student')}</span><select required value={selectedContact} onChange={(event) => setSelectedContact(event.target.value)} disabled={classLoading || parents.length === 0} className="h-11 w-full rounded-xl border bg-background px-3 shadow-sm outline-none focus:ring-2 focus:ring-teal-600/20 disabled:opacity-60"><option value="">{classLoading ? t('جارٍ تحميل أولياء الأمور...', 'Loading parents...') : parents.length ? t('اختر ولي الأمر', 'Choose a parent') : t('لا يوجد ولي أمر مرتبط بطلاب هذا الفصل', 'No parent is linked to students in this class')}</option>{parents.map((parent) => <option key={parent.key} value={parent.key}>{parent.parentName} · {t('ولي أمر', 'Parent of')} {parent.studentName}{parent.phone ? ` · ${parent.phone}` : ''}</option>)}</select>{selectedParent && <span className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800"><Check className="size-4 shrink-0" />{t(`سيُحجز الموعد لـ ${selectedParent.parentName} بخصوص الطالب ${selectedParent.studentName}.`, `The meeting will be booked with ${selectedParent.parentName} about ${selectedParent.studentName}.`)}</span>}</label>}

            {selectedParent && <div className="space-y-4 border-t pt-4">
              <label className="block space-y-1.5 text-sm"><span className="font-semibold">{t('عنوان اللقاء', 'Meeting title')}</span><input required minLength={2} maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 shadow-sm outline-none focus:ring-2 focus:ring-teal-600/20" /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5 text-sm"><span className="font-semibold">{t('تاريخ اللقاء', 'Meeting date')}</span><DatePicker value={meetingDate} onChange={setMeetingDate} placeholder={t('اختر اليوم', 'Choose a day')} minDate={new Date()} /></label>
                <label className="block space-y-1.5 text-sm"><span className="font-semibold">{t('وقت اللقاء', 'Meeting time')}</span><TimeSelect value={meetingTime} onChange={setMeetingTime} placeholder={t('اختر الوقت من القائمة', 'Choose a time')} /></label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5 text-sm"><span className="font-semibold">{t('مدة اللقاء', 'Meeting duration')}</span><select value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} className="h-11 w-full rounded-xl border bg-background px-3 shadow-sm"><option value={15}>{t('١٥ دقيقة', '15 minutes')}</option><option value={30}>{t('٣٠ دقيقة', '30 minutes')}</option><option value={45}>{t('٤٥ دقيقة', '45 minutes')}</option><option value={60}>{t('ساعة', '1 hour')}</option></select></label>
                {startTime && <div className="flex min-h-11 items-center gap-2 rounded-xl border border-teal-100 bg-teal-50/60 px-3 text-xs text-teal-900"><Clock3 className="size-4 shrink-0" /><span>{t('ينتهي تقريبًا', 'Expected to end at')} {timeWithMinutes(meetingTime, durationMinutes, locale)}</span></div>}
              </div>

              <fieldset className="space-y-2"><legend className="text-sm font-semibold">{t('طريقة اللقاء', 'Meeting type')}</legend><div className="flex flex-wrap gap-2"><label className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${mode === 'IN_PERSON' ? 'border-teal-600 bg-teal-50 text-teal-900' : 'bg-background'}`}><input type="radio" name="meeting-mode" checked={mode === 'IN_PERSON'} onChange={() => setMode('IN_PERSON')} />{t('حضوري', 'In person')}</label><label className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${mode === 'ONLINE' ? 'border-teal-600 bg-teal-50 text-teal-900' : 'bg-background'}`}><input type="radio" name="meeting-mode" checked={mode === 'ONLINE'} onChange={() => setMode('ONLINE')} />{t('عن بُعد', 'Online')}</label></div></fieldset>
              {mode === 'IN_PERSON' ? <label className="block space-y-1.5 text-sm"><span className="font-semibold">{t('الموقع', 'Location')}</span><span className="relative block"><MapPin className="absolute right-3 top-3 size-4 text-muted-foreground" /><input value={location} maxLength={300} onChange={(event) => setLocation(event.target.value)} className="h-11 w-full rounded-xl border bg-background pr-10 pl-3 shadow-sm" placeholder={t('مثال: مكتب المرشد الطلابي', 'Example: Student counselor’s office')} /></span></label> : <label className="block space-y-1.5 text-sm"><span className="font-semibold">{t('رابط اللقاء الآمن', 'Secure meeting link')}</span><input required type="url" value={meetingUrl} onChange={(event) => setMeetingUrl(event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 shadow-sm" placeholder="https://..." /></label>}
              <label className="block space-y-1.5 text-sm"><span className="font-semibold">{t('ملاحظات لولي الأمر', 'Notes for the parent')} <span className="font-normal text-muted-foreground">{t('(اختياري)', '(optional)')}</span></span><textarea rows={3} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} className="w-full resize-y rounded-xl border bg-background p-3 shadow-sm" placeholder={t('اكتب ما يحتاج ولي الأمر إلى معرفته قبل اللقاء.', 'Add anything the parent should know before the meeting.')} /></label>
              <p className="rounded-xl border border-sky-100 bg-sky-50 p-3 text-xs leading-6 text-sky-900">{t('سيُحجز الموعد لهذا ولي الأمر فقط، ويظهر لديه كموعد مؤكد في بوابة ولي الأمر.', 'This appointment is reserved for this parent and will appear as confirmed in their portal.')}</p>
              <button disabled={busy || !classes.length || !meetingTime || !meetingDate || !selectedParent} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"><Video className="size-4" />{busy ? t('جارٍ حفظ اللقاء...', 'Saving meeting...') : t('حفظ وإرسال الموعد لولي الأمر', 'Save and send to parent')}</button>
            </div>}
          </form>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between"><div><h2 className="text-lg font-bold">{t('المواعيد والحجوزات', 'Meetings and bookings')}</h2><p className="mt-1 text-sm text-muted-foreground">{t('تظهر هنا اللقاءات المرتبطة بأولياء الأمور المختارين.', 'Meetings with the selected parents appear here.')}</p></div><span className="rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground">{meetings.length} {t('موعد', 'meetings')}</span></div>
          {!meetings.length ? <div className="rounded-2xl border border-dashed bg-card p-10 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-800"><CalendarPlus className="size-5" /></span><p className="mt-3 font-semibold">{t('لم تتم جدولة لقاءات بعد', 'No meetings scheduled yet')}</p><p className="mt-1 text-sm text-muted-foreground">{t('اختر الفصل وولي الأمر لإنشاء أول موعد خاص.', 'Choose a class and parent to schedule your first meeting.')}</p></div> : meetings.map((meeting) => <article key={meeting.id} className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="mb-2 flex flex-wrap items-center gap-2"><span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">{meeting.maxBookings === 1 && meeting.bookings.some((booking) => booking.status === 'BOOKED') ? t('موعد خاص', 'Private appointment') : t('موعد مفتوح', 'Open appointment')}</span><span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">{meeting.class.name}</span></div><h3 className="font-bold">{meeting.title}</h3><p className="mt-1 text-sm text-muted-foreground">{new Date(meeting.startsAt).toLocaleString(isEnglish ? 'en-US' : 'ar-EG')} · {new Date(meeting.startsAt).toLocaleTimeString(isEnglish ? 'en-US' : 'ar-EG', { hour: '2-digit', minute: '2-digit' })}–{new Date(meeting.endsAt).toLocaleTimeString(isEnglish ? 'en-US' : 'ar-EG', { hour: '2-digit', minute: '2-digit' })}</p><p className="mt-1 text-xs text-muted-foreground">{meeting.mode === 'ONLINE' ? t('عن بُعد', 'Online') : `${t('حضوري', 'In person')}${meeting.location ? ` · ${meeting.location}` : ''}`}</p></div><button type="button" onClick={() => void toggle(meeting)} className="h-9 shrink-0 rounded-xl border px-3 text-sm transition hover:bg-muted">{meeting.isOpen ? t('إلغاء إتاحة اللقاء', 'Close booking') : t('إعادة إتاحة اللقاء', 'Reopen booking')}</button></div>
            {meeting.description && <p className="text-sm leading-6">{meeting.description}</p>}
            {meeting.bookings.length > 0 && <div className="divide-y rounded-xl border bg-muted/20">{meeting.bookings.map((booking) => <div key={booking.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"><span className="font-medium">{booking.parent?.name || t('ولي أمر', 'Parent')}{booking.student?.name ? ` · ${t('الطالب', 'Student')} ${booking.student.name}` : ''}</span><span className="text-xs text-muted-foreground">{booking.status === 'BOOKED' ? t('موعد مؤكد', 'Confirmed') : t('أُلغي الحجز', 'Cancelled')}{booking.parent?.phone ? ` · ${booking.parent.phone}` : ''}</span></div>)}</div>}
          </article>)}
        </section>
      </div>
    </main>
  );
}
