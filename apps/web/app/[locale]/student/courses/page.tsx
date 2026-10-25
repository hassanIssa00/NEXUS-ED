'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { CalendarDays, Clock3, MapPin, Video } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';

type ScheduleEvent = { dayOfWeek: number; startTime: string; endTime: string; room?: string | null; subject: string };
type StudentClass = {
  id: string;
  name: string;
  teacher?: string | null;
  schedule: ScheduleEvent[];
  nextClass?: string | null;
  meetingUrl?: string | null;
  nextSessionTitle?: string | null;
};

const dayNames = { ar: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] };

export default function ClassesPage() {
  const isEnglish = useLocale() === 'en';
  const t = (ar: string, en: string) => isEnglish ? en : ar;
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiClient.get('/classes/student/list')
      .then(({ data }) => { if (active) setClasses(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setError(t('تعذر تحميل فصولك.', 'Could not load your classes.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <main className="space-y-6" dir={isEnglish ? 'ltr' : 'rtl'}>
      <header><h1 className="text-2xl font-bold">{t('فصولي', 'My classes')}</h1><p className="mt-1 text-sm text-muted-foreground">{t('الجداول والجلسات المسجلة لفصولك.', 'Schedules and sessions recorded for your classes.')}</p></header>
      {loading ? <p className="py-8 text-center text-sm text-muted-foreground">{t('تحميل الفصول...', 'Loading classes...')}</p>
        : error ? <p role="alert" className="text-sm text-destructive">{error}</p>
          : classes.length === 0 ? <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">{t('لا توجد فصول مرتبطة بحسابك حاليًا.', 'No classes are currently linked to your account.')}</p>
            : <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{classes.map((schoolClass) => (
              <Card key={schoolClass.id}>
                <CardHeader><CardTitle className="text-lg">{schoolClass.name}</CardTitle>{schoolClass.teacher && <p className="text-sm text-muted-foreground">{schoolClass.teacher}</p>}</CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h2 className="flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4" />{t('الجدول', 'Schedule')}</h2>
                    {schoolClass.schedule.length === 0 ? <p className="text-sm text-muted-foreground">{t('لا يوجد جدول مسجل.', 'No schedule is recorded.')}</p> : schoolClass.schedule.map((event, index) => (
                      <div key={`${event.dayOfWeek}:${event.startTime}:${index}`} className="rounded-md bg-muted/50 p-3 text-sm">
                        <p className="font-medium">{event.subject}</p>
                        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>{dayNames[isEnglish ? 'en' : 'ar'][event.dayOfWeek] || t('اليوم غير محدد', 'Day not specified')}</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{event.startTime} - {event.endTime}</span>{event.room && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{event.room}</span>}</p>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-4">
                    {schoolClass.nextClass ? <p className="text-sm text-muted-foreground">{schoolClass.nextSessionTitle || t('الجلسة القادمة', 'Next session')} · {new Date(schoolClass.nextClass).toLocaleString(isEnglish ? 'en-US' : 'ar-SA')}</p> : <p className="text-sm text-muted-foreground">{t('لا توجد جلسات قادمة مسجلة.', 'No upcoming sessions are recorded.')}</p>}
                    {schoolClass.meetingUrl && <a href={schoolClass.meetingUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground"><Video className="h-4 w-4" />{t('فتح رابط الجلسة', 'Open session link')}</a>}
                  </div>
                </CardContent>
              </Card>
            ))}</section>}
    </main>
  );
}
