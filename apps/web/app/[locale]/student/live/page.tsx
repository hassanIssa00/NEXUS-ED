'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CircleAlert, ExternalLink, Loader2, Radio } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

type SchoolClass = { id: string; name: string; meetingUrl?: string | null; nextClass?: string | null; nextSessionTitle?: string | null; teacher?: string | null };

export default function StudentLivePage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiClient.get('/classes/student/list')
      .then(({ data }) => { if (active) setClasses(Array.isArray(data) ? data : []); })
      .catch((reason) => { if (active) setError(reason?.response?.data?.message || 'تعذر تحميل الجلسات.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const activeClasses = classes.filter((item) => item.meetingUrl);

  return (
    <main className="mx-auto max-w-4xl space-y-6 pb-10" dir="rtl">
      <header className="flex items-center gap-3 border-b pb-5"><Radio className="h-6 w-6 text-primary" /><div><h1 className="text-2xl font-bold">الجلسات المباشرة</h1><p className="mt-1 text-sm text-muted-foreground">الجلسات النشطة المتاحة في فصولك المسجلة.</p></div></header>
      {loading ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />تحميل الجلسات...</div> : error ? <p role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 p-4 text-sm text-destructive"><CircleAlert className="h-4 w-4" />{error}</p> : activeClasses.length === 0 ? <p className="rounded-md border p-6 text-sm text-muted-foreground">لا توجد جلسة مباشرة متاحة لفصولك حاليًا.</p> : (
        <ul className="divide-y rounded-md border bg-card">
          {activeClasses.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div><h2 className="font-semibold">{item.nextSessionTitle || item.name}</h2><p className="mt-1 text-sm text-muted-foreground">{item.name}{item.teacher ? ` · ${item.teacher}` : ''}{item.nextClass ? ` · ${new Date(item.nextClass).toLocaleString('ar-SA')}` : ''}</p></div>
            <Link href={`/live/${encodeURIComponent(item.id)}`} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"><ExternalLink className="h-4 w-4" />دخول الجلسة</Link>
          </li>)}
        </ul>
      )}
    </main>
  );
}
