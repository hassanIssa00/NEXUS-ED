'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Archive, CircleAlert, LoaderCircle, MailCheck } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { PrintReportButton, ReportPrintFooter, ReportPrintIdentity } from '@/components/reports/report-print-tools';

type ArchiveEntry = {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: string;
  status: string;
  createdAt: string;
  verifiedAt?: string | null;
};

export default function RegistrationArchivePage() {
  const isEnglish = useLocale() === 'en';
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiClient.get('/auth/registration-archive')
      .then(({ data }) => { if (active) setEntries(Array.isArray(data?.data) ? data.data : []); })
      .catch(() => { if (active) setError(isEnglish ? 'The registration archive could not be loaded.' : 'تعذر تحميل أرشيف التسجيلات.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isEnglish]);

  const label = (entry: ArchiveEntry) => entry.status === 'COMPLETED'
    ? (isEnglish ? 'Account created' : 'تم إنشاء الحساب')
    : entry.status === 'VERIFIED'
      ? (isEnglish ? 'Email confirmed · sign-in available' : 'تم تأكيد البريد · تسجيل الدخول متاح')
      : (isEnglish ? 'Waiting for email confirmation' : 'بانتظار تأكيد البريد');

  return (
    <main className="report-print-root mx-auto max-w-6xl space-y-6 pb-12" dir={isEnglish ? 'ltr' : 'rtl'}>
      <ReportPrintIdentity title={isEnglish ? 'Registration archive report' : 'تقرير أرشيف التسجيلات'} subtitle={isEnglish ? 'Student and teacher email confirmation and account status' : 'حالة تأكيد البريد وإنشاء حسابات الطلاب والمعلمين'} />
      <header className="flex flex-wrap items-center gap-3 border-b border-border pb-5">
        <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary"><Archive className="size-5" /></span>
        <div className="flex flex-1 flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-black">{isEnglish ? 'Registration archive' : 'أرشيف التسجيلات'}</h1><p className="mt-1 text-sm text-muted-foreground">{isEnglish ? 'Student and teacher signup attempts, including accounts that have not confirmed their email.' : 'محاولات تسجيل الطلاب والمعلمين، بما فيها الحسابات التي لم تؤكد البريد.'}</p></div>{!loading && !error && <PrintReportButton label={isEnglish ? 'Print / Save PDF' : 'طباعة / حفظ PDF'} />}</div>
      </header>

      {loading ? <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />{isEnglish ? 'Loading archive…' : 'جارٍ تحميل الأرشيف...'}</div> : error ? (
        <div role="alert" className="flex items-center gap-2 rounded-2xl border border-destructive/30 p-4 text-sm text-destructive"><CircleAlert className="size-4" />{error}</div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground"><Archive className="mx-auto mb-3 size-8 opacity-50" />{isEnglish ? 'No student or teacher signup attempts have been archived.' : 'لا توجد محاولات تسجيل طلاب أو معلمين في الأرشيف.'}</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/50 text-start text-muted-foreground"><tr>
                <th className="px-4 py-3 text-start">{isEnglish ? 'Name' : 'الاسم'}</th>
                <th className="px-4 py-3 text-start">{isEnglish ? 'Account' : 'الحساب'}</th>
                <th className="px-4 py-3 text-start">{isEnglish ? 'Role' : 'الدور'}</th>
                <th className="px-4 py-3 text-start">{isEnglish ? 'Status' : 'الحالة'}</th>
                <th className="px-4 py-3 text-start">{isEnglish ? 'Created' : 'تاريخ التسجيل'}</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry) => <tr key={entry.id}>
                  <td className="px-4 py-4 font-semibold">{entry.fullName}<span className="block pt-1 text-xs font-normal text-muted-foreground">{entry.phone || (isEnglish ? 'No phone provided' : 'لا يوجد رقم جوال')}</span></td>
                  <td className="px-4 py-4"><bdi dir="ltr">{entry.email}</bdi></td>
                  <td className="px-4 py-4">{entry.role === 'TEACHER' ? (isEnglish ? 'Teacher' : 'معلم') : (isEnglish ? 'Student' : 'طالب')}</td>
                  <td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${entry.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' : entry.status === 'VERIFIED' ? 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'}`}>{entry.status !== 'PENDING' && <MailCheck className="size-3.5" />}{label(entry)}</span></td>
                  <td className="px-4 py-4 text-muted-foreground">{new Intl.DateTimeFormat(isEnglish ? 'en-US' : 'ar-SA', { dateStyle: 'medium' }).format(new Date(entry.createdAt))}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <ReportPrintFooter />
    </main>
  );
}
