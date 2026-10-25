'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { Link2, LoaderCircle, Phone, ShieldCheck, UserRound, Users } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api/client';

const relationships = [
  { value: 'father', label: 'الأب' },
  { value: 'mother', label: 'الأم' },
  { value: 'guardian', label: 'ولي أمر آخر' },
];

function getErrorMessage(error: any, isEnglish: boolean) {
  const message = error?.response?.data?.message ?? error?.message;
  const text = Array.isArray(message) ? message.join(isEnglish ? ', ' : '، ') : message;
  if (isEnglish) return typeof text === 'string' && !/[\u0600-\u06ff]/.test(text) ? text : 'Could not link the student. Check the information and try again.';
  return text || 'تعذر إكمال الربط. راجع البيانات وحاول مرة أخرى.';
}

export default function ParentOnboardingPage() {
  const isEnglish = useLocale() === 'en';
  const t = (ar: string, en: string) => isEnglish ? en : ar;
  const localizedRelationships = relationships.map((item) => ({
    ...item,
    label: item.value === 'father' ? t('الأب', 'Father') : item.value === 'mother' ? t('الأم', 'Mother') : t('ولي أمر آخر', 'Other guardian'),
  }));
  const router = useRouter();
  const { profile, loading, refreshProfile, markParentLinked } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const relationshipInput = useRef<HTMLSelectElement>(null);
  const canSetName = !profile?.full_name?.trim();

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
      setError(t('هذه الخطوة مخصصة لحساب ولي الأمر فقط.', 'This step is only for parent accounts.'));
      return;
    }
    if (code.length !== 16) {
      setError(t('رمز الطالب يتكون من 16 خانة. أدخل الرمز كاملًا كما يظهر في حساب الطالب.', 'The student code must contain 16 characters. Enter it exactly as shown in the student account.'));
      return;
    }
    if (!relationship) {
      setError(t('اختر صلة القرابة بالطالب أولًا لإكمال الربط.', 'Choose your relationship to the student before linking the account.'));
      relationshipInput.current?.focus();
      return;
    }

    setSaving(true);
    try {
      const profileNeedsUpdate = (canSetName && name.trim() !== profile.full_name?.trim())
        || phone.trim() !== (profile.phone ?? '').trim();
      if (profileNeedsUpdate) {
        await apiClient.patch('/users/me', {
          ...(canSetName ? { name: name.trim() } : {}),
          phone: phone.trim(),
        });
      }
      const { data } = await apiClient.post('/users/link-student', { code, relationship });
      try {
        await refreshProfile();
      } catch (refreshError) {
        console.warn('Student link succeeded, but the parent profile could not be refreshed.', refreshError);
      }
      markParentLinked(data.student.id);
      router.replace(`/survey?student=${encodeURIComponent(data.student.id)}`);
    } catch (submitError) {
      setError(getErrorMessage(submitError, isEnglish));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile || profile.role !== 'parent') {
    return <div dir={isEnglish ? 'ltr' : 'rtl'} className="flex min-h-screen items-center justify-center text-sm text-gray-500">{t('جارٍ التحقق من حساب ولي الأمر...', 'Verifying your parent account…')}</div>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-[#0f1015]" dir={isEnglish ? 'ltr' : 'rtl'}>
      <section className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1e1e2d] md:p-8">
        <header className="mb-6">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
              <Users className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-500">{t('إعداد حساب ولي الأمر · الخطوة 1 من 2', 'Set up your parent account · Step 1 of 2')}</p>
              <h1 className="mt-1 text-xl font-black text-gray-900 dark:text-white">{t('بيانات ولي الأمر وربط الطالب', 'Parent details and student linking')}</h1>
              <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                {t('أكمل بياناتك وأدخل الرمز الذي يصدره الطالب من حسابه. بعد نجاح الربط ستنتقل إلى استبيان ولي الأمر، وليس إلى اختبار الطالب.', 'Complete your details and enter the code generated from the student account. After linking, you will continue to the parent survey, not the student assessment.')}
              </p>
            </div>
          </div>
        </header>

        {error && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

        <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-2 text-sm font-bold text-gray-700 dark:text-gray-200">
            {t('اسم ولي الأمر الكامل', 'Parent full name')}
            <span className="relative block">
              <UserRound className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              <input required={canSetName} disabled={!canSetName} minLength={canSetName ? 3 : undefined} maxLength={100} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border border-gray-200 bg-white py-3 pe-10 ps-3 text-sm disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-white/10 dark:bg-white/5 dark:disabled:bg-white/10" />
            </span>
            {!canSetName ? <span className="block text-xs font-normal text-gray-500">{t('الاسم مسجل لدى المدرسة ولا يمكن تغييره من الحساب.', 'This name is recorded by the school and cannot be changed here.')}</span> : null}
          </label>

          <label className="block space-y-2 text-sm font-bold text-gray-700 dark:text-gray-200">
            {t('رقم الجوال', 'Mobile number')}
            <span className="relative block">
              <Phone className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              <input required type="tel" minLength={7} maxLength={20} autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="05xxxxxxxx أو +966..." dir="ltr" className="w-full rounded-lg border border-gray-200 bg-white py-3 pe-10 ps-3 text-sm dark:border-white/10 dark:bg-white/5" />
            </span>
          </label>

          <label className="block space-y-2 text-sm font-bold text-gray-700 dark:text-gray-200">
            {t('صلة القرابة بالطالب', 'Relationship to student')}
            <span className="relative block">
              <Users className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              <select ref={relationshipInput} value={relationship} onChange={(event) => { setRelationship(event.target.value); setError(''); }} aria-invalid={!relationship && code.length === 16} className={`w-full rounded-lg border bg-white py-3 pe-10 ps-3 text-sm dark:border-white/10 dark:bg-white/5 ${!relationship && code.length === 16 ? 'border-amber-500 ring-2 ring-amber-100 dark:ring-amber-500/20' : 'border-gray-200'}`}>
                <option value="" disabled>{t('اختر صلة القرابة', 'Choose a relationship')}</option>
                {localizedRelationships.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </span>
            {!relationship && code.length === 16 ? <span className="block text-xs font-semibold text-amber-700 dark:text-amber-300">{t('اختر الأب أو الأم أو ولي أمر آخر لتفعيل الربط.', 'Choose father, mother, or another guardian to enable linking.')}</span> : null}
          </label>

          <label className="block space-y-2 text-sm font-bold text-gray-700 dark:text-gray-200">
            {t('رمز ربط الطالب', 'Student link code')}
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
                placeholder={t('الرمز المكوّن من 16 خانة', '16-character code')}
                dir="ltr"
                className="w-full rounded-lg border border-gray-200 bg-white py-3 pe-10 ps-3 text-center font-mono text-lg tracking-[0.18em] dark:border-white/10 dark:bg-white/5"
              />
            </span>
            <span className="flex items-center justify-between gap-3 text-xs font-normal text-gray-500">
              <span>{t('انسخ الرمز كاملًا من حساب الطالب. صالح لمرة واحدة ولمدة 7 أيام.', 'Copy the full code from the student account. It can be used once and expires after 7 days.')}</span>
              <span dir="ltr" className={code.length === 16 ? 'font-semibold text-emerald-700' : ''}>{code.length}/16</span>
            </span>
          </label>

          <p className="flex gap-2 rounded-lg bg-sky-50 p-3 text-xs leading-5 text-sky-800 dark:bg-sky-500/10 dark:text-sky-200">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> {t('لن يُربط الحساب إلا برمز طالب صالح من المدرسة. لا تستخدم اسم الطالب أو رقم جواله بدل الرمز.', 'The account can only be linked with a valid school-issued student code. Do not use the student’s name or phone number instead.')}
          </p>

          <button type="submit" disabled={saving || code.length !== 16} className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            {saving ? t('جارٍ حفظ البيانات وربط الطالب...', 'Saving details and linking student…') : !relationship && code.length === 16 ? t('اختر صلة القرابة للمتابعة', 'Choose a relationship to continue') : t('حفظ البيانات وربط الطالب ثم الاستبيان', 'Save, link student, and continue to survey')}
          </button>
        </form>
      </section>
    </main>
  );
}
