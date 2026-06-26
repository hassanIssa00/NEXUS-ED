'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
    GraduationCap, BookOpen, Users, Briefcase, UserPlus,
    HeartHandshake, Eye, Calculator, ArrowLeft, Sparkles,
    Shield, Trophy, Brain, Zap, Rocket, Lock
} from 'lucide-react';
import { useLocale } from 'next-intl';
import { LanguageSwitcher } from '@/components/language-switcher';
import Link from 'next/link';
import { useState } from 'react';

const loginPortals = [
    {
        id: 'student',
        label: 'بوابة الطالب',
        icon: GraduationCap,
        color: 'from-[#00D1B2] to-[#059669]',
        highlight: '#00D1B2',
        description: 'تابع دروسك وواجباتك ودرجاتك وتحدياتك اليومية',
        emoji: '🎓',
        users: '+8,500 طالب',
        tag: 'الأكثر استخداماً'
    },
    {
        id: 'teacher',
        label: 'بوابة المعلم',
        icon: BookOpen,
        color: 'from-[#3B82F6] to-[#2563EB]',
        highlight: '#3B82F6',
        description: 'أدر فصولك وواجباتك وتحليلات أداء الطلاب',
        emoji: '📚',
        users: '+1,200 معلم',
        tag: 'AI مدعوم'
    },
    {
        id: 'parent',
        label: 'بوابة ولي الأمر',
        icon: Users,
        color: 'from-[#F59E0B] to-[#D97706]',
        highlight: '#F59E0B',
        description: 'تابع أداء ابنك وحضوره ودرجاته لحظة بلحظة',
        emoji: '👨‍👩‍👧',
        users: '+3,200 ولي أمر',
        tag: ''
    },
    {
        id: 'principal',
        label: 'مدير المدرسة',
        icon: Briefcase,
        color: 'from-[#8B5CF6] to-[#6D28D9]',
        highlight: '#8B5CF6',
        description: 'إدارة شاملة للمدرسة مع تقارير الأداء والإحصاءات',
        emoji: '🏫',
        users: '+85 قائد',
        tag: ''
    },
    {
        id: 'vice_principal',
        label: 'وكيل المدرسة',
        icon: UserPlus,
        color: 'from-[#EC4899] to-[#BE185D]',
        highlight: '#EC4899',
        description: 'متابعة شؤون المدرسة والجداول الدراسية وسجلات الطلاب',
        emoji: '📋',
        users: '+120 وكيل',
        tag: ''
    },
    {
        id: 'counselor',
        label: 'التوجيه الطلابي',
        icon: HeartHandshake,
        color: 'from-[#14B8A6] to-[#0F766E]',
        highlight: '#14B8A6',
        description: 'دعم الطلاب ومتابعة حالاتهم ومعالجة الغيابات',
        emoji: '🤝',
        users: '+340 مرشد',
        tag: ''
    },
    {
        id: 'supervisor',
        label: 'الإشراف التربوي',
        icon: Eye,
        color: 'from-[#6366F1] to-[#4338CA]',
        highlight: '#6366F1',
        description: 'مراقبة الأداء العام وضمان جودة التعليم في المدارس',
        emoji: '👁️',
        users: '+280 مشرف',
        tag: ''
    },
    {
        id: 'admin',
        label: 'الشئون الإدارية',
        icon: Calculator,
        color: 'from-[#F43F5E] to-[#E11D48]',
        highlight: '#F43F5E',
        description: 'إدارة الشؤون المالية والإدارية والحسابات',
        emoji: '💼',
        users: '+160 موظف',
        tag: ''
    },
];

const platformFeatures = [
    { icon: Brain, text: 'ذكاء اصطناعي متقدم', color: 'text-purple-500', bg: 'bg-purple-50' },
    { icon: Trophy, text: '🏆 جائزة المليون ريال', color: 'text-yellow-500', bg: 'bg-yellow-50' },
    { icon: Shield, text: 'بيانات آمنة 100%', color: 'text-green-500', bg: 'bg-green-50' },
    { icon: Zap, text: 'واجهة فائقة السرعة', color: 'text-blue-500', bg: 'bg-blue-50' },
];

export default function GlobalLoginSelectorPage() {
    const locale = useLocale();
    const [hoveredPortal, setHoveredPortal] = useState<string | null>(null);

    const activePortal = loginPortals.find(p => p.id === hoveredPortal);

    return (
        <div className="min-h-screen w-full flex hero-section overflow-hidden force-light dots-pattern relative" dir="rtl">
            {/* ═══ Animated Particles Background ═══ */}
            <div className="particles-container">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="p" />
                ))}
            </div>

            {/* Morphing Blob Backgrounds */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-primary/8 rounded-full blur-[150px] animate-float-slow morph-blob"></div>
                <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-secondary/8 rounded-full blur-[130px] animate-float-delay morph-blob" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] animate-breathe"></div>
            </div>

            {/* Orbiting Decorative Elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none hidden lg:block">
                <div className="animate-orbit absolute">
                    <div className="w-3 h-3 rounded-full bg-primary-500/20 blur-sm"></div>
                </div>
                <div className="animate-orbit-reverse absolute">
                    <div className="w-2 h-2 rounded-full bg-secondary-500/20 blur-sm"></div>
                </div>
            </div>

            <div className="hero-overlay pointer-events-none"></div>

            <div className="w-full flex flex-col lg:flex-row min-h-screen relative z-10">

                {/* ═══ LEFT SIDE INFO PANEL ═══ */}
                <div className="hidden lg:flex flex-col justify-between w-[360px] flex-shrink-0 p-10 border-l border-slate-200/60 bg-white/40 backdrop-blur-sm relative overflow-hidden">
                    {/* Subtle mesh gradient overlay */}
                    <div className="absolute inset-0 mesh-gradient opacity-30 pointer-events-none"></div>

                    {/* Logo */}
                    <div className="relative z-10">
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: 'spring', stiffness: 200 }}
                            className="flex items-center gap-3 mb-10"
                        >
                            <div className="relative flex items-center gap-2">
                                <img src="/logo_new.webp" alt="Nexus EDU" className="w-12 h-12 rounded-[14px] object-cover shadow-md bg-white border border-border" />
                                <img src="/second_logo.webp" alt="Partner Logo" className="w-12 h-12 rounded-[14px] object-cover shadow-md bg-white border border-border" />
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-slate-900">نكسس</h1>
                                <p className="text-[10px] text-primary-500 font-bold tracking-widest uppercase">NEXUS EDU</p>
                            </div>
                        </motion.div>

                        {/* Active portal info */}
                        <AnimatePresence mode="wait">
                            {activePortal ? (
                                <motion.div
                                    key={activePortal.id}
                                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -15, scale: 0.95 }}
                                    transition={{ duration: 0.3, type: 'spring', stiffness: 250 }}
                                    className="mb-8"
                                >
                                    <div className="text-5xl mb-4 animate-elastic">{activePortal.emoji}</div>
                                    <h3 className="text-2xl font-black text-slate-900 mb-2">{activePortal.label}</h3>
                                    <p className="text-slate-600 leading-relaxed mb-4">{activePortal.description}</p>
                                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-100/80 rounded-xl border border-slate-200/60">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-xs font-semibold text-slate-700">{activePortal.users} نشطون الآن</span>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="default"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="mb-8"
                                >
                                    <div className="text-5xl mb-4 animate-float">👋</div>
                                    <h3 className="text-2xl font-black text-slate-900 mb-2">أهلاً بك في نِكْسُس</h3>
                                    <p className="text-slate-600 leading-relaxed">
                                        اختر بوابتك المناسبة للدخول إلى لوحة التحكم الخاصة بك. مرّر الماوس فوق أي بوابة لمعرفة المزيد.
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Platform features */}
                        <div className="space-y-3">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">لماذا نِكْسُس؟</p>
                            {platformFeatures.map((f, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -15 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 + 0.3 }}
                                    whileHover={{ x: 4, scale: 1.02 }}
                                    className={`flex items-center gap-3 p-3 rounded-[14px] bg-white/70 border border-slate-200/60 cursor-default shine-card`}
                                >
                                    <div className={`w-8 h-8 rounded-[10px] ${f.bg} flex items-center justify-center flex-shrink-0`}>
                                        <f.icon className={`w-4 h-4 ${f.color}`} />
                                    </div>
                                    <span className="text-sm font-semibold text-slate-700">{f.text}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="relative z-10 flex items-center gap-2 text-xs text-slate-400 border-t border-slate-200 pt-6 mt-6">
                        <Lock className="w-3.5 h-3.5 text-green-500" />
                        <span>بيانات محمية ومشفرة بالكامل • خوادم سعودية</span>
                    </div>
                </div>

                {/* ═══ MAIN CONTENT ═══ */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-10 overflow-y-auto">
                    {/* Mobile Header */}
                    <div className="w-full max-w-3xl flex justify-between items-center mb-8 lg:mb-10">
                        <div className="flex items-center gap-3 lg:hidden">
                            <img src="/logo_new.webp" alt="Nexus EDU" className="w-10 h-10 rounded-[12px] object-cover bg-white border border-border" />
                            <span className="text-lg font-black text-slate-900">نكسس</span>
                        </div>
                        <div className="lg:mr-auto">
                            <LanguageSwitcher />
                        </div>
                    </div>

                    {/* Title */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                        className="text-center mb-10 w-full max-w-3xl"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-ultra text-primary-500 text-sm font-bold mb-5 border border-primary-200/40"
                        >
                            <Sparkles className="w-4 h-4 animate-pulse" />
                            نظام الدخول الموحد
                            <Rocket className="w-4 h-4" />
                        </motion.div>
                        <h2 className="text-3xl lg:text-4xl font-black text-slate-900 mb-3">
                            اختر البوابة <span className="text-shimmer">المناسبة</span> للدخول
                        </h2>
                        <p className="text-slate-500 text-base max-w-lg mx-auto">
                            يوفر نِكْسُس بوابات دخول مخصصة لكل دور في المنظومة التعليمية
                        </p>
                    </motion.div>

                    {/* Portal Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full max-w-3xl">
                        {loginPortals.map((portal, index) => {
                            const Icon = portal.icon;
                            const isHovered = hoveredPortal === portal.id;
                            return (
                                <motion.div
                                    key={portal.id}
                                    initial={{ opacity: 0, y: 25, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ duration: 0.5, delay: index * 0.06, type: 'spring', stiffness: 250 }}
                                    whileHover={{ y: -8, scale: 1.03 }}
                                    whileTap={{ scale: 0.96 }}
                                    onHoverStart={() => setHoveredPortal(portal.id)}
                                    onHoverEnd={() => setHoveredPortal(null)}
                                >
                                    <Link href={`/${locale}/login/${portal.id}`}>
                                        <div className="group relative flex flex-col items-center justify-center gap-3 p-6 cursor-pointer overflow-hidden border-2 transition-all duration-300 shadow-sm hover:shadow-2xl rounded-[20px] bg-white/90 backdrop-blur-md shine-card"
                                            style={{
                                                borderColor: isHovered ? `${portal.highlight}40` : 'rgba(226,232,240,0.6)',
                                            }}
                                        >
                                            {/* Hover BG gradient */}
                                            <div className={`absolute inset-0 opacity-0 group-hover:opacity-[0.08] transition-opacity duration-500 bg-gradient-to-br ${portal.color}`} />

                                            {/* Corner glow */}
                                            <div className="absolute -top-10 -right-10 w-20 h-20 rounded-full opacity-0 group-hover:opacity-50 transition-all duration-500 blur-2xl"
                                                style={{ backgroundColor: portal.highlight }} />

                                            {/* Tag (if exists) */}
                                            {portal.tag && (
                                                <div className="absolute top-2 left-2 px-2 py-0.5 text-[9px] font-bold rounded-full text-white" style={{ backgroundColor: portal.highlight }}>
                                                    {portal.tag}
                                                </div>
                                            )}

                                            {/* Icon with glow */}
                                            <div className="w-14 h-14 rounded-[16px] flex items-center justify-center transition-all duration-400 shadow-md group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg"
                                                style={{ backgroundColor: `${portal.highlight}15` }}
                                            >
                                                <Icon className="w-7 h-7 transition-all duration-300" style={{ color: portal.highlight }} />
                                            </div>

                                            {/* Label */}
                                            <span className="text-[13px] font-bold text-slate-800 text-center leading-tight">
                                                {portal.label}
                                            </span>

                                            {/* Description (shown on hover) */}
                                            <motion.p
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={isHovered ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
                                                className="text-[11px] text-slate-500 text-center leading-relaxed overflow-hidden"
                                            >
                                                {portal.description}
                                            </motion.p>

                                            {/* Animated bottom bar */}
                                            <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] w-0 group-hover:w-4/5 transition-all duration-500 rounded-full bg-gradient-to-r ${portal.color}`} />

                                            {/* Arrow on hover */}
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0, rotate: -90 }}
                                                animate={isHovered ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0, scale: 0, rotate: -90 }}
                                                transition={{ type: 'spring', stiffness: 300 }}
                                                className="absolute top-3 left-3"
                                            >
                                                <ArrowLeft className="w-3.5 h-3.5" style={{ color: portal.highlight }} />
                                            </motion.div>
                                        </div>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Footer note */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="mt-10 text-center"
                    >
                        <p className="text-xs text-slate-400 mb-3">
                            هل تواجه صعوبة في الدخول؟
                            <a href="https://wa.me/201098810794" target="_blank" rel="noopener noreferrer" className="text-primary-500 font-semibold mr-1 hover:underline underline-expand">
                                تواصل مع الدعم الفني
                            </a>
                        </p>
                        <div className="flex items-center justify-center gap-4 text-[10px] text-slate-300 font-medium mb-4">
                            <span>🔒 SSL 256-bit</span>
                            <span>•</span>
                            <span>🇸🇦 خوادم سعودية</span>
                            <span>•</span>
                            <span>⚡ 99.9% Uptime</span>
                        </div>
                        <div className="flex flex-col items-center justify-center gap-1 border-t border-white/5 pt-4">
                            <p className="text-center text-[11px] text-slate-400 font-medium">
                                © 2026 Nexus EDU — جميع الحقوق محفوظة لمدارس الإخلاص الأهلية
                            </p>
                            <p className="text-center text-[10px] text-slate-500 font-medium tracking-wide">
                                Developed by <span className="font-bold text-slate-400">Hassan Issa</span>
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
