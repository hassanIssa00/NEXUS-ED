'use client'

import { ReactNode, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { useAuth, type UserRole } from '@/contexts/auth-context'
import { Sidebar } from '@/components/layout/sidebar'
import { DashboardHeader } from '@/components/layout/dashboard-header'
import { PageTransition } from '@/components/ui/page-transition'

const titles: Record<string, Record<'ar' | 'en', string>> = {
  principal: { ar: 'بوابة مدير المدرسة', en: 'Principal portal' },
  vice_principal: { ar: 'بوابة وكيل المدرسة', en: 'Vice principal portal' },
  counselor: { ar: 'بوابة التوجيه الطلابي', en: 'Student counseling portal' },
  supervisor: { ar: 'بوابة الإشراف التربوي', en: 'Educational supervisor portal' },
  accountant: { ar: 'بوابة الشؤون المالية', en: 'Finance portal' },
  hr: { ar: 'بوابة الموارد البشرية', en: 'Human resources portal' },
}

export default function RolePortalLayout({ role, children }: { role: Extract<UserRole, 'principal' | 'vice_principal' | 'counselor' | 'supervisor' | 'accountant' | 'hr'>; children: ReactNode }) {
  const { profile, loading } = useAuth()
  const router = useRouter()
  const locale = useLocale() === 'en' ? 'en' : 'ar'

  useEffect(() => {
    if (loading) return
    if (!profile) router.replace(`/login/${role}` as never)
    else if (profile.role !== role) router.replace('/login' as never)
  }, [loading, profile, role, router])

  if (loading || !profile || profile.role !== role) {
    return <main className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground" dir={locale === 'en' ? 'ltr' : 'rtl'} aria-busy="true">{locale === 'en' ? 'Checking account access…' : 'جارٍ التحقق من صلاحية الحساب...'}</main>
  }

  return <div className="flex min-h-screen bg-background" dir={locale === 'en' ? 'ltr' : 'rtl'}>
    <Sidebar role={role} />
    <div className="flex min-w-0 flex-1 flex-col">
      <DashboardHeader title={titles[role][locale]} />
      <main className="flex-1 overflow-x-hidden p-4 sm:p-6">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  </div>
}
