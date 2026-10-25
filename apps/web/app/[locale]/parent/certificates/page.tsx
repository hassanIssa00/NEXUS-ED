'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Award, BadgeCheck, CircleAlert, Download, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { apiClient } from '@/lib/api/client';

type Child = { id: string; name: string };
type Certificate = {
  id: string;
  serial: string;
  title: string;
  description?: string | null;
  createdAt: string;
  student?: { id: string; name?: string | null };
  issuer?: { name?: string | null };
};

const requestError = (error: any, isEnglish: boolean) => isEnglish ? 'Could not load your children’s certificates.' : error?.response?.data?.message || error?.message || 'تعذر تحميل شهادات الأبناء.';

export default function ParentCertificatesPage() {
  const isEnglish = useLocale() === 'en';
  const t = (ar: string, en: string) => isEnglish ? en : ar;
  const [children, setChildren] = useState<Child[]>([]);
  const [studentId, setStudentId] = useState('');
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingCertificates, setLoadingCertificates] = useState(false);
  const [downloadingId, setDownloadingId] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [error, setError] = useState('');

  const loadChildren = useCallback(async () => {
    setLoadingChildren(true);
    setError('');
    try {
      const { data } = await apiClient.get('/dashboard/parent');
      const linked = Array.isArray(data?.children) ? data.children as Child[] : [];
      setChildren(linked);
      setStudentId((current) => linked.some((child) => child.id === current) ? current : linked[0]?.id || '');
    } catch (reason) {
      setError(requestError(reason, isEnglish));
    } finally {
      setLoadingChildren(false);
    }
  }, [isEnglish]);

  useEffect(() => { void loadChildren(); }, [loadChildren]);

  useEffect(() => {
    if (!studentId) {
      setCertificates([]);
      return;
    }
    let active = true;
    setLoadingCertificates(true);
    setError('');
    apiClient.get<Certificate[]>(`/workspace/parent/certificates?studentId=${encodeURIComponent(studentId)}`)
      .then(({ data }) => { if (active) setCertificates(Array.isArray(data) ? data : []); })
      .catch((reason) => { if (active) { setCertificates([]); setError(requestError(reason, isEnglish)); } })
      .finally(() => { if (active) setLoadingCertificates(false); });
    return () => { active = false; };
  }, [studentId, refreshToken, isEnglish]);

  const download = async (certificate: Certificate) => {
    setDownloadingId(certificate.id);
    setError('');
    try {
      const { data } = await apiClient.get(`/workspace/certificates/${encodeURIComponent(certificate.id)}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${certificate.serial}.pdf`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) {
      setError(requestError(reason, isEnglish));
    } finally {
      setDownloadingId('');
    }
  };

  const selectedChild = children.find((child) => child.id === studentId);

  return (
    <main dir={isEnglish ? 'ltr' : 'rtl'} className="mx-auto max-w-5xl space-y-6 p-4 pb-12 md:p-7">
      <header className="relative overflow-hidden rounded-[1.6rem] bg-gradient-to-l from-[#152b49] via-[#214d6a] to-[#98793e] p-5 text-white shadow-lg sm:p-7">
        <div aria-hidden="true" className="absolute -left-10 -top-16 size-52 rounded-full border-[28px] border-white/5" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-xl bg-white"><img src="/second_logo.webp" alt={isEnglish ? 'Al-Ikhlas Private Schools logo' : 'شعار مدارس الإخلاص الأهلية'} className="size-10 object-contain" /></div>
            <div className="grid size-12 place-items-center rounded-xl bg-white"><img src="/logo_new.webp" alt="Nexus EDU" className="size-10 object-contain" /></div>
            <div className="me-1"><p className="text-xs font-bold text-sky-100">{t('ملف إنجازات أبنائك', 'Your children’s achievements')}</p><h1 className="mt-1 text-xl font-black sm:text-2xl">{t('الشهادات المدرسية', 'School certificates')}</h1><p className="mt-1 text-sm text-white/80">{selectedChild?.name || t('الشهادات الصادرة من المدرسة', 'Certificates issued by the school')}</p></div>
          </div>
          <button onClick={() => { setRefreshToken((value) => value + 1); void loadChildren(); }} aria-label={t('تحديث الشهادات', 'Refresh certificates')} className="grid size-10 place-items-center rounded-xl border border-white/25 bg-white/10 hover:bg-white/20"><RefreshCw className="h-4 w-4" /></button>
        </div>
      </header>

      {error && <p role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><CircleAlert className="size-4 shrink-0" />{error}</p>}
      {loadingChildren ? <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{t('جارٍ تحميل ملفات الأبناء...', 'Loading children’s profiles...')}</div> : children.length === 0 ? (
        <section className="rounded-2xl border border-dashed bg-white p-8 text-center"><Award className="mx-auto size-10 text-slate-400" /><h2 className="mt-3 font-bold">{t('لا يوجد طالب مرتبط بحساب ولي الأمر', 'No student is linked to the parent account')}</h2><p className="mt-1 text-sm text-muted-foreground">{t('اربط حساب الطالب أولًا حتى تظهر شهاداته الصادرة من المدرسة.', 'Link a student account to view certificates issued by the school.')}</p><Link href="/student/new?flow=parent" className="mt-4 inline-flex h-10 items-center rounded-lg bg-[#214d6a] px-4 text-sm font-bold text-white">{t('ربط طالب', 'Link a student')}</Link></section>
      ) : <>
        {children.length > 1 && <label className="block max-w-sm space-y-2 text-sm font-semibold"><span>{t('ملف الطالب', 'Student profile')}</span><select value={studentId} onChange={(event) => setStudentId(event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3">{children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label>}
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-black">{t('الشهادات الصادرة', 'Issued certificates')}</h2><p className="mt-1 text-sm text-muted-foreground">{t('نسخ معتمدة محفوظة في ملف الطالب، ويمكن تنزيلها والتحقق من رقمها.', 'Verified copies saved to the student’s profile. Download them or check their serial number.')}</p></div><span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900">{certificates.length} {t('شهادة', 'certificates')}</span></div>
        {loadingCertificates ? <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{t('جارٍ تحميل الشهادات...', 'Loading certificates...')}</div> : certificates.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><Award className="mx-auto size-10 text-slate-400" /><h3 className="mt-3 font-bold">{t('لا توجد شهادات صادرة لهذا الطالب حتى الآن', 'No certificates have been issued for this student yet')}</h3><p className="mt-1 text-sm text-muted-foreground">{t('عند إصدار شهادة من المدرسة، ستظهر هنا تلقائيًا.', 'Certificates issued by the school will appear here automatically.')}</p></section>
        ) : <div className="grid gap-4 md:grid-cols-2">{certificates.map((certificate) => <article key={certificate.id} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div aria-hidden="true" className="absolute -left-8 -top-8 size-28 rounded-full bg-amber-100/60 blur-2xl" /><div className="relative"><div className="mb-4 flex items-start justify-between gap-3"><div className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 text-amber-800"><Award className="size-5" /></div><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800"><BadgeCheck className="size-3.5" />{t('صادرة من المدرسة', 'Issued by the school')}</span></div><h3 className="text-lg font-black text-[#152b49]">{certificate.title}</h3>{certificate.description && <p className="mt-2 text-sm leading-6 text-slate-600">{certificate.description}</p>}<p className="mt-3 text-xs text-slate-500">{certificate.student?.name || selectedChild?.name} · {certificate.issuer?.name || 'مدارس الإخلاص الأهلية'} · {new Date(certificate.createdAt).toLocaleDateString(isEnglish ? 'en-US' : 'ar-SA')}</p><div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><code dir="ltr" className="text-[10px] font-semibold text-slate-500">{certificate.serial}</code><div className="flex gap-2"><Link href={`/certificates/verify/${encodeURIComponent(certificate.serial)}`} target="_blank" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-[#214d6a] hover:bg-slate-50"><ShieldCheck className="size-3.5" />{t('التحقق', 'Verify')}</Link><button disabled={downloadingId === certificate.id} onClick={() => void download(certificate)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#214d6a] px-3 text-xs font-bold text-white hover:bg-[#152b49] disabled:opacity-60"><Download className="size-3.5" />{downloadingId === certificate.id ? t('جارٍ التنزيل', 'Downloading...') : t('تنزيل PDF', 'Download PDF')}</button></div></div></div></article>)}</div>}
      </>}
    </main>
  );
}
