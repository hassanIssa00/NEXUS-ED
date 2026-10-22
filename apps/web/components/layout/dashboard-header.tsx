'use client'

import { useLocale } from 'next-intl'
import { Bell, Search, Sun, Moon, Menu, LogOut, Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EnhancedNotifications } from '@/components/dashboard/notifications-popover'
import { GlobalSearch } from '@/components/search/global-search'
import { XpBar } from '@/components/gamification/xp-bar'
import { useAuth } from '@/contexts/auth-context'
import { usePathname, useRouter } from '@/i18n/routing'

// Map routes to Arabic page titles
const PAGE_TITLES: Record<string, string> = {
    // Student
    '/student': 'لوحة التحكم',
    '/student/assignments': 'الواجبات',
    '/student/grades': 'الدرجات',
    '/student/million': 'مسابقة نكسس',
    '/student/games': 'الألعاب التعليمية',
    '/student/content': 'المكتبة التعليمية',
    '/student/attendance': 'سجل الحضور',
    '/student/messages': 'الرسائل',
    '/student/settings': 'الإعدادات',
    // Teacher
    '/teacher': 'لوحة التحكم',
    '/teacher/classes': 'فصولي',
    '/teacher/assignments': 'الواجبات',
    '/teacher/grading': 'التصحيح',
    '/teacher/attendance': 'الحضور والغياب',
    '/teacher/lessons': 'الدروس',
    '/teacher/automation': 'أدوات الأتمتة',
    '/teacher/notifications': 'التنبيهات',
    '/teacher/settings': 'الإعدادات',
    // Admin
    '/admin': 'لوحة التحكم',
    '/admin/users': 'المستخدمون',
    '/admin/classes': 'الفصول الدراسية',
    '/admin/subjects': 'المواد الدراسية',
    '/admin/enrollments': 'التسجيلات',
    '/admin/content': 'إدارة المحتوى',
    '/admin/games': 'إدارة الألعاب',
    '/admin/permissions': 'الصلاحيات',
    '/admin/settings': 'الإعدادات',
    // Parent
    '/parent': 'لوحة التحكم',
    '/parent/grades': 'درجات الأبناء',
    '/parent/attendance': 'سجل الحضور',
    '/parent/notifications': 'الإشعارات',
    '/parent/payments': 'المدفوعات',
    '/parent/messages': 'التواصل',
}

function getPageTitle(pathname: string): string {
    // Strip locale prefix (e.g. /ar/student → /student)
    const stripped = pathname.replace(/^\/[a-z]{2}(?=\/)/, '')
    // Exact match
    if (PAGE_TITLES[stripped]) return PAGE_TITLES[stripped]
    // Partial match (e.g. /student/assignments/submit → الواجبات)
    const segments = stripped.split('/')
    for (let i = segments.length; i > 1; i--) {
        const key = segments.slice(0, i).join('/')
        if (PAGE_TITLES[key]) return PAGE_TITLES[key]
    }
    return 'لوحة التحكم'
}

interface DashboardHeaderProps {
    title?: string
    onMenuClick?: () => void
}

export function DashboardHeader({ title, onMenuClick }: DashboardHeaderProps) {
    const { setTheme } = useTheme()
    const pathname = usePathname()
    const router = useRouter()
    const locale = useLocale()
    const { signOut } = useAuth()
    const pageTitle = title || getPageTitle(pathname)

    return (
        <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border px-4 lg:px-6 h-14 lg:h-16 flex items-center justify-between transition-all duration-200 no-print">
            <div className="flex items-center gap-3">
                {/* Mobile spacer for hamburger button */}
                <div className="w-10 lg:hidden" />

                <h1 className="text-lg lg:text-xl font-bold text-foreground" dir="rtl">
                    {pageTitle}
                </h1>
            </div>

            <div className="flex items-center gap-4">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 gap-2 px-2"
                    aria-label={locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
                    onClick={() => router.replace(pathname, { locale: locale === 'ar' ? 'en' : 'ar' })}
                >
                    <Languages className="h-4 w-4" />
                    <span className="text-xs font-semibold">{locale === 'ar' ? 'English' : 'العربية'}</span>
                </Button>

                {/* XP Bar (Students Only) */}
                {pathname.includes('/student') && (
                    <div className="hidden md:block">
                        <XpBar />
                    </div>
                )}

                {/* Global Search */}
                <GlobalSearch />

                {/* Enhanced Notifications */}
                <EnhancedNotifications />

                {/* Theme Toggle */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                            <span className="sr-only">تغيير المظهر</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setTheme("light")}>فاتح</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("dark")}>داكن</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("system")}>تلقائي</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* LogOut Button */}
                <Button variant="ghost" size="icon" onClick={() => signOut()} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 h-9 w-9">
                    <LogOut className="h-4 w-4" />
                    <span className="sr-only">تسجيل الخروج</span>
                </Button>
            </div>
        </header>
    )
}
