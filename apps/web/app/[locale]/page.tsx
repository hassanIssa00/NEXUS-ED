'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import Link from 'next/link'
import {
    GraduationCap, BookOpen, Users, Award, ArrowLeft, CheckCircle,
    Star, PlayCircle, Brain, BarChart3, Trophy, ShieldCheck,
    ChevronLeft, ChevronRight, Sparkles, Zap, Globe, Menu, X,
    Smartphone, QrCode, TrendingUp, Medal, Target, Heart
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from '@/components/language-switcher'
import { VideoModal } from '@/components/ui/video-modal'
import { AnimatedCounter } from '@/components/ui/animated-counter'

// Hero Images for Carousel
const heroImages = [
    { src: '/images/hero-1.webp', alt: 'Nexus EDU - Vision' },
    { src: '/images/hero-2.webp', alt: 'Nexus EDU - Smart Education' },
    { src: '/images/hero-3.webp', alt: 'Performance Analytics' },
    { src: '/images/hero-4.webp', alt: 'Admin Overview' },
]

// School partner logos (text-based for now)
const schoolPartners = [
    'مدرسة الرياض النموذجية', 'ثانوية المتفوقين', 'مدرسة الإبداع',
    'مجمع الأمير سلمان', 'ثانوية الخليج', 'مدرسة المستقبل',
    'مجمع الملك فيصل', 'ثانوية الإخلاص', 'مدرسة الفجر',
]

// How it works steps
const howItWorksSteps = [
    {
        step: '01',
        icon: '📱',
        title: 'سجّل مجاناً',
        description: 'أنشئ حسابك في دقيقتين وأضف بياناتك الدراسية'
    },
    {
        step: '02',
        icon: '🎯',
        title: 'ابدأ رحلتك',
        description: 'اختر مواضيعك وابدأ بالتحديات اليومية وحضور الدروس'
    },
    {
        step: '03',
        icon: '⚡',
        title: 'اكسب النقاط',
        description: 'تصاعد في الترتيب عبر النقاط والإنجازات اليومية'
    },
    {
        step: '04',
        icon: '🏆',
        title: 'اربح الجائزة',
        description: 'تنافس للفوز بجائزة المليون ريال السنوية الكبرى'
    },
]

export default function LandingPage() {
    const t = useTranslations('landing')
    const tCommon = useTranslations('common')
    const tAuth = useTranslations('auth')
    const [currentImage, setCurrentImage] = useState(0)
    const [isVideoOpen, setIsVideoOpen] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentImage((prev) => (prev + 1) % heroImages.length)
        }, 5000)
        return () => clearInterval(timer)
    }, [])

    return (
        <div className="min-h-screen bg-white overflow-x-hidden force-light">
            {/* Global Floating Particles */}
            <div className="particles-container fixed inset-0 z-0 pointer-events-none">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="p" />
                ))}
            </div>
            {/* ═══════════ HEADER ═══════════ */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <img src="/logo_new.webp" alt="Nexus EDU" className="w-10 h-10 rounded-[12px] object-cover" />
                            <img src="/second_logo.webp" alt="Partner Logo" className="w-10 h-10 rounded-[12px] object-cover bg-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-2xl font-bold nexus-gradient-text">نِكْسُس</span>
                            <span className="text-[9px] font-bold tracking-[0.2em] text-slate-600 -mt-1 uppercase">Nexus EDU</span>
                        </div>
                    </div>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-8">
                        <nav className="flex gap-6 text-sm font-bold text-slate-800">
                            <Link href="#features" className="hover:text-primary-500 transition-colors">{t('nav.features')}</Link>
                            <Link href="#how-it-works" className="hover:text-primary-500 transition-colors">كيف يعمل؟</Link>
                            <Link href="#stats" className="hover:text-primary-500 transition-colors">الإحصائيات</Link>
                            <Link href="#testimonials" className="hover:text-primary-500 transition-colors">{t('nav.testimonials')}</Link>
                            <Link href="#pricing" className="hover:text-primary-500 transition-colors">{t('nav.pricing')}</Link>
                        </nav>
                        <div className="flex items-center gap-3">
                            <LanguageSwitcher />
                            <Link href="/login">
                                <Button variant="ghost">{tAuth('signIn')}</Button>
                            </Link>
                            <Link href="/register">
                                <Button>{tAuth('signUp')}</Button>
                            </Link>
                        </div>
                    </div>

                    {/* Mobile Hamburger */}
                    <div className="flex md:hidden items-center gap-3">
                        <LanguageSwitcher />
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl glass-card"
                        >
                            <Menu className="w-5 h-5 text-slate-700" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Nav Drawer */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="mobile-nav-overlay"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="mobile-nav-drawer"
                            dir="rtl"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <img src="/logo_new.webp" alt="Nexus EDU" className="w-9 h-9 rounded-xl" />
                                        <img src="/second_logo.webp" alt="Partner Logo" className="w-9 h-9 rounded-xl bg-white" />
                                    </div>
                                    <span className="font-bold text-lg nexus-gradient-text">نِكْسُس</span>
                                </div>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-xl glass-card">
                                    <X className="w-5 h-5 text-slate-600" />
                                </button>
                            </div>
                            <nav className="flex flex-col gap-1">
                                {[
                                    { href: '#features', label: 'المميزات' },
                                    { href: '#how-it-works', label: 'كيف يعمل؟' },
                                    { href: '#stats', label: 'الإحصائيات' },
                                    { href: '#testimonials', label: 'آراء المستخدمين' },
                                    { href: '#pricing', label: 'الأسعار' },
                                ].map(item => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="px-4 py-3 rounded-xl text-slate-700 font-semibold hover:bg-primary-50 hover:text-primary-600 transition-colors"
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </nav>
                            <div className="mt-8 flex flex-col gap-3">
                                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button variant="outline" className="w-full">تسجيل الدخول</Button>
                                </Link>
                                <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button className="w-full primary-btn">إنشاء حساب مجاني</Button>
                                </Link>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ═══════════ HERO SECTION ═══════════ */}
            <section className="relative pt-32 pb-24 lg:pt-44 lg:pb-32 overflow-hidden hero-section dots-pattern">
                <div className="absolute top-20 right-1/4 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-[120px] animate-float-slow morph-blob"></div>
                <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-secondary-500/10 rounded-full blur-[100px] animate-float-delay morph-blob" style={{ animationDelay: '3s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-primary-500/5 animate-spin-slow"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-secondary-500/5 animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '30s' }}></div>
                <div className="absolute inset-0 mesh-gradient opacity-30 pointer-events-none"></div>

                <div className="hero-overlay"></div>

                <div className="container mx-auto px-6 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                            className="hero-card border border-white/50 p-8 lg:p-12 relative z-20 animate-pulse-glow"
                        >
                            {/* Badge */}
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-primary-500 text-sm font-semibold mb-8">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                                </span>
                                {t('hero.badge')}
                            </div>

                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.3 }}
                                className="hero-title text-5xl lg:text-6xl mb-6 leading-tight"
                            >
                                {t('hero.title')} <br />
                                <span className="animated-gradient-text">
                                    {t('hero.titleHighlight')}
                                </span>
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.45 }}
                                className="hero-description text-xl mb-10 max-w-lg font-medium"
                            >
                                {t('hero.description')}
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.6 }}
                                className="flex flex-col sm:flex-row gap-4"
                            >
                                <Link href="/register">
                                    <Button size="xl" className="primary-btn relative overflow-hidden group animate-pulse-glow">
                                        <span className="absolute inset-0 animate-shimmer"></span>
                                        <span className="relative z-10 flex items-center">
                                            {t('hero.ctaPrimary')}
                                            <ArrowLeft className="mr-2 h-5 w-5 rotate-180 group-hover:-translate-x-1 transition-transform" />
                                        </span>
                                    </Button>
                                </Link>
                                <Button onClick={() => setIsVideoOpen(true)} size="xl" variant="outline" className="bg-white/60 hover:bg-white/90 border-slate-200 backdrop-blur-sm text-slate-700 font-semibold hover-lift">
                                    <PlayCircle className="ml-2 h-5 w-5" />
                                    شاهد الفيديو التعريفي
                                </Button>
                            </motion.div>

                            {/* Trust indicators */}
                            <div className="flex items-center gap-6 mt-10 pt-10 border-t border-slate-200">
                                <div className="flex -space-x-3 space-x-reverse">
                                    {[1, 2, 3, 4].map(i => (
                                        <img key={i} src={`/images/avatar-${i}.webp`} alt="طالب" className="w-10 h-10 rounded-full border-2 border-white object-cover shadow-sm" />
                                    ))}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 text-sm">+10,000 طالب مسجل</p>
                                    <p className="text-xs text-slate-600">يثقون بمنصة نِكْسُس</p>
                                </div>
                                <div className="h-8 w-px bg-slate-200 mr-2" />
                                <div className="flex items-center gap-1">
                                    {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />)}
                                    <span className="text-xs text-slate-600 mr-1 font-medium">4.9/5</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Image Carousel */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="relative lg:h-[550px]"
                        >
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] nexus-gradient rounded-full blur-[100px] opacity-20"></div>

                            <div className="relative z-10 rounded-[16px] overflow-hidden h-[400px] lg:h-[500px] border border-white/10">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={`bg-${currentImage}`}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0"
                                    >
                                        <img src={heroImages[currentImage]!.src} alt="" className="w-full h-full object-cover blur-xl scale-110 opacity-40" />
                                    </motion.div>
                                </AnimatePresence>

                                <AnimatePresence mode="wait">
                                    <motion.img
                                        key={currentImage}
                                        src={heroImages[currentImage]!.src}
                                        alt={heroImages[currentImage]!.alt}
                                        initial={{ opacity: 0, x: 100 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -100 }}
                                        transition={{ duration: 0.5 }}
                                        className="relative z-10 w-full h-full object-contain hero-img-bg"
                                    />
                                </AnimatePresence>

                                {/* Carousel controls */}
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
                                    <button onClick={() => setCurrentImage((prev) => (prev - 1 + heroImages.length) % heroImages.length)} className="glass-card rounded-full w-8 h-8 flex items-center justify-center hover:bg-white/10 transition-colors">
                                        <ChevronRight className="w-4 h-4 text-slate-900" />
                                    </button>
                                    {heroImages.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentImage(i)}
                                            className={`h-2 rounded-full transition-all ${i === currentImage ? 'bg-primary-500 w-8' : 'bg-white/30 w-2'}`}
                                        />
                                    ))}
                                    <button onClick={() => setCurrentImage((prev) => (prev + 1) % heroImages.length)} className="glass-card rounded-full w-8 h-8 flex items-center justify-center hover:bg-white/10 transition-colors">
                                        <ChevronLeft className="w-4 h-4 text-slate-900" />
                                    </button>
                                </div>
                            </div>

                            {/* Floating Cards */}
                            <motion.div
                                animate={{ y: [0, 12, 0] }}
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                className="absolute -bottom-4 -left-4 glass-card p-4 rounded-[16px] z-20"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex -space-x-2 space-x-reverse">
                                        {[1, 2, 3].map(i => (
                                            <img key={i} src={`/images/avatar-${i}.webp`} alt="طالب" className="w-8 h-8 rounded-full border-2 border-nexus-card object-cover" />
                                        ))}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-sm">+10,000 طالب</p>
                                        <p className="text-xs text-slate-600">يثقون بنا</p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Floating badge - Million prize */}
                            <motion.div
                                animate={{ y: [0, -10, 0], rotate: [-1, 1, -1] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute -top-4 -right-4 glass-card p-3 rounded-[16px] z-20 border border-yellow-200"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">🏆</span>
                                    <div>
                                        <p className="font-black text-slate-900 text-sm leading-none">1,000,000</p>
                                        <p className="text-xs text-yellow-600 font-semibold">ريال جائزة كبرى</p>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </section>



            {/* ═══════════ STATISTICS ═══════════ */}
            <section id="stats" className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 nexus-gradient opacity-[0.07]"></div>
                <div className="container mx-auto px-6 relative z-10">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                        {stats.map((stat, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.15, type: 'spring', stiffness: 200 }}
                                className="text-center group cursor-pointer"
                            >
                                <div className="w-16 h-16 mx-auto mb-4 rounded-[16px] glass-glow flex items-center justify-center group-hover:animate-bounce-subtle">
                                    {stat.icon}
                                </div>
                                <div className="text-4xl lg:text-5xl font-bold animated-gradient-text mb-2">
                                    <AnimatedCounter target={stat.rawValue} suffix={stat.suffix} prefix={stat.prefix} />
                                </div>
                                <p className="text-slate-600 font-medium">{stat.label}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════ HOW IT WORKS ═══════════ */}
            <section id="how-it-works" className="py-24 bg-slate-50/60">
                <div className="container mx-auto px-6">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-primary-500 text-sm font-semibold mb-6">
                            <Zap className="w-4 h-4" />
                            خطوات بسيطة
                        </div>
                        <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">كيف يعمل نِكْسُس؟</h2>
                        <p className="text-lg text-slate-600">أربع خطوات بسيطة تفصلك عن تجربة تعليمية استثنائية</p>
                    </div>

                    <div className="grid md:grid-cols-4 gap-8 relative">
                        {/* Connector line */}
                        <div className="hidden md:block absolute top-16 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-primary-500/30 via-secondary-500/30 to-primary-500/30" />

                        {howItWorksSteps.map((step, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.15, type: 'spring', stiffness: 200 }}
                                className="text-center relative"
                            >
                                {/* Step icon */}
                                <div className="relative inline-flex mb-6">
                                    <div className="w-20 h-20 mx-auto nexus-gradient rounded-[20px] flex items-center justify-center text-3xl shadow-lg animate-glow-ring">
                                        {step.icon}
                                    </div>
                                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-white border-2 border-primary-500 rounded-full flex items-center justify-center text-xs font-black text-primary-500 shadow-md">
                                        {index + 1}
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                                <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
                            </motion.div>
                        ))}
                    </div>

                    <div className="text-center mt-12">
                        <Link href="/register">
                            <Button size="xl" className="primary-btn">
                                ابدأ رحلتك الآن مجاناً
                                <ArrowLeft className="mr-2 h-5 w-5 rotate-180" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ═══════════ FEATURES ═══════════ */}
            <section id="features" className="py-24">
                <div className="container mx-auto px-6">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
                            {t('features.title')}
                        </h2>
                        <p className="text-lg text-slate-600">
                            {t('features.subtitle')}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1, type: 'spring', stiffness: 200 }}
                                whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(79, 70, 229, 0.1)' }}
                                className="glass-card-interactive group"
                            >
                                <div className={`w-12 h-12 rounded-[12px] ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">{t(`features.${feature.key}.title`)}</h3>
                                <p className="text-sm text-slate-600 leading-relaxed">{t(`features.${feature.key}.description`)}</p>
                                <div className="mt-4 w-0 group-hover:w-full h-0.5 bg-gradient-to-r from-primary-500 to-secondary-500 transition-all duration-500 rounded-full"></div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════ AI LEARNING SHOWCASE ═══════════ */}
            <section className="py-24 overflow-hidden">
                <div className="container mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="relative"
                        >
                            <div className="rounded-[20px] overflow-hidden h-[400px] relative border border-white/10 parallax-img shadow-2xl">
                                <div className="absolute inset-0">
                                    <img src="/images/ai-learning-new.webp" alt="" className="w-full h-full object-cover blur-xl scale-110 opacity-30" />
                                </div>
                                <img src="/images/ai-learning-new.webp" alt="AI-Personalized Learning" className="relative z-10 w-full h-full object-contain" />
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-secondary-400 text-sm font-semibold mb-6">
                                <Brain className="w-4 h-4" />
                                ذكاء اصطناعي متقدم
                            </div>
                            <h2 className="text-4xl font-bold text-slate-900 mb-6">تعلم مخصص بالذكاء الاصطناعي</h2>
                            <p className="text-lg text-slate-600 leading-relaxed mb-8">
                                محرك الذكاء الاصطناعي في نِكْسُس يحلل أنماط تعلم كل طالب ويقدم توصيات مخصصة لتحسين الأداء الأكاديمي. نظام تكيفي يتطور مع كل تفاعل.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                {['تحليل أنماط التعلم', 'توصيات مخصصة', 'تقارير ذكية', 'تنبؤ بالأداء'].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 glass-card">
                                        <CheckCircle className="w-5 h-5 text-primary-500 flex-shrink-0" />
                                        <span className="text-sm font-medium text-slate-900">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ═══════════ PERFORMANCE STATS ═══════════ */}
            <section className="py-24">
                <div className="container mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-primary-400 text-sm font-semibold mb-6">
                                <BarChart3 className="w-4 h-4" />
                                نتائج مثبتة
                            </div>
                            <h2 className="text-4xl font-bold text-slate-900 mb-6">تحسن ملموس في الأداء</h2>
                            <p className="text-lg text-slate-600 leading-relaxed mb-8">
                                المدارس التي تستخدم نِكْسُس شهدت تحسنًا ملحوظًا في أداء الطلاب ومشاركتهم. أرقام حقيقية تثبت فعالية المنصة.
                            </p>
                            <div className="space-y-5">
                                {[
                                    { label: 'تحسن في الدرجات', value: '35%', raw: 35, color: 'from-primary-500 to-primary-600' },
                                    { label: 'زيادة في المشاركة', value: '60%', raw: 60, color: 'from-secondary-500 to-secondary-600' },
                                    { label: 'رضا أولياء الأمور', value: '95%', raw: 95, color: 'from-primary-500 to-secondary-500' },
                                ].map((item, i) => (
                                    <div key={i}>
                                        <div className="flex justify-between mb-2">
                                            <span className="font-semibold text-slate-900 text-sm">{item.label}</span>
                                            <span className="font-bold text-primary-500">
                                                <AnimatedCounter target={item.raw} suffix="%" />
                                            </span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                whileInView={{ width: item.value }}
                                                viewport={{ once: true }}
                                                transition={{ duration: 1.5, delay: i * 0.2 }}
                                                className={`h-full bg-gradient-to-r ${item.color} rounded-full`}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="relative"
                        >
                            <div className="rounded-[20px] overflow-hidden h-[400px] relative border border-white/10 parallax-img shadow-2xl">
                                <div className="absolute inset-0">
                                    <img src="/images/stats-comparison-new.webp" alt="" className="w-full h-full object-cover blur-xl scale-110 opacity-30" />
                                </div>
                                <img src="/images/stats-comparison-new.webp" alt="Performance Statistics" className="relative z-10 w-full h-full object-contain" />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ═══════════ LEADERBOARD & REWARDS ═══════════ */}
            <section className="py-24 overflow-hidden">
                <div className="container mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="relative"
                        >
                            <div className="rounded-[20px] overflow-hidden h-[400px] relative border border-white/10 parallax-img shadow-2xl">
                                <div className="absolute inset-0">
                                    <img src="/images/leaderboard-new.webp" alt="" className="w-full h-full object-cover blur-xl scale-110 opacity-30" />
                                </div>
                                <img src="/images/leaderboard-new.webp" alt="Leaderboard" className="relative z-10 w-full h-full object-contain" />
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-yellow-400 text-sm font-semibold mb-6">
                                <Trophy className="w-4 h-4" />
                                نظام المكافآت
                            </div>
                            <h2 className="text-4xl font-bold text-slate-900 mb-6">لوحة المتصدرين والجوائز</h2>
                            <p className="text-lg text-slate-600 leading-relaxed mb-8">
                                نظام تحفيزي متكامل يكافئ الطلاب على التميز والمشاركة. نقاط، شارات، ومسابقات تجعل التعلم ممتعًا ومحفزًا.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                {['🏆 مسابقات أسبوعية', '🎖️ شارات إنجاز', '💎 نقاط مكافأة', '🌟 جائزة المليون', '🔥 سلاسل يومية', '⚡ تحديات فورية'].map((badge, i) => (
                                    <motion.span
                                        key={i}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.08 }}
                                        className="px-4 py-2 glass-card text-sm font-semibold rounded-full"
                                    >
                                        {badge}
                                    </motion.span>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ═══════════ PARENT MONITORING ═══════════ */}
            <section className="py-24">
                <div className="container mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-secondary-400 text-sm font-semibold mb-6">
                                <ShieldCheck className="w-4 h-4" />
                                متابعة أولياء الأمور
                            </div>
                            <h2 className="text-4xl font-bold text-slate-900 mb-6">اطمئنان تام لأولياء الأمور</h2>
                            <p className="text-lg text-slate-600 leading-relaxed mb-8">
                                لوحة مراقبة شاملة تمنح أولياء الأمور رؤية كاملة لأداء أبنائهم الأكاديمي والسلوكي. تقارير آنية وتنبيهات ذكية.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                {['متابعة الدرجات', 'سجل الحضور', 'تنبيهات فورية', 'تقارير دورية'].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 glass-card">
                                        <CheckCircle className="w-5 h-5 text-secondary-400 flex-shrink-0" />
                                        <span className="text-sm font-medium text-slate-900">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="relative"
                        >
                            <div className="rounded-[20px] overflow-hidden h-[400px] relative border border-white/10 parallax-img shadow-2xl">
                                <div className="absolute inset-0">
                                    <img src="/images/parent-monitoring-new.webp" alt="" className="w-full h-full object-cover blur-xl scale-110 opacity-30" />
                                </div>
                                <img src="/images/parent-monitoring-new.webp" alt="Parent Monitoring" className="relative z-10 w-full h-full object-contain" />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ═══════════ VISION 2030 ═══════════ */}
            <section className="py-24 relative overflow-hidden hero-section">
                <div className="absolute inset-0 bg-white/40"></div>
                <div className="container mx-auto px-6 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-primary-400 text-sm font-semibold mb-6">
                                🇸🇦 رؤية المملكة 2030
                            </div>
                            <h2 className="text-4xl font-bold text-slate-900 mb-6">متوافق مع رؤية 2030</h2>
                            <p className="text-lg text-slate-600 leading-relaxed mb-8">
                                نِكْسُس مصمم ليتوافق مع أهداف رؤية المملكة العربية السعودية 2030 في تطوير التعليم والتحول الرقمي. نساهم في بناء جيل مبتكر ومتمكن.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                {['التحول الرقمي', 'جودة التعليم', 'تمكين الشباب', 'الابتكار'].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 glass-card rounded-[12px]">
                                        <CheckCircle className="w-5 h-5 text-primary-400 flex-shrink-0" />
                                        <span className="text-sm font-medium text-slate-900">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="relative"
                        >
                            <div className="rounded-[20px] overflow-hidden h-[400px] relative border border-white/10 parallax-img shadow-2xl">
                                <div className="absolute inset-0">
                                    <img src="/images/vision-2030-new.webp" alt="" className="w-full h-full object-cover blur-xl scale-110 opacity-30" />
                                </div>
                                <img src="/images/vision-2030-new.webp" alt="Saudi Vision 2030" className="relative z-10 w-full h-full object-contain" />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ═══════════ TESTIMONIALS ═══════════ */}
            <section id="testimonials" className="py-24 overflow-hidden">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
                            {t('testimonials.title')}
                        </h2>
                        <p className="text-slate-600">ماذا يقول مجتمعنا التعليمي عن نِكْسُس</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {[0, 1, 2].map((index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.15 }}
                                whileHover={{ y: -6 }}
                                className="glass-card p-6"
                            >
                                <div className="flex gap-1 mb-4">
                                    {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
                                </div>
                                <p className="text-slate-600 mb-6 leading-relaxed">"{t(`testimonials.items.${index}.content`)}"</p>
                                <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                                    <div className="w-10 h-10 rounded-full nexus-gradient flex items-center justify-center text-white font-bold text-sm shadow-md">
                                        {t(`testimonials.items.${index}.author`).charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-900 text-sm">{t(`testimonials.items.${index}.author`)}</h4>
                                        <p className="text-xs text-slate-600">{t(`testimonials.items.${index}.role`)}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════ APP DOWNLOAD ═══════════ */}
            <section className="py-24 bg-slate-50/60">
                <div className="container mx-auto px-6">
                    <div className="rounded-[24px] overflow-hidden relative premium-card p-12 lg:p-16">
                        <div className="absolute top-0 right-0 w-64 h-64 nexus-gradient rounded-full blur-[100px] opacity-10 -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 nexus-gradient rounded-full blur-[100px] opacity-10 translate-y-1/2 -translate-x-1/2" />

                        <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
                            <div>
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 text-primary-600 text-sm font-semibold mb-6 border border-primary-100">
                                    <Smartphone className="w-4 h-4" />
                                    تطبيق الجوال
                                </div>
                                <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
                                    تعلّم في أي وقت وأي مكان
                                </h2>
                                <p className="text-lg text-slate-600 leading-relaxed mb-8">
                                    حمّل تطبيق نِكْسُس على هاتفك واستمر في رحلتك التعليمية أينما كنت. متاح على iOS وAndroid.
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    <button className="flex items-center gap-3 px-5 py-3 bg-slate-900 text-white rounded-[14px] hover:bg-slate-800 transition-colors">
                                        <span className="text-2xl">🍎</span>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-400">حمّل من</p>
                                            <p className="font-bold text-sm">App Store</p>
                                        </div>
                                    </button>
                                    <button className="flex items-center gap-3 px-5 py-3 bg-slate-900 text-white rounded-[14px] hover:bg-slate-800 transition-colors">
                                        <span className="text-2xl">🤖</span>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-400">حمّل من</p>
                                            <p className="font-bold text-sm">Google Play</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center justify-center">
                                <div className="w-48 h-48 glass-card rounded-[24px] flex items-center justify-center text-center p-6">
                                    <div>
                                        <div className="text-5xl mb-3">📱</div>
                                        <p className="text-sm font-semibold text-slate-700">امسح QR</p>
                                        <p className="text-xs text-slate-500 mt-1">للتحميل الفوري</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════ CTA SECTION ═══════════ */}
            <section className="py-24 container mx-auto px-6">
                <div className="relative rounded-[16px] p-12 lg:p-20 text-center overflow-hidden border border-white/10">
                    <div className="absolute inset-0 nexus-gradient opacity-90"></div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2"></div>
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                    <div className="relative z-10 max-w-3xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="text-6xl mb-6 float-badge inline-block"
                        >
                            🚀
                        </motion.div>
                        <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">{t('cta.title')}</h2>
                        <p className="text-xl text-white/85 mb-10">
                            {t('cta.description')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/register">
                                <Button size="xl" className="bg-white text-indigo-700 hover:bg-white/90 shadow-2xl font-bold">
                                    {t('cta.button')}
                                    <ArrowLeft className="mr-2 h-5 w-5 rotate-180" />
                                </Button>
                            </Link>
                            <Link href="/login">
                                <Button size="xl" variant="outline" className="border-white/40 text-white hover:bg-white/10 font-bold">
                                    تسجيل الدخول
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════ FOOTER ═══════════ */}
            <footer className="border-t border-slate-200 py-16">
                <div className="container mx-auto px-6">
                    <div className="grid md:grid-cols-4 gap-12">
                        <div className="col-span-1 md:col-span-2">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="flex items-center gap-1.5">
                                    <img src="/logo_new.webp" alt="Nexus EDU" className="w-10 h-10 rounded-[12px] object-cover" />
                                    <img src="/second_logo.webp" alt="Partner Logo" className="w-10 h-10 rounded-[12px] object-cover bg-white" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-2xl font-bold nexus-gradient-text">نِكْسُس</span>
                                    <span className="text-[9px] font-bold tracking-[0.2em] text-slate-600 -mt-1 uppercase">Nexus EDU</span>
                                </div>
                            </div>
                            <p className="text-slate-600 max-w-sm leading-relaxed mb-8">
                                {t('footer.description')}
                            </p>
                            <div className="flex gap-3">
                                {[
                                    { label: 'X', href: '#' },
                                    { label: 'In', href: '#' },
                                    { label: 'Fb', href: '#' },
                                ].map((social, i) => (
                                    <a key={i} href={social.href} className="w-10 h-10 rounded-full glass-card flex items-center justify-center text-slate-600 hover:text-primary-500 hover:border-primary-500/50 transition-all text-sm font-semibold">
                                        {social.label}
                                    </a>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-slate-900 font-semibold mb-6">{t('footer.quickLinks')}</h4>
                            <ul className="space-y-3">
                                <li><Link href="#" className="text-slate-600 hover:text-primary-500 transition-colors text-sm">{t('footer.about')}</Link></li>
                                <li><Link href="#" className="text-slate-600 hover:text-primary-500 transition-colors text-sm">{t('footer.features')}</Link></li>
                                <li><Link href="#" className="text-slate-600 hover:text-primary-500 transition-colors text-sm">{t('footer.pricing')}</Link></li>
                                <li><Link href="#" className="text-slate-600 hover:text-primary-500 transition-colors text-sm">{t('footer.blog')}</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-slate-900 font-semibold mb-6">{t('footer.support')}</h4>
                            <ul className="space-y-3">
                                <li><Link href="#" className="text-slate-600 hover:text-primary-500 transition-colors text-sm">{t('footer.helpCenter')}</Link></li>
                                <li><Link href="#" className="text-slate-600 hover:text-primary-500 transition-colors text-sm">{t('footer.privacy')}</Link></li>
                                <li><Link href="#" className="text-slate-600 hover:text-primary-500 transition-colors text-sm">{t('footer.terms')}</Link></li>
                                <li><Link href="#" className="text-slate-600 hover:text-primary-500 transition-colors text-sm">{t('footer.contact')}</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-slate-200 mt-16 pt-8 flex flex-col items-center justify-between gap-6 text-sm text-slate-500 sm:flex-row">
                        <div className="flex flex-col items-center sm:items-start gap-1.5">
                            <span className="font-semibold text-slate-700">© 2026 Nexus EDU — جميع الحقوق محفوظة لمدارس الإخلاص الأهلية</span>
                            <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5 bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200/60">
                                Developed by 
                                <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent font-black tracking-wide">
                                    Hassan Issa
                                </span>
                            </span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                            <span>🇸🇦</span>
                            <span className="font-medium text-slate-600">صُنع في المملكة العربية السعودية</span>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Video Modal */}
            <VideoModal
                isOpen={isVideoOpen}
                onClose={() => setIsVideoOpen(false)}
                videoSrc="/videos/intro.mp4"
                title="الفيديو التعريفي لنِكْسُس EDU"
                poster="/images/hero-banner.webp"
            />
        </div>
    )
}

const stats = [
    { rawValue: 10000, prefix: '+', suffix: '', label: 'طالب مسجل', icon: <Users className="w-7 h-7 text-primary-500" /> },
    { rawValue: 500, prefix: '+', suffix: '', label: 'معلم متميز', icon: <GraduationCap className="w-7 h-7 text-primary-500" /> },
    { rawValue: 200, prefix: '+', suffix: '', label: 'مادة دراسية', icon: <BookOpen className="w-7 h-7 text-primary-500" /> },
    { rawValue: 98, prefix: '', suffix: '%', label: 'نسبة الرضا', icon: <Award className="w-7 h-7 text-primary-500" /> },
]

const features = [
    { icon: <BookOpen className="w-6 h-6 text-primary-500" />, key: 'contentManagement', color: 'bg-primary-500/10' },
    { icon: <Users className="w-6 h-6 text-secondary-400" />, key: 'communication', color: 'bg-secondary-500/10' },
    { icon: <Award className="w-6 h-6 text-yellow-400" />, key: 'evaluation', color: 'bg-yellow-500/10' },
    { icon: <GraduationCap className="w-6 h-6 text-primary-400" />, key: 'virtualClasses', color: 'bg-primary-500/10' },
]
