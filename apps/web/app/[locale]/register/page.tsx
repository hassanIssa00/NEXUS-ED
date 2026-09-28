'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Phone, GraduationCap, Users, ShieldCheck, ArrowLeft, Check, Sparkles, AlertCircle, BookOpen, School, Camera, Upload, Trash2 } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { nexusBridge, ClassStudentRecord } from '@/lib/nexusDataBridge';

export default function RegisterPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<'parent' | 'student' | 'teacher'>('parent');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [childName, setChildName] = useState('');
  const [specialization, setSpecialization] = useState('اللغة العربية والدراسات الإسلامية');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
    const [studentStage, setStudentStage] = useState<'kindergarten' | 'elementary' | 'middle' | 'high'>('elementary');
  const [regPhoto, setRegPhoto] = useState<string | null>(null);
const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [allStudents, setAllStudents] = useState<ClassStudentRecord[]>([]);

  useEffect(() => {
    setAllStudents(nexusBridge.getStudents());
  }, []);

  // Intelligent Child Matching for Parents using actual school roster
  const matchedStudent = useMemo(() => {
    if (accountType !== 'parent') return null;
    const cleanParent = fullName.trim().toLowerCase();
    const cleanPhone = phone.trim().replace(/\D/g, '');
    const cleanChild = childName.trim().toLowerCase();

    return (
      allStudents.find((s) => {
        const pMatch = cleanParent && s.parentName.toLowerCase().includes(cleanParent);
        const phMatch = cleanPhone && s.parentPhone.includes(cleanPhone);
        const cMatch = cleanChild && s.fullName.toLowerCase().includes(cleanChild);
        return pMatch || phMatch || cMatch;
      }) || null
    );
  }, [accountType, fullName, phone, childName, allStudents]);

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
      if (accountType === 'teacher') {
        const universalId = nexusBridge.generateUniversalId('TCH');
        const teacherAccId = `acc_teacher_${Date.now()}`;

        if (regPhoto) {
          localStorage.setItem('nexus_teacher_photo', regPhoto);
        }
        const teacherRecord = {
          id: teacherAccId,
          teacherId: universalId,
          universalId,
          name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          photoUrl: regPhoto || undefined,
          role: 'teacher' as const,
          title: `معلم ${specialization}`,
          specialization: specialization.trim(),
          nationalId: `10${Math.floor(10000000 + Math.random() * 90000000)}`,
          assignedClassIds: ['CLS-101'],
          assignedSubjectIds: ['SUB-ARB-1'],
          weeklyPeriodsCount: 15,
          status: 'active' as const,
          schoolName: 'مدارس نكسس التعليمية الأهلية',
          employeeId: `EMP-${universalId}`,
          department: specialization,
          hireDate: new Date().toISOString().slice(0, 10),
          createdAt: new Date().toISOString(),
        };

        nexusBridge.saveTeacher(teacherRecord);
        nexusBridge.saveAccount({
          id: teacherAccId,
          universalId,
          name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          role: 'teacher',
          title: `معلم ${specialization}`,
          employeeId: `EMP-${universalId}`,
          department: specialization,
          status: 'active',
          schoolName: 'مدارس نكسس التعليمية الأهلية',
          avatarUrl: regPhoto || undefined,
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem('nexus_user', JSON.stringify(teacherRecord));
        localStorage.setItem('access_token', `nexus_live_${teacherAccId}`);
        localStorage.setItem('nexus_role', 'teacher');
        window.dispatchEvent(new CustomEvent('nexus:data-changed'));

        router.push('/teacher');
      } else if (accountType === 'parent') {
        const universalId = nexusBridge.generateUniversalId('PRT');
        const studentId = matchedStudent?.id || '';
        const parentAccId = `acc_parent_${Date.now()}`;

        const parentAccount = {
          id: parentAccId,
          universalId,
          name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          role: 'parent' as const,
          title: matchedStudent ? `ولي أمر الطالب ${matchedStudent.fullName}` : `ولي أمر الطالب ${childName.trim() || fullName.trim()}`,
          linkedStudentId: studentId,
          linkedStudentIds: studentId ? [studentId] : [],
          schoolName: 'مدارس نكسس التعليمية الأهلية',
          createdAt: new Date().toISOString(),
        };

        nexusBridge.saveAccount(parentAccount);
        localStorage.setItem('nexus_user', JSON.stringify(parentAccount));
        localStorage.setItem('access_token', `nexus_live_${parentAccId}`);
        localStorage.setItem('nexus_role', 'parent');
        window.dispatchEvent(new CustomEvent('nexus:data-changed'));

        router.push('/parent');
      } else {
        // Student registration
        const universalId = nexusBridge.generateUniversalId('STD');
        const studentAccId = `acc_student_${Date.now()}`;
        const studentRecordId = `std_${Date.now()}`;
        const stageLabel = studentStage === 'kindergarten' ? 'الروضة' : studentStage === 'middle' ? 'المرحلة المتوسطة' : studentStage === 'high' ? 'المرحلة الثانوية' : 'المرحلة الابتدائية';

        localStorage.setItem('nexus_student_stage', studentStage);
        if (regPhoto) {
          localStorage.setItem('nexus_student_photo', regPhoto);
        }

        const studentRecord: ClassStudentRecord = {
          id: studentRecordId,
          universalId,
          fullName: fullName.trim(),
          fullNameEn: '',
          grade: stageLabel,
          classId: 'CLS-101',
          nationalId: `11${Math.floor(10000000 + Math.random() * 90000000)}`,
          dateOfBirth: '2016-01-01',
          parentName: '',
          parentPhone: phone.trim(),
          parentEmail: '',
          photoUrl: regPhoto || undefined,
          notes: 'طالب مسجل حديثاً',
          averageGrade: 100,
          attendanceRate: 100,
          rank: 1,
          assignedProgram: studentStage === 'kindergarten' ? 'مسار رياض الأطفال' : studentStage === 'high' ? 'مسار الثانوي التخصصي' : 'المسار العام',
          status: 'excellent',
          studentAccountId: studentAccId,
          parentAccountId: '',
        };

        const studentAccount = {
          id: studentAccId,
          universalId,
          name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          photoUrl: regPhoto || undefined,
          stage: studentStage,
          role: 'student' as const,
          linkedStudentId: studentRecordId,
          title: `طالب — ${stageLabel}`,
          schoolName: 'مدارس نكسس التعليمية الأهلية',
          createdAt: new Date().toISOString(),
        };

        nexusBridge.saveStudent(studentRecord);
        nexusBridge.saveAccount(studentAccount);
        localStorage.setItem('nexus_user', JSON.stringify(studentAccount));
        localStorage.setItem('access_token', `nexus_live_${studentAccId}`);
        localStorage.setItem('nexus_role', 'student');
        window.dispatchEvent(new CustomEvent('nexus:data-changed'));

        router.push('/student');
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'حدث خطأ أثناء إنشاء الحساب');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 dark:bg-[#0f1015]" dir="rtl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[520px] my-auto">
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
              <span>مدارس نكسس التعليمية الأهلية — العام الدراسي 1448هـ</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">تسجيل حساب رسمي بالنظام</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              انضم إلى المنظومة المدرسية الشاملة مع معرف نظام موحد (Universal ID)
            </p>
          </div>

          {/* 3 Role Tabs */}
          <div className="flex gap-2 bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl mb-6">
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
              <span>ولي أمر</span>
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
              <span>طالب</span>
            </button>
            <button
              type="button"
              onClick={() => setAccountType('teacher')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                accountType === 'teacher'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>معلم</span>
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
                {accountType === 'parent'
                  ? 'اسم ولي الأمر الكامل *'
                  : accountType === 'teacher'
                  ? 'اسم المعلم كاملاً مع اللقب *'
                  : 'اسم الطالب الكامل *'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5" />
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={
                    accountType === 'parent'
                      ? 'مثال: فيصل الغامدي'
                      : accountType === 'teacher'
                      ? 'مثال: أ. عبد العزيز الدوسري'
                      : 'مثال: أحمد فيصل الغامدي'
                  }
                  className="w-full pr-10 pl-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>

            {accountType === 'teacher' && (
              <div>
                <label className="text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 block">
                  التخصص التعليمي / المادة المسندة *
                </label>
                <div className="relative">
                  <BookOpen className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5" />
                  <input
                    required
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="مثال: الرياضيات والحساب الذهني / اللغة الإنجليزية"
                    className="w-full pr-10 pl-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>
            )}

                        {accountType === 'student' && (
              <div>
                <label className="text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 block">
                  المرحلة الدراسية للطالب *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'kindergarten', label: 'رياض الأطفال', emoji: '🧸' },
                    { id: 'elementary', label: 'المرحلة الابتدائية', emoji: '📚' },
                    { id: 'middle', label: 'المرحلة المتوسطة', emoji: '🔬' },
                    { id: 'high', label: 'المرحلة الثانوية', emoji: '🎓' },
                  ].map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => setStudentStage(s.id as any)}
                      className={`py-2.5 px-3 rounded-2xl text-xs font-black border transition-all flex items-center justify-center gap-1.5 ${
                        studentStage === s.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                          : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      <span>{s.emoji}</span>
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Optional Photo Upload */}
            {(accountType === 'student' || accountType === 'teacher') && (
              <div>
                <label className="text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 block">
                  الصورة الشخصية (اختياري — ستظل الخانة مخصصة لتضع صورتك لاحقاً)
                </label>
                <div className="flex items-center gap-3.5 p-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl">
                  <div className="w-14 h-14 rounded-2xl bg-gray-200 dark:bg-white/10 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 dark:border-white/20 flex-shrink-0 shadow-inner">
                    {regPhoto ? (
                      <img src={regPhoto} alt="Photo Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 transition-all shadow-sm">
                        <Upload className="w-3.5 h-3.5 text-blue-600" />
                        <span>{regPhoto ? 'تغيير الصورة' : 'اختر صورة من جهازك'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                alert('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 5 ميجابايت.');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                if (typeof ev.target?.result === 'string') {
                                  setRegPhoto(ev.target.result);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {regPhoto && (
                        <button
                          type="button"
                          onClick={() => setRegPhoto(null)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/30 hover:bg-red-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>إلغاء</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      ستظهر صورتك في الكارد الشخصي بعد الدخول، أو يمكنك إضافتها لاحقاً بنقرة زر.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {accountType === 'parent' && (
              <div>
                <label className="text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 block">
                  اسم الطالب (الابن/الابنة بالمدرسة)
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5" />
                  <input
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    placeholder="مثال: أحمد فيصل الغامدي"
                    className="w-full pr-10 pl-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                {matchedStudent && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400"
                  >
                    <Check className="w-4 h-4" />
                    <span>تم التعرف التلقائي على الطالب: {matchedStudent.fullName} ({matchedStudent.grade})</span>
                  </motion.div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 block">البريد الإلكتروني *</label>
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
                <label className="text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 block">رقم الجوال *</label>
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 block">كلمة المرور *</label>
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
                <label className="text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 block">تأكيد كلمة المرور *</label>
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
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-black text-sm shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                ) : (
                  <>
                    <span>إنشاء الحساب وإصدار المعرف الرسمي</span>
                    <ArrowLeft className="w-4 h-4" />
                  </>
                )}
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
