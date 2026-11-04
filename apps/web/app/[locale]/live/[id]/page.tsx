'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, CircleAlert, Clock, ExternalLink, Loader2, RefreshCw, User } from 'lucide-react';
import { classSessionApi, ClassSession } from '@/lib/api/class-session';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { JitsiRoom } from '@/components/meeting/JitsiRoom';

export default function LiveClassPage() {
  const params = useParams() as { id: string };
  const router = useRouter();
  const { profile } = useAuth();
  const classId = params?.id || '';
  const [session, setSession] = useState<ClassSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);
  const attendanceMarked = useRef(false);

  const load = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setError('');
    try {
      const response = await classSessionApi.getActive(classId);
      const raw = response?.data as any;
      const data: ClassSession | null = raw?.data ?? raw ?? null;
      setSession(data);
    } catch (reason: any) {
      setSession(null);
      if (reason?.response?.status !== 404) {
        setError(reason?.response?.data?.message || 'لا يمكن تحميل الجلسة لهذا الحساب.');
      }
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => { void load(); }, [load]);

  // Poll every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => { void load(); }, 15_000);
    return () => clearInterval(interval);
  }, [load]);

  // Auto-mark attendance when student joins
  useEffect(() => {
    if (session && profile && !attendanceMarked.current) {
      attendanceMarked.current = true;
      classSessionApi.selfJoin(classId, session.id).catch(() => {
        // Silently fail – attendance marking is best-effort
      });
    }
  }, [session, profile, classId]);

  // Extract Jitsi room name
  const jitsiRoomName = session?.meetingUrl?.startsWith('https://meet.jit.si/')
    ? session.meetingUrl.replace('https://meet.jit.si/', '').split('?')[0]
    : null;

  const displayName = profile?.full_name || 'طالب';

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-6 pb-10" dir="rtl">
      <header className="flex items-start justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold">جلسة الفصل</h1>
          {session && (
            <div className="mt-2 space-y-1">
              <p className="font-semibold text-lg">{session.title}</p>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {session.teacher?.name && (
                  <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{session.teacher.name}</span>
                )}
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{new Date(session.startTime).toLocaleString('ar-SA')}</span>
              </div>
            </div>
          )}
        </div>
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowRight className="ml-2 h-4 w-4" />رجوع
        </Button>
      </header>

      {loading && !session ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />التحقق من الجلسة...
        </div>
      ) : error ? (
        <p role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 p-4 text-sm text-destructive">
          <CircleAlert className="h-4 w-4" />{error}
        </p>
      ) : !session ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border p-10 text-center">
          <p className="text-muted-foreground">لا توجد جلسة مباشرة لهذا الفصل في الوقت الحالي.</p>
          <p className="text-xs text-muted-foreground">ستتجدد الصفحة تلقائيًا عند بدء جلسة.</p>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="ml-2 h-4 w-4" />تحديث يدوي
          </Button>
        </div>
      ) : jitsiRoomName ? (
        <JitsiRoom
          roomName={jitsiRoomName}
          displayName={displayName}
          height="600px"
          onReady={() => setJoined(true)}
        />
      ) : session.meetingUrl ? (
        <section className="space-y-3 rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">تبدأ الجلسة في {new Date(session.startTime).toLocaleString('ar-SA')}</p>
          <a
            href={session.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <ExternalLink className="h-4 w-4" />دخول الاجتماع
          </a>
        </section>
      ) : (
        <p className="rounded-md border p-4 text-sm text-muted-foreground">رابط الاجتماع غير متاح.</p>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="ml-2 h-4 w-4" />تحديث
        </Button>
      </div>
    </main>
  );
}
