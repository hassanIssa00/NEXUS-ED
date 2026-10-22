'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { CalendarClock, RefreshCw } from 'lucide-react';

type Child = { id: string; name: string };
type Meeting = { id: string; title: string; description?: string; startsAt: string; endsAt: string; mode: string; location?: string; meetingUrl?: string; maxBookings: number; class: { name: string }; teacher: { name?: string }; bookings: Array<{ id: string; status: string }>; _count: { bookings: number } };
const errorMessage = (error: any) => error?.response?.data?.message || error?.message || 'تعذر إتمام الطلب';

export default function ParentMeetingsPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [studentId, setStudentId] = useState('');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const dashboard = await apiClient.get('/dashboard/parent');
      const linkedChildren = Array.isArray(dashboard.data?.children) ? dashboard.data.children : [];
      setChildren(linkedChildren);
      const chosen = linkedChildren.some((child: Child) => child.id === studentId) ? studentId : linkedChildren[0]?.id || '';
      setStudentId(chosen);
      if (chosen) {
        const response = await apiClient.get<Meeting[]>(`/workspace/parent/meetings?studentId=${encodeURIComponent(chosen)}`);
        setMeetings(response.data || []);
      } else setMeetings([]);
    } catch (caught) { setError(errorMessage(caught)); }
    finally { setLoading(false); }
  }, [studentId]);

  useEffect(() => { void load(); }, [load]);

  const selectChild = (id: string) => setStudentId(id);

  const book = async (meeting: Meeting) => {
    try {
      await apiClient.post(`/workspace/parent/meetings/${meeting.id}/book`, { studentId, note });
      setNote(''); await load();
    } catch (caught) { setError(errorMessage(caught)); }
  };

  const cancel = async (meeting: Meeting) => {
    const booking = meeting.bookings[0];
    if (!booking) return;
    try {
      await apiClient.delete(`/workspace/parent/meetings/${meeting.id}/bookings/${booking.id}?studentId=${encodeURIComponent(studentId)}`);
      await load();
    } catch (caught) { setError(errorMessage(caught)); }
  };

  return (
    <main dir="rtl" className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><CalendarClock className="h-7 w-7 text-teal-700" /><div><h1 className="text-2xl font-bold">لقاءات أولياء الأمور</h1><p className="mt-1 text-sm text-muted-foreground">اختر موعدًا متاحًا مع معلم ابنك.</p></div></div><button onClick={() => void load()} aria-label="تحديث المواعيد" className="grid size-10 place-items-center rounded-md border"><RefreshCw className="h-4 w-4" /></button></header>
      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {children.length === 0 && !loading ? <section className="rounded-md border p-8 text-center"><p className="font-semibold">لا يوجد طالب مرتبط بالحساب</p><p className="mt-2 text-sm text-muted-foreground">اربط حساب الطالب أولاً حتى تظهر مواعيد فصله.</p><Link href="/student/new?flow=parent" className="mt-4 inline-flex h-10 items-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white">ربط طالب</Link></section> : <>
        {children.length > 1 && <label className="block max-w-sm space-y-1 text-sm"><span className="font-medium">ملف الطالب</span><select value={studentId} onChange={(event) => selectChild(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3">{children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label>}
        <label className="block max-w-xl space-y-1 text-sm"><span>ملاحظة للمعلم (اختياري)</span><textarea value={note} maxLength={1000} onChange={(event) => setNote(event.target.value)} rows={2} className="w-full rounded-md border bg-background p-2" /></label>
        {loading ? <p className="py-12 text-center text-sm text-muted-foreground">جاري تحميل المواعيد...</p> : meetings.length === 0 ? <p className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">لا توجد مواعيد متاحة لفصول هذا الطالب حاليًا.</p> : <div className="divide-y rounded-md border bg-card">{meetings.map((meeting) => {
          const booking = meeting.bookings[0];
          const full = meeting._count.bookings >= meeting.maxBookings;
          return <article key={meeting.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="font-semibold">{meeting.title}</h2><p className="mt-1 text-sm text-muted-foreground">{meeting.class.name} · {meeting.teacher?.name || 'معلم الفصل'}</p><p className="mt-1 text-sm">{new Date(meeting.startsAt).toLocaleString('ar-EG')} - {new Date(meeting.endsAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p><p className="mt-1 text-xs text-muted-foreground">{meeting.mode === 'ONLINE' ? 'عن بُعد' : `حضوري${meeting.location ? ` · ${meeting.location}` : ''}`} · {Math.max(0, meeting.maxBookings - meeting._count.bookings)} أماكن متاحة</p>{meeting.description && <p className="mt-2 text-sm">{meeting.description}</p>}</div>
            <div className="flex shrink-0 flex-wrap gap-2">{booking?.status === 'BOOKED' ? <><span className="inline-flex h-10 items-center rounded-md bg-emerald-50 px-3 text-sm font-medium text-emerald-800">تم الحجز</span>{meeting.mode === 'ONLINE' && meeting.meetingUrl && <a href={meeting.meetingUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-md border px-3 text-sm">رابط اللقاء</a>}<button onClick={() => void cancel(meeting)} className="h-10 rounded-md border px-3 text-sm">إلغاء الحجز</button></> : <button disabled={full || !meeting.maxBookings} onClick={() => void book(meeting)} className="h-10 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{full ? 'اكتملت الحجوزات' : 'حجز الموعد'}</button>}</div>
          </article>;
        })}</div>}
      </>}
    </main>
  );
}
