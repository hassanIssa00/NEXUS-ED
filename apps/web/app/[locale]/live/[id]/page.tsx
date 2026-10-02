'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, CircleAlert, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { classSessionApi, ClassSession } from '@/lib/api/class-session';
import { Button } from '@/components/ui/button';

export default function LiveClassPage() {
  const params = useParams() as { id: string };
  const router = useRouter();
  const classId = params?.id || '';
  const [session, setSession] = useState<ClassSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setError('');
    try {
      const response = await classSessionApi.getActive(classId);
      setSession(response.data ?? null);
    } catch (reason: any) {
      setSession(null);
      setError(reason?.response?.data?.message || 'لا يمكن تحميل الجلسة لهذا الحساب.');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => { void load(); }, [load]);

  return (
    <main className="mx-auto flex min-h-[65vh] max-w-xl flex-col justify-center gap-5 p-6" dir="rtl">
      <header><h1 className="text-2xl font-bold">جلسة الفصل</h1>{session && <p className="mt-2 text-muted-foreground">{session.title}</p>}</header>
      {loading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />التحقق من الجلسة...</div> : error ? <p role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 p-4 text-sm text-destructive"><CircleAlert className="h-4 w-4" />{error}</p> : !session ? <p className="rounded-md border p-4 text-sm text-muted-foreground">لا توجد جلسة مباشرة لهذا الفصل.</p> : session.meetingUrl ? <section className="space-y-3 rounded-md border bg-card p-5"><p className="text-sm">تبدأ الجلسة في {new Date(session.startTime).toLocaleString('ar-SA')}</p><a href={session.meetingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><ExternalLink className="h-4 w-4" />دخول الاجتماع</a></section> : <p className="rounded-md border p-4 text-sm text-muted-foreground">رابط الاجتماع غير متاح.</p>}
      <div className="flex gap-2"><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="ml-2 h-4 w-4" />تحديث</Button><Button variant="ghost" onClick={() => router.back()}><ArrowRight className="ml-2 h-4 w-4" />رجوع</Button></div>
    </main>
  );
}
