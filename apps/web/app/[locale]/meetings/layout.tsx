'use client'

import type { ReactNode } from 'react'
import { useLocale } from 'next-intl'
import { useAuth } from '@/contexts/auth-context'
import { Sidebar } from '@/components/layout/sidebar'
import { DashboardHeader } from '@/components/layout/dashboard-header'
import { PageTransition } from '@/components/ui/page-transition'

export default function MeetingsLayout({ children }: { children: ReactNode }) {
  const isEnglish = useLocale() === 'en'
  const { profile, loading } = useAuth()

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background" dir={isEnglish ? 'ltr' : 'rtl'} aria-busy="true">
        <p className="text-sm font-semibold text-muted-foreground">{isEnglish ? 'Checking account access…' : 'جارٍ التحقق من الحساب...'}</p>
      </main>
    )
  }

  return (
    <div className="flex min-h-screen bg-background" dir={isEnglish ? 'ltr' : 'rtl'}>
      <Sidebar role={profile.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader title={isEnglish ? 'Nexus meeting rooms' : 'قاعات اجتماعات نكسس'} />
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  )
}
