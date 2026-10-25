'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CircleAlert, Download, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PrintReportButton, ReportPrintFooter, ReportPrintIdentity } from '@/components/reports/report-print-tools';
import { DatePicker } from '@/components/ui/date-picker';
import { useLocale } from 'next-intl';

type SchoolClass = { id: string; name: string };
type Student = { id: string; name?: string | null; firstName?: string | null; lastName?: string | null };
type AttendanceRow = { studentId: string; status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'; notes?: string | null };
const statusLabels = (isEnglish: boolean): Record<AttendanceRow['status'], string> => isEnglish
  ? { PRESENT: 'Present', ABSENT: 'Absent', LATE: 'Late', EXCUSED: 'Excused' }
  : { PRESENT: 'حاضر', ABSENT: 'غائب', LATE: 'متأخر', EXCUSED: 'بعذر' };

function todayLocal() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

export default function TeacherArchivePage() {
  const isEnglish = useLocale() === 'en';
  const t = (arabic: string, english: string) => isEnglish ? english : arabic;
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
      .catch((reason) => { if (active) setError(isEnglish ? 'Could not load classes.' : (reason?.response?.data?.message || 'تعذر تحميل الفصول.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isEnglish]);

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
      setError(isEnglish ? 'Could not load attendance records.' : (reason?.response?.data?.message || 'تعذر تحميل سجل الحضور.'));
    } finally {
      setLoading(false);
    }
  }, [classId, date, isEnglish]);

  useEffect(() => { void load(); }, [load]);

  const rows = useMemo(() => students.map((student) => ({
    name: student.name || [student.firstName, student.lastName].filter(Boolean).join(' ') || t('اسم غير مسجل', 'Unnamed student'),
    status: records.find((record) => record.studentId === student.id)?.status,
    notes: records.find((record) => record.studentId === student.id)?.notes,
  })), [students, records, isEnglish]);

  const exportCsv = () => {
    const labels = statusLabels(isEnglish);
    const lines = [[t('الطالب', 'Student'), t('الحالة', 'Status'), t('ملاحظات', 'Notes')], ...rows.map((row) => [row.name, row.status ? labels[row.status] : t('غير مسجل', 'Not recorded'), row.notes || ''])];
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
    <main className="report-print-root mx-auto max-w-5xl space-y-6 pb-10" dir={isEnglish ? 'ltr' : 'rtl'}>
      <ReportPrintIdentity title={t('أرشيف الحضور', 'Attendance archive')} subtitle={`${selected?.name || ''} · ${date}`} />
      <header className="flex flex-wrap items-end justify-between gap-3 border-b pb-5"><div><h1 className="text-2xl font-bold">{t('أرشيف الحضور', 'Attendance archive')}</h1><p className="mt-1 text-sm text-muted-foreground">{t('سجلات الفصل والتاريخ المختارين من قاعدة بيانات المدرسة.', 'Attendance records for the selected class and date from the school database.')}</p></div><div className="print:hidden flex gap-2"><Button variant="outline" onClick={exportCsv} disabled={!rows.length}><Download className="ml-2 h-4 w-4" />{t('تصدير CSV', 'Export CSV')}</Button>{!loading && !error && selected && <PrintReportButton />}</div></header>
      <div className="print:hidden flex flex-wrap gap-3"><Select value={classId} onValueChange={setClassId}><SelectTrigger className="max-w-sm"><SelectValue placeholder={t('اختر فصلًا', 'Select a class')} /></SelectTrigger><SelectContent>{classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><DatePicker value={date} onChange={setDate} placeholder={t('اختر تاريخ الحضور', 'Select attendance date')} ariaLabel={t('تاريخ الحضور', 'Attendance date')} className="h-10 sm:max-w-64 rounded-md shadow-none" /></div>
      {error && <p role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 p-3 text-sm text-destructive"><CircleAlert className="h-4 w-4" />{error}</p>}
      {selected && <section className="space-y-4"><h2 className="font-semibold">{selected.name} · {date}</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{(Object.keys(statusLabels(isEnglish)) as AttendanceRow['status'][]).map((status) => <div key={status} className="rounded-md border bg-card p-4"><p className="text-sm text-muted-foreground">{statusLabels(isEnglish)[status]}</p><p className="mt-1 text-2xl font-bold">{count(status)}</p></div>)}</div></section>}
      <section className="overflow-x-auto rounded-md border bg-card">{loading ? <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t('تحميل الأرشيف...', 'Loading archive...')}</div> : !rows.length ? <p className="p-10 text-center text-sm text-muted-foreground">{t('لا يوجد طلاب أو سجلات لهذا الفصل والتاريخ.', 'No students or records for this class and date.')}</p> : <table className="w-full text-sm"><thead className="bg-muted/50 text-right text-muted-foreground"><tr><th className="px-4 py-3 font-medium">{t('الطالب', 'Student')}</th><th className="px-4 py-3 font-medium">{t('الحالة المسجلة', 'Recorded status')}</th><th className="px-4 py-3 font-medium">{t('ملاحظة', 'Note')}</th></tr></thead><tbody className="divide-y">{rows.map((row, index) => <tr key={index}><td className="px-4 py-3 font-medium">{row.name}</td><td className="px-4 py-3">{row.status ? statusLabels(isEnglish)[row.status] : t('غير مسجل', 'Not recorded')}</td><td className="px-4 py-3 text-muted-foreground">{row.notes || '—'}</td></tr>)}</tbody></table>}</section>
      <ReportPrintFooter />
    </main>
  );
}
