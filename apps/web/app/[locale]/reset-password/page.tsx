'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { AlertCircle, ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

type AccountRole = 'student' | 'parent';

export default function ResetPasswordPage() {
  const locale = useLocale();
  const router = useRouter();
  const [role, setRole] = useState<AccountRole>('student');
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const requestedRole = new URLSearchParams(window.location.search).get('role');
    if (requestedRole === 'parent' || requestedRole === 'student') setRole(requestedRole);
    if (!supabase) {
      setChecking(false);
      setError('رابط الاستعادة غير متاح لمزود الحساب الحالي.');
      return;
    }

    let active = true;
    let resolved = false;
    const verifyRecoverySession = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (!active || sessionError || !session) return;

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!active || userError || !user) return;

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      const profileRole = String(profile?.role ?? '').toLowerCase();
      if (profileError || (profileRole !== 'student' && profileRole !== 'parent') || profileRole !== requestedRole) {
        resolved = true;
        await supabase.auth.signOut();
        if (active) {
          setError('رابط الاستعادة لا يطابق حساب طالب أو ولي أمر.');
          setChecking(false);
        }
        return;
      }

      if (active) {
        resolved = true;
        setRole(profileRole);
        setReady(true);
        setChecking(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        window.setTimeout(() => void verifyRecoverySession(), 0);
      }
    });
    void verifyRecoverySession();
    const timeout = window.setTimeout(() => {
      if (active && !resolved) {
        resolved = true;
        setChecking(false);
        setError('الرابط غير صالح أو انتهت صلاحيته. اطلب رسالة استعادة جديدة.');
      }
    }, 8000);

    return () => {
      active = false;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!supabase || !ready) return;
    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    setSuccess(true);
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10" dir="rtl">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9">
        <Link href={`/${locale}/login`} className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900">
          <ArrowRight className="h-4 w-4" /> العودة لتسجيل الدخول
        </Link>
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            {success ? <CheckCircle2 className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
          </div>
          <h1 className="text-2xl font-black text-slate-900">{success ? 'تم تغيير كلمة المرور' : 'تعيين كلمة مرور جديدة'}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {success ? 'تم تحديث كلمة المرور. سجّل الدخول بها الآن.' : 'استخدم كلمة مرور جديدة لا تقل عن 8 أحرف.'}
          </p>
        </div>

        {error && (
          <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {checking && <p role="status" className="py-5 text-center text-sm text-slate-500">جارٍ التحقق من رابط الاستعادة...</p>}
        {ready && !success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm font-bold text-slate-700">
              كلمة المرور الجديدة
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="new-password" minLength={8} maxLength={128} required className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              تأكيد كلمة المرور
              <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" autoComplete="new-password" minLength={8} maxLength={128} required className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <button disabled={loading} className="h-12 w-full rounded-xl bg-blue-700 text-sm font-bold text-white transition hover:bg-blue-800 disabled:opacity-50">
              {loading ? 'جارٍ الحفظ...' : 'حفظ كلمة المرور'}
            </button>
          </form>
        )}

        {success && <button onClick={() => router.push(`/login/${role}`)} className="h-12 w-full rounded-xl bg-blue-700 text-sm font-bold text-white hover:bg-blue-800">تسجيل الدخول</button>}
      </section>
    </main>
  );
}
