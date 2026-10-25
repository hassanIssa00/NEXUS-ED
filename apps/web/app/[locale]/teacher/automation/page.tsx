'use client'

import { motion } from 'framer-motion'
import { BookOpen, BarChart3, ClipboardCheck, PieChart } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useLocale } from 'next-intl'

const automationModules = [
    {
        icon: BookOpen,
        label: 'مساعد تحضير الدروس',
        desc: 'إنشاء ملخص وأسئلة من محتوى درس محفوظ باستخدام خدمة الذكاء الاصطناعي المتاحة.',
        bg: 'bg-primary',
        href: '/teacher/automation/lesson-prep',
    },
    {
        icon: BarChart3,
        label: 'رصد الدرجات الجماعي',
        desc: 'مراجعة وحفظ درجات التسليمات الفعلية للتكليفات المسندة إليك.',
        bg: 'bg-emerald-600',
        href: '/teacher/automation/bulk-grading',
    },
    {
        icon: ClipboardCheck,
        label: 'رصد الحضور',
        desc: 'فتح شاشة الحضور المرتبطة بالفصول المسندة إلى حسابك.',
        bg: 'bg-violet-600',
        href: '/teacher/automation/attendance',
    },
    {
        icon: PieChart,
        label: 'تحليل نتائج التكليفات',
        desc: 'عرض إحصاءات من التسليمات والدرجات المسجلة في النظام.',
        bg: 'bg-pink-600',
        href: '/teacher/automation/results',
    },
]

export default function AutomationHubPage() {
    const isEnglish = useLocale() === 'en'
    const t = (ar: string, en: string) => isEnglish ? en : ar
    const labels: Record<string, { title: string; desc: string }> = {
        'مساعد تحضير الدروس': { title: 'Lesson preparation assistant', desc: 'Create a lesson summary and questions from saved lesson content using the available AI service.' },
        'رصد الدرجات الجماعي': { title: 'Bulk grading', desc: 'Review and save grades for actual submissions assigned to you.' },
        'رصد الحضور': { title: 'Attendance tracking', desc: 'Open the attendance screen for classes assigned to your account.' },
        'تحليل نتائج التكليفات': { title: 'Assignment results analysis', desc: 'View statistics from submissions and grades recorded in the system.' },
    }
    return (
        <div className="space-y-8 max-w-7xl mx-auto" dir={isEnglish ? 'ltr' : 'rtl'}>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-b border-border pb-5"
            >
                <h1 className="text-2xl font-bold">{t('أدوات المعلم', 'Teacher tools')}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{t('أدوات مرتبطة ببيانات التكليفات والحضور والدروس في حسابك.', 'Tools connected to assignment, attendance, and lesson data in your account.')}</p>
            </motion.div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {automationModules.map((mod, i) => (
                    <motion.div
                        key={mod.href}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="h-full"
                    >
                        <Card className="h-full bg-card hover:border-primary/30 transition-all duration-300 overflow-hidden group flex flex-col">
                            <div className={`h-1.5 w-full ${mod.bg}`}></div>
                            <CardContent className="p-6 flex-1 flex flex-col">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className={`w-10 h-10 rounded-lg ${mod.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 shadow-sm transition-transform`}>
                                        <mod.icon className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-bold text-foreground leading-tight">{isEnglish ? labels[mod.label]?.title : mod.label}</h3>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground mb-6 leading-relaxed flex-1">{isEnglish ? labels[mod.label]?.desc : mod.desc}</p>
                                
                                <div className="mt-auto">
                                    <Link href={mod.href} className="block mt-4">
                                        <Button className="w-full font-medium">
                                            {t('فتح الأداة', 'Open tool')}
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
