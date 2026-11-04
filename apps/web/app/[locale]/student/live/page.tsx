'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { CircleAlert, Loader2, Radio, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { classSessionApi, ClassSession } from '@/lib/api/class-session';
import { Button } from '@/components/ui/button';

type SchoolClass = { id: string; name: string; teacher?: { name?: string | null } | null };
type ClassWithSession = SchoolClass & { session: ClassSession | null; sessionLoading: boolean };

export default function StudentLivePage() {
  const [classes, setClasses] = useState<ClassWithSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchSessions = useCallback(async (classList: SchoolClass[]) => {
    const results = await Promise.allSettled(
      classList.map((cls) =>
        classSessionApi.getActive(cls.id)
          .then((res) => {
            const raw = res?.data as any;
            const data: ClassSession | null = raw?.data ?? raw ?? null;
            return { ...cls, session: data, sessionLoading: false };
          })
          .catch(() => ({ ...cls, session: null as ClassSession | null, sessionLoading: false }))
      )
    );
    return results.map((r) => r.status === 'fulfilled' ? r.value : ({ id: '', name: '', session: null, sessionLoading: false }));
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get('/classes/student/list');
      const rows: SchoolClass[] = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      const withSessions = await fetchSessions(rows);
      setClasses(withSessions.filter((c) => c.id));
      setLastRefresh(new Date());
    } catch (reason: any) {
      setError(reason?.response?.data?.message || 'تعذر تحميل الجلسات.');
    } finally {
      setLoading(false);
    }
  }, [fetchSessions]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => { void loadAll(); }, 30_000);
    return () => clearInterval(interval);
  }, [loadAll]);

  const activeClasses = classes.filter((c) => c.session);
  const inactiveClasses = classes.filter((c) => !c.session);

  return (
    <main className="mx-auto max-w-4xl space-y-6 pb-10" dir="rtl">
      <header className="flex items-center justify-between gap-3 border-b pb-5">
        <div className="flex items-center gap-3">
          <Radio className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">الجلسات المباشرة</h1>
            <p className="mt-1 text-sm text-muted-foreground">الجلسات النشطة المتاحة في فصولك المسجلة.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">آخر تحديث: {lastRefresh.toLocaleTimeString('ar-SA')}</span>
          <Button variant="outline" size="sm" onClick={() => void loadAll()} disabled={loading}>
            <RefreshCw className={`ml-1 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
      </header>

      {loading && classes.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />تحميل الجلسات...
        </div>
      ) : error ? (
        <p role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 p-4 text-sm text-destructive">
          <CircleAlert className="h-4 w-4" />{error}
        </p>
      ) : (
        <div className="space-y-6">
          {/* Active sessions */}
          {activeClasses.length > 0 && (
            <section>
              <h2 className="mb-3 font-semibold text-emerald-700 dark:text-emerald-400">🔴 جلسات نشطة الآن</h2>
              <ul className="space-y-3">
                {activeClasses.map((item) => (
                  <li key={item.id} className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/20">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                        <div>
                          <h3 className="font-semibold">{item.session?.title || item.name}</h3>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {item.name}
                            {item.session?.teacher?.name && ` · ${item.session.teacher.name}`}
                            {item.session?.startTime && ` · بدأت ${new Date(item.session.startTime).toLocaleTimeString('ar-SA')}`}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/live/${encodeURIComponent(item.id)}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-emerald-700 transition-colors"
                      >
                        <Radio className="h-4 w-4" />
                        انضم للجلسة
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Inactive classes */}
          {inactiveClasses.length > 0 && (
            <section>
              <h2 className="mb-3 font-semibold text-muted-foreground">فصولك الأخرى</h2>
              <ul className="space-y-2">
                {inactiveClasses.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
                    <h3 className="font-medium">{item.name}</h3>
                    <span className="rounded-full border border-muted px-3 py-0.5 text-xs text-muted-foreground">لا توجد جلسة نشطة</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {classes.length === 0 && (
            <p className="rounded-md border p-6 text-sm text-muted-foreground text-center">
              لم يتم تسجيلك في أي فصل دراسي حتى الآن.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
