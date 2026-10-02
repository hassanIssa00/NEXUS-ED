type ScheduleEvent = {
  id: string;
  startTime: string;
  endTime: string;
  room?: string | null;
  subject?: { name?: string | null } | null;
  class?: { name?: string | null } | null;
};

const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export default function ScheduleWeekView({ schedule }: { schedule: Record<string, ScheduleEvent[]> }) {
  const days = Object.entries(schedule || {})
    .map(([key, events]) => ({ day: Number(key), events: Array.isArray(events) ? events : [] }))
    .filter(({ day, events }) => Number.isInteger(day) && day >= 0 && day < DAY_NAMES.length && events.length > 0)
    .sort((left, right) => left.day - right.day);

  if (!days.length) return <p className="rounded-md border p-6 text-sm text-muted-foreground">لا يوجد جدول دراسي مسجل لهذا الحساب حتى الآن.</p>;

  return (
    <div className="space-y-5" dir="rtl">
      {days.map(({ day, events }) => (
        <section key={day} className="rounded-md border bg-card">
          <h2 className="border-b px-4 py-3 font-semibold">{DAY_NAMES[day]}</h2>
          <ol className="divide-y">
            {[...events].sort((left, right) => left.startTime.localeCompare(right.startTime)).map((event) => (
              <li key={event.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="font-medium">{event.subject?.name || 'مادة غير مسماة'}</span>
                <span className="text-muted-foreground" dir="ltr">{event.startTime}–{event.endTime}</span>
                {(event.class?.name || event.room) && <span className="text-xs text-muted-foreground">{[event.class?.name, event.room].filter(Boolean).join(' · ')}</span>}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
