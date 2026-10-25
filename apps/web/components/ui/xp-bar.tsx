'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { useLocale } from 'next-intl'
import { Zap, Star } from 'lucide-react'

interface XPBarProps {
    currentXP: number
    maxXP: number
    level: number
    className?: string
}

const LEVEL_TITLES = {
    ar: ['مبتدئ', 'متعلم', 'متقدم', 'ماهر', 'خبير', 'محترف', 'متميز', 'نخبة', 'أسطورة', 'المليوني'],
    en: ['Beginner', 'Learner', 'Advanced', 'Skilled', 'Expert', 'Pro', 'Excellent', 'Elite', 'Legend', 'Millionaire'],
}

export function XPBar({ currentXP, maxXP, level, className = '' }: XPBarProps) {
    const isEnglish = useLocale() === 'en'
    const titles = isEnglish ? LEVEL_TITLES.en : LEVEL_TITLES.ar
    const ref = useRef<HTMLDivElement>(null)
    const isInView = useInView(ref, { once: true })
    const percentage = Math.min((currentXP / maxXP) * 100, 100)
    const title = titles[Math.min(level - 1, titles.length - 1)] || titles[1]

    return (
        <div ref={ref} className={`w-full ${className}`}>
            {/* Level + Title Row */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {/* Level Badge */}
                    <div className="relative w-10 h-10 flex items-center justify-center">
                        <div className="absolute inset-0 nexus-gradient rounded-xl opacity-20 blur-sm" />
                        <div className="relative w-10 h-10 nexus-gradient rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-white font-black text-sm">{level}</span>
                        </div>
                    </div>
                    <div>
                        <p className="font-bold text-slate-900 text-sm leading-none">{title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{isEnglish ? `Level ${level}` : `المستوى ${level}`}</p>
                    </div>
                </div>

                <div className="flex items-center gap-1 text-sm">
                    <Zap className="w-4 h-4 text-yellow-500 fill-yellow-400" />
                    <span className="font-bold text-slate-700">{currentXP.toLocaleString(isEnglish ? 'en-US' : 'ar-SA')}</span>
                    <span className="text-slate-400">/</span>
                    <span className="text-slate-500">{maxXP.toLocaleString(isEnglish ? 'en-US' : 'ar-SA')}</span>
                    <span className="text-xs text-slate-400">XP</span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 relative">
                {/* Shimmer animation */}
                <motion.div
                    className="absolute inset-0 overflow-hidden rounded-full"
                    initial={false}
                >
                    <motion.div
                        initial={{ width: 0 }}
                        animate={isInView ? { width: `${percentage}%` } : { width: 0 }}
                        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                        className="h-full nexus-gradient rounded-full relative overflow-hidden"
                    >
                        {/* Shimmer sweep */}
                        <div className="absolute inset-0 animate-shimmer opacity-50" />
                    </motion.div>
                </motion.div>
            </div>

            {/* Next level info */}
            <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs text-slate-500">
                    {isEnglish ? `${(maxXP - currentXP).toLocaleString('en-US')} XP to next level` : `${(maxXP - currentXP).toLocaleString('ar-SA')} XP للمستوى التالي`}
                </span>
                {level < 10 && (
                    <div className="flex items-center gap-1 text-xs text-primary-500 font-medium">
                        <Star className="w-3 h-3" />
                        {titles[Math.min(level, titles.length - 1)]}
                    </div>
                )}
            </div>
        </div>
    )
}
