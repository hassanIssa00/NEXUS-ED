'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth, type UserRole } from '@/contexts/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { motion } from 'framer-motion';
import { User, Mail, Lock, GraduationCap, BookOpen, Users, ShieldCheck, Briefcase, ArrowRight } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';

const roles = [
    { value: 'student', label: 'طالب', icon: GraduationCap, desc: 'للطلاب المسجلين' },
    { value: 'teacher', label: 'مدرس', icon: BookOpen, desc: 'للمعلمين' },
    { value: 'manager', label: 'مدير', icon: Briefcase, desc: 'لمدراء المدارس' },
    { value: 'admin', label: 'إداري', icon: ShieldCheck, desc: 'للموظفين' },
    { value: 'parent', label: 'ولي أمر', icon: Users, desc: 'لأولياء الأمور' },
] as const;

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'student' as UserRole,
    });
    const [loading, setLoading] = useState(false);
    const [agreeTerms, setAgreeTerms] = useState(false);
    const { signUp } = useAuth();
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast({
                variant: 'destructive',
                title: '❌ خطأ',
                description: 'كلمات المرور غير متطابقة',
            });
            return;
        }

        if (formData.password.length < 6) {
            toast({
                variant: 'destructive',
                title: '❌ خطأ',
                description: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
            });
            return;
        }

        if (!agreeTerms) {
            toast({
                variant: 'destructive',
                title: '❌ تنبيه',
                description: 'يرجى الموافقة على الشروط أولاً',
            });
            return;
        }

        setLoading(true);

        try {
            await signUp(
                formData.email,
                formData.password,
                formData.fullName,
                formData.role
            );

            toast({
                title: '✅ تم إنشاء الحساب بنجاح',
                description: 'مرحباً بك في منصة Nexus EDU',
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: '❌ خطأ في إنشاء الحساب',
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex hero-section overflow-hidden force-light" dir="rtl">
            <div className="hero-overlay"></div>

            {/* Centered Form */}
            <div className="w-full flex items-center justify-center p-4 relative z-10 overflow-y-auto min-h-screen">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="w-full max-w-[460px] my-auto"
                >
                    {/* Card */}
                    <div className="hero-card p-8 shadow-2xl">
                        {/* Language Switcher */}
                        <div className="flex justify-end mb-6">
                            <LanguageSwitcher />
                        </div>

                        {/* Logo + Header */}
                        <div className="text-center mb-8">
                            <div className="flex justify-center mb-4">
                                <img src="/logo_new.webp" alt="Nexus EDU" className="w-14 h-14 rounded-[14px] shadow-sm object-cover" />
                            </div>
                            <h1 className="hero-title text-3xl mb-2">
                                إنشاء <span>حساب جديد</span>
                            </h1>
                            <p className="hero-description text-sm">
                                انضم لمنظومة Nexus التعليمية اليوم واكتشف مستقبل التعليم
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Full Name */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">الاسم الكامل</label>
                                <div className="relative">
                                    <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        required
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        placeholder="أحمد علي"
                                        className="w-full h-12 pr-12 pl-4 rounded-xl text-slate-900 border border-slate-200 bg-white shadow-sm outline-none transition-all placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">البريد الإلكتروني</label>
                                <div className="relative">
                                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="ahmed@example.com"
                                        className="w-full h-12 pr-12 pl-4 rounded-xl text-slate-900 border border-slate-200 bg-white shadow-sm outline-none transition-all placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Password */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">كلمة المرور</label>
                                    <div className="relative">
                                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="password"
                                            required
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            placeholder="••••••••"
                                            className="w-full h-12 pr-10 pl-3 rounded-xl text-slate-900 border border-slate-200 bg-white shadow-sm outline-none transition-all placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        />
                                    </div>
                                </div>

                                {/* Confirm Password */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">تأكيد المرور</label>
                                    <div className="relative">
                                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="password"
                                            required
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            placeholder="••••••••"
                                            className="w-full h-12 pr-10 pl-3 rounded-xl text-slate-900 border border-slate-200 bg-white shadow-sm outline-none transition-all placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Role Selection */}
                            <div className="space-y-3 pt-2">
                                <label className="text-sm font-semibold text-slate-700">نوع الحساب</label>
                                <div className="grid grid-cols-3 gap-3 mb-2">
                                    {roles.slice(0, 3).map((role) => {
                                        const Icon = role.icon;
                                        const isSelected = formData.role === role.value;
                                        return (
                                            <label
                                                key={role.value}
                                                className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                                    isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="role"
                                                    value={role.value}
                                                    checked={isSelected}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, role: e.target.value as any })
                                                    }
                                                    className="sr-only"
                                                />
                                                <Icon
                                                    className={`w-6 h-6 ${isSelected ? 'text-primary' : 'text-slate-400'}`}
                                                />
                                                <div className="text-center">
                                                    <span className={`block text-xs font-bold leading-none mb-1 ${isSelected ? 'text-primary' : 'text-slate-700'}`}>
                                                        {role.label}
                                                    </span>
                                                    <span className={`block text-[10px] leading-tight ${isSelected ? 'text-primary/80' : 'text-slate-400'}`}>
                                                        {role.desc}
                                                    </span>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {roles.slice(3).map((role) => {
                                        const Icon = role.icon;
                                        const isSelected = formData.role === role.value;
                                        return (
                                            <label
                                                key={role.value}
                                                className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                                    isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="role"
                                                    value={role.value}
                                                    checked={isSelected}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, role: e.target.value as any })
                                                    }
                                                    className="sr-only"
                                                />
                                                <Icon
                                                    className={`w-6 h-6 ${isSelected ? 'text-primary' : 'text-slate-400'}`}
                                                />
                                                <div className="text-center">
                                                    <span className={`block text-xs font-bold leading-none mb-1 ${isSelected ? 'text-primary' : 'text-slate-700'}`}>
                                                        {role.label}
                                                    </span>
                                                    <span className={`block text-[10px] leading-tight ${isSelected ? 'text-primary/80' : 'text-slate-400'}`}>
                                                        {role.desc}
                                                    </span>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Terms */}
                            <div className="flex items-start gap-3 pt-4">
                                <input
                                    id="terms"
                                    type="checkbox"
                                    required
                                    checked={agreeTerms}
                                    onChange={(e) => setAgreeTerms(e.target.checked)}
                                    className="h-5 w-5 mt-0.5 rounded border-slate-300 text-primary focus:ring-primary accent-primary"
                                />
                                <label htmlFor="terms" className="text-sm text-slate-600 leading-relaxed">
                                    قرأت وأوافق على{' '}
                                    <Link href="/terms" className="text-primary hover:text-primary/80 font-semibold transition-colors">
                                        شروط الخدمة
                                    </Link>{' '}
                                    و{' '}
                                    <Link href="/privacy" className="text-primary hover:text-primary/80 font-semibold transition-colors">
                                        سياسة الخصوصية
                                    </Link>
                                    {' '}الخاصة بمنصة نِكْسُس.
                                </label>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-14 rounded-xl primary-btn flex items-center justify-center gap-2 mt-2 hover:opacity-90 hover:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {loading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب جديد'}
                                {!loading && <ArrowRight className="w-5 h-5 auto-rtl" />}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="my-6 border-t border-slate-200"></div>

                        {/* Sign in link */}
                        <p className="text-center text-sm text-slate-500">
                            لديك حساب بالفعل؟{' '}
                            <Link
                                href="/login"
                                className="font-bold text-primary hover:text-primary/80 transition-colors"
                            >
                                تسجيل الدخول من هنا
                            </Link>
                        </p>
                    </div>
                </motion.div>
            </div>

            <Toaster />
        </div>
    );
}
