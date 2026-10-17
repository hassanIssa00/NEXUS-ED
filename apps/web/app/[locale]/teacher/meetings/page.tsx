'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { AlertCircle, CalendarPlus, RefreshCw } from 'lucide-react';

type ClassItem = { id: string; name: string };
type Booking = { id: string; status: string; parent?: { name?: string; phone?: string }; student?: { name?: string } };
type Meeting = { id: string; title: string; description?: string; startsAt: string; endsAt: string; mode: string; location?: string; meetingUrl?: string; isOpen: boolean; maxBookings: number; class: { name: string }; bookings: Booking[] };
const formatError = (error: any) => Array.isArray(error?.response?.data?.message) ? error.response.data.message.join('، ') : error?.response?.data?.message || error?.message || 'تعذر إتمام الطلب';

export default function TeacherMeetingsPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [classId, setClassId] = useState('');
  const [title, setTitle] = useState('لقاء ولي أمر');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [mode, setMode] = useState<'IN_PERSON' | 'ONLINE'>('IN_PERSON');
  const [location, setLocation] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [maxBookings, setMaxBookings] = useState('1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [classResponse, meetingResponse] = await Promise.all([
        apiClient.get<ClassItem[]>('/workspace/teacher/classes'),
        apiClient.get<Meeting[]>('/workspace/teacher/meetings'),
      ]);
      setClasses(classResponse.data || []); setMeetings(meetingResponse.data || []);
    } catch (caught) { setError(formatError(caught)); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await apiClient.post('/workspace/teacher/meetings', {
        classId, title, description, startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString(),
        mode, location: mode === 'IN_PERSON' ? location : undefined, meetingUrl: mode === 'ONLINE' ? meetingUrl : undefined, maxBookings: Number(maxBookings),
      });
      setDescription(''); setStartsAt(''); setEndsAt(''); setLocation(''); setMeetingUrl('');
      await load();
    } catch (caught) { setError(formatError(caught)); }
    finally { setBusy(false); }
  };

  const toggle = async (meeting: Meeting) => {
    try { await apiClient.patch(`/workspace/teacher/meetings/${meeting.id}/open`, { isOpen: !meeting.isOpen }); await load(); }
    catch (caught) { setError(formatError(caught)); }
  };

  return (
    <main dir="rtl" className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">لقاءات أولياء الأمور</h1><p className="mt-1 text-sm text-muted-foreground">حدد المواعيد والسعة، وتابع حجوزات أولياء أمور طلاب فصولك.</p></div><button onClick={() => void load()} className="inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm"><RefreshCw className="h-4 w-4" /> تحديث</button></header>
      {error && <p role="alert" className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="h-4 w-4 shrink-0" />{error}</p>}
      <div className="grid gap-6 lg:grid-cols-[minmax(300px,0.75fr)_minmax(0,1.25fr)]">
        <section className="h-fit rounded-md border bg-card p-4 md:p-5"><div className="mb-4 flex items-center gap-2"><CalendarPlus className="h-5 w-5 text-teal-700" /><h2 className="text-lg font-semibold">جدولة لقاء</h2></div>
          <form onSubmit={submit} className="space-y-4">
            <label className="block space-y-1 text-sm"><span className="font-medium">الفصل</span><select required value={classId} onChange={(event) => setClassId(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3"><option value="">اختر فصلاً</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="block space-y-1 text-sm"><span className="font-medium">عنوان اللقاء</span><input required value={title} maxLength={160} onChange={(event) => setTitle(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3" /></label>
            <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1 text-sm"><span className="font-medium">يبدأ</span><input required type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="h-10 w-full rounded-md border bg-background px-2" /></label><label className="block space-y-1 text-sm"><span className="font-medium">ينتهي</span><input required type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="h-10 w-full rounded-md border bg-background px-2" /></label></div>
            <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">طريقة اللقاء</legend><div className="flex gap-5"><label className="flex items-center gap-2 text-sm"><input type="radio" checked={mode === 'IN_PERSON'} onChange={() => setMode('IN_PERSON')} />حضوري</label><label className="flex items-center gap-2 text-sm"><input type="radio" checked={mode === 'ONLINE'} onChange={() => setMode('ONLINE')} />عن بُعد</label></div></fieldset>
            {mode === 'IN_PERSON' ? <label className="block space-y-1 text-sm"><span className="font-medium">الموقع</span><input value={location} maxLength={300} onChange={(event) => setLocation(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3" /></label> : <label className="block space-y-1 text-sm"><span className="font-medium">رابط آمن HTTPS</span><input required type="url" value={meetingUrl} onChange={(event) => setMeetingUrl(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3" /></label>}
            <label className="block space-y-1 text-sm"><span className="font-medium">عدد الحجوزات المتاحة</span><input type="number" min={1} max={30} value={maxBookings} onChange={(event) => setMaxBookings(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3" /></label>
            <label className="block space-y-1 text-sm"><span className="font-medium">ملاحظات لولي الأمر</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="w-full rounded-md border bg-background p-3" /></label>
            <button disabled={busy || !classes.length} className="h-11 w-full rounded-md bg-teal-700 px-4 font-semibold text-white disabled:opacity-50">{busy ? 'جارٍ الحفظ...' : 'حفظ الموعد'}</button>
          </form>
        </section>
        <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">المواعيد والحجوزات</h2><span className="text-sm text-muted-foreground">{meetings.length} موعد</span></div>
          {!meetings.length ? <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">لم تتم جدولة لقاءات بعد.</p> : meetings.map((meeting) => <article key={meeting.id} className="space-y-4 rounded-md border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{meeting.title}</h3><p className="mt-1 text-sm text-muted-foreground">{meeting.class.name} · {new Date(meeting.startsAt).toLocaleString('ar-EG')} - {new Date(meeting.endsAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p><p className="mt-1 text-xs text-muted-foreground">{meeting.mode === 'ONLINE' ? 'عن بُعد' : `حضوري${meeting.location ? ` · ${meeting.location}` : ''}`} · {meeting.bookings.length}/{meeting.maxBookings} حجز</p></div><button onClick={() => void toggle(meeting)} className="h-9 rounded-md border px-3 text-sm">{meeting.isOpen ? 'إغلاق الحجز' : 'فتح الحجز'}</button></div>
            {meeting.description && <p className="text-sm">{meeting.description}</p>}
            {meeting.bookings.length > 0 && <div className="divide-y rounded-md border">{meeting.bookings.map((booking) => <div key={booking.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"><span>{booking.parent?.name || 'ولي أمر'}{booking.student?.name ? ` · ${booking.student.name}` : ''}</span><span className="text-xs text-muted-foreground">{booking.status === 'BOOKED' ? 'مؤكد' : 'ملغي'}{booking.parent?.phone ? ` · ${booking.parent.phone}` : ''}</span></div>)}</div>}
          </article>)}
        </section>
      </div>
    </main>
  );
}
