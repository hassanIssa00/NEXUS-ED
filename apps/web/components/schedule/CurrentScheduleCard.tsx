'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { Activity, CalendarDays, Clock3, LoaderCircle, Radio } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

type ScheduleEvent = {
  id: string;
  periodNumber?: number | null;
  startTime: string;
  endTime: string;
  subject?: { name?: string | null } | null;
  class?: { name?: string | null } | null;
};

type Props = { studentId?: string; title?: string; scheduleData?: Record<string, ScheduleEvent[]> };

function getSaudiTime() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Riyadh', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date()).map(({ type, value }) => [type, value]));
  const day = ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[String(parts.weekday)];
  return { day: day ?? 0, minute: Number(parts.hour) * 60 + Number(parts.minute) };
}

function parseTime(value: string) {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(value || '');
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export default function CurrentScheduleCard({ studentId, title, scheduleData }: Props) {
  const locale = useLocale() === 'en' ? 'en' : 'ar';
  const en = locale === 'en';
  const [loadedSchedule, setLoadedSchedule] = useState<Record<string, ScheduleEvent[]>>({});
  const [minuteNow, setMinuteNow] = useState<number | null>(null);
  const [dayNow, setDayNow] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const schedule = scheduleData ?? loadedSchedule;

  useEffect(() => {
    const update = () => {
      const now = getSaudiTime();
      setDayNow(now.day);
      setMinuteNow(now.minute);
    };
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (scheduleData) {
      setError(false);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(false);
    const endpoint = studentId
      ? `/schedule/parent/${encodeURIComponent(studentId)}`
      : '/schedule/my';
    apiClient.get(endpoint)
      .then(({ data }) => { if (active) setLoadedSchedule(data?.data && typeof data.data === 'object' ? data.data : {}); })
      .catch(() => { if (active) { setLoadedSchedule({}); setError(true); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [studentId, scheduleData]);

  const dayEvents = useMemo(() => (dayNow === null ? [] : [...(schedule[String(dayNow)] || [])]
    .map((event) => ({ event, start: parseTime(event.startTime), end: parseTime(event.endTime) }))
    .filter((item): item is { event: ScheduleEvent; start: number; end: number } => item.start !== null && item.end !== null && item.end > item.start)
    .sort((a, b) => a.start - b.start)), [schedule, dayNow]);

  const status = useMemo(() => {
    if (minuteNow === null || dayNow === null) return null;
    if (dayNow > 4) return { kind: 'weekend' as const };
    const current = dayEvents.find((item) => minuteNow >= item.start && minuteNow < item.end);
    if (current) return { kind: 'lesson' as const, ...current };
    const next = dayEvents.find((item) => item.start > minuteNow);
    if (!next) return dayEvents.length ? { kind: 'ended' as const } : { kind: 'empty' as const };
    const previous = [...dayEvents].reverse().find((item) => item.end <= minuteNow);
    if (!previous) return { kind: 'upcoming' as const, ...next };
    return { kind: next.start - previous.end >= 10 ? 'break' as const : 'between' as const, next };
  }, [dayEvents, dayNow, minuteNow]);

  const names = en
    ? { loading: 'Loading today’s school schedule…', error: 'The live schedule could not be loaded.', title: 'Live school day', lesson: 'Class in progress', break: 'Break time', between: 'Between classes', upcoming: 'Next class', ended: 'School day ended', weekend: 'No classes today', empty: 'No schedule published for today', next: 'Next', now: 'Live now', starts: 'Starts at', remaining: 'minutes remaining', minutes: 'minutes', inferred: 'Based on the gaps in the published timetable' }
    : { loading: 'جارٍ تحميل جدول اليوم...', error: 'تعذر تحميل الجدول المباشر.', title: 'اليوم الدراسي مباشر', lesson: 'الحصة جارية الآن', break: 'وقت فسحة', between: 'بين الحصص', upcoming: 'الحصة القادمة', ended: 'انتهى اليوم الدراسي', weekend: 'لا توجد حصص اليوم', empty: 'لا يوجد جدول منشور لهذا اليوم', next: 'التالي', now: 'مباشر الآن', starts: 'تبدأ الساعة', remaining: 'دقيقة متبقية', minutes: 'دقيقة', inferred: 'تُحسب الفسحة من الفجوة الظاهرة في الجدول المنشور' };

  let label = names.loading;
  let subject = '';
  let timeText = '';
  let tone = 'border-border bg-card';
  let isLive = false;

  if (!loading && error) {
    label = names.error;
    tone = 'border-destructive/30 bg-destructive/5';
  } else if (!loading && status) {
    if (status.kind === 'lesson') {
      label = names.lesson;
      subject = status.event.subject?.name || (en ? 'Class' : 'حصة دراسية');
      const remaining = status.end - minuteNow!;
      const eventIndex = dayEvents.findIndex((item) => item.event.id === status.event.id);
      const duplicateLegacyNumbers = dayEvents.length > 1 && dayEvents.every((item) => item.event.periodNumber === dayEvents[0].event.periodNumber);
      const periodPosition = duplicateLegacyNumbers || !status.event.periodNumber
        ? eventIndex + 1
        : status.event.periodNumber;
      const periodLabel = periodPosition > 0 ? `${en ? 'Period' : 'الحصة'} ${periodPosition} · ` : '';
      timeText = `${periodLabel}${status.event.startTime} – ${status.event.endTime} · ${remaining} ${names.remaining}`;
      tone = 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-white dark:border-emerald-900 dark:from-emerald-950/40 dark:to-card';
      isLive = true;
    } else if (status.kind === 'break' || status.kind === 'between') {
      label = status.kind === 'break' ? names.break : names.between;
      subject = `${names.upcoming}: ${status.next.event.subject?.name || (en ? 'Class' : 'حصة دراسية')}`;
      timeText = `${names.starts} ${status.next.event.startTime} · ${Math.max(0, status.next.start - minuteNow!)} ${names.minutes}`;
      tone = 'border-amber-300 bg-gradient-to-br from-amber-50 to-white dark:border-amber-900 dark:from-amber-950/30 dark:to-card';
    } else if (status.kind === 'upcoming') {
      label = names.upcoming;
      subject = status.event.subject?.name || (en ? 'Class' : 'حصة دراسية');
      timeText = `${names.starts} ${status.event.startTime} · ${Math.max(0, status.start - minuteNow!)} ${names.minutes}`;
      tone = 'border-sky-300 bg-gradient-to-br from-sky-50 to-white dark:border-sky-900 dark:from-sky-950/30 dark:to-card';
    } else {
      label = status.kind === 'ended' ? names.ended : status.kind === 'weekend' ? names.weekend : names.empty;
    }
  }

  return (
    <section className={`overflow-hidden rounded-2xl border shadow-sm ${tone}`} dir={en ? 'ltr' : 'rtl'} aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 md:p-6">
        <div className="flex items-center gap-4">
          <span className={`grid size-12 place-items-center rounded-2xl ${isLive ? 'bg-emerald-600 text-white' : 'bg-primary/10 text-primary'}`}>
            {loading ? <LoaderCircle className="size-5 animate-spin" /> : isLive ? <Radio className="size-5 animate-pulse" /> : <CalendarDays className="size-5" />}
          </span>
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Activity className="size-4" />{title || names.title}</p>
            <h2 className="mt-1 text-lg font-black">{label}</h2>
            {subject && <p className="mt-1 font-bold text-foreground">{subject}</p>}
            {timeText && <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground" dir="ltr"><Clock3 className="size-3.5" />{timeText}</p>}
            {(status?.kind === 'break' || status?.kind === 'between') && <p className="mt-1 text-[11px] text-muted-foreground">{names.inferred}</p>}
          </div>
        </div>
        {isLive && <span className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"><span className="size-2 animate-pulse rounded-full bg-white" />{names.now}</span>}
      </div>
    </section>
  );
}
