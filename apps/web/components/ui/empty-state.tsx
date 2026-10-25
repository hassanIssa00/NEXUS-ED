'use client'

import { cn } from '@/lib/utils'
import { useLocale } from 'next-intl'
import { motion } from 'framer-motion'
import { AlertCircle, FileSearch, Trophy, Inbox, BarChart3, BookOpen } from 'lucide-react'
import { Button } from './button'

interface EmptyStateProps {
    type?: 'default' | 'assignments' | 'grades' | 'leaderboard' | 'error' | 'search' | 'analytics'
    title?: string
    description?: string
    action?: {
        label: string
        onClick: () => void
    }
    className?: string
}

const emptyStateConfig = {
    default: {
        icon: Inbox,
        iconColor: 'text-slate-400',
        iconBg: 'bg-slate-100 dark:bg-slate-800',
        title: ['لا توجد بيانات', 'No data available'],
        description: ['لم يتم العثور على أي محتوى في الوقت الحالي', 'No content was found at this time.'],
    },
    assignments: {
        icon: BookOpen,
        iconColor: 'text-blue-500',
        iconBg: 'bg-blue-50 dark:bg-blue-900/20',
        title: ['لا توجد واجبات', 'No assignments'],
        description: ['لا توجد واجبات مسندة إليك حالياً. استمتع بوقت الراحة! 🎉', 'No assignments have been assigned to you yet. Enjoy the break! 🎉'],
    },
    grades: {
        icon: Trophy,
        iconColor: 'text-yellow-500',
        iconBg: 'bg-yellow-50 dark:bg-yellow-900/20',
        title: ['لا توجد درجات بعد', 'No grades yet'],
        description: ['ستظهر درجاتك هنا بعد أن يقوم المعلم بتصحيح واجباتك', 'Your grades will appear here after your teacher marks your assignments.'],
    },
    leaderboard: {
        icon: Trophy,
        iconColor: 'text-purple-500',
        iconBg: 'bg-purple-50 dark:bg-purple-900/20',
        title: ['لوحة المتصدرين فارغة', 'The leaderboard is empty'],
        description: ['كن أول من يتصدر القائمة! ابدأ بحل التحديات وكسب النقاط', 'Be the first on the leaderboard! Complete challenges to earn points.'],
    },
    analytics: {
        icon: BarChart3,
        iconColor: 'text-emerald-500',
        iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
        title: ['لا توجد بيانات تحليلية', 'No analytics available'],
        description: ['ستظهر الإحصاءات والتحليلات هنا بعد تراكم البيانات الكافية', 'Statistics and analytics will appear here once enough data is available.'],
    },
    search: {
        icon: FileSearch,
        iconColor: 'text-slate-400',
        iconBg: 'bg-slate-100 dark:bg-slate-800',
        title: ['لا توجد نتائج', 'No results found'],
        description: ['جرب كلمات بحث مختلفة أو قلّل من الفلاتر المطبّقة', 'Try different search terms or remove some filters.'],
    },
    error: {
        icon: AlertCircle,
        iconColor: 'text-red-500',
        iconBg: 'bg-red-50 dark:bg-red-900/20',
        title: ['حدث خطأ', 'Something went wrong'],
        description: ['تعذّر تحميل البيانات. يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً', 'The data could not be loaded. Check your internet connection and try again.'],
    },
}

export function EmptyState({
    type = 'default',
    title,
    description,
    action,
    className,
}: EmptyStateProps) {
    const isEnglish = useLocale() === 'en'
    const config = emptyStateConfig[type]
    const Icon = config.icon
    const displayTitle = title ?? config.title[isEnglish ? 1 : 0]
    const displayDescription = description ?? config.description[isEnglish ? 1 : 0]

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={cn(
                'flex flex-col items-center justify-center text-center py-16 px-6',
                className
            )}
            dir={isEnglish ? 'ltr' : 'rtl'}
        >
            {/* Icon */}
            <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                className={cn(
                    'w-20 h-20 rounded-[24px] flex items-center justify-center mb-6 shadow-sm',
                    config.iconBg
                )}
            >
                <Icon className={cn('w-10 h-10', config.iconColor)} />
            </motion.div>

            {/* Text */}
            <h3 className="text-lg font-bold text-foreground mb-2">{displayTitle}</h3>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-6">
                {displayDescription}
            </p>

            {/* Action Button */}
            {action && (
                <Button onClick={action.onClick} variant="outline" size="sm">
                    {action.label}
                </Button>
            )}
        </motion.div>
    )
}
