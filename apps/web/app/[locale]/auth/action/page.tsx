'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import Image from 'next/image';
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from 'firebase/auth';
import { CheckCircle2, GraduationCap, KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react';
import { auth, isFirebaseConfigured } from '@/lib/firebase/config';

type ActionMode = 'verifyEmail' | 'resetPassword' | 'unsupported';
type PageState = 'loading' | 'verify-ready' | 'verified' | 'reset-ready' | 'reset-done' | 'continued' | 'error';

export default function EmailActionPage() {
  const locale = useLocale();
  const started = useRef(false);
  const [mode, setMode] = useState<ActionMode>('unsupported');
  const [pageState, setPageState] = useState<PageState>('loading');
  const [actionCode, setActionCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const isArabic = locale === 'ar';

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const params = new URLSearchParams(window.location.search);
    const requestedMode = params.get('mode');
    const code = params.get('oobCode') || '';
    const completedResult = params.get('result');
    const nextMode: ActionMode = requestedMode === 'verifyEmail'
      ? 'verifyEmail'
      : requestedMode === 'resetPassword'
        ? 'resetPassword'
        : 'unsupported';
    setMode(nextMode);
    setActionCode(code);

    if (!code && completedResult === 'verified') {
      setMode('verifyEmail');
      setPageState('continued');
      return;
    }
    if (!code && completedResult === 'password-reset') {
      setMode('resetPassword');
      setPageState('continued');
      return;
    }

    const prepare = async () => {
      if (!isFirebaseConfigured || !auth || !code || nextMode === 'unsupported') {
        setError(isArabic ? 'الرابط غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا.' : 'This link is invalid or has expired. Request a new one.');
        setPageState('error');
        return;
      }

      try {
        if (nextMode === 'verifyEmail') {
          const action = await checkActionCode(auth, code);
          setEmail(action.data.email || '');
          setPageState('verify-ready');
          return;
        }

        setEmail(await verifyPasswordResetCode(auth, code));
        setPageState('reset-ready');
      } catch {
        setError(isArabic ? 'الرابط غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا.' : 'This link is invalid or has expired. Request a new one.');
        setPageState('error');
      }
    };

    void prepare();
  }, [isArabic]);

  const verifyEmail = async () => {
    if (!auth || !actionCode) return;
    setPageState('loading');
    setError('');
    try {
      await applyActionCode(auth, actionCode);
      setPageState('verified');
    } catch {
      setError(isArabic ? 'تعذر تأكيد البريد. قد يكون الرابط مستخدمًا أو منتهي الصلاحية.' : 'We could not verify this email. The link may have been used or expired.');
      setPageState('error');
    }
  };

  const resetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth || !actionCode) return;
    if (password !== confirmPassword) {
      setError(isArabic ? 'كلمتا المرور غير متطابقتين.' : 'The passwords do not match.');
      return;
    }
    setPageState('loading');
    setError('');
    try {
      await confirmPasswordReset(auth, actionCode, password);
      setPassword('');
      setConfirmPassword('');
      setPageState('reset-done');
    } catch (resetError: unknown) {
      const code = (resetError as { code?: string })?.code;
      setError(code === 'auth/weak-password'
        ? (isArabic ? 'اختر كلمة مرور أقوى لا تقل عن 8 أحرف.' : 'Choose a stronger password of at least 8 characters.')
        : (isArabic ? 'تعذر تغيير كلمة المرور. اطلب رابطًا جديدًا وحاول مرة أخرى.' : 'We could not reset your password. Request a new link and try again.'));
      setPageState('reset-ready');
    }
  };

  const copy = isArabic
    ? {
        eyebrow: 'حساب آمن، بتجربة موثوقة',
        school: 'مدارس الإخلاص الأهلية',
        product: 'Nexus EDU',
        verifyTitle: 'تأكيد البريد الإلكتروني',
        resetTitle: 'إنشاء كلمة مرور جديدة',
        verifyText: 'أكد ملكيتك لهذا البريد لمتابعة استخدام حسابك في نكسس.',
        resetText: 'اختر كلمة مرور جديدة لحسابك. استخدم 8 أحرف على الأقل.',
        verifyButton: 'تأكيد البريد الإلكتروني',
        password: 'كلمة المرور الجديدة',
        confirmPassword: 'تأكيد كلمة المرور',
        resetButton: 'حفظ كلمة المرور',
        verifiedTitle: 'تم تأكيد بريدك الإلكتروني',
        verifiedText: 'أصبح بريدك جاهزًا للاستخدام في نكسس.',
        resetDoneTitle: 'تم تحديث كلمة المرور',
        resetDoneText: 'يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.',
        continuedTitle: 'العودة إلى نكسس',
        continuedText: 'إذا أكملت الإجراء في صفحة Firebase، يمكنك تسجيل الدخول الآن. إذا لم يكتمل، اطلب رابطًا جديدًا.',
        login: 'الانتقال إلى تسجيل الدخول',
        loading: 'جارٍ التحقق من الرابط...',
      }
    : {
        eyebrow: 'Secure account. Trusted learning.',
        school: 'Al-Ikhlas Private Schools',
        product: 'Nexus EDU',
        verifyTitle: 'Verify your email address',
        resetTitle: 'Create a new password',
        verifyText: 'Confirm that you own this email address to continue to your Nexus account.',
        resetText: 'Choose a new password for your account. Use at least 8 characters.',
        verifyButton: 'Verify email address',
        password: 'New password',
        confirmPassword: 'Confirm new password',
        resetButton: 'Save new password',
        verifiedTitle: 'Email address verified',
        verifiedText: 'Your email is now ready to use with Nexus EDU.',
        resetDoneTitle: 'Password updated',
        resetDoneText: 'You can now sign in with your new password.',
        continuedTitle: 'Return to Nexus EDU',
        continuedText: 'If you completed the action on Firebase, you can sign in now. If it did not finish, request a new link.',
        login: 'Continue to sign in',
        loading: 'Checking your secure link...',
      };

  const isVerified = pageState === 'verified';
  const isResetDone = pageState === 'reset-done';
  const isContinued = pageState === 'continued';
  const isFinished = isVerified || isResetDone || isContinued;
  const title = isVerified ? copy.verifiedTitle : isResetDone ? copy.resetDoneTitle : isContinued ? copy.continuedTitle : mode === 'verifyEmail' ? copy.verifyTitle : copy.resetTitle;
  const description = isVerified ? copy.verifiedText : isResetDone ? copy.resetDoneText : isContinued ? copy.continuedText : mode === 'verifyEmail' ? copy.verifyText : copy.resetText;

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10 text-slate-900" dir={isArabic ? 'rtl' : 'ltr'}>
      <section className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_-36px_rgba(15,23,42,0.35)]">
        <div className="h-1.5 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600" />
        <div className="p-6 sm:p-9">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Image src="/second_logo.webp" alt={copy.school} width={48} height={48} className="h-12 w-12 rounded-full border border-slate-200 bg-white object-contain p-0.5" />
              <span className="h-9 w-px bg-slate-200" />
              <Image src="/logo_new.webp" alt={copy.product} width={48} height={48} className="h-12 w-12 rounded-xl border border-slate-200 bg-white object-contain p-1" />
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-slate-900">{copy.product}</p>
                <p className="truncate text-xs text-slate-500">{copy.school}</p>
              </div>
            </div>
            <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-800 sm:inline-flex">
              <ShieldCheck className="h-4 w-4" /> {copy.eyebrow}
            </span>
          </div>

          <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-blue-700">
            {pageState === 'loading'
              ? <LoaderCircle className="h-6 w-6 animate-spin" />
              : isVerified || isResetDone
                ? <CheckCircle2 className="h-6 w-6" />
                : mode === 'verifyEmail'
                  ? <GraduationCap className="h-6 w-6" />
                  : <KeyRound className="h-6 w-6" />}
          </div>

          <h1 className="text-2xl font-black tracking-normal text-slate-950">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          {email && <p className="mt-3 break-all rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700" dir="ltr">{email}</p>}

          {pageState === 'loading' && <p role="status" className="mt-6 text-sm text-slate-500">{copy.loading}</p>}
          {error && <p role="alert" className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-800">{error}</p>}

          {pageState === 'verify-ready' && (
            <button type="button" onClick={() => void verifyEmail()} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200">
              <CheckCircle2 className="h-4 w-4" /> {copy.verifyButton}
            </button>
          )}

          {pageState === 'reset-ready' && (
            <form onSubmit={(event) => void resetPassword(event)} className="mt-6 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">
                {copy.password}
                <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={8} maxLength={128} autoComplete="new-password" required className="mt-2 h-12 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                {copy.confirmPassword}
                <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" minLength={8} maxLength={128} autoComplete="new-password" required className="mt-2 h-12 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
              </label>
              <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200">
                <KeyRound className="h-4 w-4" /> {copy.resetButton}
              </button>
            </form>
          )}

          {(isFinished || pageState === 'error') && (
            <a href={`/${locale}/login`} className="mt-6 flex min-h-12 w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50">
              {copy.login}
            </a>
          )}

          <div className="mt-8 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
            <p>{copy.school} · {copy.product}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
