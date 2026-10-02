'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, CheckCheck, CircleAlert, Clock3, Loader2, Save, UserX, X } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
type Student = { id: string; name?: string | null; firstName?: string | null; lastName?: string | null; avatar?: string | null };
type SchoolClass = { id: string; name: string };

const statusLabels: Record<AttendanceStatus, string> = {
  PRESENT: 'حاضر',
  ABSENT: 'غائب',
  LATE: 'متأخر',
  EXCUSED: 'بعذر',
};

const statusStyles: Record<AttendanceStatus, string> = {
  PRESENT: 'border-emerald-600 bg-emerald-600 text-white',
  ABSENT: 'border-rose-600 bg-rose-600 text-white',
  LATE: 'border-amber-500 bg-amber-500 text-white',
  EXCUSED: 'border-sky-600 bg-sky-600 text-white',
};

function todayLocal() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function getErrorMessage(error: any) {
  return error?.response?.data?.message || 'تعذر الاتصال بالخادم. حاول مرة أخرى.';
}

export default function AttendancePage() {
  const { toast } = useToast();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [date, setDate] = useState(todayLocal);
  const [students, setStudents] = useState<Student[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    apiClient.get('/classes')
      .then(({ data }) => { if (active) setClasses(Array.isArray(data) ? data : []); })
      .catch((error) => { if (active) setLoadError(getErrorMessage(error)); })
      .finally(() => { if (active) setLoadingClasses(false); });
    return () => { active = false; };
  }, []);

  const loadRoster = useCallback(async () => {
    if (!selectedClassId) {
      setStudents([]);
      setStatuses({});
      return;
    }
    setLoadingRoster(true);
    setLoadError('');
    try {
      const { data } = await apiClient.get(`/attendance/classes/${selectedClassId}`, { params: { date } });
      const roster: Student[] = Array.isArray(data?.students) ? data.students : [];
      const marked: Record<string, AttendanceStatus> = {};
      for (const record of Array.isArray(data?.records) ? data.records : []) {
        marked[record.studentId] = record.status;
      }
      setStudents(roster);
      setStatuses(marked);
    } catch (error) {
      setStudents([]);
      setStatuses({});
      setLoadError(getErrorMessage(error));
    } finally {
      setLoadingRoster(false);
    }
  }, [selectedClassId, date]);

  useEffect(() => { void loadRoster(); }, [loadRoster]);

  const counts = useMemo(() => {
    const initial = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, pending: 0 };
    for (const student of students) {
      const status = statuses[student.id];
      if (status) initial[status] += 1;
      else initial.pending += 1;
    }
    return initial;
  }, [students, statuses]);

  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    setStatuses((current) => ({ ...current, [studentId]: status }));
  };

  const markAllPresent = () => {
    setStatuses(Object.fromEntries(students.map((student) => [student.id, 'PRESENT'])));
  };

  const saveAttendance = async () => {
    if (!selectedClassId || students.length === 0 || counts.pending > 0) return;
    setSaving(true);
    try {
      const entries = students.map((student) => ({ studentId: student.id, status: statuses[student.id] }));
      const { data } = await apiClient.post(`/attendance/classes/${selectedClassId}`, { date, entries });
      toast({ title: 'تم حفظ التحضير', description: `تم حفظ ${data.savedCount} سجلًا بتاريخ ${date}.` });
      await loadRoster();
    } catch (error) {
      toast({ title: 'لم يتم حفظ التحضير', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const selectedClass = classes.find((item) => item.id === selectedClassId);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10" dir="rtl">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">تحضير الطلاب</h1>
          <p className="mt-1 text-sm text-muted-foreground">سجل يومي مرتبط بفصول وطلاب المدرسة.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="attendance-date">تاريخ التحضير</label>
          <div className="flex h-10 items-center gap-2 rounded-md border bg-background px-3">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <input id="attendance-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="bg-transparent text-sm outline-none" />
          </div>
          <Button variant="outline" onClick={markAllPresent} disabled={!students.length || loadingRoster}>
            <CheckCheck className="ml-2 h-4 w-4" />
            اعتبار الجميع حاضرين
          </Button>
          <Button onClick={saveAttendance} disabled={!students.length || counts.pending > 0 || saving || loadingRoster}>
            {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
            حفظ التحضير
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">الفصل الدراسي</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="max-w-md"><SelectValue placeholder={loadingClasses ? 'جاري تحميل الفصول...' : 'اختر فصلًا'} /></SelectTrigger>
            <SelectContent>
              {classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {loadError && <p role="alert" className="flex items-center gap-2 text-sm text-destructive"><CircleAlert className="h-4 w-4" />{loadError}</p>}
        </CardContent>
      </Card>

      {selectedClass && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const).map((status) => (
              <Card key={status}><CardContent className="flex items-center justify-between p-4"><span className="text-sm text-muted-foreground">{statusLabels[status]}</span><strong className="text-xl">{counts[status]}</strong></CardContent></Card>
            ))}
            <Card><CardContent className="flex items-center justify-between p-4"><span className="text-sm text-muted-foreground">غير مسجل</span><strong className="text-xl">{counts.pending}</strong></CardContent></Card>
          </div>

          <Card>
            <CardHeader className="border-b"><CardTitle className="text-base">{selectedClass.name} · {date}</CardTitle></CardHeader>
            <CardContent className="p-0">
              {loadingRoster ? (
                <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />تحميل قائمة الفصل...</div>
              ) : students.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">لا يوجد طلاب مسجلون في هذا الفصل.</div>
              ) : (
                <ul className="divide-y">
                  {students.map((student) => {
                    const fullName = student.name || [student.firstName, student.lastName].filter(Boolean).join(' ') || 'طالب';
                    return (
                      <li key={student.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold">{fullName.slice(0, 1)}</span>
                          <span className="truncate text-sm font-medium">{fullName}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const).map((status) => {
                            const Icon = status === 'PRESENT' ? Check : status === 'ABSENT' ? UserX : status === 'LATE' ? Clock3 : X;
                            const selected = statuses[student.id] === status;
                            return (
                              <Button key={status} type="button" size="sm" variant={selected ? 'default' : 'outline'} className={selected ? statusStyles[status] : ''} onClick={() => updateStatus(student.id, status)} aria-pressed={selected}>
                                <Icon className="ml-1.5 h-4 w-4" />{statusLabels[status]}
                              </Button>
                            );
                          })}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
