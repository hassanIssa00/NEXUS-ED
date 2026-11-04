'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { CircleAlert, Loader2, Radio, RefreshCw, Square, Users, Clock } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { classSessionApi, ClassSession } from '@/lib/api/class-session';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JitsiRoom } from '@/components/meeting/JitsiRoom';

type SchoolClass = { id: string; name: string };
const payloadOf = (value: any) => value?.data?.data ?? value?.data;

function generateRoomName(classId: string): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `nexus-${classId.slice(0, 8)}-${datePart}`;
}

export default function TeacherLivePage() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classId, setClassId] = useState('');
  const [session, setSession] = useState<ClassSession | null>(null);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(45);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [roomLeft, setRoomLeft] = useState(false);

  useEffect(() => {
    let active = true;
    apiClient.get('/classes')
      .then(({ data }) => {
        if (!active) return;
        const rows = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
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
      setRoomLeft(false);
    } catch (reason: any) {
      setSession(null);
      if (reason?.response?.status !== 404) {
        setError(reason?.response?.data?.message || 'تعذر تحميل الجلسة.');
      }
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => { void loadSession(); }, [loadSession]);

  const startSession = async (event: FormEvent) => {
    event.preventDefault();
    if (!classId || !title.trim()) return;
    const roomName = generateRoomName(classId);
    const meetingUrl = `https://meet.jit.si/${roomName}`;
    setSaving(true);
    setError('');
    try {
      const response = await classSessionApi.start(classId, { title: title.trim(), meetingUrl, duration });
      setSession(payloadOf(response));
      setTitle('');
      setRoomLeft(false);
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
      setRoomLeft(false);
    } catch (reason: any) {
      setError(reason?.response?.data?.message || 'تعذر إنهاء الجلسة.');
    } finally {
      setSaving(false);
    }
  };

  const activeClass = classes.find((item) => item.id === classId);
  const displayName = profile?.full_name || 'معلم';

  // Extract Jitsi room name from meetingUrl
  const jitsiRoomName = session?.meetingUrl?.startsWith('https://meet.jit.si/')
    ? session.meetingUrl.replace('https://meet.jit.si/', '').split('?')[0]
    : null;

  return (
    <main className="mx-auto max-w-5xl space-y-6 pb-10" dir="rtl">
      <header className="flex items-center gap-3 border-b pb-5">
        <Radio className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">الجلسات المباشرة</h1>
          <p className="mt-1 text-sm text-muted-foreground">ابدأ جلسة مباشرة عبر Jitsi Meet وشاركها مع طلابك في الفصل.</p>
        </div>
      </header>

      <label className="block max-w-md space-y-2 text-sm font-medium">
        الفصل
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger>
            <SelectValue placeholder={loading ? 'تحميل الفصول...' : 'اختر فصلًا'} />
          </SelectTrigger>
          <SelectContent>
            {classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </label>

      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 p-3 text-sm text-destructive">
          <CircleAlert className="h-4 w-4 shrink-0" />{error}
        </p>
      )}

      {session && !roomLeft ? (
        <section className="space-y-4">
          {/* Session info banner */}
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-emerald-50 p-4 dark:bg-emerald-950/20">
            <div className="flex items-start gap-3">
              <span className="mt-1 h-3 w-3 shrink-0 animate-pulse rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              <div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">جلسة مباشرة نشطة</p>
                <h2 className="mt-0.5 text-lg font-semibold">{session.title}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {activeClass && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{activeClass.name}</span>}
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{new Date(session.startTime).toLocaleString('ar-SA')}</span>
                </div>
              </div>
            </div>
            <Button variant="destructive" onClick={endSession} disabled={saving}>
              {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Square className="ml-2 h-4 w-4" />}
              إنهاء الجلسة
            </Button>
          </div>

          {/* Embedded Jitsi room */}
          {jitsiRoomName ? (
            <JitsiRoom
              roomName={jitsiRoomName}
              displayName={displayName}
              height="600px"
              onLeft={() => setRoomLeft(true)}
            />
          ) : (
            <p className="rounded-md border p-4 text-sm text-muted-foreground">رابط الاجتماع غير متوافق مع Jitsi Meet.</p>
          )}
        </section>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />تحميل الجلسة...
        </div>
      ) : !classId ? (
        <p className="rounded-md border p-6 text-sm text-muted-foreground">لا توجد فصول مسندة إلى حسابك.</p>
      ) : (
        <form onSubmit={startSession} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="font-semibold">بدء جلسة للفصل: {activeClass?.name}</h2>
          <p className="text-sm text-muted-foreground">سيتم إنشاء غرفة Jitsi تلقائيًا وإرسال الرابط للطلاب.</p>

          <label className="block space-y-1.5 text-sm font-medium">
            عنوان الجلسة
            <Input required minLength={2} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: درس الكسور العشرية" />
          </label>

          <label className="block space-y-1.5 text-sm font-medium">
            المدة بالدقائق
            <select className="w-full rounded-md border bg-background p-2.5" value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
              {[20, 30, 45, 60, 90, 120].map((minutes) => <option key={minutes} value={minutes}>{minutes}</option>)}
            </select>
          </label>

          <Button type="submit" disabled={saving || !classId}>
            {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Radio className="ml-2 h-4 w-4" />}
            بدء الجلسة
          </Button>
        </form>
      )}

      <Button variant="outline" onClick={loadSession} disabled={loading || !classId}>
        <RefreshCw className="ml-2 h-4 w-4" />تحديث
      </Button>
    </main>
  );
}
