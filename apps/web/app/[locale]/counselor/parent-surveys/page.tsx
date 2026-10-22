'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Download, FileText, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { PrintReportButton, ReportPrintFooter, ReportPrintIdentity } from '@/components/reports/report-print-tools';

type SurveyRecord = {
  id: string;
  updatedAt: string;
  answers: Record<string, string>;
  parent: { id: string; name: string | null; email: string };
  student: { id: string; name: string | null; email: string };
};

const arabicQuestionLabels: Record<string, string> = {
  q1: 'عمر الطالب', q2: 'حالة صحية أو حساسية', q3: 'متوسط النوم', q4: 'وقت الشاشة',
  q5: 'التعبير عن النفس', q6: 'الاهتمام بالقراءة', q7: 'نطق الحروف',
  q8: 'الاندماج مع الزملاء', q9: 'الاستجابة للتوجيهات', q10: 'انتظار الدور',
  q11: 'التركيز في نشاط تعليمي', q12: 'التعامل مع الصعوبة', q13: 'الالتزام بالروتين',
  q14: 'متابعة الواجبات', q15: 'هدف الأسرة للفصل',
};
const englishQuestionLabels: Record<string, string> = {
  q1: 'Student age', q2: 'Health condition or allergy', q3: 'Average sleep', q4: 'Screen time',
  q5: 'Self-expression', q6: 'Interest in reading', q7: 'Pronunciation',
  q8: 'Peer interaction', q9: 'Following directions', q10: 'Taking turns',
  q11: 'Focus during learning', q12: 'Handling challenges', q13: 'Daily routine',
  q14: 'Homework follow-up', q15: 'Family goal for the term',
};

function csvCell(value: string) {
  const safeValue = /^[=+\-@]/.test(value.trimStart()) ? `'${value}` : value;
  return `"${safeValue.replace(/"/g, '""')}"`;
}

export default function ParentSurveyReportPage() {
  const locale = useLocale() === 'en' ? 'en' : 'ar';
  const questionLabels = locale === 'en' ? englishQuestionLabels : arabicQuestionLabels;
  const t = locale === 'en'
    ? { eyebrow: 'Student records', title: 'Parent surveys', saved: 'surveys saved at this school', refresh: 'Refresh report', export: 'Export this page', student: 'Student', parent: 'Parent', updated: 'Last updated', answers: 'Answers', empty: 'No surveys have been saved yet.', loading: 'Loading survey records…', error: 'Could not load the authorized survey records.', by: 'Submitted by', previous: 'Previous', next: 'Next', page: 'Page' }
    : { eyebrow: 'تقارير الطلاب', title: 'استبيانات أولياء الأمور', saved: 'استبيانًا محفوظًا في المدرسة', refresh: 'تحديث التقرير', export: 'تصدير الصفحة', student: 'الطالب', parent: 'ولي الأمر', updated: 'آخر تحديث', answers: 'الإجابات', empty: 'لا توجد استبيانات محفوظة بعد.', loading: 'جارٍ تحميل السجلات...', error: 'تعذر تحميل سجلات الاستبيان المصرح بها.', by: 'بواسطة', previous: 'السابق', next: 'التالي', page: 'صفحة' };
  const [rows, setRows] = useState<SurveyRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get('/users/parent-surveys', { params: { page: targetPage, limit: 25 } });
      const records = Array.isArray(data?.data) ? data.data : [];
      setRows(records);
      setTotal(data?.meta?.total ?? 0);
      setTotalPages(Math.max(1, data?.meta?.totalPages ?? 1));
      setSelectedId((current) => records.some((row: SurveyRecord) => row.id === current) ? current : records[0]?.id || '');
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }, [t.error]);

  useEffect(() => { void load(page); }, [load, page]);

  const selected = rows.find((row) => row.id === selectedId);

  const downloadCsv = () => {
    const headings = locale === 'en' ? ['Student', 'Student email', 'Parent', 'Parent email', 'Updated', ...Object.keys(questionLabels).map((key) => questionLabels[key])] : ['الطالب', 'بريد الطالب', 'ولي الأمر', 'بريد ولي الأمر', 'تاريخ التحديث', ...Object.keys(questionLabels).map((key) => questionLabels[key])];
    const lines = rows.map((row) => [
      row.student.name || row.student.email,
      row.student.email,
      row.parent.name || row.parent.email,
      row.parent.email,
      new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(row.updatedAt)),
      ...Object.keys(questionLabels).map((key) => row.answers?.[key] ?? ''),
    ].map((value) => csvCell(String(value))).join(','));
    const blob = new Blob(['\uFEFF', [headings.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `parent-surveys-page-${page}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="report-print-root mx-auto max-w-6xl space-y-6 pb-12" dir={locale === 'en' ? 'ltr' : 'rtl'}>
      <ReportPrintIdentity title={t.title} subtitle={`${t.saved} · ${locale === 'en' ? 'Page' : 'صفحة'} ${page} ${locale === 'en' ? 'of' : 'من'} ${totalPages}`} />
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-200 pb-5 dark:border-white/10">
        <div>
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{t.eyebrow}</p>
          <h1 className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{t.title}</h1>
          <p className="mt-2 text-sm text-gray-500">{total.toLocaleString(locale === 'en' ? 'en-US' : 'ar-SA')} {t.saved}</p>
        </div>
        <div className="print:hidden flex gap-2">
          <button type="button" onClick={() => void load(page)} aria-label={t.refresh} title={t.refresh} className="grid h-10 w-10 place-items-center rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:bg-white/10"><RefreshCw className="h-4 w-4" /></button>
          <button type="button" onClick={downloadCsv} disabled={!rows.length} className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-white/10 dark:text-white dark:hover:bg-white/10"><Download className="h-4 w-4" />{t.export}</button>
          {!loading && !error && <PrintReportButton label={locale === 'en' ? 'Print / Save PDF' : 'طباعة / حفظ PDF'} />}
        </div>
      </header>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/10 dark:bg-[#1e1e2d]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-right text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 dark:border-white/10 dark:bg-white/5">
              <tr><th className="px-4 py-3 font-semibold">{t.student}</th><th className="px-4 py-3 font-semibold">{t.parent}</th><th className="px-4 py-3 font-semibold">{t.updated}</th><th className="px-4 py-3 font-semibold">{t.answers}</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/10">
              {rows.map((row) => <tr key={row.id} className={selectedId === row.id ? 'bg-emerald-50/60 dark:bg-emerald-500/5' : ''}>
                <td className="px-4 py-3"><button type="button" onClick={() => setSelectedId(row.id)} className="text-right font-semibold text-gray-900 hover:text-emerald-700 dark:text-white">{row.student.name || row.student.email}<span className="mt-1 block text-xs font-normal text-gray-500">{row.student.email}</span></button></td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{row.parent.name || row.parent.email}<span className="mt-1 block text-xs text-gray-500">{row.parent.email}</span></td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-gray-300">{new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ar-SA').format(new Date(row.updatedAt))}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{Object.keys(row.answers || {}).length}</td>
              </tr>)}
              {!loading && rows.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-500"><FileText className="mx-auto mb-2 h-6 w-6" />{t.empty}</td></tr>}
              {loading && <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-500">{t.loading}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {selected && <section className="border-t border-gray-200 pt-5 dark:border-white/10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">إجابات {selected.student.name || selected.student.email}</h2>
          <p className="text-xs text-gray-500">{t.by} {selected.parent.name || selected.parent.email}</p>
        </div>
        <dl className="mt-4 divide-y divide-gray-100 dark:divide-white/10">
          {Object.entries(questionLabels).map(([key, label]) => <div key={key} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]"><dt className="text-sm text-gray-500">{label}</dt><dd className="text-sm font-semibold text-gray-900 dark:text-white">{selected.answers?.[key] || '—'}</dd></div>)}
        </dl>
      </section>}

      <footer className="print:hidden flex items-center justify-between border-t border-gray-200 pt-4 dark:border-white/10">
        <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold disabled:opacity-40 dark:border-white/10">{t.previous}</button>
        <span className="text-xs text-gray-500">{t.page} {page.toLocaleString(locale === 'en' ? 'en-US' : 'ar-SA')} / {totalPages.toLocaleString(locale === 'en' ? 'en-US' : 'ar-SA')}</span>
        <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold disabled:opacity-40 dark:border-white/10">{t.next}</button>
      </footer>
      <ReportPrintFooter />
    </main>
  );
}
