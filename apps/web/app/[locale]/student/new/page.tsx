'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from '@/i18n/routing';
import { Camera, Check, Copy, GraduationCap, LoaderCircle, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api/client';
import { uploadService } from '@/lib/services/upload.service';
import { getCurrentUser } from '@/lib/firebase/auth';
import { getStudentOnboardingProfile, syncStudentOnboardingMetadata } from '@/lib/firebase/registration';
import { useLocale } from 'next-intl';

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

function errorMessage(error: any, isEnglish: boolean) {
  if (isEnglish) return 'Could not save your information. Please check the fields and try again.';
  const message = error?.response?.data?.message ?? error?.message;
  return Array.isArray(message) ? message.join('، ') : message || 'تعذر حفظ البيانات. حاول مرة أخرى.';
}

function normalizeDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/\D/g, '');
}

function dateOfBirthParts(value: unknown) {
  const match = String(value ?? '').slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? { day: match[3], month: match[2], year: match[1] } : null;
}

function serializeDateOfBirth(dayValue: string, monthValue: string, yearValue: string, isEnglish: boolean) {
  const parts = [dayValue, monthValue, yearValue].map((value) => value.trim());
  if (parts.every((part) => !part)) return undefined;
  if (parts.some((part) => !part)) {
    throw new Error(isEnglish ? 'Enter the full day, month, and year, or leave the date of birth blank.' : 'أدخل اليوم والشهر والسنة كاملين، أو اترك تاريخ الميلاد فارغًا.');
  }

  const [day, month, year] = parts.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 1900
    || year > 9999
    || date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    throw new Error(isEnglish ? 'The date of birth is invalid. Check the day, month, and year.' : 'تاريخ الميلاد غير صحيح. راجع اليوم والشهر والسنة.');
  }

  const serializedDate = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (serializedDate > new Date().toISOString().slice(0, 10)) {
    throw new Error(isEnglish ? 'The date of birth cannot be in the future.' : 'تاريخ الميلاد لا يمكن أن يكون في المستقبل.');
  }

  return `${serializedDate}T00:00:00.000Z`;
}

export default function StudentNewPage() {
  const isEnglish = useLocale() === 'en';
  const t = (ar: string, en: string) => isEnglish ? en : ar;
  const router = useRouter();
  const { profile, loading: authLoading, refreshProfile } = useAuth();
  const [gradeLevel, setGradeLevel] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [issuedLinkCode, setIssuedLinkCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const role = profile?.role;
  const isStudent = role === 'student';
  const isFirebaseAccount = Boolean(profile && getCurrentUser()?.uid === profile.id);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview('');
      return;
    }
    const previewUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [photoFile]);

  useEffect(() => {
    if (authLoading) return;
    if (!profile) {
      router.replace('/login');
      return;
    }
    if (profile.role === 'student') {
      const firebaseUser = getCurrentUser();
      Promise.all([
        apiClient.get('/users/me/student-profile').then(({ data }) => data),
        firebaseUser?.uid === profile.id ? getStudentOnboardingProfile() : Promise.resolve(null),
      ]).then(([apiProfile, firebaseProfile]) => {
        const grade = apiProfile?.gradeLevel ?? firebaseProfile?.gradeLevel;
        const birthDate = apiProfile?.dateOfBirth ?? firebaseProfile?.dateOfBirth;
        if (typeof apiProfile?.nationalId === 'string') setNationalId(apiProfile.nationalId);
        if (grade !== null && grade !== undefined) setGradeLevel(String(grade));
        if (birthDate) {
          const parts = dateOfBirthParts(birthDate);
          if (parts) {
            setBirthDay(parts.day);
            setBirthMonth(parts.month);
            setBirthYear(parts.year);
          }
        }
      }).catch(() => setError(t('تعذر تحميل ملف الطالب الحالي. حاول إعادة فتح صفحة استكمال البيانات.', 'Could not load the current student profile. Reopen this page and try again.')));
    }
  }, [authLoading, profile, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (isStudent) {
        if (!nationalId || !/^\d{10}$/.test(nationalId)) throw new Error(t('أدخل رقم الهوية الوطنية أو الإقامة المكوّن من 10 أرقام.', 'Enter a 10-digit national ID or residence number.'))
        if (!photoFile && !profile?.avatar_url) throw new Error(t('ارفع صورة الطالب لإكمال إنشاء الملف الدراسي.', 'Upload a student photo to complete the academic profile.'))
        const firebaseUser = getCurrentUser();
        const serializedDate = serializeDateOfBirth(birthDay, birthMonth, birthYear, isEnglish);
        if (photoFile) await uploadService.uploadStudentAvatar(photoFile);
        await apiClient.put('/users/me/student-profile', {
          gradeLevel: Number(gradeLevel),
          nationalId,
          ...(serializedDate ? { dateOfBirth: serializedDate } : {}),
        });
        if (firebaseUser?.uid === profile?.id && profile?.emailVerified !== false) {
          try {
            await syncStudentOnboardingMetadata(Number(gradeLevel), serializedDate);
          } catch (syncError) {
            console.warn('Student profile was saved to the API, but Firebase metadata could not be synchronized.', syncError);
          }
        }
        const { data } = await apiClient.post('/users/student-link-code');
        if (profile?.id && data.code && data.expiresAt) {
          sessionStorage.setItem(`nexus-student-parent-link-code:${profile.id}`, JSON.stringify({ code: data.code, expiresAt: data.expiresAt }));
        }
        await refreshProfile();
        setIssuedLinkCode(data.code);
      } else {
        router.replace('/login');
      }
    } catch (submitError) {
      setError(errorMessage(submitError, isEnglish));
    } finally {
      setSaving(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(issuedLinkCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(t('تعذر نسخ الرمز. يمكنك تحديده ونسخه يدويًا.', 'Could not copy the code. You can select and copy it manually.'));
    }
  };

  if (authLoading || !role) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">{t('جارٍ التحقق من الحساب...', 'Verifying your account...')}</div>;
  }

  if (!isStudent) return null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-[#0f1015]" dir={isEnglish ? 'ltr' : 'rtl'}>
      <section className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1e1e2d] md:p-8">
        <div className="mb-6 flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
            <GraduationCap className="h-6 w-6" />
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-500">{t('استكمال إعداد الحساب', 'Complete account setup')}</p>
            <h1 className="mt-1 text-xl font-black text-gray-900 dark:text-white">{t('الملف الدراسي', 'Academic profile')}</h1>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
              {t(`مرحبًا ${profile?.full_name || ''}، حدّد صفك الحالي. تُحفظ البيانات في ملفك المدرسي.`, `Welcome ${profile?.full_name || ''}. Select your current grade. This information will be saved to your school profile.`)}
            </p>
          </div>
        </div>

        {error && <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        {!issuedLinkCode ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <>
                <label className="block space-y-2 text-sm font-bold text-gray-700 dark:text-gray-200">
                  {t('الصف الدراسي', 'Grade level')}
                  <span className="relative block">
                    <GraduationCap className={`absolute ${isEnglish ? 'left-3' : 'right-3'} top-3 h-4 w-4 text-gray-400`} />
                    <select required value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)} className="w-full rounded-lg border border-gray-200 bg-white py-3 pe-10 ps-3 text-sm dark:border-white/10 dark:bg-white/5">
                      <option value="" disabled>{t('اختر الصف الدراسي', 'Select a grade')}</option>
                      {gradeOptions.map((grade) => <option key={grade.value} value={grade.value}>{isEnglish ? ['Kindergarten / Preparatory', 'Grade 1 · Elementary', 'Grade 2 · Elementary', 'Grade 3 · Elementary', 'Grade 4 · Elementary', 'Grade 5 · Elementary', 'Grade 6 · Elementary', 'Grade 1 · Middle school', 'Grade 2 · Middle school', 'Grade 3 · Middle school', 'Grade 1 · High school', 'Grade 2 · High school', 'Grade 3 · High school'][grade.value] : grade.label}</option>)}
                    </select>
                  </span>
                </label>
                <label className="block space-y-2 text-sm font-bold text-gray-700 dark:text-gray-200">
                  {t('رقم الهوية الوطنية أو الإقامة', 'National ID or residence number')}
                  <span className="relative block">
                    <ShieldCheck className={`absolute ${isEnglish ? 'left-3' : 'right-3'} top-3 h-4 w-4 text-gray-400`} />
                    <input
                      required
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      value={nationalId}
                      onChange={(event) => setNationalId(event.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder={t('10 أرقام', '10 digits')}
                      dir="ltr"
                      className="w-full rounded-lg border border-gray-200 bg-white py-3 pe-10 ps-3 text-sm tracking-widest dark:border-white/10 dark:bg-white/5"
                    />
                  </span>
                  <span className="block text-xs font-normal text-gray-500">{t('يُحفظ ضمن ملف الطالب ولا يظهر للطلاب الآخرين.', 'This is stored in the student profile and is not shown to other students.')}</span>
                </label>
                <label className="block space-y-2 text-sm font-bold text-gray-700 dark:text-gray-200">
                  {t('تاريخ الميلاد (اختياري)', 'Date of birth (optional)')}
                  <span className="grid grid-cols-[1fr_1fr_1.5fr] gap-2" dir={isEnglish ? 'ltr' : 'rtl'}>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="bday-day"
                      aria-label={t('يوم الميلاد', 'Birth day')}
                      dir="ltr"
                      maxLength={2}
                      value={birthDay}
                      onChange={(event) => setBirthDay(normalizeDigits(event.target.value).slice(0, 2))}
                      placeholder={t('يوم', 'Day')}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-center text-sm dark:border-white/10 dark:bg-white/5"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="bday-month"
                      aria-label={t('شهر الميلاد', 'Birth month')}
                      dir="ltr"
                      maxLength={2}
                      value={birthMonth}
                      onChange={(event) => setBirthMonth(normalizeDigits(event.target.value).slice(0, 2))}
                      placeholder={t('شهر', 'Month')}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-center text-sm dark:border-white/10 dark:bg-white/5"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="bday-year"
                      aria-label={t('سنة الميلاد', 'Birth year')}
                      dir="ltr"
                      maxLength={4}
                      value={birthYear}
                      onChange={(event) => setBirthYear(normalizeDigits(event.target.value).slice(0, 4))}
                      placeholder={t('سنة الميلاد', 'Year')}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-center text-sm dark:border-white/10 dark:bg-white/5"
                    />
                  </span>
                  <span className="block text-xs font-normal text-gray-500">{t('اكتب اليوم ثم الشهر ثم السنة. مثال: 03 / 02 / 2012.', 'Enter the day, month, then year. Example: 03 / 02 / 2012.')}</span>
                </label>
                <div className="space-y-2">
                  <label htmlFor="student-photo" className="block text-sm font-bold text-gray-700 dark:text-gray-200">{t('صورة الطالب', 'Student photo')} <span className="text-rose-600">*</span></label>
                  <div className="flex items-center gap-4 rounded-lg border border-gray-200 p-3 dark:border-white/10">
                    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-200">
                      {photoPreview || profile?.avatar_url
                        ? <Image src={photoPreview || profile?.avatar_url || ''} alt={t('معاينة صورة الطالب', 'Student photo preview')} width={64} height={64} unoptimized className="h-full w-full object-contain" />
                        : <UserRound className="h-8 w-8" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-300">{t('JPEG أو PNG أو WebP، بحد أقصى 5 ميجابايت', 'JPEG, PNG, or WebP · up to 5 MB')}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <label htmlFor="student-photo" className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-100 dark:hover:bg-white/5">
                          <Camera className="h-4 w-4" />{photoFile ? t('تغيير الصورة', 'Change photo') : t('اختيار صورة', 'Choose photo')}
                        </label>
                        {photoFile && <button type="button" onClick={() => { setPhotoFile(null); if (photoInputRef.current) photoInputRef.current.value = ''; }} className="rounded-md px-2 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10">{t('إزالة', 'Remove')}</button>}
                      </div>
                    </div>
                    <input
                      id="student-photo"
                      ref={photoInputRef}
                      type="file"
                      required={!profile?.avatar_url}
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
                          setError(t('اختر صورة JPEG أو PNG أو WebP لا يتجاوز حجمها 5 ميجابايت.', 'Choose a JPEG, PNG, or WebP image up to 5 MB.'));
                          event.currentTarget.value = '';
                          return;
                        }
                        setError('');
                        setPhotoFile(file);
                      }}
                    />
                  </div>
                </div>
                <p className="flex gap-2 rounded-lg bg-sky-50 p-3 text-xs leading-5 text-sky-800 dark:bg-sky-500/10 dark:text-sky-200">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> {t('لن يظهر اختبار تحديد مستوى إلا إذا أعدّت المدرسة اختبارًا فعليًا مناسبًا للصف ونشرته لحسابك.', 'A placement test will appear only if the school prepares a suitable test for your grade and publishes it to your account.')}
                </p>
            </>

            <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
              {saving ? t('جارٍ الحفظ...', 'Saving...') : t('حفظ الملف وإصدار رمز ولي الأمر', 'Save profile and generate parent link code')}
            </button>
          </form>
        ) : (
          <div className="space-y-5">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <Check className="mx-auto h-7 w-7 text-emerald-700 dark:text-emerald-300" />
              <p className="mt-2 font-bold text-emerald-900 dark:text-emerald-100">{t('تم حفظ ملفك وإصدار رمز الربط', 'Your profile was saved and a link code was generated')}</p>
              <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-200">{t('شاركه مع ولي أمرك فقط. سيُلغى بعد الاستخدام أو بعد 7 أيام.', 'Share it only with your parent or guardian. It expires after use or after 7 days.')}</p>
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-white p-2 dark:border-white/10 dark:bg-black/20">
              <code dir="ltr" className="flex-1 select-all text-xl font-black tracking-[0.2em] text-gray-900 dark:text-white">{issuedLinkCode}</code>
                <button type="button" onClick={copyCode} aria-label={t('نسخ رمز ولي الأمر', 'Copy parent link code')} title={t('نسخ الرمز', 'Copy code')} className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:bg-white/10">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <button type="button" onClick={() => router.push('/assessment')} className="w-full rounded-lg bg-teal-700 px-4 py-3 text-sm font-bold text-white hover:bg-teal-800">{t('بدء الاختبار التشخيصي', 'Start diagnostic assessment')}</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
