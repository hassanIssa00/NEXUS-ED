'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import {
    ArrowLeft, CheckCircle, Trophy, ShieldCheck, Brain,
    ChevronLeft, ChevronRight, GraduationCap, BookOpen, School, Menu, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from '@/components/language-switcher'

// Hero Images for Carousel
const heroImages = [
    { src: '/images/nexus-promo-01.webp', alt: 'تعلم ممتع.. إنجاز بلا حدود - نكسس التعليمية × مدارس الإخلاص' },
    { src: '/images/nexus-promo-02.webp', alt: 'مستقبل التعليم يبدأ من هنا - نكسس التعليمية' },
    { src: '/images/nexus-promo-03.webp', alt: 'نحو تعليم أكثر ذكاءً - نكسس التعليمية' },
    { src: '/images/nexus-promo-04.webp', alt: 'نصنع مستقبل التعليم بالتكنولوجيا - الذكاء الاصطناعي' },
    { src: '/images/nexus-promo-05.webp', alt: 'نصنع مستقبل التعليم بالتكنولوجيا - رؤية 2030' },
    { src: '/images/nexus-promo-06.webp', alt: 'بالمعلم يبدأ التغيير - نكسس التعليمية' },
    { src: '/images/nexus-promo-07.webp', alt: 'إدارة واعية تصنع فرقاً حقيقياً - نكسس التعليمية' },
]

const schoolStages = [
    { key: 'elementary', icon: <BookOpen className="h-6 w-6" /> },
    { key: 'middle', icon: <School className="h-6 w-6" /> },
    { key: 'secondary', icon: <GraduationCap className="h-6 w-6" /> },
]

const schoolValues = ['creativity', 'quality', 'achievement', 'initiative', 'institutionalWork', 'transparency', 'integration'] as const

export default function LandingPage() {
    const t = useTranslations('landing')
    const tAuth = useTranslations('auth')
    const [currentImage, setCurrentImage] = useState(0)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const reduceMotion = useReducedMotion()

    useEffect(() => {
        if (reduceMotion) return
        let timer: ReturnType<typeof setInterval> | undefined
        const updateTimer = () => {
            if (timer) clearInterval(timer)
            if (document.visibilityState === 'visible') {
                timer = setInterval(() => setCurrentImage((prev) => (prev + 1) % heroImages.length), 6000)
            }
        }
        updateTimer()
        document.addEventListener('visibilitychange', updateTimer)
        return () => {
            if (timer) clearInterval(timer)
            document.removeEventListener('visibilitychange', updateTimer)
        }
    }, [reduceMotion])

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
                            <Link href="#school" className="hover:text-primary-500 transition-colors">{t('nav.story')}</Link>
                            <Link href="#journey" className="hover:text-primary-500 transition-colors">{t('nav.stages')}</Link>
                            <Link href="#values" className="hover:text-primary-500 transition-colors">{t('nav.values')}</Link>
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
                                    { href: '#school', label: t('nav.story') },
                                    { href: '#journey', label: t('nav.stages') },
                                    { href: '#values', label: t('nav.values') },
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
                                    <Button className="w-full primary-btn">إنشاء حساب</Button>
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
                                className="hero-title mb-7 max-w-full"
                            >
                                <span className="hero-title-name">
                                    {t('hero.title')}
                                </span>
                                <span className="hero-title-highlight animated-gradient-text">
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
                                <Button asChild size="xl" variant="outline" className="bg-white/80 border-slate-300 text-slate-800 hover:bg-white">
                                    <a href="https://alekhlas.edu.sa/site/admission.php" target="_blank" rel="noreferrer">
                                        {t('hero.ctaAdmission')}
                                    </a>
                                </Button>
                            </motion.div>

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
                                <AnimatePresence initial={false} mode="sync">
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

                                <AnimatePresence initial={false} mode="sync">
                                    <motion.img
                                        key={currentImage}
                                        src={heroImages[currentImage]!.src}
                                        alt={heroImages[currentImage]!.alt}
                                        initial={{ opacity: 0, scale: 1.015 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.8, ease: 'easeInOut' }}
                                        className="absolute inset-0 z-10 w-full h-full object-contain hero-img-bg"
                                    />
                                </AnimatePresence>

                                {/* Carousel controls */}
                                <div className="hero-carousel-controls absolute bottom-4 left-1/2 -translate-x-1/2 z-20" role="group" aria-label="التنقل بين الصور">
                                    <button aria-label="الصورة السابقة" onClick={() => setCurrentImage((prev) => (prev - 1 + heroImages.length) % heroImages.length)} className="hero-carousel-arrow">
                                        <ChevronRight aria-hidden="true" className="h-4 w-4" />
                                    </button>
                                    {heroImages.map((_, i) => (
                                        <button
                                            key={i}
                                            aria-label={`عرض الصورة ${i + 1}`}
                                            aria-current={i === currentImage ? 'true' : undefined}
                                            onClick={() => setCurrentImage(i)}
                                            className={`hero-carousel-dot ${i === currentImage ? 'is-active' : ''}`}
                                        />
                                    ))}
                                    <button aria-label="الصورة التالية" onClick={() => setCurrentImage((prev) => (prev + 1) % heroImages.length)} className="hero-carousel-arrow">
                                        <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                        </motion.div>
                    </div>
                </div>
            </section>



            {/* ═══════════ SCHOOL STORY ═══════════ */}
            <section id="school" className="relative overflow-hidden bg-slate-50 py-24 text-slate-900">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(35,74,101,0.045),transparent_48%),radial-gradient(ellipse_at_bottom_right,rgba(152,121,62,0.045),transparent_45%)]" />
                <div className="container relative z-10 mx-auto px-6">
                    <div className="grid items-stretch gap-8 lg:grid-cols-12">
                        <motion.div
                            initial={{ opacity: 0, y: 28 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.55 }}
                            className="relative flex min-h-[300px] flex-col justify-between overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 p-8 shadow-[0_24px_70px_rgba(35,74,101,0.08)] backdrop-blur-sm lg:col-span-4 lg:p-10"
                        >
                            <div className="absolute -bottom-20 -left-14 h-56 w-56 rounded-full border border-slate-200" />
                            <div className="relative">
                                <span className="text-sm font-semibold tracking-wide text-slate-600">{t('story.foundedLabel')}</span>
                                <p className="mt-4 text-6xl font-black tracking-tight text-slate-950">1413<span className="mr-2 text-2xl font-bold text-[#98793E]">هـ</span></p>
                            </div>
                            <div className="relative mt-10 border-t border-slate-200 pt-6">
                                <p className="text-sm text-slate-500">{t('story.founderLabel')}</p>
                                <p className="mt-2 text-lg font-bold text-slate-900">{t('story.founder')}</p>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 28 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.55, delay: 0.12 }}
                            className="flex flex-col justify-center rounded-[28px] border border-white/90 bg-white/75 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.06)] backdrop-blur-sm lg:col-span-8 lg:p-12"
                        >
                            <p className="mb-4 text-sm font-bold text-[#87682F]">{t('story.eyebrow')}</p>
                            <h2 className="max-w-3xl text-3xl font-black leading-tight text-slate-950 sm:text-4xl lg:text-5xl">{t('story.title')}</h2>
                            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">{t('story.description')}</p>
                            <a href="https://alekhlas.edu.sa/site/about.php" target="_blank" rel="noreferrer" className="mt-7 inline-flex w-fit items-center gap-2 font-bold text-[#234A65] transition-colors hover:text-[#87682F]">
                                {t('story.readMore')} <ArrowLeft className="h-4 w-4 rotate-180" />
                            </a>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ═══════════ SCHOOL VISION & VALUES ═══════════ */}
            <section id="values" className="py-24">
                <div className="container mx-auto px-6">
                    <div className="grid gap-5 lg:grid-cols-2">
                        <motion.article
                            initial={{ opacity: 0, x: -24 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="rounded-[26px] border border-slate-200 bg-white p-8 lg:p-10"
                        >
                            <span className="text-sm font-bold text-indigo-700">{t('values.visionLabel')}</span>
                            <h2 className="mt-4 text-3xl font-black text-slate-950">{t('values.visionTitle')}</h2>
                            <p className="mt-5 text-lg leading-8 text-slate-700">{t('values.vision')}</p>
                        </motion.article>
                        <motion.article
                            initial={{ opacity: 0, x: 24 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="rounded-[26px] border border-slate-200 bg-white p-8 lg:p-10"
                        >
                            <span className="text-sm font-bold text-[#87682F]">{t('values.missionLabel')}</span>
                            <h2 className="mt-4 text-3xl font-black text-slate-950">{t('values.missionTitle')}</h2>
                            <p className="mt-5 text-base leading-8 text-slate-700">{t('values.mission')}</p>
                        </motion.article>
                    </div>

                    <div className="mt-12">
                        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-sm font-bold text-primary-600">{t('values.eyebrow')}</p>
                                <h2 className="mt-2 text-2xl font-black text-slate-950">{t('values.title')}</h2>
                            </div>
                            <p className="max-w-xl text-sm leading-6 text-slate-600">{t('values.description')}</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {schoolValues.map((value, index) => (
                                <motion.span
                                    key={value}
                                    initial={{ opacity: 0, scale: 0.94 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.045 }}
                                    className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm"
                                >
                                    {t(`values.items.${value}`)}
                                </motion.span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════ LEARNING JOURNEY ═══════════ */}
            <section id="journey" className="relative overflow-hidden bg-slate-50 py-24">
                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-indigo-100/60 to-transparent" />
                <div className="container relative z-10 mx-auto px-6">
                    <div className="mx-auto mb-14 max-w-3xl text-center">
                        <p className="mb-3 text-sm font-bold text-primary-600">{t('journey.eyebrow')}</p>
                        <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">{t('journey.title')}</h2>
                        <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">{t('journey.description')}</p>
                    </div>
                    <div className="grid gap-5 md:grid-cols-3">
                        {schoolStages.map((stage, index) => (
                            <motion.article
                                key={stage.key}
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.45, delay: index * 0.1 }}
                                whileHover={reduceMotion ? undefined : { y: -5 }}
                                className="group relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-7 shadow-[0_12px_40px_rgba(15,23,42,0.045)] transition-shadow hover:shadow-[0_20px_50px_rgba(35,74,101,0.12)]"
                            >
                                <div className="absolute inset-x-0 top-0 h-1 bg-[#98793E]" />
                                <div className="flex items-center justify-between">
                                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-[#234A65] transition-transform group-hover:scale-105">{stage.icon}</span>
                                    <span className="text-sm font-black tracking-[0.18em] text-slate-300">0{index + 1}</span>
                                </div>
                                <h3 className="mt-7 text-2xl font-extrabold text-slate-900">{t(`journey.stages.${stage.key}.title`)}</h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">{t(`journey.stages.${stage.key}.description`)}</p>
                                <p className="mt-6 border-t border-slate-100 pt-5 text-sm font-bold text-[#234A65]">{t(`journey.stages.${stage.key}.grades`)}</p>
                            </motion.article>
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
                                    <img src="/images/nexus-promo-04.webp" alt="" className="w-full h-full object-cover blur-xl scale-110 opacity-30" />
                                </div>
                                <img src="/images/nexus-promo-04.webp" alt="تعلم مخصص بالذكاء الاصطناعي - نكسس EDU" className="relative z-10 w-full h-full object-contain" />
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
                                تساعد أدوات الذكاء الاصطناعي على تلخيص الدروس المحفوظة وتقديم إرشادات من الدرجات المتاحة، عند تهيئة خدمة الذكاء الاصطناعي.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                {['تلخيص الدروس المحفوظة', 'أسئلة مراجعة من المحتوى', 'إرشادات من الدرجات المسجلة', 'الاستجابة عند توفر الخدمة'].map((item, i) => (
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
                                    <img src="/images/nexus-promo-01.webp" alt="" className="w-full h-full object-cover blur-xl scale-110 opacity-30" />
                                </div>
                                <img src="/images/nexus-promo-01.webp" alt="لوحة المتصدرين والجوائز - تعلم ممتع وإنجاز بلا حدود" className="relative z-10 w-full h-full object-contain" />
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
                                اعرض نقاطك وشاراتك وترتيبك بناءً على النشاط المسجل في حسابك.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                {['🏅 ترتيب الطلاب', '🎖️ شارات الإنجاز', '💎 نقاط النشاط'].map((badge, i) => (
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
                                يتابع ولي الأمر الدرجات والحضور والرسائل المسجلة للطلاب المرتبطين بحسابه.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                {['درجات الطلاب المرتبطين', 'سجل الحضور', 'مراسلات المنصة', 'بيانات مسجلة في النظام'].map((item, i) => (
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
                                    <img src="/images/nexus-promo-02.webp" alt="" className="w-full h-full object-cover blur-xl scale-110 opacity-30" />
                                </div>
                                <img src="/images/nexus-promo-02.webp" alt="اطمئنان تام لأولياء الأمور - متابعة نكسس EDU" className="relative z-10 w-full h-full object-contain" />
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
                                مدرسة الإخلاص الأهلية
                            </div>
                            <h2 className="text-4xl font-bold text-slate-900 mb-6">منظومة رقمية مدرسية</h2>
                            <p className="text-lg text-slate-600 leading-relaxed mb-8">
                                تجمع المنصة خدمات المدرسة الرقمية في مكان واحد، مع إظهار البيانات بحسب الدور والارتباطات المسجلة لكل حساب.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                {['حسابات المدرسة', 'بيانات مرتبطة', 'صلاحيات حسب الدور', 'خدمات رقمية'].map((item, i) => (
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
                                    <img src="/images/nexus-promo-05.webp" alt="" className="w-full h-full object-cover blur-xl scale-110 opacity-30" />
                                </div>
                                <img src="/images/nexus-promo-05.webp" alt="خدمات مدرسة الإخلاص الأهلية عبر نكسس" className="relative z-10 w-full h-full object-contain" />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ═══════════ OFFICIAL SCHOOL ADMISSION ROUTE ═══════════ */}
            <section className="border-y border-slate-200 bg-slate-50/80 py-20">
                <div className="container mx-auto px-6">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="text-sm font-bold text-primary-600">{t('admission.eyebrow')}</p>
                        <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">{t('admission.title')}</h2>
                        <p className="mt-4 text-base leading-7 text-slate-600">{t('admission.description')}</p>
                    </div>
                    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {(['request', 'number', 'review', 'enrollment'] as const).map((step, index) => (
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, y: 18 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.07 }}
                                className="rounded-2xl border border-slate-200 bg-white p-5"
                            >
                                <span className="text-xs font-black tracking-[0.18em] text-indigo-500">0{index + 1}</span>
                                <h3 className="mt-3 font-extrabold text-slate-900">{t(`admission.steps.${step}.title`)}</h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">{t(`admission.steps.${step}.description`)}</p>
                            </motion.div>
                        ))}
                    </div>
                    <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <a href="https://alekhlas.edu.sa/site/admission.php" target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 font-bold text-white shadow-lg shadow-indigo-600/15 transition hover:bg-indigo-700">
                            {t('admission.schoolForm')} <ArrowLeft className="h-4 w-4 rotate-180" />
                        </a>
                        <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700">
                            {t('admission.portalLogin')}
                        </Link>
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
                        </div>

                        <div>
                            <h4 className="text-slate-900 font-semibold mb-6">{t('footer.quickLinks')}</h4>
                            <ul className="space-y-3">
                                <li><Link href="#school" className="text-slate-600 hover:text-primary-500 transition-colors text-sm">{t('nav.story')}</Link></li>
                                <li><Link href="#journey" className="text-slate-600 hover:text-primary-500 transition-colors text-sm">{t('nav.stages')}</Link></li>
                                <li><Link href="/login" className="text-slate-600 hover:text-primary-500 transition-colors text-sm">تسجيل الدخول</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-slate-900 font-semibold mb-6">{t('footer.support')}</h4>
                            <ul className="space-y-3">
                                <li><Link href="/register" className="text-slate-600 hover:text-primary-500 transition-colors text-sm">{tAuth('signUp')}</Link></li>
                                <li><a href="https://alekhlas.edu.sa/site/admission.php" target="_blank" rel="noreferrer" className="text-slate-600 hover:text-primary-500 transition-colors text-sm">{t('admission.schoolForm')}</a></li>
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

        </div>
    )
}
