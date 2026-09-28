'use client';

import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface LoginCardProps {
    onSubmit?: (email: string, password: string) => Promise<void>;
    isLoading?: boolean;
}

export default function LoginCard({ onSubmit, isLoading = false }: LoginCardProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

    const validate = () => {
        const newErrors: { email?: string; password?: string } = {};

        if (!email) {
            newErrors.email = 'البريد الإلكتروني مطلوب';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = 'البريد الإلكتروني غير صحيح';
        }

        if (!password) {
            newErrors.password = 'كلمة المرور مطلوبة';
        } else if (password.length < 6) {
            newErrors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            await onSubmit?.(email, password);
        } catch (error) {
            console.error('Login error:', error);
        }
    };

    return (
        <div className="w-full max-w-md animate-slide-up">
            {/* Card Container - Now with proper contrast */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-200 dark:border-slate-700">
                {/* Header */}
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-2">
                        مرحباً بك
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400">
                        سجل الدخول للمتابعة
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Email Input - Fixed contrast */}
                    <div>
                        <label
                            htmlFor="email"
                            className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2"
                        >
                            البريد الإلكتروني
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                            </div>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="student@nexus.edu.sa"
                                className={`
                  block w-full pr-10 px-4 py-3 rounded-lg
                  bg-slate-50 dark:bg-slate-900
                  text-slate-900 dark:text-slate-100
                  border ${errors.email ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}
                  placeholder-slate-400 dark:placeholder-slate-500
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                  transition-all duration-200
                `}
                                aria-invalid={!!errors.email}
                                aria-describedby={errors.email ? 'email-error' : undefined}
                            />
                        </div>
                        {errors.email && (
                            <p
                                id="email-error"
                                className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
                            >
                                <AlertCircle className="h-4 w-4" />
                                {errors.email}
                            </p>
                        )}
                    </div>

                    {/* Password Input - Fixed contrast */}
                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2"
                        >
                            كلمة المرور
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                            </div>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className={`
                  block w-full pr-10 pl-10 px-4 py-3 rounded-lg
                  bg-slate-50 dark:bg-slate-900
                  text-slate-900 dark:text-slate-100
                  border ${errors.password ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}
                  placeholder-slate-400 dark:placeholder-slate-500
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                  transition-all duration-200
                `}
                                aria-invalid={!!errors.password}
                                aria-describedby={errors.password ? 'password-error' : undefined}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                        {errors.password && (
                            <p
                                id="password-error"
                                className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
                            >
                                <AlertCircle className="h-4 w-4" />
                                {errors.password}
                            </p>
                        )}
                    </div>

                    {/* Remember & Forgot */}
                    <div className="flex items-center justify-between">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                className="rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="mr-2 text-sm text-slate-600 dark:text-slate-400">تذكرني</span>
                        </label>
                        <a href="#" className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">
                            نسيت كلمة المرور؟
                        </a>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="
              w-full py-3 px-4 rounded-lg
              bg-gradient-to-r from-primary-600 to-primary-500
              text-white font-semibold
              hover:from-primary-700 hover:to-primary-600
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
              shadow-lg hover:shadow-xl
            "
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                جاري تسجيل الدخول...
                            </span>
                        ) : (
                            'تسجيل الدخول'
                        )}
                    </button>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-300 dark:border-slate-600" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                أو
                            </span>
                        </div>
                    </div>

                    {/* Sign Up Link */}
                    <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                        ليس لديك حساب؟{' '}
                        <a href="/signup" className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">
                            سجل الآن
                        </a>
                    </p>
                </form>
            </div>
        </div>
    );
}
