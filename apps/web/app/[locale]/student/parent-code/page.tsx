'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Copy, LoaderCircle, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { Link } from '@/i18n/routing';
import { apiClient } from '@/lib/api/client';

type ParentLinkCode = {
  code: string;
  expiresAt: string;
};

function getErrorMessage(error: any) {
  const message = error?.response?.data?.message ?? error?.message;
  return Array.isArray(message) ? message.join('، ') : message || 'تعذر إصدار رمز ولي الأمر. حاول مرة أخرى.';
}

function readStoredCode(key: string): ParentLinkCode | null {
  try {
    const value = sessionStorage.getItem(key);
    if (!value) return null;
    const parsed = JSON.parse(value) as ParentLinkCode;
    if (typeof parsed.code === 'string' && parsed.code && new Date(parsed.expiresAt).getTime() > Date.now()) return parsed;
    sessionStorage.removeItem(key);
  } catch {
    sessionStorage.removeItem(key);
  }
  return null;
}

export default function StudentParentCodePage() {
  const { profile, loading: authLoading } = useAuth();
  const [linkCode, setLinkCode] = useState<ParentLinkCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const initialized = useRef(false);
  const storageKey = profile?.id ? `nexus-student-parent-link-code:${profile.id}` : '';

  const issueCode = useCallback(async () => {
    if (!storageKey) return;
    setIssuing(true);
    setError('');
    try {
      const { data } = await apiClient.post<ParentLinkCode>('/users/student-link-code');
      sessionStorage.setItem(storageKey, JSON.stringify(data));
      setLinkCode(data);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIssuing(false);
      setLoading(false);
    }
  }, [storageKey]);

  useEffect(() => {
    if (authLoading || initialized.current) return;
    initialized.current = true;
    if (!storageKey) {
      setLoading(false);
      return;
    }
    const storedCode = storageKey ? readStoredCode(storageKey) : null;
    if (storedCode) {
      setLinkCode(storedCode);
      setLoading(false);
      return;
    }
    void issueCode();
  }, [authLoading, issueCode, storageKey]);

  const copyCode = async () => {
    if (!linkCode) return;
    try {
      await navigator.clipboard.writeText(linkCode.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('تعذر نسخ الرمز. يمكنك تحديده ونسخه يدويًا.');
    }
  };

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center p-4 md:p-8" dir="rtl">
      <section className="w-full space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1e1e2d] md:p-8">
        <header className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-200">
            <Users className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">رمز ولي الأمر</h1>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">شارك الرمز مع ولي أمرك لربط حسابه بملفك الدراسي.</p>
          </div>
        </header>

        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

        {loading || authLoading ? (
          <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-gray-500">
            <LoaderCircle className="h-5 w-5 animate-spin" /> جارٍ تجهيز الرمز...
          </div>
        ) : linkCode ? (
          <div className="space-y-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <ShieldCheck className="mx-auto h-8 w-8 text-emerald-700 dark:text-emerald-300" />
            <p className="font-bold text-emerald-900 dark:text-emerald-100">رمز الربط جاهز</p>
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-white p-2 dark:border-white/10 dark:bg-black/20">
              <code dir="ltr" className="flex-1 select-all text-xl font-black tracking-[0.2em] text-gray-900 dark:text-white">{linkCode.code}</code>
              <Button type="button" variant="outline" size="icon" onClick={copyCode} aria-label="نسخ رمز ولي الأمر" title="نسخ الرمز">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs leading-5 text-emerald-800 dark:text-emerald-200">
              ينتهي في {new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium' }).format(new Date(linkCode.expiresAt))}، ويُلغى بعد استخدامه.
            </p>
            <Button type="button" variant="outline" onClick={() => void issueCode()} disabled={issuing}>
              {issuing ? <LoaderCircle className="ms-2 h-4 w-4 animate-spin" /> : <RefreshCw className="ms-2 h-4 w-4" />}
              إصدار رمز جديد
            </Button>
          </div>
        ) : !error ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">أكمل بيانات ملفك الدراسي قبل إصدار رمز ولي الأمر.</p>
        ) : null}

        <div className="flex flex-wrap justify-center gap-3 border-t border-gray-100 pt-5 dark:border-white/10">
          {!linkCode && !loading && <Button type="button" onClick={() => void issueCode()} disabled={issuing}>{issuing && <LoaderCircle className="ms-2 h-4 w-4 animate-spin" />}إعادة المحاولة</Button>}
          <Button asChild variant="outline"><Link href="/student"><ArrowRight className="ms-2 h-4 w-4" />العودة إلى صفحة الطالب</Link></Button>
        </div>
      </section>
    </main>
  );
}
