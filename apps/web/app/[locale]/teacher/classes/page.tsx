'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, CircleAlert, Loader2, Save, Search } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
type Student = { id: string; name?: string | null; firstName?: string | null; lastName?: string | null; email?: string | null };
type SchoolClass = { id: string; name: string };

const statuses: { value: AttendanceStatus; label: string }[] = [
  { value: 'PRESENT', label: 'حاضر' },
  { value: 'ABSENT', label: 'غائب' },
  { value: 'LATE', label: 'متأخر' },
  { value: 'EXCUSED', label: 'بعذر' },
];

function todayLocal() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function getErrorMessage(error: any) {
  return error?.response?.data?.message || 'تعذر الاتصال بالخادم. حاول مرة أخرى.';
}

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(todayLocal);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [search, setSearch] = useState('');
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiClient.get('/classes')
      .then(({ data }) => {
        if (!active) return;
        const rows = Array.isArray(data) ? data : [];
        setClasses(rows);
        setClassId(rows[0]?.id || '');
      })
      .catch((reason) => { if (active) setError(getErrorMessage(reason)); })
      .finally(() => { if (active) setLoadingClasses(false); });
    return () => { active = false; };
  }, []);

  const loadRoster = useCallback(async () => {
    if (!classId) {
      setStudents([]);
      setAttendance({});
      return;
    }
    setLoadingRoster(true);
    setError('');
    try {
      const { data } = await apiClient.get(`/attendance/classes/${classId}`, { params: { date } });
      setStudents(Array.isArray(data?.students) ? data.students : []);
      setAttendance(Object.fromEntries((Array.isArray(data?.records) ? data.records : []).map((row: any) => [row.studentId, row.status])));
    } catch (reason) {
      setStudents([]);
      setAttendance({});
      setError(getErrorMessage(reason));
    } finally {
      setLoadingRoster(false);
    }
  }, [classId, date]);

  useEffect(() => { void loadRoster(); }, [loadRoster]);

  const filteredStudents = useMemo(() => students.filter((student) => {
    const name = student.name || [student.firstName, student.lastName].filter(Boolean).join(' ');
    return `${name} ${student.email || ''}`.toLowerCase().includes(search.toLowerCase());
  }), [students, search]);

  const pendingCount = students.filter((student) => !attendance[student.id]).length;
  const saveAttendance = async () => {
    if (!classId || students.length === 0 || pendingCount > 0) return;
    setSaving(true);
    setError('');
    try {
      await apiClient.post(`/attendance/classes/${classId}`, {
        date,
        entries: students.map((student) => ({ studentId: student.id, status: attendance[student.id] })),
      });
      await loadRoster();
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  };

  const selectedClass = classes.find((item) => item.id === classId);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10" dir="rtl">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">فصولي الدراسية</h1>
          <p className="mt-1 text-sm text-muted-foreground">قائمة الطلاب والتحضير اليومي محفوظان في قاعدة بيانات المدرسة.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/teacher/assignments">الواجبات</Link></Button>
          <Button asChild variant="outline"><Link href="/teacher/grading">تصحيح التسليمات</Link></Button>
          <Button asChild variant="outline"><Link href="/teacher/reports">التقارير</Link></Button>
        </div>
      </header>

      <Card>
        <CardHeader><CardTitle className="text-base">الفصل والتاريخ</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="sm:max-w-md"><SelectValue placeholder={loadingClasses ? 'جاري تحميل الفصول...' : 'اختر فصلًا'} /></SelectTrigger>
            <SelectContent>{classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
          </Select>
          <label className="flex h-10 items-center gap-2 rounded-md border bg-background px-3 text-sm">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <input aria-label="تاريخ التحضير" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="bg-transparent outline-none" />
          </label>
        </CardContent>
      </Card>

      {error && <p role="alert" className="flex items-center gap-2 text-sm text-destructive"><CircleAlert className="h-4 w-4" />{error}</p>}

      {selectedClass && (
        <Card>
          <CardHeader className="flex flex-col gap-3 border-b sm:flex-row sm:items-center sm:justify-between">
            <div><CardTitle className="text-base">{selectedClass.name}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{students.length} طالب · {pendingCount} دون حالة حضور</p></div>
            <div className="flex gap-2">
              <div className="relative"><Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالاسم أو البريد" className="pr-9" /></div>
              <Button onClick={saveAttendance} disabled={!students.length || pendingCount > 0 || saving || loadingRoster}>
                {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
                حفظ الحضور
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingRoster ? <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />تحميل قائمة الفصل...</div> : students.length === 0 ? <p className="p-10 text-center text-sm text-muted-foreground">لا يوجد طلاب مسجلون في هذا الفصل.</p> : filteredStudents.length === 0 ? <p className="p-10 text-center text-sm text-muted-foreground">لا توجد نتائج مطابقة.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-right text-muted-foreground"><tr><th className="px-4 py-3 font-medium">الطالب</th><th className="px-4 py-3 font-medium">البريد</th><th className="px-4 py-3 font-medium">الحضور</th></tr></thead>
                  <tbody className="divide-y">
                    {filteredStudents.map((student) => (
                      <tr key={student.id}>
                        <td className="px-4 py-3 font-medium">{student.name || [student.firstName, student.lastName].filter(Boolean).join(' ') || 'اسم غير مسجل'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{student.email || '—'}</td>
                        <td className="px-4 py-3"><Select value={attendance[student.id] || ''} onValueChange={(value: AttendanceStatus) => setAttendance((current) => ({ ...current, [student.id]: value }))}><SelectTrigger className="w-36"><SelectValue placeholder="اختر الحالة" /></SelectTrigger><SelectContent>{statuses.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}</SelectContent></Select></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
