'use client';

import { useEffect, useState } from 'react';
import { reload, sendEmailVerification } from 'firebase/auth';
import { MailCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { useAuth } from '@/contexts/auth-context';
import { getCurrentUser } from '@/lib/firebase/auth';
import { auth as firebaseAuth } from '@/lib/firebase/config';
import { EMAIL_ACTION_CONTINUE_PATHS, getEmailActionSettings } from '@/lib/firebase/email-actions';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!profile) {
      router.replace('/login');
      return;
    }
    setEmail(profile.email);
    if (profile.emailVerified) {
      router.replace(profile.role === 'student' || profile.role === 'parent' ? '/student/new' : '/login');
    }
  }, [authLoading, profile, router]);

  const resend = async () => {
    const user = getCurrentUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (!firebaseAuth) throw new Error('Firebase Authentication is unavailable.');
      firebaseAuth.languageCode = 'en';
      await sendEmailVerification(user, getEmailActionSettings(EMAIL_ACTION_CONTINUE_PATHS.verified));
      setMessage('أرسلنا رابط تحقق جديدًا إلى بريدك الإلكتروني.');
    } catch {
      setError('تعذر إرسال الرابط الآن. تحقق من إعدادات البريد أو حاول لاحقًا.');
    } finally {
      setBusy(false);
    }
  };

  const checkVerification = async () => {
    const user = getCurrentUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await reload(user);
      await user.getIdToken(true);
      if (!user.emailVerified) {
        setError('لم يتم تأكيد البريد بعد. افتح رابط التحقق ثم أعد المحاولة.');
        return;
      }
      window.location.reload();
    } catch {
      setError('تعذر التحقق من الحالة. أعد المحاولة بعد فتح رابط البريد.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-[#0f1015]" dir="rtl">
      <section className="w-full max-w-md space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1e1e2d] md:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"><MailCheck className="h-6 w-6" /></span>
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-teal-800 dark:text-teal-300"><ShieldCheck className="h-4 w-4" /> حماية الحساب</p>
          <h1 className="mt-2 text-xl font-black text-gray-900 dark:text-white">تحقق من بريدك الإلكتروني</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">أرسلنا رابط تأكيد إلى <bdi dir="ltr" className="font-semibold">{email || 'بريدك المسجل'}</bdi>. أكّد العنوان قبل متابعة إعداد الحساب.</p>
        </div>
        {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" disabled={busy} onClick={() => void checkVerification()} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> تحققت، تابع
          </button>
          <button type="button" disabled={busy} onClick={() => void resend()} className="min-h-11 rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5">
            إعادة إرسال الرابط
          </button>
        </div>
      </section>
    </main>
  );
}
