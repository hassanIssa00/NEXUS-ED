'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, CircleAlert, Loader2, Users } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import ScheduleWeekView from '@/components/schedule/ScheduleWeekView';

type Child = { id: string; name: string };

export default function ParentSchedulePage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [studentId, setStudentId] = useState('');
  const [schedule, setSchedule] = useState<Record<string, any[]>>({});
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiClient.get('/dashboard/parent')
      .then(({ data }) => {
        if (!active) return;
        const rows = Array.isArray(data?.children) ? data.children : [];
        setChildren(rows);
        setStudentId(rows[0]?.id || '');
      })
      .catch((reason) => { if (active) setError(reason?.response?.data?.message || 'تعذر تحميل ملفات الأبناء.'); })
      .finally(() => { if (active) setLoadingChildren(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!studentId) { setSchedule({}); return; }
    let active = true;
    setLoadingSchedule(true);
    setError('');
    apiClient.get(`/schedule/parent/${encodeURIComponent(studentId)}`)
      .then(({ data }) => { if (active) setSchedule(data?.data || {}); })
      .catch((reason) => { if (active) { setSchedule({}); setError(reason?.response?.data?.message || 'تعذر تحميل جدول الطالب.'); } })
      .finally(() => { if (active) setLoadingSchedule(false); });
    return () => { active = false; };
  }, [studentId]);

  const selectedChild = children.find((child) => child.id === studentId);

  return (
    <main className="mx-auto max-w-5xl space-y-6 pb-10" dir="rtl">
      <header className="flex items-center gap-3 border-b pb-5">
        <CalendarDays className="h-6 w-6 text-primary" />
        <div><h1 className="text-2xl font-bold">جدول الأبناء</h1><p className="mt-1 text-sm text-muted-foreground">يُعرض الجدول للطالب المرتبط بحساب ولي الأمر فقط.</p></div>
      </header>

      {loadingChildren ? <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />تحميل ملفات الأبناء...</div> : children.length === 0 ? (
        <section className="rounded-md border p-8 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">لا يوجد طالب مرتبط بالحساب.</p>
          <Link href="/student/new?flow=parent" className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">ربط طالب برمز الطالب</Link>
        </section>
      ) : (
        <>
          <label className="block max-w-md space-y-2 text-sm font-medium">الطالب
            <select className="w-full rounded-md border bg-background p-2.5" value={studentId} onChange={(event) => setStudentId(event.target.value)}>
              {children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}
            </select>
          </label>
          {selectedChild && <h2 className="text-lg font-semibold">جدول {selectedChild.name}</h2>}
          {error ? <p role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 p-4 text-sm text-destructive"><CircleAlert className="h-4 w-4" />{error}</p> : loadingSchedule ? <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />تحميل الجدول...</div> : <ScheduleWeekView schedule={schedule} />}
        </>
      )}
    </main>
  );
}
