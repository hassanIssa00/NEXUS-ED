'use client';

import { useCallback, useEffect, useState } from 'react';
import { Link } from '@/i18n/routing';
import { CircleAlert, Loader2, Radio, Video } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useLocale } from 'next-intl';

type SchoolClass = { id: string; name: string; activeSessionId?: string | null; nextClass?: string | null; nextSessionTitle?: string | null; teacher?: string | null };

export default function StudentLivePage() {
  const isEnglish = useLocale() === 'en';
  const t = useCallback((ar: string, en: string) => isEnglish ? en : ar, [isEnglish]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiClient.get('/classes/student/list')
      .then(({ data }) => { if (active) setClasses(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setError(t('تعذر تحميل الجلسات.', 'Could not load live sessions.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [t]);

  const activeClasses = classes.filter((item) => item.activeSessionId);

  return (
    <main className="mx-auto max-w-4xl space-y-6 pb-10" dir={isEnglish ? 'ltr' : 'rtl'}>
      <header className="flex items-center gap-3 border-b pb-5"><Radio className="h-6 w-6 text-primary" /><div><h1 className="text-2xl font-bold">{t('الجلسات المباشرة', 'Live sessions')}</h1><p className="mt-1 text-sm text-muted-foreground">{t('الجلسات النشطة المتاحة في فصولك المسجلة.', 'Active sessions available in your enrolled classes.')}</p></div></header>
      {loading ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t('تحميل الجلسات...', 'Loading sessions…')}</div> : error ? <p role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 p-4 text-sm text-destructive"><CircleAlert className="h-4 w-4" />{error}</p> : activeClasses.length === 0 ? <p className="rounded-md border p-6 text-sm text-muted-foreground">{t('لا توجد جلسة مباشرة متاحة لفصولك حاليًا.', 'No live sessions are currently available for your classes.')}</p> : (
        <ul className="divide-y rounded-md border bg-card">
          {activeClasses.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div><h2 className="font-semibold">{item.nextSessionTitle || item.name}</h2><p className="mt-1 text-sm text-muted-foreground">{item.name}{item.teacher ? ` · ${item.teacher}` : ''}{item.nextClass ? ` · ${new Date(item.nextClass).toLocaleString(isEnglish ? 'en-US' : 'ar-SA')}` : ''}</p></div>
            <Link href={`/live/${encodeURIComponent(item.id)}`} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"><Video className="h-4 w-4" />{t('دخول البث', 'Join live session')}</Link>
          </li>)}
        </ul>
      )}
    </main>
  );
}
