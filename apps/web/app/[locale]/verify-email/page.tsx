'use client';

import { useEffect, useRef, useState } from 'react';
import { sendEmailVerification } from 'firebase/auth';
import { MailCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { getCurrentUser } from '@/lib/firebase/auth';
import { auth as firebaseAuth } from '@/lib/firebase/config';
import { EMAIL_ACTION_CONTINUE_PATHS, getEmailActionSettings } from '@/lib/firebase/email-actions';

export default function VerifyEmailPage() {
  const router = useRouter();
  const locale = useLocale();
  const isArabic = locale !== 'en';
  const copy = isArabic ? {
    pageTitle: 'تحقق من بريدك الإلكتروني', security: 'حماية الحساب',
    sessionError: 'تم تأكيد البريد، لكن تعذر تحديث جلسة المنصة. سجّل الدخول مرة أخرى.',
    retryLogin: 'تعذر الاتصال بخدمة التحقق. حاول تسجيل الدخول مرة أخرى.',
    sent: 'أرسلنا رابط التحقق إلى بريدك الإلكتروني بعد اكتمال خطوات التسجيل.',
    resendAutoError: 'تعذر إرسال رابط التحقق تلقائيًا. استخدم زر إعادة الإرسال بعد قليل.',
    sentAgain: 'أرسلنا رابط تحقق جديدًا إلى بريدك الإلكتروني.',
    resendError: 'تعذر إرسال الرابط الآن. تحقق من إعدادات البريد أو حاول لاحقًا.',
    notVerified: 'لم يتم تأكيد البريد بعد. افتح رابط التحقق ثم أعد المحاولة.',
    updateError: 'تم فتح رابط البريد، لكن تعذر تحديث جلسة المنصة. أعد المحاولة بعد قليل.',
    intro: 'بعد إكمال إعداد الحساب، استخدم رابط التحقق المرسل إلى',
    inbox: 'بريدك المسجل', continue: 'تحققت، تابع', resend: 'إعادة إرسال الرابط', loading: 'جارٍ تحميل صفحة التحقق...',
  } : {
    pageTitle: 'Verify your email', security: 'Account security',
    sessionError: 'Your email is verified, but Nexus could not refresh your session. Sign in again.',
    retryLogin: 'The verification service could not be reached. Please sign in again.',
    sent: 'We sent a verification link to your email after completing registration.',
    resendAutoError: 'We could not send the verification link automatically. Try the resend button shortly.',
    sentAgain: 'A new verification link was sent to your email.',
    resendError: 'We could not send the link right now. Check email settings or try again later.',
    notVerified: 'Your email is not verified yet. Open the verification link, then try again.',
    updateError: 'The email link opened, but Nexus could not refresh your session. Try again shortly.',
    intro: 'After completing account setup, use the verification link sent to',
    inbox: 'your registered email', continue: 'I verified, continue', resend: 'Resend link', loading: 'Loading verification page...',
  };
  const { profile, loading: authLoading, refreshVerifiedSession } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const sentForUser = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!profile) {
      router.replace('/login');
      return;
    }
    setEmail(profile.email);
    if (profile.emailVerified) {
      router.replace(profile.role === 'student' ? '/student' : profile.role === 'teacher' ? '/teacher' : profile.role === 'parent' ? '/parent' : '/login');
      return;
    }

    const user = getCurrentUser();
    if (!user || sentForUser.current === user.uid) return;
    sentForUser.current = user.uid;
    void (async () => {
      try {
        if (!firebaseAuth) throw new Error('Firebase Authentication is unavailable.');
        const verifiedProfile = await refreshVerifiedSession();
        if (user.emailVerified) {
          if (verifiedProfile?.emailVerified) {
            router.replace(verifiedProfile.role === 'student' ? '/student' : verifiedProfile.role === 'teacher' ? '/teacher' : verifiedProfile.role === 'parent' ? '/parent' : '/login');
          } else {
            setError(copy.sessionError);
          }
          return;
        }
      } catch {
        if (user.emailVerified) {
          setError(copy.sessionError);
          return;
        }
        if (!firebaseAuth) {
          setError(copy.retryLogin);
          return;
        }
      }

      if (user.emailVerified || !firebaseAuth) return;
      try {
        firebaseAuth.languageCode = window.location.pathname.split('/').filter(Boolean)[0] === 'en' ? 'en' : 'ar';
        await sendEmailVerification(user, getEmailActionSettings(EMAIL_ACTION_CONTINUE_PATHS.verified));
        setMessage(copy.sent);
      } catch {
        setError(copy.resendAutoError);
      }
    })();
  }, [authLoading, profile, refreshVerifiedSession, router]);

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
      firebaseAuth.languageCode = locale === 'en' ? 'en' : 'ar';
      await sendEmailVerification(user, getEmailActionSettings(EMAIL_ACTION_CONTINUE_PATHS.verified));
      setMessage(copy.sentAgain);
    } catch {
      setError(copy.resendError);
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
      const verifiedProfile = await refreshVerifiedSession();
      if (!user.emailVerified || !verifiedProfile?.emailVerified) {
        setError(copy.notVerified);
        return;
      }
      router.replace(verifiedProfile.role === 'student' ? '/student' : verifiedProfile.role === 'teacher' ? '/teacher' : '/parent');
    } catch {
      setError(copy.updateError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-[#0f1015]" dir={isArabic ? 'rtl' : 'ltr'}>
      <section className="w-full max-w-md space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1e1e2d] md:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"><MailCheck className="h-6 w-6" /></span>
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-teal-800 dark:text-teal-300"><ShieldCheck className="h-4 w-4" /> {copy.security}</p>
          <h1 className="mt-2 text-xl font-black text-gray-900 dark:text-white">{copy.pageTitle}</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{copy.intro} <bdi dir="ltr" className="font-semibold">{email || copy.inbox}</bdi> {isArabic ? 'لتفعيل الدخول إلى المنصة.' : 'to activate sign-in to the platform.'}</p>
        </div>
        {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" disabled={busy} onClick={() => void checkVerification()} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> {copy.continue}
          </button>
          <button type="button" disabled={busy} onClick={() => void resend()} className="min-h-11 rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5">
            {copy.resend}
          </button>
        </div>
      </section>
    </main>
  );
}
