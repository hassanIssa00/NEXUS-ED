'use client';

import { useCallback, useEffect, useState } from 'react';
import { BookOpen, CircleAlert, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { PrintReportButton, ReportPrintFooter, ReportPrintIdentity } from '@/components/reports/report-print-tools';
import { useLocale } from 'next-intl';

type Child = { id: string; name: string };
type Grade = { id: string; subjectName: string; subjectCode?: string; grade: number; maxGrade: number; percentage: number; letterGrade: string; date: string };

export default function ParentGradesPage() {
  const isEnglish = useLocale() === 'en';
  const t = useCallback((ar: string, en: string) => isEnglish ? en : ar, [isEnglish]);
  const [children, setChildren] = useState<Child[]>([]);
  const [studentId, setStudentId] = useState('');
  const [grades, setGrades] = useState<Grade[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiClient.get('/dashboard/parent')
      .then(({ data }) => {
        if (!active) return;
        const rows = Array.isArray(data?.children) ? data.children : [];
        setChildren(rows);
        setStudentId(rows[0]?.id || '');
      })
      .catch(() => { if (active) setError(t('تعذر تحميل ملفات الأبناء.', 'Could not load the children’s records.')); })
      .finally(() => { if (active) setLoadingChildren(false); });
    return () => { active = false; };
  }, [t]);

  useEffect(() => {
    if (!studentId) { setGrades([]); setAverage(null); return; }
    let active = true;
    setLoadingGrades(true);
    setError('');
    apiClient.get(`/grades/parent/${encodeURIComponent(studentId)}`)
      .then(({ data }) => {
        if (!active) return;
        setGrades(Array.isArray(data?.grades) ? data.grades : []);
        setAverage(typeof data?.summary?.averageGrade === 'number' ? data.summary.averageGrade : null);
      })
      .catch(() => { if (active) { setGrades([]); setAverage(null); setError(t('تعذر تحميل الدرجات المسجلة.', 'Could not load the recorded grades.')); } })
      .finally(() => { if (active) setLoadingGrades(false); });
    return () => { active = false; };
  }, [studentId, t]);

  const selectedChild = children.find((child) => child.id === studentId);

  return (
    <main className="report-print-root mx-auto max-w-5xl space-y-6 pb-10" dir={isEnglish ? 'ltr' : 'rtl'}>
      <ReportPrintIdentity title={t('تقرير درجات الأبناء', 'Children’s grade report')} subtitle={selectedChild ? `${t('الطالب:', 'Student:')} ${selectedChild.name}` : t('الدرجات المسجلة في نظام المدرسة', 'Grades recorded in the school system')} />
      <header className="flex items-center gap-3 border-b pb-5">
        <BookOpen className="h-6 w-6 text-primary" />
        <div className="flex flex-1 flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">{t('الدرجات المسجلة', 'Recorded grades')}</h1><p className="mt-1 text-sm text-muted-foreground">{t('السجل مرتبط بدرجات الطالب المحفوظة في قاعدة بيانات المدرسة.', 'This report uses the student grades saved in the school database.')}</p></div>{!loadingChildren && !loadingGrades && !error && grades.length > 0 && <PrintReportButton />}</div>
      </header>

      {loadingChildren ? <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t('تحميل ملفات الأبناء...', 'Loading children’s records…')}</div> : children.length === 0 ? <p className="rounded-md border p-6 text-sm text-muted-foreground">{t('لا يوجد طالب مرتبط بحساب ولي الأمر.', 'No student is linked to this parent account.')}</p> : (
        <>
          <label className="block max-w-md space-y-2 text-sm font-medium">{t('الطالب', 'Student')}
            <select className="w-full rounded-md border bg-background p-2.5" value={studentId} onChange={(event) => setStudentId(event.target.value)}>
              {children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}
            </select>
          </label>
          {selectedChild && <div className="flex flex-wrap items-end justify-between gap-3"><h2 className="text-lg font-semibold">{t('درجات', 'Grades for')} {selectedChild.name}</h2>{average !== null && <p className="text-sm text-muted-foreground">{t('المتوسط المسجل:', 'Recorded average:')} <strong className="text-foreground">{average.toFixed(1)}%</strong></p>}</div>}
          {error ? <p role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 p-4 text-sm text-destructive"><CircleAlert className="h-4 w-4" />{error}</p> : loadingGrades ? <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t('تحميل الدرجات...', 'Loading grades…')}</div> : grades.length === 0 ? <p className="rounded-md border p-6 text-sm text-muted-foreground">{t('لا توجد درجات مسجلة لهذا الطالب حتى الآن.', 'No grades have been recorded for this student yet.')}</p> : (
            <div className="overflow-x-auto rounded-md border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-start text-muted-foreground"><tr><th className="px-4 py-3 font-medium">{t('المادة', 'Subject')}</th><th className="px-4 py-3 font-medium">{t('الدرجة', 'Score')}</th><th className="px-4 py-3 font-medium">{t('النسبة', 'Percentage')}</th><th className="px-4 py-3 font-medium">{t('التقدير', 'Grade')}</th><th className="px-4 py-3 font-medium">{t('تاريخ التسجيل', 'Recorded on')}</th></tr></thead>
                <tbody className="divide-y">{grades.map((grade) => <tr key={grade.id}><td className="px-4 py-3 font-medium">{grade.subjectName}</td><td className="px-4 py-3">{grade.grade} / {grade.maxGrade}</td><td className="px-4 py-3">{grade.percentage}%</td><td className="px-4 py-3">{grade.letterGrade}</td><td className="px-4 py-3 text-muted-foreground">{new Date(grade.date).toLocaleDateString(isEnglish ? 'en-US' : 'ar-SA')}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </>
      )}
      <ReportPrintFooter />
    </main>
  );
}
