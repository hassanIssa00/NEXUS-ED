'use client'

import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useLocale } from 'next-intl'
import Link from 'next/link'

interface PremiumLockProps {
    children: React.ReactNode
    isLocked?: boolean
    title?: string
    description?: string
}

export function PremiumLock({
    children,
    isLocked = true,
    title,
    description
}: PremiumLockProps) {
    const isEnglish = useLocale() === 'en'
    if (!isLocked) return <>{children}</>

    return (
        <div className="relative group">
            {/* Blurred Content */}
            <div className="blur-sm select-none pointer-events-none opacity-50 grayscale transition-all duration-300">
                {children}
            </div>

            {/* Lock Overlay */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 text-center max-w-sm mx-4 transform transition-transform duration-300 hover:scale-105">
                    <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">{title ?? (isEnglish ? 'Premium feature' : 'ميزة مدفوعة')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        {description ?? (isEnglish ? 'Upgrade to access this feature and more advanced tools.' : 'قم بالترقية للوصول إلى هذه الميزة والمزيد من الخصائص المتقدمة.')}
                    </p>
                    <Link href="/pricing">
                        <Button className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white shadow-lg shadow-primary-500/20">
                            {isEnglish ? 'Upgrade plan ⚡️' : 'ترقية الاشتراك ⚡️'}
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}
