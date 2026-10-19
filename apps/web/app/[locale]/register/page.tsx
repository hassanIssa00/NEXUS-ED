'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Phone, GraduationCap, Users, BookOpen, ArrowLeft, Sparkles, AlertCircle, KeyRound } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { isAuthenticationConfigured, useAuth } from '@/contexts/auth-context';

const registrationCopy = {
  ar: {
    unavailable: 'إنشاء الحساب غير متاح حاليًا. يُرجى التواصل مع إدارة المدرسة.',
    fullNameRequired: 'يرجى كتابة الاسم كاملاً',
    emailRequired: 'يرجى إدخال بريد إلكتروني صحيح',
    passwordShort: 'كلمة المرور يجب ألا تقل عن 8 أحرف أو أرقام',
    passwordMismatch: 'كلمات المرور غير متطابقة',
    teacherCodeRequired: 'أدخل كود المدرس المعتمد من إدارة المدرسة.',
    submitError: 'حدث خطأ أثناء إنشاء الحساب',
    logoAlt: 'نكسس التعليمية',
    academicYear: 'مدارس نكسس التعليمية الأهلية — العام الدراسي 1448هـ',
    title: (role: string) => role === 'student' ? 'إنشاء حساب طالب' : role === 'teacher' ? 'إنشاء حساب معلم' : 'إنشاء حساب ولي أمر',
    subtitle: 'انضم إلى المنظومة المدرسية الشاملة مع معرف نظام موحد (Universal ID)',
    parent: 'ولي أمر', student: 'طالب', teacher: 'معلم',
    parentName: 'اسم ولي الأمر الكامل *', studentName: 'اسم الطالب الكامل *', teacherName: 'اسم المعلم الكامل *',
    parentPlaceholder: 'مثال: فيصل الغامدي', studentPlaceholder: 'مثال: أحمد فيصل الغامدي', teacherPlaceholder: 'مثال: محمد أحمد',
    email: 'البريد الإلكتروني *', phone: 'رقم الجوال *',
    teacherCode: 'كود المدرس *', teacherCodePlaceholder: 'أدخل كود التسجيل من إدارة المدرسة', teacherCodeHint: 'هذا الكود مطلوب لإنشاء حساب مدرس.',
    password: 'كلمة المرور *', confirmPassword: 'تأكيد كلمة المرور *',
    createTeacher: 'إنشاء حساب المعلم', createAccount: 'إنشاء الحساب وإصدار المعرف الرسمي',
    already: 'لديك حساب بالفعل؟', login: 'تسجيل الدخول',
    loading: 'جارٍ تحميل صفحة التسجيل...',
  },
  en: {
    unavailable: 'Account creation is currently unavailable. Please contact the school administration.',
    fullNameRequired: 'Enter your full name.',
    emailRequired: 'Enter a valid email address.',
    passwordShort: 'Password must contain at least 8 characters.',
    passwordMismatch: 'Passwords do not match.',
    teacherCodeRequired: 'Enter the teacher registration code provided by the school.',
    submitError: 'There was a problem creating your account.',
    logoAlt: 'Nexus EDU',
    academicYear: 'Nexus EDU Private Schools — Academic Year 1448 AH',
    title: (role: string) => role === 'student' ? 'Create a student account' : role === 'teacher' ? 'Create a teacher account' : 'Create a parent account',
    subtitle: 'Join the school platform with one unified account.',
    parent: 'Parent', student: 'Student', teacher: 'Teacher',
    parentName: 'Parent full name *', studentName: 'Student full name *', teacherName: 'Teacher full name *',
    parentPlaceholder: 'e.g. Faisal Alghamdi', studentPlaceholder: 'e.g. Ahmed Faisal Alghamdi', teacherPlaceholder: 'e.g. Mohamed Ahmed',
    email: 'Email address *', phone: 'Mobile number *',
    teacherCode: 'Teacher registration code *', teacherCodePlaceholder: 'Enter the code from your school', teacherCodeHint: 'A valid school code is required to register as a teacher.',
    password: 'Password *', confirmPassword: 'Confirm password *',
    createTeacher: 'Create teacher account', createAccount: 'Create account and issue your ID',
    already: 'Already have an account?', login: 'Sign in',
    loading: 'Loading registration...',
  },
} as const;

function RegisterForm() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { signUp } = useAuth();
  const authConfigured = isAuthenticationConfigured();
  const isEnglish = locale === 'en';
  const copy = registrationCopy[isEnglish ? 'en' : 'ar'];
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!authConfigured) {
      setError(copy.unavailable);
      return;
    }

    if (!fullName.trim()) {
      setError(copy.fullNameRequired);
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError(copy.emailRequired);
      return;
    }

    if (password.length < 8) {
      setError(copy.passwordShort);
      return;
    }

    if (password !== confirmPassword) {
      setError(copy.passwordMismatch);
      return;
    }

    if (accountType === 'teacher' && !teacherCode.trim()) {
      setError(copy.teacherCodeRequired);
      return;
    }

    setLoading(true);

    try {
      await signUp(email.trim().toLowerCase(), password, fullName.trim(), accountType, phone.trim(), teacherCode.trim());
      if (accountType === 'teacher') {
        router.push('/teacher/onboarding');
        return;
      }
      const flow = accountType === 'student' ? 'student' : 'parent';
      router.push(`/student/new?flow=${flow}`);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || copy.submitError);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 dark:bg-[#0f1015]" dir={isEnglish ? 'ltr' : 'rtl'}>
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
              <span>{copy.academicYear}</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              {copy.title(accountType)}
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

          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!authConfigured && (
            <div role="status" className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{copy.unavailable}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 block">
                {accountType === 'parent'
                  ? copy.parentName
                  : accountType === 'teacher' ? copy.teacherName : copy.studentName}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5" />
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={
                    accountType === 'parent'
                      ? copy.parentPlaceholder
                      : accountType === 'teacher' ? copy.teacherPlaceholder : copy.studentPlaceholder
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
                    placeholder="name@nexusedu.sa"
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
              <div>
                <label htmlFor="teacher-registration-code" className="mb-1.5 block text-xs font-black text-gray-600 dark:text-gray-300">{copy.teacherCode}</label>
                <div className="relative">
                  <KeyRound className="absolute right-3.5 top-3.5 h-4 w-4 text-gray-400" />
                  <input
                    id="teacher-registration-code"
                    required
                    value={teacherCode}
                    onChange={(event) => setTeacherCode(event.target.value)}
                    placeholder={copy.teacherCodePlaceholder}
                    autoCapitalize="characters"
                    autoComplete="one-time-code"
                    spellCheck={false}
                    maxLength={64}
                    dir="ltr"
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-4 pr-10 text-sm font-bold uppercase tracking-wider text-gray-900 placeholder:text-right placeholder:text-xs placeholder:font-medium placeholder:normal-case placeholder:tracking-normal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-gray-500">{copy.teacherCodeHint}</p>
              </div>
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
                <label className="text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 block">{copy.confirmPassword}</label>
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
                    <ArrowLeft className={`w-4 h-4 ${isEnglish ? 'rotate-180' : ''}`} />
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
  const isEnglish = locale === 'en';
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-gray-500" dir={isEnglish ? 'ltr' : 'rtl'}>{registrationCopy[isEnglish ? 'en' : 'ar'].loading}</div>}>
      <RegisterForm />
    </Suspense>
  );
}
