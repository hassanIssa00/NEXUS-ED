'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { CalendarDays, CheckCircle2, Clock3, Radio } from 'lucide-react';

type ScheduleEvent = {
  id: string;
  periodNumber?: number | null;
  startTime: string;
  endTime: string;
  room?: string | null;
  subject?: { name?: string | null } | null;
  class?: { name?: string | null } | null;
};

const PERIODS = [
  { number: 1, start: '07:00', end: '07:45' },
  { number: 2, start: '07:45', end: '08:30' },
  { number: 3, start: '08:30', end: '09:15' },
  { number: 4, start: '09:30', end: '10:15' },
  { number: 5, start: '10:15', end: '11:00' },
  { number: 6, start: '11:00', end: '11:45' },
  { number: 7, start: '11:45', end: '12:30' },
];

const DAY_NAMES = {
  ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
};

const subjectStyles = [
  'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100',
  'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100',
  'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100',
  'border-violet-200 bg-violet-50 text-violet-950 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-100',
  'border-cyan-200 bg-cyan-50 text-cyan-950 dark:border-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-100',
  'border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100',
];

function minutes(value: string) {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(value || '');
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function getSaudiClock() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Riyadh', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date()).map(({ type, value }) => [type, value]));
  const day = ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[String(parts.weekday)];
  return { day: day ?? 0, minute: Number(parts.hour) * 60 + Number(parts.minute) };
}

export default function ScheduleWeekView({ schedule }: { schedule: Record<string, ScheduleEvent[]> }) {
  const locale = useLocale() === 'en' ? 'en' : 'ar';
  const days = DAY_NAMES[locale];
  const [today, setToday] = useState<number | null>(null);
  const [minuteNow, setMinuteNow] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [dayWasSelected, setDayWasSelected] = useState(false);

  useEffect(() => {
    const update = () => {
      const clock = getSaudiClock();
      setToday(clock.day);
      setMinuteNow(clock.minute);
      if (!dayWasSelected) setSelectedDay(clock.day < 5 ? clock.day : 0);
    };
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, [dayWasSelected]);

  const lessonsBySlot = useMemo(() => {
    const slots = new Map<string, ScheduleEvent>();
    for (const [dayKey, entries] of Object.entries(schedule || {})) {
      const day = Number(dayKey);
      if (!Number.isInteger(day) || day < 0 || day > 4 || !Array.isArray(entries)) continue;
      const sorted = [...entries].sort((left, right) => left.startTime.localeCompare(right.startTime));
      const duplicateLegacyNumbers = sorted.length > 1 && sorted.every((event) => event.periodNumber === sorted[0].periodNumber);
      sorted.forEach((event, index) => {
        const number = duplicateLegacyNumbers || !event.periodNumber ? index + 1 : event.periodNumber;
        if (number >= 1 && number <= 7) slots.set(`${day}-${number}`, event);
      });
    }
    return slots;
  }, [schedule]);

  const allEvents = Object.values(schedule || {}).flat().filter(Boolean);
  const selectedLessons = Array.from({ length: 7 }, (_, index) => ({
    period: PERIODS[index],
    event: lessonsBySlot.get(`${selectedDay}-${index + 1}`) || null,
  })).filter(({ event }) => event);
  const nextSelectedLessonId = selectedDay === today && minuteNow !== null
    ? selectedLessons.find(({ event }) => {
        const start = event ? minutes(event.startTime) : null;
        return start !== null && start > minuteNow;
      })?.event?.id
    : undefined;

  if (!allEvents.length) {
    return <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground" dir={locale === 'en' ? 'ltr' : 'rtl'}>
      <CalendarDays className="h-8 w-8 opacity-50" />
      <p>{locale === 'en' ? 'No timetable has been added for this class yet.' : 'لا يوجد جدول دراسي مسجل لهذا الفصل حتى الآن.'}</p>
    </div>;
  }

  return <section className="space-y-4" dir={locale === 'en' ? 'ltr' : 'rtl'}>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><CalendarDays className="size-5" /></div>
        <div><h2 className="font-bold">{locale === 'en' ? 'Weekly timetable' : 'الجدول الأسبوعي'}</h2><p className="text-xs text-muted-foreground">{locale === 'en' ? 'Select a day or lesson to focus its details.' : 'اختر يومًا أو حصة لعرض تفاصيلها.'}</p></div>
      </div>
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={locale === 'en' ? 'Days of the week' : 'أيام الأسبوع'}>
        {days.map((day, index) => <button key={day} type="button" role="tab" aria-current={today === index ? 'date' : undefined} aria-selected={selectedDay === index} onClick={() => { setSelectedDay(index); setDayWasSelected(true); }} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${today === index ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300 hover:bg-emerald-700' : selectedDay === index ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
          {day}{today === index && <span className="ms-1.5 inline-flex items-center gap-1 rounded-full bg-white/20 px-1.5 py-0.5"><span className="size-1.5 rounded-full bg-white" />{locale === 'en' ? 'Today' : 'اليوم'}</span>}
        </button>)}
      </div>
    </div>

    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead><tr className="bg-muted/50 text-muted-foreground">
          <th scope="col" className="sticky start-0 z-10 min-w-28 border-b border-e border-border bg-muted/80 px-4 py-3 text-start">{locale === 'en' ? 'Period' : 'الحصة'}</th>
          {days.map((day, index) => <th key={day} scope="col" aria-current={today === index ? 'date' : undefined} className={`min-w-32 border-b border-e border-border px-3 py-3 text-center font-bold last:border-e-0 ${today === index ? 'border-b-emerald-400 bg-emerald-50 text-emerald-900 dark:border-b-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100' : selectedDay === index ? 'bg-primary/[0.04]' : ''}`}><button type="button" onClick={() => { setSelectedDay(index); setDayWasSelected(true); }} className="rounded-md px-2 py-1 hover:bg-background/80">{day}{today === index && <span className="mt-1 flex items-center justify-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300"><span className="size-1.5 rounded-full bg-emerald-500" />{locale === 'en' ? 'Today' : 'اليوم'}</span>}</button></th>)}
        </tr></thead>
        <tbody>{PERIODS.map((period) => <tr key={period.number} className="border-b border-border last:border-b-0">
          <th scope="row" className="sticky start-0 z-10 border-e border-border bg-card px-4 py-3 text-start"><span className="block font-bold">{locale === 'en' ? `Period ${period.number}` : `الحصة ${period.number}`}</span><span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-muted-foreground" dir="ltr"><Clock3 className="size-3" />{period.start} – {period.end}</span></th>
          {days.map((day, dayIndex) => {
            const event = lessonsBySlot.get(`${dayIndex}-${period.number}`);
            const start = event ? minutes(event.startTime) : null;
            const end = event ? minutes(event.endTime) : null;
            const isCurrent = Boolean(event && today === dayIndex && minuteNow !== null && start !== null && end !== null && minuteNow >= start && minuteNow < end);
            return <td key={`${dayIndex}-${period.number}`} className={`border-e border-border p-2 align-top last:border-e-0 ${today === dayIndex ? 'border-e-emerald-200 bg-emerald-50/60 dark:border-e-emerald-900 dark:bg-emerald-950/20' : selectedDay === dayIndex ? 'bg-primary/[0.025]' : ''}`}>
              {event ? <button type="button" aria-pressed={selectedDay === dayIndex} onClick={() => { setSelectedDay(dayIndex); setDayWasSelected(true); }} className={`min-h-[68px] w-full rounded-xl border p-2.5 text-start transition hover:-translate-y-0.5 hover:shadow-sm ${isCurrent ? 'border-emerald-600 bg-gradient-to-br from-emerald-100 to-white text-emerald-950 ring-2 ring-emerald-400 shadow-md dark:border-emerald-500 dark:from-emerald-950/70 dark:to-emerald-950/20 dark:text-emerald-100' : `${subjectStyles[(period.number + dayIndex) % subjectStyles.length]} ${today === dayIndex ? 'ring-1 ring-emerald-200 dark:ring-emerald-900' : ''}`}`}>
                <span className="flex min-h-5 items-start justify-between gap-1"><span className="font-bold leading-5">{event.subject?.name || (locale === 'en' ? 'Lesson' : 'حصة دراسية')}</span>{isCurrent && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground"><Radio className="size-3 animate-pulse" />{locale === 'en' ? 'Live' : 'جارية'}</span>}</span>
                <span className="mt-1 block text-[10px] opacity-70" dir="ltr">{event.startTime} – {event.endTime}</span>
              </button> : <div aria-label={locale === 'en' ? 'Free period' : 'لا توجد حصة'} className="grid min-h-[68px] place-items-center rounded-xl border border-dashed border-border/70 text-muted-foreground/35">—</div>}
            </td>;
          })}
        </tr>)}</tbody>
      </table>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {selectedLessons.map(({ period, event }) => {
        const start = event ? minutes(event.startTime) : null;
        const end = event ? minutes(event.endTime) : null;
        const isCurrent = Boolean(event && today === selectedDay && minuteNow !== null && start !== null && end !== null && minuteNow >= start && minuteNow < end);
        const isNext = Boolean(event && event.id === nextSelectedLessonId);
        return <div key={event!.id} className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-start ${isCurrent ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20' : isNext ? 'border-sky-300 bg-sky-50/70 dark:border-sky-900 dark:bg-sky-950/20' : 'border-border bg-card'}`}>
          <span><span className="block text-xs text-muted-foreground">{locale === 'en' ? `Period ${period.number}` : `الحصة ${period.number}`} · <span dir="ltr">{event!.startTime}–{event!.endTime}</span></span><span className="mt-1 block font-bold">{isNext ? (locale === 'en' ? 'Next class: ' : 'الحصة القادمة: ') : ''}{event!.subject?.name || (locale === 'en' ? 'Lesson' : 'حصة دراسية')}</span>{event!.class?.name && <span className="mt-1 block text-xs text-muted-foreground">{event!.class.name}</span>}</span>
          {isCurrent ? <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground"><Radio className="size-3 animate-pulse" />{locale === 'en' ? 'Now' : 'الآن'}</span> : <CheckCircle2 className="size-4 text-muted-foreground/50" />}
        </div>;
      })}
    </div>
  </section>;
}
