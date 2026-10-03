'use client';

import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { CalendarDays, Check, Copy, GraduationCap, Link2, LoaderCircle, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api/client';
import { getCurrentUser } from '@/lib/firebase/auth';
import { getStudentOnboardingProfile, linkParentWithStudentCode, saveStudentOnboarding } from '@/lib/firebase/registration';

const gradeOptions = [
  { value: 0, label: 'رياض الأطفال / التمهيدي' },
  { value: 1, label: 'الصف الأول الابتدائي' },
  { value: 2, label: 'الصف الثاني الابتدائي' },
  { value: 3, label: 'الصف الثالث الابتدائي' },
  { value: 4, label: 'الصف الرابع الابتدائي' },
  { value: 5, label: 'الصف الخامس الابتدائي' },
  { value: 6, label: 'الصف السادس الابتدائي' },
  { value: 7, label: 'الصف الأول المتوسط' },
  { value: 8, label: 'الصف الثاني المتوسط' },
  { value: 9, label: 'الصف الثالث المتوسط' },
  { value: 10, label: 'الصف الأول الثانوي' },
  { value: 11, label: 'الصف الثاني الثانوي' },
  { value: 12, label: 'الصف الثالث الثانوي' },
];

function errorMessage(error: any) {
  const message = error?.response?.data?.message ?? error?.message;
  return Array.isArray(message) ? message.join('، ') : message || 'تعذر حفظ البيانات. حاول مرة أخرى.';
}

export default function StudentNewPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const [gradeLevel, setGradeLevel] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [linkCode, setLinkCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const role = profile?.role;
  const isStudent = role === 'student';
  const isParent = role === 'parent';

  useEffect(() => {
    if (authLoading) return;
    if (!profile) {
      router.replace('/login');
      return;
    }
    if (profile.role === 'student') {
      const firebaseUser = getCurrentUser();
      const loadProfile = firebaseUser?.uid === profile.id
        ? getStudentOnboardingProfile().then((data) => ({ data }))
        : apiClient.get('/users/me/student-profile');
      loadProfile.then(({ data }) => {
        if (data) {
          if (data.gradeLevel !== null && data.gradeLevel !== undefined) setGradeLevel(String(data.gradeLevel));
          if (data.dateOfBirth) setDateOfBirth(String(data.dateOfBirth).slice(0, 10));
        }
      }).catch(() => setError('تعذر تحميل ملف الطالب الحالي.'));
    }
  }, [authLoading, profile, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (isStudent) {
        const firebaseUser = getCurrentUser();
        if (firebaseUser?.uid === profile?.id) {
          const code = await saveStudentOnboarding(
            Number(gradeLevel),
            dateOfBirth ? new Date(`${dateOfBirth}T00:00:00.000Z`).toISOString() : undefined,
          );
          setLinkCode(code);
        } else {
          await apiClient.put('/users/me/student-profile', {
            gradeLevel: Number(gradeLevel),
            ...(dateOfBirth ? { dateOfBirth: new Date(`${dateOfBirth}T00:00:00.000Z`).toISOString() } : {}),
          });
          const { data } = await apiClient.post('/users/student-link-code');
          setLinkCode(data.code);
        }
      } else if (isParent) {
        const firebaseUser = getCurrentUser();
        if (firebaseUser?.uid === profile?.id) {
          const studentId = await linkParentWithStudentCode(linkCode);
          router.push(`/survey?student=${encodeURIComponent(studentId)}`);
        } else {
          const { data } = await apiClient.post('/users/link-student', { code: linkCode.trim() });
          router.push(`/survey?student=${encodeURIComponent(data.student.id)}`);
        }
      } else {
        router.replace('/login');
      }
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setSaving(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(linkCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('تعذر نسخ الرمز. يمكنك تحديده ونسخه يدويًا.');
    }
  };

  if (authLoading || !role) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">جارٍ التحقق من الحساب...</div>;
  }

  if (!isStudent && !isParent) return null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-[#0f1015]" dir="rtl">
      <section className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1e1e2d] md:p-8">
        <div className="mb-6 flex items-start gap-4">
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${isStudent ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {isStudent ? <GraduationCap className="h-6 w-6" /> : <Users className="h-6 w-6" />}
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-500">استكمال إعداد الحساب</p>
            <h1 className="mt-1 text-xl font-black text-gray-900 dark:text-white">{isStudent ? 'الملف الدراسي' : 'ربط حساب ولي الأمر'}</h1>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
              {isStudent
                ? `مرحبًا ${profile?.full_name || ''}، حدّد صفك الحالي. تُحفظ البيانات في ملفك المدرسي.`
                : 'أدخل رمز الربط الذي يصدره الطالب من حسابه. لا نستخدم الأسماء أو أرقام الجوال لمطابقة الحسابات.'}
            </p>
          </div>
        </div>

        {error && <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        {!linkCode ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            {isStudent ? (
              <>
                <label className="block space-y-2 text-sm font-bold text-gray-700 dark:text-gray-200">
                  الصف الدراسي
                  <span className="relative block">
                    <GraduationCap className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                    <select required value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)} className="w-full rounded-lg border border-gray-200 bg-white py-3 pe-10 ps-3 text-sm dark:border-white/10 dark:bg-white/5">
                      <option value="" disabled>اختر الصف الدراسي</option>
                      {gradeOptions.map((grade) => <option key={grade.value} value={grade.value}>{grade.label}</option>)}
                    </select>
                  </span>
                </label>
                <label className="block space-y-2 text-sm font-bold text-gray-700 dark:text-gray-200">
                  تاريخ الميلاد (اختياري)
                  <span className="relative block">
                    <CalendarDays className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                    <input type="date" value={dateOfBirth} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setDateOfBirth(event.target.value)} className="w-full rounded-lg border border-gray-200 bg-white py-3 pe-10 ps-3 text-sm dark:border-white/10 dark:bg-white/5" />
                  </span>
                </label>
                <p className="flex gap-2 rounded-lg bg-sky-50 p-3 text-xs leading-5 text-sky-800 dark:bg-sky-500/10 dark:text-sky-200">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> لن يظهر اختبار تحديد مستوى إلا إذا أعدّت المدرسة اختبارًا فعليًا مناسبًا للصف ونشرته لحسابك.
                </p>
              </>
            ) : (
              <label className="block space-y-2 text-sm font-bold text-gray-700 dark:text-gray-200">
                رمز ربط الطالب
                <span className="relative block">
                  <Link2 className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                  <input required autoComplete="one-time-code" inputMode="text" maxLength={32} minLength={32} value={linkCode} onChange={(event) => setLinkCode(event.target.value.toUpperCase().replace(/[^A-F0-9]/g, ''))} placeholder="أدخل رمز الربط المكوّن من 32 خانة" dir="ltr" className="w-full rounded-lg border border-gray-200 bg-white py-3 pe-10 ps-3 text-center font-mono text-lg tracking-widest dark:border-white/10 dark:bg-white/5" />
                </span>
                <span className="block text-xs font-normal text-gray-500">الرمز صالح لمدة 7 أيام ويُستخدم مرة واحدة.</span>
              </label>
            )}

            <button type="submit" disabled={saving || (isParent && linkCode.length !== 32)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : isStudent ? <GraduationCap className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
              {saving ? 'جارٍ الحفظ...' : isStudent ? 'حفظ الملف وإصدار رمز ولي الأمر' : 'ربط الطالب والمتابعة'}
            </button>
          </form>
        ) : (
          <div className="space-y-5">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <Check className="mx-auto h-7 w-7 text-emerald-700 dark:text-emerald-300" />
              <p className="mt-2 font-bold text-emerald-900 dark:text-emerald-100">تم حفظ ملفك وإصدار رمز الربط</p>
              <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-200">شاركه مع ولي أمرك فقط. سيُلغى بعد الاستخدام أو بعد 7 أيام.</p>
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-white p-2 dark:border-white/10 dark:bg-black/20">
                <code dir="ltr" className="flex-1 select-all text-xl font-black tracking-[0.2em] text-gray-900 dark:text-white">{linkCode}</code>
                <button type="button" onClick={copyCode} aria-label="نسخ رمز ولي الأمر" title="نسخ الرمز" className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:bg-white/10">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {profile?.status === 'pending' ? (
              <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                <p>احتفظ برمز الربط وشاركه مع ولي أمرك. تبقى لوحة الطالب والاختبار مغلقين إلى أن تعتمد المدرسة الحساب وتنشر اختبارًا فعليًا.</p>
                <button type="button" onClick={() => router.push('/account/pending')} className="font-bold underline underline-offset-4">عرض حالة الحساب</button>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => router.push('/assessment')} className="w-full rounded-lg bg-teal-700 px-4 py-3 text-sm font-bold text-white hover:bg-teal-800">بدء الاختبار التشخيصي</button>
                <button type="button" onClick={() => router.push('/student')} className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:bg-white/10">الدخول إلى لوحة الطالب</button>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
