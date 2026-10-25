'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'

interface StreakCounterProps {
    streak: number
    className?: string
    compact?: boolean
}

export function StreakCounter({ streak, className = '', compact = false }: StreakCounterProps) {
    const isEnglish = useLocale() === 'en'
    const [isAnimating, setIsAnimating] = useState(false)

    useEffect(() => {
        setIsAnimating(true)
        const t = setTimeout(() => setIsAnimating(false), 1000)
        return () => clearTimeout(t)
    }, [streak])

    const getFlameColor = () => {
        if (streak >= 30) return 'from-red-500 to-orange-400'
        if (streak >= 14) return 'from-orange-500 to-yellow-400'
        if (streak >= 7) return 'from-yellow-500 to-amber-400'
        return 'from-amber-400 to-yellow-300'
    }

    const getFlameSize = () => {
        if (streak >= 30) return 'text-4xl'
        if (streak >= 14) return 'text-3xl'
        if (streak >= 7) return 'text-2xl'
        return 'text-xl'
    }

    if (compact) {
        return (
            <div className={`flex items-center gap-1.5 ${className}`}>
                <motion.span
                    animate={{ scale: isAnimating ? [1, 1.3, 1] : 1, rotate: isAnimating ? [-5, 5, 0] : 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-lg"
                >
                    🔥
                </motion.span>
                <span className="font-bold text-orange-500">{streak}</span>
            </div>
        )
    }

    return (
        <div className={`flex flex-col items-center ${className}`}>
            {/* Flame */}
            <div className="relative">
                <motion.div
                    animate={{
                        scale: [1, 1.1, 0.95, 1.05, 1],
                        rotate: [-2, 2, -1, 1, 0],
                    }}
                    transition={{ duration: 2, repeat: Infinity, repeatType: 'loop' }}
                    className={`${getFlameSize()} select-none`}
                >
                    🔥
                </motion.div>
                {/* Glow effect */}
                <div className={`absolute inset-0 bg-gradient-to-t ${getFlameColor()} rounded-full blur-xl opacity-30 scale-150`} />
            </div>

            {/* Streak Number */}
            <motion.div
                key={streak}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className="text-3xl font-black text-slate-900 mt-1"
            >
                {streak}
            </motion.div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">{isEnglish ? 'day streak' : 'يوم متتالي'}</div>

            {/* Milestone badges */}
            {streak >= 7 && (
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 text-xs font-bold"
                >
                    {streak >= 30 ? (isEnglish ? '🏆 Legendary' : '🏆 أسطوري') : streak >= 14 ? (isEnglish ? '⚡ Pro' : '⚡ محترف') : (isEnglish ? '⭐ Excellent' : '⭐ متميز')}
                </motion.div>
            )}
        </div>
    )
}
