'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { CircleAlert, ExternalLink, Loader2, Radio, RefreshCw, Square } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { classSessionApi, ClassSession } from '@/lib/api/class-session';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type SchoolClass = { id: string; name: string };
const payloadOf = (value: any) => value?.data?.data ?? value?.data;

export default function TeacherLivePage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classId, setClassId] = useState('');
  const [session, setSession] = useState<ClassSession | null>(null);
  const [title, setTitle] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [duration, setDuration] = useState(45);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiClient.get('/classes')
      .then(({ data }) => {
        if (!active) return;
        const rows = Array.isArray(data) ? data : [];
        setClasses(rows);
        setClassId(rows[0]?.id || '');
      })
      .catch((reason) => { if (active) setError(reason?.response?.data?.message || 'تعذر تحميل فصول المعلم.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const loadSession = useCallback(async () => {
    if (!classId) { setSession(null); return; }
    setLoading(true);
    setError('');
    try {
      const response = await classSessionApi.getActive(classId);
      setSession(payloadOf(response) || null);
    } catch (reason: any) {
      setSession(null);
      setError(reason?.response?.data?.message || 'تعذر تحميل الجلسة.');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => { void loadSession(); }, [loadSession]);

  const startSession = async (event: FormEvent) => {
    event.preventDefault();
    if (!classId || !title.trim() || !meetingUrl.trim()) return;
    setSaving(true);
    setError('');
    try {
      const response = await classSessionApi.start(classId, { title: title.trim(), meetingUrl: meetingUrl.trim(), duration });
      setSession(payloadOf(response));
      setTitle('');
      setMeetingUrl('');
    } catch (reason: any) {
      setError(reason?.response?.data?.message || 'تعذر بدء الجلسة. تحقق من إعدادات نطاق الاجتماعات المعتمد.');
    } finally {
      setSaving(false);
    }
  };

  const endSession = async () => {
    if (!session || !classId) return;
    setSaving(true);
    setError('');
    try {
      await classSessionApi.end(classId, session.id);
      setSession(null);
    } catch (reason: any) {
      setError(reason?.response?.data?.message || 'تعذر إنهاء الجلسة.');
    } finally {
      setSaving(false);
    }
  };

  const activeClass = classes.find((item) => item.id === classId);

  return (
    <main className="mx-auto max-w-4xl space-y-6 pb-10" dir="rtl">
      <header className="flex items-center gap-3 border-b pb-5"><Radio className="h-6 w-6 text-primary" /><div><h1 className="text-2xl font-bold">الجلسات المباشرة</h1><p className="mt-1 text-sm text-muted-foreground">الجلسات وروابطها تُحفظ على الخادم وتقتصر على الفصل المسند.</p></div></header>

      <label className="block max-w-md space-y-2 text-sm font-medium">الفصل
        <Select value={classId} onValueChange={setClassId}><SelectTrigger><SelectValue placeholder={loading ? 'تحميل الفصول...' : 'اختر فصلًا'} /></SelectTrigger><SelectContent>{classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>
      </label>

      {error && <p role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 p-3 text-sm text-destructive"><CircleAlert className="h-4 w-4 shrink-0" />{error}</p>}

      {session ? (
        <section className="space-y-4 rounded-md border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold text-emerald-700">جلسة مباشرة</p><h2 className="mt-1 text-lg font-semibold">{session.title}</h2><p className="text-sm text-muted-foreground">{activeClass?.name} · {new Date(session.startTime).toLocaleString('ar-SA')}</p></div><Button variant="destructive" onClick={endSession} disabled={saving}><Square className="ml-2 h-4 w-4" />إنهاء الجلسة</Button></div>
          {session.meetingUrl && <a href={session.meetingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline"><ExternalLink className="h-4 w-4" />فتح رابط الاجتماع المعتمد</a>}
        </section>
      ) : loading ? <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />تحميل الجلسة...</div> : !classId ? <p className="rounded-md border p-6 text-sm text-muted-foreground">لا توجد فصول مسندة إلى حسابك.</p> : (
        <form onSubmit={startSession} className="space-y-4 rounded-md border bg-card p-5">
          <h2 className="font-semibold">بدء جلسة للفصل: {activeClass?.name}</h2>
          <label className="block space-y-1.5 text-sm font-medium">عنوان الجلسة<Input required minLength={2} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label className="block space-y-1.5 text-sm font-medium">رابط الاجتماع المعتمد<Input required type="url" inputMode="url" dir="ltr" value={meetingUrl} onChange={(event) => setMeetingUrl(event.target.value)} /></label>
          <label className="block space-y-1.5 text-sm font-medium">المدة بالدقائق<select className="w-full rounded-md border bg-background p-2.5" value={duration} onChange={(event) => setDuration(Number(event.target.value))}>{[20, 30, 45, 60, 90, 120].map((minutes) => <option key={minutes} value={minutes}>{minutes}</option>)}</select></label>
          <Button type="submit" disabled={saving || !classId}>{saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Radio className="ml-2 h-4 w-4" />}بدء الجلسة</Button>
        </form>
      )}

      <Button variant="outline" onClick={loadSession} disabled={loading || !classId}><RefreshCw className="ml-2 h-4 w-4" />تحديث</Button>
    </main>
  );
}
