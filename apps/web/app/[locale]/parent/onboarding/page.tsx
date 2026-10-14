'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { Link2, LoaderCircle, Phone, ShieldCheck, UserRound, Users } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api/client';

const relationships = [
  { value: 'father', label: 'الأب' },
  { value: 'mother', label: 'الأم' },
  { value: 'guardian', label: 'ولي أمر آخر' },
];

function getErrorMessage(error: any) {
  const message = error?.response?.data?.message ?? error?.message;
  return Array.isArray(message) ? message.join('، ') : message || 'تعذر إكمال الربط. راجع البيانات وحاول مرة أخرى.';
}

export default function ParentOnboardingPage() {
  const router = useRouter();
  const { profile, loading, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      router.replace('/login');
      return;
    }
    if (profile.role !== 'parent') {
      router.replace(profile.role === 'student' ? '/student' : '/login');
      return;
    }
    setName(profile.full_name || '');
    setPhone(profile.phone || '');
    if (profile.onboardingStep === 'parent-survey' && profile.onboardingStudentId) {
      router.replace(`/survey?student=${encodeURIComponent(profile.onboardingStudentId)}`);
    } else if (profile.onboardingStep === 'complete') {
      router.replace('/parent');
    }
  }, [loading, profile, router]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!profile || profile.role !== 'parent') {
      setError('هذه الخطوة مخصصة لحساب ولي الأمر فقط.');
      return;
    }
    if (code.length !== 16) {
      setError('رمز الطالب يتكون من 16 خانة. أدخل الرمز كاملًا كما يظهر في حساب الطالب.');
      return;
    }

    setSaving(true);
    try {
      await apiClient.patch('/users/me', { name: name.trim(), phone: phone.trim() });
      const { data } = await apiClient.post('/users/link-student', { code, relationship });
      await refreshProfile();
      router.replace(`/survey?student=${encodeURIComponent(data.student.id)}`);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile || profile.role !== 'parent') {
    return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">جارٍ التحقق من حساب ولي الأمر...</div>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-[#0f1015]" dir="rtl">
      <section className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1e1e2d] md:p-8">
        <header className="mb-6">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
              <Users className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-500">إعداد حساب ولي الأمر · الخطوة 1 من 2</p>
              <h1 className="mt-1 text-xl font-black text-gray-900 dark:text-white">بيانات ولي الأمر وربط الطالب</h1>
              <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                أكمل بياناتك وأدخل الرمز الذي يصدره الطالب من حسابه. بعد نجاح الربط ستنتقل إلى استبيان ولي الأمر، وليس إلى اختبار الطالب.
              </p>
            </div>
          </div>
        </header>

        {error && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

        <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-2 text-sm font-bold text-gray-700 dark:text-gray-200">
            اسم ولي الأمر الكامل
            <span className="relative block">
              <UserRound className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              <input required minLength={3} maxLength={100} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border border-gray-200 bg-white py-3 pe-10 ps-3 text-sm dark:border-white/10 dark:bg-white/5" />
            </span>
          </label>

          <label className="block space-y-2 text-sm font-bold text-gray-700 dark:text-gray-200">
            رقم الجوال
            <span className="relative block">
              <Phone className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              <input required type="tel" minLength={7} maxLength={20} autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="05xxxxxxxx أو +966..." dir="ltr" className="w-full rounded-lg border border-gray-200 bg-white py-3 pe-10 ps-3 text-sm dark:border-white/10 dark:bg-white/5" />
            </span>
          </label>

          <label className="block space-y-2 text-sm font-bold text-gray-700 dark:text-gray-200">
            صلة القرابة بالطالب
            <span className="relative block">
              <Users className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              <select required value={relationship} onChange={(event) => setRelationship(event.target.value)} className="w-full rounded-lg border border-gray-200 bg-white py-3 pe-10 ps-3 text-sm dark:border-white/10 dark:bg-white/5">
                <option value="" disabled>اختر صلة القرابة</option>
                {relationships.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </span>
          </label>

          <label className="block space-y-2 text-sm font-bold text-gray-700 dark:text-gray-200">
            رمز ربط الطالب
            <span className="relative block">
              <Link2 className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              <input
                required
                autoComplete="one-time-code"
                inputMode="text"
                minLength={16}
                maxLength={16}
                pattern="[A-Fa-f0-9]{16}"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 16))}
                placeholder="الرمز المكوّن من 16 خانة"
                dir="ltr"
                className="w-full rounded-lg border border-gray-200 bg-white py-3 pe-10 ps-3 text-center font-mono text-lg tracking-[0.18em] dark:border-white/10 dark:bg-white/5"
              />
            </span>
            <span className="flex items-center justify-between gap-3 text-xs font-normal text-gray-500">
              <span>انسخ الرمز كاملًا من حساب الطالب. صالح لمرة واحدة ولمدة 7 أيام.</span>
              <span dir="ltr" className={code.length === 16 ? 'font-semibold text-emerald-700' : ''}>{code.length}/16</span>
            </span>
          </label>

          <p className="flex gap-2 rounded-lg bg-sky-50 p-3 text-xs leading-5 text-sky-800 dark:bg-sky-500/10 dark:text-sky-200">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> لن يُربط الحساب إلا برمز طالب صالح من المدرسة. لا تستخدم اسم الطالب أو رقم جواله بدل الرمز.
          </p>

          <button type="submit" disabled={saving || code.length !== 16 || !relationship} className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            {saving ? 'جارٍ حفظ البيانات وربط الطالب...' : 'حفظ البيانات وربط الطالب ثم الاستبيان'}
          </button>
        </form>
      </section>
    </main>
  );
}
