'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, CircleAlert, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import ScheduleWeekView from '@/components/schedule/ScheduleWeekView';

export default function SchedulePage() {
  const [schedule, setSchedule] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiClient.get('/schedule/my')
      .then(({ data }) => { if (active) setSchedule(data?.data || {}); })
      .catch((reason) => { if (active) setError(reason?.response?.data?.message || 'تعذر تحميل الجدول من الخادم.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <main className="mx-auto max-w-5xl space-y-6 pb-10" dir="rtl">
      <header className="flex items-center gap-3 border-b pb-5">
        <CalendarDays className="h-6 w-6 text-primary" />
        <div><h1 className="text-2xl font-bold">جدول الحصص</h1><p className="mt-1 text-sm text-muted-foreground">المواعيد المسجلة للفصول والمواد المرتبطة بحسابك.</p></div>
      </header>
      {loading ? <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />تحميل الجدول...</div> : error ? <p role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 p-4 text-sm text-destructive"><CircleAlert className="h-4 w-4" />{error}</p> : <ScheduleWeekView schedule={schedule} />}
    </main>
  );
}
