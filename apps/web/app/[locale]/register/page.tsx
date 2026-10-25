'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Phone, GraduationCap, Users, BookOpen, ArrowLeft, Sparkles, AlertCircle, ImagePlus, ShieldCheck } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { isAuthenticationConfigured, useAuth } from '@/contexts/auth-context';
import { getApiBaseUrl } from '@/lib/api/endpoints';
import { getCurrentUser } from '@/lib/firebase/auth';

const elementarySubjects = [
  ['ARABIC', 'لغتي / اللغة العربية', 'Arabic Language'],
  ['ISLAMIC_STUDIES', 'الدراسات الإسلامية', 'Islamic Studies'],
  ['MATHEMATICS', 'الرياضيات', 'Mathematics'],
  ['SCIENCE', 'العلوم', 'Science'],
  ['ENGLISH', 'اللغة الإنجليزية', 'English'],
  ['SOCIAL_STUDIES', 'الدراسات الاجتماعية', 'Social Studies'],
  ['LIFE_SKILLS', 'المهارات الحياتية والأسرية', 'Life and Family Skills'],
  ['DIGITAL_SKILLS', 'المهارات الرقمية', 'Digital Skills'],
  ['PHYSICAL_EDUCATION', 'التربية البدنية والدفاع عن النفس', 'Physical Education'],
  ['ART_EDUCATION', 'التربية الفنية', 'Art Education'],
  ['ACTIVITY', 'النشاط', 'Activity'],
] as const;

function RegisterForm() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { signUp } = useAuth();
  const authConfigured = isAuthenticationConfigured();
  const isArabic = locale !== 'en';
  const requestedRole = searchParams.get('role');
  const initialRole = requestedRole === 'student' || requestedRole === 'teacher' ? requestedRole : 'parent';
  const [accountType, setAccountType] = useState<'parent' | 'student' | 'teacher'>(initialRole);

  useEffect(() => {
    setAccountType(initialRole);
  }, [initialRole]);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [teacherPhoto, setTeacherPhoto] = useState<File | null>(null);
  const [teacherArchiveCreated, setTeacherArchiveCreated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const copy = isArabic ? {
    unavailable: 'إنشاء الحساب غير متاح حاليًا. يُرجى التواصل مع إدارة المدرسة.',
    missingName: 'يرجى كتابة الاسم كاملاً', invalidEmail: 'يرجى إدخال بريد إلكتروني صحيح',
    shortPassword: 'كلمة المرور يجب ألا تقل عن 8 أحرف أو أرقام', mismatch: 'كلمات المرور غير متطابقة',
    createError: 'حدث خطأ أثناء إنشاء الحساب', parent: 'ولي أمر', student: 'طالب', teacher: 'معلم',
    titleParent: 'إنشاء حساب ولي أمر', titleStudent: 'إنشاء حساب طالب', titleTeacher: 'إنشاء حساب معلم',
    schoolYear: 'مدارس نكسس التعليمية الأهلية — العام الدراسي 1448هـ', subtitle: 'انضم إلى المنظومة المدرسية الشاملة مع معرف نظام موحد (Universal ID)',
    teacherNote: 'يلزم كود تسجيل المعلمين المعتمد من المدرسة. يمكنك تحديد فصول التدريس وفصل الريادة بعد الدخول إلى بوابة المعلم.',
    nameParent: 'اسم ولي الأمر الكامل *', nameStudent: 'اسم الطالب الكامل *', nameTeacher: 'اسم المعلم الكامل *',
    nameExParent: 'مثال: فيصل الغامدي', nameExStudent: 'مثال: أحمد فيصل الغامدي', nameExTeacher: 'مثال: محمد أحمد',
    email: 'البريد الإلكتروني *', phone: 'رقم الجوال *', password: 'كلمة المرور *', confirm: 'تأكيد كلمة المرور *',
    teacherCode: 'كود تسجيل المعلم *', nationalId: 'رقم الهوية الوطنية أو الإقامة *', specialization: 'التخصص أو المادة *',
    chooseSubject: 'اختر المادة التي تدرسها', photo: 'الصورة الشخصية للمعلم *', photoHint: 'JPG أو PNG أو WebP — حتى 512 كيلوبايت',
    teacherData: 'بيانات المعلم والتحقق', studentData: 'بيانات التسجيل', optionalClasses: 'تُضاف الفصول التي تدرسها وفصل الريادة من داخل بوابة المعلم بعد تسجيل الدخول.',
    createTeacher: 'إنشاء حساب المعلم وإرسال رابط التحقق', createAccount: 'إنشاء الحساب وإصدار المعرف الرسمي',
    already: 'لديك حساب بالفعل؟', login: 'تسجيل الدخول', signupUnavailable: 'إنشاء الحساب غير متاح حاليًا. يُرجى التواصل مع إدارة المدرسة.',
    exampleEmail: 'name@nexusedu.sa', codeUnavailable: 'خدمة التحقق من كود المعلم غير متاحة حاليًا.',
    invalidCode: 'كود تسجيل المعلم غير صحيح.', invalidId: 'أدخل رقم هوية أو إقامة مكوّنًا من 10 أرقام.', chooseSpecialty: 'اختر التخصص أو المادة.',
    invalidPhoto: 'اختر صورة JPG أو PNG أو WebP لا يتجاوز حجمها 512 كيلوبايت.', uploadPhoto: 'تعذر رفع الصورة. أعد المحاولة مع اتصال مستقر.',
  } : {
    unavailable: 'Account creation is currently unavailable. Please contact the school administration.',
    missingName: 'Enter your full name.', invalidEmail: 'Enter a valid email address.',
    shortPassword: 'Password must be at least 8 characters.', mismatch: 'Passwords do not match.',
    createError: 'An error occurred while creating your account.', parent: 'Parent', student: 'Student', teacher: 'Teacher',
    titleParent: 'Create a parent account', titleStudent: 'Create a student account', titleTeacher: 'Create a teacher account',
    schoolYear: 'Nexus Private Schools — Academic Year 1448 AH', subtitle: 'Join the school platform with one Universal ID.',
    teacherNote: 'A school-issued teacher registration code is required. Teaching classes and your homeroom class can be assigned from the teacher portal after sign-in.',
    nameParent: 'Parent full name *', nameStudent: 'Student full name *', nameTeacher: 'Teacher full name *',
    nameExParent: 'Example: Faisal Alghamdi', nameExStudent: 'Example: Ahmed Faisal Alghamdi', nameExTeacher: 'Example: Mohammed Ahmed',
    email: 'Email address *', phone: 'Mobile number *', password: 'Password *', confirm: 'Confirm password *',
    teacherCode: 'Teacher registration code *', nationalId: 'National ID or residency number *', specialization: 'Subject specialization *',
    chooseSubject: 'Choose the subject you teach', photo: 'Teacher profile photo *', photoHint: 'JPG, PNG, or WebP — up to 512 KB',
    teacherData: 'Teacher details and verification', studentData: 'Registration details', optionalClasses: 'Your teaching classes and homeroom class can be added in the teacher portal after sign-in.',
    createTeacher: 'Create teacher account and send verification link', createAccount: 'Create account and issue your official ID',
    already: 'Already have an account?', login: 'Sign in', signupUnavailable: 'Account creation is currently unavailable. Please contact the school administration.',
    exampleEmail: 'name@nexusedu.sa', codeUnavailable: 'Teacher-code verification is currently unavailable.',
    invalidCode: 'The teacher registration code is incorrect.', invalidId: 'Enter a 10-digit national ID or residency number.', chooseSpecialty: 'Choose a subject specialization.',
    invalidPhoto: 'Choose a JPG, PNG, or WebP image no larger than 512 KB.', uploadPhoto: 'The photo could not be uploaded. Retry with a stable connection.',
  };

  const title = accountType === 'student' ? copy.titleStudent : accountType === 'teacher' ? copy.titleTeacher : copy.titleParent;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!authConfigured) {
      setError(copy.unavailable);
      return;
    }

    const uploadTeacherPhoto = async () => {
      const user = getCurrentUser();
      const apiBaseUrl = getApiBaseUrl();
      if (!user || !apiBaseUrl || !teacherPhoto) throw new Error(copy.uploadPhoto);
      const idToken = await user.getIdToken();
      const formData = new FormData();
      formData.append('file', teacherPhoto);
      const response = await fetch(`${apiBaseUrl}/auth/teacher-registration/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
        body: formData,
      });
      if (!response.ok) throw new Error(copy.uploadPhoto);
    };

    if (!fullName.trim()) {
      setError(copy.missingName);
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError(copy.invalidEmail);
      return;
    }

    if (password.length < 8) {
      setError(copy.shortPassword);
      return;
    }

    if (password !== confirmPassword) {
      setError(copy.mismatch);
      return;
    }

    if (accountType === 'teacher') {
      if (!/^[12]\d{9}$/.test(nationalId.trim())) { setError(copy.invalidId); return; }
      if (!elementarySubjects.some(([key]) => key === specialization)) { setError(copy.chooseSpecialty); return; }
      if (!teacherCode.trim()) { setError(copy.invalidCode); return; }
      if (!teacherPhoto || !['image/jpeg', 'image/png', 'image/webp'].includes(teacherPhoto.type) || teacherPhoto.size > 512 * 1024) {
        setError(copy.invalidPhoto);
        return;
      }
    }

    setLoading(true);

    try {
      if (accountType === 'teacher' && !teacherArchiveCreated) {
        const apiBaseUrl = getApiBaseUrl();
        if (!apiBaseUrl) throw new Error(copy.codeUnavailable);
        const codeResponse = await fetch(`${apiBaseUrl}/auth/teacher-registration/verify-code`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: teacherCode.trim() }),
        });
        if (!codeResponse.ok) throw new Error(copy.codeUnavailable);
        const codeResult = await codeResponse.json();
        if (!codeResult.valid) throw new Error(copy.invalidCode);
        const subject = elementarySubjects.find(([key]) => key === specialization)?.[0];
        await signUp(email.trim().toLowerCase(), password, fullName.trim(), accountType, phone.trim(), {
          teacherCode: teacherCode.trim(),
          profile: { nationalId: nationalId.trim(), specialization: subject || '' },
        });
        setTeacherArchiveCreated(true);
      } else if (accountType !== 'teacher') {
        await signUp(email.trim().toLowerCase(), password, fullName.trim(), accountType, phone.trim());
      }
      if (accountType === 'teacher') {
        await uploadTeacherPhoto();
        router.push('/verify-email');
        return;
      }
      if (accountType === 'student') {
        router.push('/verify-email');
        return;
      }
      router.push('/student/new?flow=parent');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || copy.createError);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 dark:bg-[#0f1015]" dir={isArabic ? 'rtl' : 'ltr'}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[520px] my-auto">
        <div className="bg-white/90 dark:bg-[#1e1e2d]/90 backdrop-blur-2xl border border-gray-100 dark:border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo_new.webp" alt={copy.logoAlt} className="w-10 h-10 rounded-2xl shadow-sm object-cover" />
              <span className="font-black text-gray-900 dark:text-white text-base">Nexus EDU</span>
            </Link>
            <LanguageSwitcher />
          </div>

          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 text-xs font-bold mb-3">
              <Sparkles className="w-3 h-3" />
              <span>{copy.schoolYear}</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              {title}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {copy.subtitle}
            </p>
          </div>

          {/* Student, parent, and code-gated teacher registration */}
          <div className="grid grid-cols-3 gap-2 bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => setAccountType('parent')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                accountType === 'parent'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{copy.parent}</span>
            </button>
            <button
              type="button"
              onClick={() => setAccountType('student')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                accountType === 'student'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>{copy.student}</span>
            </button>
            <button
              type="button"
              onClick={() => setAccountType('teacher')}
              className={`flex min-w-0 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all ${
                accountType === 'teacher'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <BookOpen className="h-4 w-4 shrink-0" />
              <span>{copy.teacher}</span>
            </button>
          </div>

          {accountType === 'teacher' && (
            <div role="status" className="mb-4 flex items-start gap-2 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 font-semibold text-blue-900">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{copy.teacherNote}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!authConfigured && (
            <div role="status" className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{copy.signupUnavailable}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 block">
                {accountType === 'parent' ? copy.nameParent : accountType === 'teacher' ? copy.nameTeacher : copy.nameStudent}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5" />
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={
                    accountType === 'parent' ? copy.nameExParent : accountType === 'teacher' ? copy.nameExTeacher : copy.nameExStudent
                  }
                  className="w-full pr-10 pl-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 block">{copy.email}</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5" />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={copy.exampleEmail}
                    dir="ltr"
                    className="w-full pr-10 pl-3 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 block">{copy.phone}</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5" />
                  <input
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0501234567"
                    dir="ltr"
                    className="w-full pr-10 pl-3 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>
            </div>

            {accountType === 'teacher' && (
              <section className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-500/20 dark:bg-blue-500/5">
                <h2 className="text-sm font-black text-blue-950 dark:text-blue-100">{copy.teacherData}</h2>
                <div>
                  <label className="mb-1.5 block text-xs font-black text-gray-600 dark:text-gray-300">{copy.teacherCode}</label>
                  <input required value={teacherCode} onChange={(e) => setTeacherCode(e.target.value)} autoComplete="off" dir="ltr" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-black text-gray-600 dark:text-gray-300">{copy.nationalId}</label>
                  <input required inputMode="numeric" maxLength={10} value={nationalId} onChange={(e) => setNationalId(e.target.value.replace(/\D/g, '').slice(0, 10))} dir="ltr" placeholder="10 digits" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-black text-gray-600 dark:text-gray-300">{copy.specialization}</label>
                  <select required value={specialization} onChange={(e) => setSpecialization(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white">
                    <option value="">{copy.chooseSubject}</option>
                    {elementarySubjects.map(([key, ar, en]) => <option key={key} value={key}>{isArabic ? ar : en}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-black text-gray-600 dark:text-gray-300">{copy.photo}</label>
                  <div className="flex items-center gap-3 rounded-xl border border-dashed border-blue-200 bg-white p-3 dark:border-blue-400/20 dark:bg-white/5">
                    <ImagePlus className="h-5 w-5 shrink-0 text-blue-600" />
                    <input required={!teacherArchiveCreated} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setTeacherPhoto(e.target.files?.[0] ?? null)} className="min-w-0 w-full text-xs text-gray-600 file:me-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-bold file:text-blue-700 dark:text-gray-300" />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{copy.photoHint}</p>
                </div>
                <p className="text-[11px] leading-5 text-blue-800 dark:text-blue-200">{copy.optionalClasses}</p>
              </section>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 block">{copy.password}</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5" />
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-10 pl-3 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 block">{copy.confirm}</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5" />
                  <input
                    required
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-10 pl-3 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !authConfigured}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-black text-sm shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                ) : (
                  <>
                    <span>{accountType === 'teacher' ? copy.createTeacher : copy.createAccount}</span>
                    <ArrowLeft className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-gray-500">
            {copy.already}{' '}
            <Link href="/login" className="font-bold text-blue-600 hover:underline">
              {copy.login}
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function RegisterPage() {
  const locale = useLocale();
  return (
    <Suspense fallback={<div dir={locale === 'en' ? 'ltr' : 'rtl'} className="flex min-h-screen items-center justify-center text-sm text-gray-500">{locale === 'en' ? 'Loading registration…' : 'جارٍ تحميل صفحة التسجيل...'}</div>}>
      <RegisterForm />
    </Suspense>
  );
}
