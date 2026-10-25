'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { CircleAlert, Download, Loader2, Radio, RefreshCw, Square, Video } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { classSessionApi, ClassSession } from '@/lib/api/class-session';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';

type SchoolClass = { id: string; name: string };
function payloadOf<T = any>(value: any): T {
  return (value?.data?.data ?? value?.data) as T;
}

export default function TeacherLivePage() {
  const isEnglish = useLocale() === 'en';
  const t = (ar: string, en: string) => isEnglish ? en : ar;
  const serverError = (reason: any, fallback: string) => {
    const message = reason?.response?.data?.message;
    return isEnglish ? (typeof message === 'string' && !/[\u0600-\u06ff]/.test(message) ? message : fallback) : (message || fallback);
  };
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classId, setClassId] = useState('');
  const [session, setSession] = useState<ClassSession | null>(null);
  const [history, setHistory] = useState<ClassSession[]>([]);
  const [title, setTitle] = useState('');
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
      .catch((reason) => { if (active) setError(serverError(reason, t('تعذر تحميل فصول المعلم.', 'Could not load the teacher’s classes.'))); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isEnglish]);

  const loadSession = useCallback(async () => {
    if (!classId) { setSession(null); return; }
    setLoading(true);
    setError('');
    try {
      const [activeResponse, historyResponse] = await Promise.all([
        classSessionApi.getActive(classId),
        classSessionApi.history(classId),
      ]);
      setSession(payloadOf(activeResponse) || null);
      setHistory(payloadOf<ClassSession[]>(historyResponse) || []);
    } catch (reason: any) {
      setSession(null);
      setError(serverError(reason, t('تعذر تحميل الجلسة.', 'Could not load the session.')));
    } finally {
      setLoading(false);
    }
  }, [classId, isEnglish]);

  useEffect(() => { void loadSession(); }, [loadSession]);

  const startSession = async (event: FormEvent) => {
    event.preventDefault();
    if (!classId || !title.trim()) return;
    setSaving(true);
    setError('');
    try {
      const response = await classSessionApi.start(classId, { title: title.trim(), duration });
      setSession(payloadOf(response));
      setTitle('');
    } catch (reason: any) {
      setError(serverError(reason, t('تعذر بدء البث الداخلي.', 'Could not start the internal live stream.')));
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
      await loadSession();
    } catch (reason: any) {
      setError(serverError(reason, t('تعذر إنهاء الجلسة.', 'Could not end the session.')));
    } finally {
      setSaving(false);
    }
  };

  const retryRecording = async () => {
    if (!session || !classId) return;
    setSaving(true); setError('');
    try {
      const response = await classSessionApi.retryRecording(classId, session.id);
      setSession(payloadOf(response));
      await loadSession();
    } catch (reason: any) {
      setError(serverError(reason, t('تعذر بدء تسجيل الحصة.', 'Could not start class recording.')));
    } finally { setSaving(false); }
  };

  const downloadRecording = async (record: ClassSession) => {
    if (!classId) return;
    setError('');
    try {
      const response = await classSessionApi.downloadRecording(classId, record.id);
      const result = payloadOf<{ url: string }>(response);
      if (result?.url) window.open(result.url, '_blank', 'noopener,noreferrer');
    } catch (reason: any) {
      setError(serverError(reason, t('تعذر فتح التسجيل.', 'Could not open the recording.')));
    }
  };

  const recordingLabel = (status?: string) => isEnglish ? ({
    RECORDING: 'Recording and saving automatically',
    PROCESSING: 'The stream ended; preparing the recording file',
    READY: 'Recording ready to download',
    FAILED: 'Recording could not be saved',
    NOT_CONFIGURED: 'Recording storage is not configured on the server',
  }[status || 'NOT_CONFIGURED'] || 'Unknown recording status') : ({
    RECORDING: 'يُسجّل الآن ويحفظ تلقائيًا',
    PROCESSING: 'انتهى البث، جارٍ تجهيز ملف التسجيل',
    READY: 'التسجيل جاهز للتنزيل',
    FAILED: 'تعذر حفظ التسجيل',
    NOT_CONFIGURED: 'التسجيل يحتاج إعداد التخزين على الخادم',
  }[status || 'NOT_CONFIGURED'] || 'حالة التسجيل غير معروفة');

  const activeClass = classes.find((item) => item.id === classId);

  return (
    <main className="mx-auto max-w-4xl space-y-6 pb-10" dir={isEnglish ? 'ltr' : 'rtl'}>
      <header className="flex items-center gap-3 border-b pb-5"><Radio className="h-6 w-6 text-primary" /><div><h1 className="text-2xl font-bold">{t('البث المباشر للحصص', 'Live classes')}</h1><p className="mt-1 text-sm text-muted-foreground">{t('ابدأ غرفة بث داخلية للفصل؛ يدخل إليها الطلاب من بواباتهم ويُسجل حضورهم عند الاتصال.', 'Start an internal live room for a class. Students join from their portals, and attendance is recorded when they connect.')}</p></div></header>

      <label className="block max-w-md space-y-2 text-sm font-medium">{t('الفصل', 'Class')}
        <Select value={classId} onValueChange={setClassId}><SelectTrigger><SelectValue placeholder={loading ? t('تحميل الفصول...', 'Loading classes…') : t('اختر فصلًا', 'Choose a class')} /></SelectTrigger><SelectContent>{classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>
      </label>

      {error && <p role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 p-3 text-sm text-destructive"><CircleAlert className="h-4 w-4 shrink-0" />{error}</p>}

      {session ? (
        <section className="space-y-4 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold text-emerald-700">● {t('البث يعمل الآن', 'Live now')}</p><h2 className="mt-1 text-lg font-semibold">{session.title}</h2><p className="text-sm text-muted-foreground">{activeClass?.name} · {t('بدأ', 'Started')} {new Date(session.startTime).toLocaleTimeString(isEnglish ? 'en-US' : 'ar-SA', { hour: 'numeric', minute: '2-digit' })}</p></div><Button variant="destructive" onClick={endSession} disabled={saving}><Square className="me-2 h-4 w-4" />{t('إنهاء البث', 'End stream')}</Button></div>
          <p className={`rounded-xl border px-3 py-2 text-sm ${session.recordingStatus === 'RECORDING' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-slate-200 bg-white text-slate-700'}`}>{recordingLabel(session.recordingStatus)}</p>
          {(session.recordingStatus === 'FAILED' || session.recordingStatus === 'NOT_CONFIGURED') && <Button variant="outline" onClick={retryRecording} disabled={saving}>{t('إعادة محاولة التسجيل', 'Retry recording')}</Button>}
          <Link href={`/live/${encodeURIComponent(classId)}`} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Video className="h-4 w-4" />{t('فتح غرفة البث', 'Open live room')}</Link>
        </section>
      ) : loading ? <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t('تحميل الجلسة...', 'Loading session…')}</div> : !classId ? <p className="rounded-md border p-6 text-sm text-muted-foreground">{t('لا توجد فصول مسندة إلى حسابك.', 'No classes are assigned to your account.')}</p> : (
        <form onSubmit={startSession} className="space-y-4 rounded-md border bg-card p-5">
          <h2 className="font-semibold">{t('بدء جلسة للفصل:', 'Start a session for:')} {activeClass?.name}</h2>
          <label className="block space-y-1.5 text-sm font-medium">{t('عنوان الجلسة', 'Session title')}<Input required minLength={2} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label className="block space-y-1.5 text-sm font-medium">{t('المدة بالدقائق', 'Duration in minutes')}<select className="w-full rounded-md border bg-background p-2.5" value={duration} onChange={(event) => setDuration(Number(event.target.value))}>{[20, 30, 45, 60, 90, 120].map((minutes) => <option key={minutes} value={minutes}>{minutes}</option>)}</select></label>
          <Button type="submit" disabled={saving || !classId}>{saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Radio className="me-2 h-4 w-4" />}{t('بدء الجلسة', 'Start session')}</Button>
        </form>
      )}

      {classId && history.length > 0 && <section className="space-y-3 rounded-2xl border bg-card p-5 shadow-sm">
        <div><h2 className="font-semibold">{t('تسجيلات الحصص', 'Class recordings')}</h2><p className="mt-1 text-sm text-muted-foreground">{t('يبدأ حفظ التسجيل تلقائيًا مع البث ويظهر هنا بعد اكتمال الملف.', 'Recording starts automatically with the stream and appears here when the file is ready.')}</p></div>
        <ul className="divide-y">{history.map((record) => <li key={record.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div><p className="font-medium">{record.title}</p><p className="text-xs text-muted-foreground">{new Date(record.startTime).toLocaleString(isEnglish ? 'en-US' : 'ar-SA')} · {record.duration} {t('دقيقة', 'minutes')}</p><p className="mt-1 text-xs">{recordingLabel(record.recordingStatus)}</p></div>
          {record.recordingStatus === 'READY' && <Button variant="outline" size="sm" onClick={() => void downloadRecording(record)}><Download className="me-2 size-4" />{t('تنزيل التسجيل', 'Download recording')}</Button>}
        </li>)}</ul>
      </section>}

      <Button variant="outline" onClick={loadSession} disabled={loading || !classId}><RefreshCw className="me-2 h-4 w-4" />{t('تحديث', 'Refresh')}</Button>
    </main>
  );
}
