'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Check, Copy, LoaderCircle, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiClient } from '@/lib/api/client';

type LinkCodeResponse = { code: string; expiresAt: string };

function getErrorMessage(error: any, isEnglish: boolean) {
  const message = error?.response?.data?.message ?? error?.message;
  if (isEnglish) {
    if (Array.isArray(message) && message.some((part) => /[\u0600-\u06ff]/.test(String(part)))) return 'Could not create the link code. Please try again.';
    if (typeof message === 'string' && /[\u0600-\u06ff]/.test(message)) return 'Could not create the link code. Please try again.';
  }
  return Array.isArray(message) ? message.join(isEnglish ? ', ' : '، ') : message || (isEnglish ? 'Could not create the link code. Please try again.' : 'تعذر إصدار رمز الربط. حاول مرة أخرى.');
}

export default function ParentLinkCodeButton() {
  const locale = useLocale();
  const isEnglish = locale === 'en';
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const showCode = async () => {
    setOpen(true);
    setError('');
    setCopied(false);
    if (code) return;

    setLoading(true);
    try {
      const { data } = await apiClient.post<LinkCodeResponse>('/users/student-link-code');
      if (!data?.code) throw new Error('تعذر إصدار رمز الربط. حاول مرة أخرى.');
      setCode(data.code);
      setExpiresAt(data.expiresAt || '');
    } catch (requestError) {
      setError(getErrorMessage(requestError, isEnglish));
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(isEnglish ? 'Copy was unavailable. Select the code and copy it manually.' : 'تعذر نسخ الرمز تلقائيًا. حدده وانسخه يدويًا.');
    }
  };

  const expiryLabel = expiresAt && !Number.isNaN(new Date(expiresAt).getTime())
    ? new Intl.DateTimeFormat(isEnglish ? 'en-SA' : 'ar-SA', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Riyadh',
      }).format(new Date(expiresAt))
    : '';

  return (
    <>
      <button type="button" onClick={showCode} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-70">
        {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
        {loading ? (isEnglish ? 'Generating code…' : 'جارٍ إصدار الرمز...') : (isEnglish ? 'Parent link code' : 'رمز ولي الأمر')}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir={isEnglish ? 'ltr' : 'rtl'} className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">{isEnglish ? 'Parent link code' : 'رمز ربط ولي الأمر'}</DialogTitle>
            <DialogDescription>
              {isEnglish ? 'Share this code with your parent to link their account to your student profile.' : 'شارك هذا الرمز مع ولي أمرك لربط حسابه بملفك الدراسي.'}
            </DialogDescription>
          </DialogHeader>

          {loading && <div role="status" className="flex items-center justify-center gap-2 rounded-xl bg-muted/60 px-4 py-8 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />{isEnglish ? 'Generating a secure code…' : 'جارٍ إصدار رمز آمن...'}</div>}

          {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

          {code && !loading && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-900 dark:bg-emerald-950/30">
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">{isEnglish ? 'Your link code' : 'رمز الربط الخاص بك'}</p>
                <code dir="ltr" className="mt-2 block select-all break-all text-2xl font-black tracking-[0.18em] text-slate-950 dark:text-white">{code}</code>
                {expiryLabel && <p className="mt-3 text-xs text-muted-foreground">{isEnglish ? `Expires: ${expiryLabel}` : `صالح حتى ${expiryLabel}`}</p>}
              </div>

              <button type="button" onClick={copyCode} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90">
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? (isEnglish ? 'Code copied' : 'تم نسخ الرمز') : (isEnglish ? 'Copy code' : 'نسخ الرمز')}
              </button>

              <p className="text-center text-xs leading-5 text-muted-foreground">
                {isEnglish ? 'The code can be used once and expires after 7 days. Share it only with your parent.' : 'يُستخدم الرمز مرة واحدة وينتهي بعد 7 أيام. شاركه مع ولي أمرك فقط.'}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
