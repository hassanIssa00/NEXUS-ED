'use client'

import { ReactNode } from 'react'
import { useLocale } from 'next-intl'
import { Sidebar } from '@/components/layout/sidebar'
import { DashboardHeader } from '@/components/layout/dashboard-header'
import { PageTransition } from '@/components/ui/page-transition'

export default function AdminLayout({ children }: { children: ReactNode }) {
    const english = useLocale() === 'en'
    return (
        <div className="flex min-h-screen bg-background" dir={english ? 'ltr' : 'rtl'}>
            <Sidebar role="admin" />
            <div className="flex-1 flex flex-col min-w-0">
                <DashboardHeader title={english ? 'School administration' : 'لوحة التحكم - المسؤول'} />
                <main className="flex-1 p-6 overflow-x-hidden">
                    <PageTransition>
                        {children}
                    </PageTransition>
                </main>
            </div>
        </div>
    )
}
