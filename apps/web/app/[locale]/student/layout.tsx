'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Sidebar } from '@/components/layout/sidebar'
import { DashboardHeader } from '@/components/layout/dashboard-header'
import { PageTransition } from '@/components/ui/page-transition'
import { SocketProvider } from '@/lib/providers/socket-provider'
import { XpToast } from '@/components/gamification/xp-toast'

export default function StudentLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname()
    const isEnglish = useLocale() === 'en'

    if (pathname.endsWith('/student/new')) return <>{children}</>

    return (
        <SocketProvider>
            <div className="flex min-h-screen bg-background" dir={isEnglish ? 'ltr' : 'rtl'}>
                <Sidebar role="student" />
                <div className="flex-1 flex flex-col min-w-0 relative">
                    <DashboardHeader title={isEnglish ? 'Student dashboard' : 'لوحة التحكم - الطالب'} />
                    <main className="flex-1 p-6 overflow-x-hidden relative">
                        <PageTransition>
                            {children}
                        </PageTransition>
                        {/* Gamification Toast Notifications */}
                        <XpToast />
                    </main>
                </div>
            </div>
        </SocketProvider>
    )
}
