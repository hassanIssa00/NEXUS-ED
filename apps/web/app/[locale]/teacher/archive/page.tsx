'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CircleAlert, Download, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type SchoolClass = { id: string; name: string };
type Student = { id: string; name?: string | null; firstName?: string | null; lastName?: string | null };
type AttendanceRow = { studentId: string; status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'; notes?: string | null };
const statusLabels: Record<AttendanceRow['status'], string> = { PRESENT: 'حاضر', ABSENT: 'غائب', LATE: 'متأخر', EXCUSED: 'بعذر' };

function todayLocal() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

export default function TeacherArchivePage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(todayLocal);
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
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
      .catch((reason) => { if (active) setError(reason?.response?.data?.message || 'تعذر تحميل الفصول.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const load = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get(`/attendance/classes/${classId}`, { params: { date } });
      setStudents(Array.isArray(data?.students) ? data.students : []);
      setRecords(Array.isArray(data?.records) ? data.records : []);
    } catch (reason: any) {
      setStudents([]);
      setRecords([]);
      setError(reason?.response?.data?.message || 'تعذر تحميل سجل الحضور.');
    } finally {
      setLoading(false);
    }
  }, [classId, date]);

  useEffect(() => { void load(); }, [load]);

  const rows = useMemo(() => students.map((student) => ({
    name: student.name || [student.firstName, student.lastName].filter(Boolean).join(' ') || 'اسم غير مسجل',
    status: records.find((record) => record.studentId === student.id)?.status,
    notes: records.find((record) => record.studentId === student.id)?.notes,
  })), [students, records]);

  const exportCsv = () => {
    const lines = [['الطالب', 'الحالة', 'ملاحظات'], ...rows.map((row) => [row.name, row.status ? statusLabels[row.status] : 'غير مسجل', row.notes || ''])];
    const csv = '\uFEFF' + lines.map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const selected = classes.find((item) => item.id === classId);
  const count = (status: AttendanceRow['status']) => records.filter((record) => record.status === status).length;

  return (
    <main className="mx-auto max-w-5xl space-y-6 pb-10" dir="rtl">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b pb-5"><div><h1 className="text-2xl font-bold">أرشيف الحضور</h1><p className="mt-1 text-sm text-muted-foreground">سجلات الفصل والتاريخ المختارين من قاعدة بيانات المدرسة.</p></div><Button variant="outline" onClick={exportCsv} disabled={!rows.length}><Download className="ml-2 h-4 w-4" />تصدير CSV</Button></header>
      <div className="flex flex-wrap gap-3"><Select value={classId} onValueChange={setClassId}><SelectTrigger className="max-w-sm"><SelectValue placeholder="اختر فصلًا" /></SelectTrigger><SelectContent>{classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><label className="flex h-10 items-center gap-2 rounded-md border bg-background px-3"><CalendarDays className="h-4 w-4 text-muted-foreground" /><input type="date" aria-label="تاريخ الحضور" value={date} onChange={(event) => setDate(event.target.value)} className="bg-transparent text-sm outline-none" /></label></div>
      {error && <p role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 p-3 text-sm text-destructive"><CircleAlert className="h-4 w-4" />{error}</p>}
      {selected && <section className="space-y-4"><h2 className="font-semibold">{selected.name} · {date}</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{(Object.keys(statusLabels) as AttendanceRow['status'][]).map((status) => <div key={status} className="rounded-md border bg-card p-4"><p className="text-sm text-muted-foreground">{statusLabels[status]}</p><p className="mt-1 text-2xl font-bold">{count(status)}</p></div>)}</div></section>}
      <section className="overflow-x-auto rounded-md border bg-card">{loading ? <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />تحميل الأرشيف...</div> : !rows.length ? <p className="p-10 text-center text-sm text-muted-foreground">لا يوجد طلاب أو سجلات لهذا الفصل والتاريخ.</p> : <table className="w-full text-sm"><thead className="bg-muted/50 text-right text-muted-foreground"><tr><th className="px-4 py-3 font-medium">الطالب</th><th className="px-4 py-3 font-medium">الحالة المسجلة</th><th className="px-4 py-3 font-medium">ملاحظة</th></tr></thead><tbody className="divide-y">{rows.map((row, index) => <tr key={index}><td className="px-4 py-3 font-medium">{row.name}</td><td className="px-4 py-3">{row.status ? statusLabels[row.status] : 'غير مسجل'}</td><td className="px-4 py-3 text-muted-foreground">{row.notes || '—'}</td></tr>)}</tbody></table>}</section>
    </main>
  );
}
