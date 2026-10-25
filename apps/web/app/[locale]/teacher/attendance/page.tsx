'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CircleAlert, Clock3, Loader2, Radio, RefreshCw, UserCheck, UserX } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker, dateInputValue } from '@/components/ui/date-picker';
import { useLocale } from 'next-intl';

type SchoolClass = { id: string; name: string };
type Student = { id: string; name?: string | null; firstName?: string | null; lastName?: string | null; avatar?: string | null };
type AttendanceRecord = { studentId: string; status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'; notes?: string | null; updatedAt?: string };
type SessionRecord = { id: string; title: string; startTime: string; duration: number; isActive: boolean; endedAt?: string | null; attendance: Array<{ studentId: string; status: string; joinedAt?: string | null }> };

function todaySchoolDate() { return dateInputValue(new Date()); }
const nameOf = (student: Student, isEnglish: boolean) => student.name || [student.firstName, student.lastName].filter(Boolean).join(' ') || (isEnglish ? 'Student' : 'طالب');

export default function AttendancePage() {
  const isEnglish = useLocale() === 'en';
  const t = (ar: string, en: string) => isEnglish ? en : ar;
  const errorMessage = (reason: any) => {
    const message = reason?.response?.data?.message;
    return isEnglish ? (typeof message === 'string' && !/[\u0600-\u06ff]/.test(message) ? message : 'Could not load attendance records.') : (message || 'تعذر تحميل سجل الحضور.');
  };
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [date, setDate] = useState(todaySchoolDate);
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiClient.get<SchoolClass[]>('/classes')
      .then(({ data }) => {
        if (!active) return;
        const rows = Array.isArray(data) ? data : [];
        setClasses(rows);
        setSelectedClassId(rows[0]?.id || '');
      })
      .catch((reason) => { if (active) setError(errorMessage(reason)); })
      .finally(() => { if (active) setLoadingClasses(false); });
    return () => { active = false; };
  }, [isEnglish]);

  const load = useCallback(async (silent = false) => {
    if (!selectedClassId) { setStudents([]); setRecords([]); setSessions([]); return; }
    if (!silent) { setLoading(true); setError(''); }
    try {
      const [daily, history] = await Promise.all([
        apiClient.get(`/attendance/classes/${encodeURIComponent(selectedClassId)}`, { params: { date } }),
        apiClient.get<SessionRecord[]>(`/classes/${encodeURIComponent(selectedClassId)}/sessions/history`),
      ]);
      setStudents(Array.isArray(daily.data?.students) ? daily.data.students : []);
      setRecords(Array.isArray(daily.data?.records) ? daily.data.records : []);
      setSessions(Array.isArray(history.data) ? history.data : []);
    } catch (reason) {
      if (!silent) { setStudents([]); setRecords([]); setSessions([]); setError(errorMessage(reason)); }
    } finally { if (!silent) setLoading(false); }
  }, [selectedClassId, date]);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => { void load(true); }, 60_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const byStudent = useMemo(() => new Map(records.map((record) => [record.studentId, record])), [records]);
  const counts = useMemo(() => records.reduce((result, record) => {
    result[record.status] = (result[record.status] || 0) + 1;
    return result;
  }, { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 } as Record<string, number>), [records]);
  const classSessions = useMemo(() => sessions.filter((session) => dateInputValue(new Date(session.startTime)) === date), [sessions, date]);
  const selectedClass = classes.find((item) => item.id === selectedClassId);

  return (
    <main className="mx-auto max-w-6xl space-y-6 pb-10" dir={isEnglish ? 'ltr' : 'rtl'}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-bold">{t('رصد الحضور والغياب', 'Attendance tracking')}</h1><p className="mt-1 text-sm text-muted-foreground">{t('يُسجل الحضور عند اتصال الطالب بالبث من بوابته، ويُثبت الغياب بعد انتهاء الحصة.', 'Attendance is recorded when a student joins the live class from their portal. Absence is recorded after the session ends.')}</p></div>
        <div className="flex flex-wrap items-center gap-2"><DatePicker value={date} onChange={setDate} placeholder={t('اختر التاريخ', 'Choose date')} ariaLabel={t('تاريخ الحضور', 'Attendance date')} className="h-10 w-auto min-w-44" locale={isEnglish ? 'en' : 'ar'} /><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`me-2 size-4 ${loading ? 'animate-spin' : ''}`} />{t('تحديث', 'Refresh')}</Button></div>
      </header>

      {error && <p role="alert" className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><CircleAlert className="size-4 shrink-0" />{error}</p>}

      <Card><CardHeader className="pb-3"><CardTitle className="text-base">{t('الفصل الدراسي', 'Class')}</CardTitle></CardHeader><CardContent><Select value={selectedClassId} onValueChange={setSelectedClassId}><SelectTrigger className="max-w-xl"><SelectValue placeholder={loadingClasses ? t('جارٍ تحميل الفصول...', 'Loading classes…') : t('اختر فصلًا', 'Choose a class')} /></SelectTrigger><SelectContent>{classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></CardContent></Card>

      {selectedClass && <>
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card><CardContent className="flex items-center justify-between p-4"><span className="flex items-center gap-2 text-sm text-emerald-700"><UserCheck className="size-4" />{t('حاضر', 'Present')}</span><strong className="text-xl">{counts.PRESENT || 0}</strong></CardContent></Card>
          <Card><CardContent className="flex items-center justify-between p-4"><span className="flex items-center gap-2 text-sm text-rose-700"><UserX className="size-4" />{t('غائب', 'Absent')}</span><strong className="text-xl">{counts.ABSENT || 0}</strong></CardContent></Card>
          <Card><CardContent className="flex items-center justify-between p-4"><span className="flex items-center gap-2 text-sm text-amber-700"><Clock3 className="size-4" />{t('متأخر', 'Late')}</span><strong className="text-xl">{counts.LATE || 0}</strong></CardContent></Card>
          <Card><CardContent className="flex items-center justify-between p-4"><span className="flex items-center gap-2 text-sm text-sky-700"><CalendarDays className="size-4" />{t('بعذر', 'Excused')}</span><strong className="text-xl">{counts.EXCUSED || 0}</strong></CardContent></Card>
        </section>

        <Card><CardHeader className="border-b"><CardTitle className="text-base">{selectedClass.name} · {new Date(`${date}T12:00:00`).toLocaleDateString(isEnglish ? 'en-US' : 'ar-SA', { dateStyle: 'full' })}</CardTitle></CardHeader><CardContent className="p-0">
          {loading ? <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{t('تحميل الحضور...', 'Loading attendance…')}</div> : students.length === 0 ? <p className="p-10 text-center text-sm text-muted-foreground">{t('لا يوجد طلاب مسجلون في هذا الفصل.', 'No students are enrolled in this class.')}</p> : <ul className="divide-y">{students.map((student) => {
            const record = byStudent.get(student.id);
            const state = record?.status === 'PRESENT' ? t('حاضر', 'Present') : record?.status === 'ABSENT' ? t('غائب', 'Absent') : record?.status === 'LATE' ? t('متأخر', 'Late') : record?.status === 'EXCUSED' ? t('بعذر', 'Excused') : t('لم تُسجل حصة بعد', 'No session recorded yet');
            const badge = record?.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' : record?.status === 'ABSENT' ? 'bg-rose-100 text-rose-800' : record ? 'bg-amber-100 text-amber-800' : 'bg-muted text-muted-foreground';
            return <li key={student.id} className="flex items-center justify-between gap-3 p-4"><div className="flex min-w-0 items-center gap-3">{student.avatar ? <img src={student.avatar} alt={`${t('صورة', 'Photo')} ${nameOf(student, isEnglish)}`} className="size-10 rounded-full bg-white object-cover" /> : <span className="grid size-10 place-items-center rounded-full bg-muted font-semibold">{nameOf(student, isEnglish).slice(0, 1)}</span>}<div className="min-w-0"><p className="truncate text-sm font-medium">{nameOf(student, isEnglish)}</p>{record?.notes && <p className="mt-0.5 truncate text-xs text-muted-foreground">{record.notes}</p>}</div></div><span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${badge}`}>{state}</span></li>;
          })}</ul>}
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Radio className="size-4 text-primary" />{t('حصص البث وحالة الاتصال', 'Live classes and connection status')}</CardTitle></CardHeader><CardContent>{classSessions.length ? <div className="space-y-3">{classSessions.map((session) => <article key={session.id} className="rounded-xl border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">{session.title}</h2><p className="mt-1 text-xs text-muted-foreground">{new Date(session.startTime).toLocaleTimeString(isEnglish ? 'en-US' : 'ar-SA', { hour: 'numeric', minute: '2-digit' })} · {session.duration} {t('دقيقة', 'minutes')}{session.endedAt ? ` · ${t('انتهت', 'Ended')}` : ` · ${t('مباشرة', 'Live')}`}</p></div><span className="rounded-full bg-muted px-3 py-1 text-xs">{session.attendance?.filter((row) => row.status === 'PRESENT').length || 0} {t('حاضر', 'present')} · {session.attendance?.filter((row) => row.status === 'ABSENT').length || 0} {t('غائب', 'absent')}</span></div></article>)}</div> : <p className="text-sm text-muted-foreground">{t('لا توجد جلسات بث محفوظة لهذا الفصل في هذا اليوم.', 'No live sessions are saved for this class on this date.')}</p>}</CardContent></Card>
      </>}
    </main>
  );
}
