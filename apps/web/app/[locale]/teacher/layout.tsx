'use client'

import { ReactNode, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { Sidebar } from '@/components/layout/sidebar'
import { DashboardHeader } from '@/components/layout/dashboard-header'
import { PageTransition } from '@/components/ui/page-transition'
import { SocketProvider } from '@/lib/providers/socket-provider'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from '@/i18n/routing'

export default function TeacherLayout({ children }: { children: ReactNode }) {
    const isEnglish = useLocale() === 'en'
    const { profile, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (loading) return
        if (!profile) {
            router.replace('/login/teacher')
        } else if (profile.role !== 'teacher') {
            router.replace('/login')
        }
    }, [loading, profile, router])

    if (loading || !profile || profile.role !== 'teacher') {
        return (
            <main className="flex min-h-screen items-center justify-center bg-background" dir={isEnglish ? 'ltr' : 'rtl'} aria-busy="true">
                <p className="text-sm font-semibold text-muted-foreground">{isEnglish ? 'Checking account access…' : 'جارٍ التحقق من صلاحية الحساب...'}</p>
            </main>
        )
    }

    return (
        <SocketProvider>
            <div className="flex min-h-screen bg-background" dir={isEnglish ? 'ltr' : 'rtl'}>
                <Sidebar role="teacher" />
                <div className="flex-1 flex flex-col min-w-0">
                    <DashboardHeader title={isEnglish ? 'Teacher dashboard' : 'لوحة التحكم - المعلم'} />
                    <main className="flex-1 p-6 overflow-x-hidden">
                        <PageTransition>
                            {children}
                        </PageTransition>
                    </main>
                </div>
            </div>
        </SocketProvider>
    )
}
