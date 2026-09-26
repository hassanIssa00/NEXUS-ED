'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Phone, GraduationCap, Users, ShieldCheck, ArrowLeft, Check, Sparkles, AlertCircle } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';

const REAL_CLASS_STUDENTS = [
  { id: 'cls-std-1', fullName: 'إبراهيم فهد الدوسري', parentName: 'فهد الدوسري', parentPhone: '0501234561' },
  { id: 'cls-std-2', fullName: 'أحمد فيصل الغامدي', parentName: 'فيصل الغامدي', parentPhone: '0501234562' },
  { id: 'cls-std-3', fullName: 'تركي محمد الحربي', parentName: 'محمد الحربي', parentPhone: '0501234563' },
  { id: 'cls-std-4', fullName: 'ريان خالد الشمري', parentName: 'خالد الشمري', parentPhone: '0501234564' },
  { id: 'cls-std-5', fullName: 'سعود علي الشهراني', parentName: 'علي الشهراني', parentPhone: '0501234565' },
  { id: 'cls-std-6', fullName: 'عبد الرحمن سعد القحطاني', parentName: 'سعد القحطاني', parentPhone: '0501234566' },
  { id: 'cls-std-7', fullName: 'عمر سلطان العتيبي', parentName: 'سلطان العتيبي', parentPhone: '0501234567' },
  { id: 'cls-std-8', fullName: 'فهد مبارك الزهراني', parentName: 'مبارك الزهراني', parentPhone: '0501234568' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<'student' | 'parent'>('parent');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [childName, setChildName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Intelligent Child Matching for Parents
  const matchedStudent = useMemo(() => {
    if (accountType !== 'parent') return null;
    const cleanParent = fullName.trim().toLowerCase();
    const cleanPhone = phone.trim().replace(/\D/g, '');

    // Match by parent name or phone or child name
    return REAL_CLASS_STUDENTS.find(s => {
      const pMatch = cleanParent && s.parentName.toLowerCase().includes(cleanParent);
      const phMatch = cleanPhone && s.parentPhone.includes(cleanPhone);
      const cMatch = childName.trim() && s.fullName.includes(childName.trim());
      return pMatch || phMatch || cMatch;
    }) || null;
  }, [accountType, fullName, phone, childName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('يرجى كتابة الاسم كاملاً');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }

    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف أو أرقام على الأقل');
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      return;
    }

    setLoading(true);

    try {
      const { nexusBridge } = await import('@/lib/nexusDataBridge');

      const studentId = accountType === 'parent'
        ? (matchedStudent?.id || 'cls-std-2')
        : 'cls-std-2';

      const userAccount = {
        id: `acc_${accountType}_${Date.now()}`,
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role: accountType,
        linkedStudentId: studentId,
        schoolBranch: 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
        createdAt: new Date().toISOString(),
      };

      // Persist in localStorage session
      localStorage.setItem('nexus_user', JSON.stringify(userAccount));
      window.dispatchEvent(new CustomEvent('nexus:data-changed'));

      if (accountType === 'student') {
        router.push(`/student/new?flow=student&student=${studentId}`);
      } else {
        router.push(`/student/new?flow=parent&student=${studentId}`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'حدث خطأ أثناء إنشاء الحساب');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 dark:bg-[#0f1015]" dir="rtl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[500px] my-auto">
        <div className="bg-white/90 dark:bg-[#1e1e2d]/90 backdrop-blur-2xl border border-gray-100 dark:border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
          
          <div className="flex justify-between items-center mb-6">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo_new.webp" alt="Nexus EDU" className="w-10 h-10 rounded-2xl shadow-sm object-cover" />
              <span className="font-black text-gray-900 dark:text-white text-base">Nexus EDU</span>
            </Link>
            <LanguageSwitcher />
          </div>

          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 text-xs font-bold mb-3">
              <Sparkles className="w-3 h-3" />
              <span>فصل د. إسماعيل عيسى — 1448هـ</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">إنشاء حساب جديد</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">انضم إلى منظومة التعليم التفاعلي والتقييم المستمر</p>
          </div>

          {/* Role Tabs */}
          <div className="flex gap-2 bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl mb-6">
            <button type="button" onClick={() => setAccountType('parent')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all ${
                accountType === 'parent'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              <Users className="w-4 h-4" />
              <span>أنا ولي أمر</span>
            </button>
            <button type="button" onClick={() => setAccountType('student')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all ${
                accountType === 'student'
                  ? 'bg-teal-500 text-white shadow-md shadow-teal-500/30'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              <GraduationCap className="w-4 h-4" />
              <span>أنا طالب</span>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 block">
                {accountType === 'parent' ? 'اسم ولي الأمر الكامل *' : 'اسم الطالب الكامل *'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5" />
                <input required value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder={accountType === 'parent' ? 'مثال: فيصل الغامدي' : 'مثال: أحمد فيصل الغامدي'}
                  className="w-full pr-10 pl-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
            </div>

            {accountType === 'parent' && (
              <div>
                <label className="text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 block">اسم الطالب (الابن/الابنة)</label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5" />
                  <input value={childName} onChange={e => setChildName(e.target.value)}
                    placeholder="مثال: أحمد فيصل الغامدي"
                    className="w-full pr-10 pl-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                </div>
                {matchedStudent && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <Check className="w-4 h-4" />
                    <span>تم التعرف التلقائي على الطالب: {matchedStudent.fullName}</span>
                  </motion.div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 block">البريد الإلكتروني *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5" />
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="name@example.com" dir="ltr"
                    className="w-full pr-10 pl-3 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 block">رقم الجوال *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5" />
                  <input required value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="0501234567" dir="ltr"
                    className="w-full pr-10 pl-3 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 block">كلمة المرور *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5" />
                  <input required type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-10 pl-3 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 block">تأكيد كلمة المرور *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5" />
                  <input required type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-10 pl-3 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button type="submit" disabled={loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-black text-sm shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" /> : <><span>إنشاء الحساب ومتابعة الخطوة التالية</span><ArrowLeft className="w-4 h-4" /></>}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-gray-500">
            لديك حساب بالفعل؟{' '}
            <Link href="/login" className="font-bold text-blue-600 hover:underline">
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
