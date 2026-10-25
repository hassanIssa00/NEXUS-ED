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

// Page titles stay in the selected portal language.
const PAGE_TITLES: Record<string, { ar: string; en: string }> = {
    // Student
    '/student': { ar: 'لوحة التحكم', en: 'Dashboard' },
    '/student/assignments': { ar: 'الواجبات', en: 'Assignments' },
    '/student/grades': { ar: 'الدرجات', en: 'Grades' },
    '/student/million': { ar: 'مسابقة نكسس', en: 'Nexus Million Challenge' },
    '/student/games': { ar: 'الألعاب التعليمية', en: 'Educational games' },
    '/student/content': { ar: 'المكتبة التعليمية', en: 'Learning library' },
    '/student/attendance': { ar: 'سجل الحضور', en: 'Attendance record' },
    '/student/messages': { ar: 'الرسائل', en: 'Messages' },
    '/student/settings': { ar: 'الإعدادات', en: 'Settings' },
    // Teacher
    '/teacher': { ar: 'لوحة التحكم', en: 'Dashboard' },
    '/teacher/classes': { ar: 'فصولي', en: 'My classes' },
    '/teacher/assignments': { ar: 'الواجبات', en: 'Assignments' },
    '/teacher/grading': { ar: 'التصحيح', en: 'Grading' },
    '/teacher/attendance': { ar: 'الحضور والغياب', en: 'Attendance' },
    '/teacher/lessons': { ar: 'الدروس', en: 'Lessons' },
    '/teacher/automation': { ar: 'أدوات الأتمتة', en: 'Automation tools' },
    '/teacher/notifications': { ar: 'التنبيهات', en: 'Notifications' },
    '/teacher/settings': { ar: 'الإعدادات', en: 'Settings' },
    // Admin
    '/admin': { ar: 'لوحة التحكم', en: 'Dashboard' },
    '/admin/users': { ar: 'المستخدمون', en: 'Users' },
    '/admin/classes': { ar: 'الفصول الدراسية', en: 'Classes' },
    '/admin/subjects': { ar: 'المواد الدراسية', en: 'Subjects' },
    '/admin/enrollments': { ar: 'التسجيلات', en: 'Enrollments' },
    '/admin/content': { ar: 'إدارة المحتوى', en: 'Content management' },
    '/admin/games': { ar: 'إدارة الألعاب', en: 'Game management' },
    '/admin/permissions': { ar: 'الصلاحيات', en: 'Permissions' },
    '/admin/settings': { ar: 'الإعدادات', en: 'Settings' },
    // Parent
    '/parent': { ar: 'لوحة التحكم', en: 'Dashboard' },
    '/parent/grades': { ar: 'درجات الأبناء', en: 'Children’s grades' },
    '/parent/attendance': { ar: 'سجل الحضور', en: 'Attendance record' },
    '/parent/notifications': { ar: 'الإشعارات', en: 'Notifications' },
    '/parent/payments': { ar: 'المدفوعات', en: 'Payments' },
    '/parent/messages': { ar: 'التواصل', en: 'Messages' },
}

function getPageTitle(pathname: string, locale: string): string {
    // Strip locale prefix (e.g. /ar/student → /student)
    const stripped = pathname.replace(/^\/[a-z]{2}(?=\/)/, '')
    // Exact match
    if (PAGE_TITLES[stripped]) return PAGE_TITLES[stripped][locale === 'en' ? 'en' : 'ar']
    // Partial match (e.g. /student/assignments/submit → الواجبات)
    const segments = stripped.split('/')
    for (let i = segments.length; i > 1; i--) {
        const key = segments.slice(0, i).join('/')
        if (PAGE_TITLES[key]) return PAGE_TITLES[key][locale === 'en' ? 'en' : 'ar']
    }
    return locale === 'en' ? 'Dashboard' : 'لوحة التحكم'
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
    const isEnglish = locale === 'en'
    const pageTitle = title || getPageTitle(pathname, locale)

    return (
        <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border px-4 lg:px-6 h-14 lg:h-16 flex items-center justify-between transition-all duration-200 no-print">
            <div className="flex items-center gap-3">
                {/* Mobile spacer for hamburger button */}
                <div className="w-10 lg:hidden" />

                <h1 className="text-lg lg:text-xl font-bold text-foreground" dir={isEnglish ? 'ltr' : 'rtl'}>
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
                    <span className="sr-only">{isEnglish ? 'Change theme' : 'تغيير المظهر'}</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setTheme("light")}>{isEnglish ? 'Light' : 'فاتح'}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("dark")}>{isEnglish ? 'Dark' : 'داكن'}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("system")}>{isEnglish ? 'System' : 'تلقائي'}</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* LogOut Button */}
                <Button variant="ghost" size="icon" onClick={() => signOut()} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 h-9 w-9">
                    <LogOut className="h-4 w-4" />
                    <span className="sr-only">{isEnglish ? 'Sign out' : 'تسجيل الخروج'}</span>
                </Button>
            </div>
        </header>
    )
}
