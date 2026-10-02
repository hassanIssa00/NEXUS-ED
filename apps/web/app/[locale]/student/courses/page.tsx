'use client';

import { useEffect, useState } from 'react';
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

const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export default function ClassesPage() {
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiClient.get('/classes/student/list')
      .then(({ data }) => { if (active) setClasses(Array.isArray(data) ? data : []); })
      .catch((reason) => { if (active) setError(reason?.response?.data?.message || 'تعذر تحميل فصولك.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <main className="space-y-6" dir="rtl">
      <header><h1 className="text-2xl font-bold">فصولي</h1><p className="mt-1 text-sm text-muted-foreground">الجداول والجلسات المسجلة لفصولك.</p></header>
      {loading ? <p className="py-8 text-center text-sm text-muted-foreground">تحميل الفصول...</p>
        : error ? <p role="alert" className="text-sm text-destructive">{error}</p>
          : classes.length === 0 ? <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">لا توجد فصول مرتبطة بحسابك حاليًا.</p>
            : <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{classes.map((schoolClass) => (
              <Card key={schoolClass.id}>
                <CardHeader><CardTitle className="text-lg">{schoolClass.name}</CardTitle>{schoolClass.teacher && <p className="text-sm text-muted-foreground">{schoolClass.teacher}</p>}</CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h2 className="flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4" />الجدول</h2>
                    {schoolClass.schedule.length === 0 ? <p className="text-sm text-muted-foreground">لا يوجد جدول مسجل.</p> : schoolClass.schedule.map((event, index) => (
                      <div key={`${event.dayOfWeek}:${event.startTime}:${index}`} className="rounded-md bg-muted/50 p-3 text-sm">
                        <p className="font-medium">{event.subject}</p>
                        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>{dayNames[event.dayOfWeek] || 'اليوم غير محدد'}</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{event.startTime} - {event.endTime}</span>{event.room && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{event.room}</span>}</p>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-4">
                    {schoolClass.nextClass ? <p className="text-sm text-muted-foreground">{schoolClass.nextSessionTitle || 'الجلسة القادمة'} · {new Date(schoolClass.nextClass).toLocaleString()}</p> : <p className="text-sm text-muted-foreground">لا توجد جلسات قادمة مسجلة.</p>}
                    {schoolClass.meetingUrl && <a href={schoolClass.meetingUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground"><Video className="h-4 w-4" />فتح رابط الجلسة</a>}
                  </div>
                </CardContent>
              </Card>
            ))}</section>}
    </main>
  );
}
