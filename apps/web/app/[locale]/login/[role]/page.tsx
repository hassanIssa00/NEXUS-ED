'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Mail, Lock, AlertCircle, Shield, GraduationCap, BookOpen, Users, UserCheck, Eye, Settings, CreditCard, Sparkles, CheckCircle, Fingerprint } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

const roleMapping: Record<string, { label: string; color: string; emailPrefix: string; gradient: string; icon: any; features: string[]; welcomeEmoji: string; bgImage: string }> = {
    student: { label: 'طالب', color: '#00D1B2', emailPrefix: 'student', gradient: 'from-teal-900/80 via-emerald-900/80 to-cyan-900/80', icon: GraduationCap, features: ['تتبع الدرجات والواجبات', 'تعلم ذكي بالـ AI', 'ترتيبك في لوحة المتصدرين'], welcomeEmoji: '🎓', bgImage: '/images/auth/student.webp' },
    teacher: { label: 'معلم', color: '#3B82F6', emailPrefix: 'teacher', gradient: 'from-blue-900/80 via-indigo-900/80 to-blue-950/80', icon: BookOpen, features: ['أتمتة التحضير والرصد', 'تحليل أداء الطلاب', 'أدوات تعليمية متقدمة'], welcomeEmoji: '📚', bgImage: '/images/auth/teacher.webp' },
    parent: { label: 'ولي أمر', color: '#F59E0B', emailPrefix: 'parent', gradient: 'from-amber-900/80 via-orange-900/80 to-amber-950/80', icon: Users, features: ['متابعة تقدم الأبناء', 'تقارير فورية ودقيقة', 'تواصل مباشر مع المدرسة'], welcomeEmoji: '👨‍👩‍👧', bgImage: '/images/auth/parent.webp' },
    principal: { label: 'مدير المدرسة', color: '#8B5CF6', emailPrefix: 'principal', gradient: 'from-purple-900/80 via-violet-900/80 to-purple-950/80', icon: Shield, features: ['لوحة قيادة شاملة', 'تقارير أداء المعلمين', 'إحصائيات المدرسة الكاملة'], welcomeEmoji: '🏫', bgImage: '/images/auth/principal.webp' },
    vice_principal: { label: 'الوكيل', color: '#EC4899', emailPrefix: 'vp', gradient: 'from-pink-900/80 via-rose-900/80 to-pink-950/80', icon: UserCheck, features: ['متابعة الحضور اليومي', 'شئون الطلاب', 'التقارير السلوكية'], welcomeEmoji: '📋', bgImage: '/images/auth/vice_principal.webp' },
    counselor: { label: 'الموجه الطلابي', color: '#14B8A6', emailPrefix: 'counselor', gradient: 'from-teal-900/80 via-cyan-900/80 to-teal-950/80', icon: Eye, features: ['متابعة الحالات النفسية', 'خطط الإرشاد الطلابي', 'تحليلات الرفاهية'], welcomeEmoji: '🤝', bgImage: '/images/auth/counselor.webp' },
    supervisor: { label: 'المشرف التربوي', color: '#6366F1', emailPrefix: 'supervisor', gradient: 'from-indigo-900/80 via-violet-900/80 to-indigo-950/80', icon: Eye, features: ['الزيارات الإشرافية', 'تقييم أداء المعلمين', 'خطط التحسين والتطوير'], welcomeEmoji: '👁️', bgImage: '/images/auth/supervisor.webp' },
    admin: { label: 'الشئون الإدارية والمالية', color: '#F43F5E', emailPrefix: 'admin', gradient: 'from-rose-900/80 via-red-900/80 to-rose-950/80', icon: Settings, features: ['إدارة الحسابات المالية', 'شئون الموظفين', 'التقارير الإدارية'], welcomeEmoji: '💼', bgImage: '/images/auth/admin.webp' },
};

export default function RoleLoginPage() {
    const params = useParams();
    const role = (params?.role as string) || '';
    const roleConfig = roleMapping[role];
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    
    const { signIn } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const t = useTranslations('auth.login');
    const tAuth = useTranslations('auth');
    const locale = useLocale();

    if (!roleConfig) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center glass-ultra p-10"
                >
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold mb-4">الصفحة أو البوابة غير صالحة</h1>
                    <Link href={`/${locale}/login`} className="text-primary hover:underline font-semibold">العودة لصفحة البوابات</Link>
                </motion.div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await signIn(email, password);
            toast({ title: '✅ تم بنجاح', description: 'مرحباً بك في بوابتك الأمنية' });
            
            if(role === 'teacher') router.push(`/${locale}/teacher`);
            else if(role === 'principal') router.push(`/${locale}/principal`);
            else if(role === 'vice_principal') router.push(`/${locale}/vice_principal`);
            else if(role === 'counselor') router.push(`/${locale}/counselor`);
            else if(role === 'admin') router.push(`/${locale}/admin`);
            else if(role === 'supervisor') router.push(`/${locale}/supervisor`);
            else if(role === 'parent') router.push(`/${locale}/parent`);
            else router.push(`/${locale}/student`);
        } catch (error: any) {
            toast({ variant: 'destructive', title: '❌ خطأ', description: tAuth('loginFailed') });
        } finally {
            setLoading(false);
        }
    };

    const fillDemo = () => {
        // These must match the emails created by prisma/seed.ts
        const demoEmails: Record<string, string> = {
            teacher:        'arabic.teacher@nexusedu.sa',
            student:        'student1@nexusedu.sa',
            parent:         'parent1@nexusedu.sa',
            principal:      'principal@nexusedu.sa',
            vice_principal: 'vice.principal@nexusedu.sa',
            counselor:      'counselor@nexusedu.sa',
            supervisor:     'supervisor@nexusedu.sa',
            admin:          'admin@nexusedu.sa',
        };
        setEmail(demoEmails[role] || `${roleConfig.emailPrefix}@nexusedu.sa`);
        setPassword('123456'); // Password set in seed.ts
    };

    const RoleIcon = roleConfig.icon;

    return (
        <div className="min-h-screen w-full flex force-light" dir="rtl">
            
            {/* ═══════════ LEFT: Themed Side Panel ═══════════ */}
            <motion.div 
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 150, damping: 20 }}
                className={`hidden lg:flex lg:w-[45%] bg-slate-900 relative overflow-hidden flex-col justify-between p-12`}
            >
                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                    <img src={roleConfig.bgImage} alt="" className="w-full h-full object-cover opacity-60 mix-blend-overlay" />
                    <div className={`absolute inset-0 bg-gradient-to-br ${roleConfig.gradient} mix-blend-multiply`}></div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute inset-0 pointer-events-none z-0">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 animate-float-slow morph-blob"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-black/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 animate-float-delay morph-blob" style={{ animationDelay: '3s' }}></div>
                    
                    {/* Orbiting rings */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border border-white/10 animate-spin-slow"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full border border-white/5 animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '30s' }}></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/[0.03] animate-spin-slow" style={{ animationDuration: '40s' }}></div>
                    
                    {/* Dots Grid Pattern */}
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
                    
                    {/* Floating particles */}
                    <div className="particles-container">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="absolute rounded-full bg-white/20 animate-float" 
                                 style={{ 
                                     width: `${3 + Math.random() * 5}px`, 
                                     height: `${3 + Math.random() * 5}px`,
                                     left: `${10 + i * 15}%`,
                                     top: `${20 + i * 10}%`,
                                     animationDelay: `${i * 0.8}s`,
                                     animationDuration: `${4 + i}s`
                                 }} 
                            />
                        ))}
                    </div>
                </div>

                {/* Top: Logo */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="relative z-10"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                            <img src="/logo_new.webp" alt="Nexus EDU" className="w-12 h-12 rounded-2xl object-cover shadow-lg border-2 border-white/20" />
                            <img src="/second_logo.webp" alt="Partner Logo" className="w-12 h-12 rounded-2xl object-cover shadow-lg border-2 border-white/20 bg-white" />
                        </div>
                        <div>
                            <span className="text-2xl font-bold text-white">نِكْسُس</span>
                            <span className="block text-[10px] font-bold tracking-[0.2em] text-white/60 uppercase">NEXUS EDU</span>
                        </div>
                    </div>
                </motion.div>

                {/* Center: Role Info */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, type: 'spring', stiffness: 150 }}
                    className="relative z-10"
                >
                    <motion.div 
                        animate={{ y: [0, -8, 0], rotate: [-1, 1, -1] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                        className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-md flex items-center justify-center mb-8 border border-white/20"
                    >
                        <RoleIcon className="w-10 h-10 text-white" />
                    </motion.div>
                    <h2 className="text-4xl font-black text-white mb-4 leading-tight">
                        بوابة<br/>{roleConfig.label}
                    </h2>
                    <p className="text-white/70 text-lg mb-10 max-w-sm leading-relaxed">
                        سجل الدخول للوصول لجميع أدوات ومميزات بوابتك في منصة نِكْسُس التعليمية
                    </p>

                    {/* Features List with stagger */}
                    <div className="space-y-4">
                        {roleConfig.features.map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: 25 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.7 + i * 0.15, type: 'spring', stiffness: 200 }}
                                className="flex items-center gap-3 group"
                            >
                                <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0 group-hover:bg-white/25 transition-colors">
                                    <CheckCircle className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-white/90 font-medium">{feature}</span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Bottom: Security Badge */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    className="relative z-10 flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/10"
                >
                    <Fingerprint className="w-5 h-5 text-white/80" />
                    <span className="text-white/70 text-sm font-medium">محمية بتشفير SSL 256-bit • مطابقة لمعايير PDPL</span>
                </motion.div>
            </motion.div>

            {/* ═══════════ RIGHT: Login Form ═══════════ */}
            <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-slate-50 relative overflow-hidden">
                {/* Mesh gradient background */}
                <div className="absolute inset-0 mesh-gradient opacity-40 pointer-events-none"></div>
                {/* Subtle dots */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
                    className="w-full max-w-[440px] relative z-10"
                >
                    {/* Back Button */}
                    <div className="mb-8 flex">
                        <Link href={`/${locale}/login`} className="inline-flex items-center gap-2 text-[14px] font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer group bg-white px-5 py-2.5 rounded-full border border-slate-200 shadow-sm hover:shadow-md magnetic-btn">
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                            العودة للبوابات
                        </Link>
                    </div>

                    {/* Login Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, type: 'spring', stiffness: 180 }}
                        className="bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-slate-100 relative overflow-hidden shine-card"
                    >
                        {/* Role Color Accent Bar with animation */}
                        <motion.div 
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ delay: 0.6, duration: 0.5 }}
                            className="absolute top-0 left-0 right-0 h-1.5 origin-right" 
                            style={{ background: `linear-gradient(90deg, ${roleConfig.color}, ${roleConfig.color}88)` }}
                        />

                        {/* Mobile Role Icon */}
                        <div className="lg:hidden flex justify-center mb-6">
                            <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 300, delay: 0.3 }}
                                className="w-16 h-16 rounded-2xl flex items-center justify-center" 
                                style={{ backgroundColor: `${roleConfig.color}15` }}
                            >
                                <RoleIcon className="w-8 h-8" style={{ color: roleConfig.color }} />
                            </motion.div>
                        </div>

                        <div className="text-center mb-8">
                            <motion.h1 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-[26px] font-black text-slate-900 mb-2"
                            >
                                تسجيل دخول <span style={{ color: roleConfig.color }}>{roleConfig.label}</span>
                            </motion.h1>
                            <p className="text-[14px] text-slate-500 font-medium">أدخل بيانات الاعتماد الخاصة بك للوصول لمنصتك</p>
                        </div>

                        {/* Demo Autofill */}
                        <motion.button 
                            type="button" 
                            onClick={fillDemo} 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full py-[10px] mb-6 border-2 border-dashed rounded-2xl text-sm font-bold transition-all bg-slate-50 border-slate-300 text-slate-500 hover:bg-slate-100 hover:border-slate-400 hover:text-slate-700"
                        >
                            🧪 تعبئة بيانات تجريبية (Demo)
                        </motion.button>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Email */}
                            <motion.div 
                                className="space-y-2"
                                animate={{ scale: focusedField === 'email' ? 1.01 : 1 }}
                                transition={{ type: 'spring', stiffness: 300 }}
                            >
                                <label className="text-[14px] font-bold text-slate-700">البريد الإلكتروني</label>
                                <div className="relative">
                                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] transition-colors" style={{ color: focusedField === 'email' ? roleConfig.color : `${roleConfig.color}80` }} />
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required 
                                           placeholder={`example@nexus.edu`}
                                           onFocus={() => setFocusedField('email')}
                                           onBlur={() => setFocusedField(null)}
                                           className="w-full h-[52px] pr-12 pl-4 rounded-2xl text-slate-900 text-[15px] outline-none transition-all duration-200 focus:ring-2 border-2 border-slate-200 bg-slate-50 focus:bg-white shadow-sm placeholder:text-slate-400 focus:border-transparent"
                                           style={{ '--tw-ring-color': `${roleConfig.color}50` } as any} />
                                </div>
                            </motion.div>

                            {/* Password */}
                            <motion.div 
                                className="space-y-2"
                                animate={{ scale: focusedField === 'password' ? 1.01 : 1 }}
                                transition={{ type: 'spring', stiffness: 300 }}
                            >
                                <label className="text-[14px] font-bold text-slate-700">كلمة المرور</label>
                                <div className="relative">
                                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] transition-colors" style={{ color: focusedField === 'password' ? roleConfig.color : `${roleConfig.color}80` }} />
                                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required 
                                           placeholder="••••••••"
                                           onFocus={() => setFocusedField('password')}
                                           onBlur={() => setFocusedField(null)}
                                           className="w-full h-[52px] pr-12 pl-12 rounded-2xl text-slate-900 text-[15px] outline-none transition-all duration-200 focus:ring-2 border-2 border-slate-200 bg-slate-50 focus:bg-white shadow-sm placeholder:text-slate-400 focus:border-transparent"
                                           style={{ '--tw-ring-color': `${roleConfig.color}50` } as any} />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                        <Eye className="w-[18px] h-[18px]" />
                                    </button>
                                </div>
                            </motion.div>

                            <div className="flex items-center justify-between pt-1">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input type="checkbox" className="w-[18px] h-[18px] rounded-md transition-transform group-hover:scale-105 border-2 border-slate-300" style={{ accentColor: roleConfig.color }} />
                                    <span className="text-[13px] font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">تذكر بياناتي</span>
                                </label>
                                <Link href="/forgot-password" className="text-[13px] font-bold hover:brightness-110 transition-all hover:underline" style={{ color: roleConfig.color }}>
                                    نسيت كلمة المرور؟
                                </Link>
                            </div>

                            <motion.button 
                                type="submit" 
                                disabled={loading} 
                                whileHover={{ scale: loading ? 1 : 1.02, y: loading ? 0 : -2 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full h-[52px] rounded-2xl text-white font-bold text-[16px] transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2 mt-2 magnetic-btn" 
                                style={{ background: `linear-gradient(135deg, ${roleConfig.color}, ${roleConfig.color}cc)`, boxShadow: `0 10px 25px -5px ${roleConfig.color}50` }}
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        جاري تسجيل الدخول...
                                    </span>
                                ) : (
                                    <>
                                        تسجيل الدخول للنظام
                                        <ArrowLeft className="w-[20px] h-[20px]" />
                                    </>
                                )}
                            </motion.button>
                        </form>

                        {/* Social Login Divider */}
                        <div className="flex items-center gap-4 my-6">
                            <div className="flex-1 h-[1px] bg-slate-200"></div>
                            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">أو سجل دخول بـ</span>
                            <div className="flex-1 h-[1px] bg-slate-200"></div>
                        </div>

                        {/* Social Login Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            <motion.button 
                                type="button" 
                                whileHover={{ y: -2, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex items-center justify-center gap-2.5 h-[48px] rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50 transition-all duration-200 hover:shadow-md hover:border-slate-300 group"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                </svg>
                                <span className="text-[14px] font-bold text-slate-700 group-hover:text-slate-900">Google</span>
                            </motion.button>
                            <motion.button 
                                type="button" 
                                whileHover={{ y: -2, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex items-center justify-center gap-2.5 h-[48px] rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50 transition-all duration-200 hover:shadow-md hover:border-slate-300 group"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 23 23">
                                    <path fill="#f35325" d="M1 1h10v10H1z"/>
                                    <path fill="#81bc06" d="M12 1h10v10H12z"/>
                                    <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                                    <path fill="#ffba08" d="M12 12h10v10H12z"/>
                                </svg>
                                <span className="text-[14px] font-bold text-slate-700 group-hover:text-slate-900">Microsoft</span>
                            </motion.button>
                        </div>
                    </motion.div>

                    {/* Footer */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="mt-6 flex flex-col items-center justify-center gap-1"
                    >
                        <p className="text-center text-[12px] text-slate-400 font-medium">
                            © 2026 Nexus EDU — جميع الحقوق محفوظة لمدارس الإخلاص الأهلية
                        </p>
                        <p className="text-center text-[10px] text-slate-400/80 font-medium tracking-wide">
                            Developed by <span className="font-bold text-slate-500">Hassan Issa</span>
                        </p>
                    </motion.div>
                </motion.div>
            </div>
            <Toaster />
        </div>
    );
}
