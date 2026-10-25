'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { CalendarDays, CircleAlert, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import ScheduleWeekView from '@/components/schedule/ScheduleWeekView';
import CurrentScheduleCard from '@/components/schedule/CurrentScheduleCard';

export default function SchedulePage() {
  const isEnglish = useLocale() === 'en';
  const t = (ar: string, en: string) => isEnglish ? en : ar;
  const [schedule, setSchedule] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiClient.get('/schedule/my')
      .then(({ data }) => { if (active) setSchedule(data?.data || {}); })
      .catch((reason) => { if (active) {
        const message = reason?.response?.data?.message;
        setError(isEnglish && typeof message === 'string' && /[\u0600-\u06ff]/.test(message)
          ? t('تعذر تحميل الجدول من الخادم.', 'Could not load the timetable from the server.')
          : message || t('تعذر تحميل الجدول من الخادم.', 'Could not load the timetable from the server.'));
      } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <main className="mx-auto max-w-5xl space-y-6 pb-10" dir={isEnglish ? 'ltr' : 'rtl'}>
      <header className="flex items-center gap-3 border-b pb-5">
        <CalendarDays className="h-6 w-6 text-primary" />
        <div><h1 className="text-2xl font-bold">{t('جدول الحصص', 'Class timetable')}</h1><p className="mt-1 text-sm text-muted-foreground">{t('المواعيد المسجلة للفصول والمواد المرتبطة بحسابك.', 'Published times for the classes and subjects linked to your account.')}</p></div>
      </header>
      {loading ? <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t('تحميل الجدول...', 'Loading timetable...')}</div> : error ? <p role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 p-4 text-sm text-destructive"><CircleAlert className="h-4 w-4" />{error}</p> : <div className="space-y-5"><CurrentScheduleCard scheduleData={schedule} /><ScheduleWeekView schedule={schedule} /></div>}
    </main>
  );
}
