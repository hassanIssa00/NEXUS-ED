'use client'

import { ReactNode } from 'react'
import { usePathname } from '@/i18n/routing'
import { Sidebar } from '@/components/layout/sidebar'
import { DashboardHeader } from '@/components/layout/dashboard-header'
import { PageTransition } from '@/components/ui/page-transition'
import { SocketProvider } from '@/lib/providers/socket-provider'

export default function ParentLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname()

    if (pathname.endsWith('/parent/onboarding')) {
        return <main className="min-h-screen bg-background">{children}</main>
    }

    return (
        <SocketProvider>
            <div className="flex min-h-screen bg-background" dir="rtl">
                <Sidebar role="parent" />
                <div className="flex-1 flex flex-col min-w-0">
                    <DashboardHeader title="لوحة التحكم - ولي الأمر" />
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
